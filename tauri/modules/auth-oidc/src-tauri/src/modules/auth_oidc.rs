//! Sign-in module: OpenID Connect with PKCE in the system browser (RFC 8252).
//!
//! 1. Fetch the provider's discovery document.
//! 2. Open the authorization page in the default browser with a PKCE
//!    challenge, state and nonce.
//! 3. The provider redirects to <scheme>://auth/callback; the deep-link
//!    plugin delivers that URL here (single-instance forwards it when the app
//!    is already running).
//! 4. Exchange the code and the PKCE verifier for tokens, stored with the
//!    secure-storage module. The interface only learns who is signed in.
//!
//! The ID token comes straight from the token endpoint over TLS, so per
//! OpenID Connect Core 3.1.3.7 its signature check may be skipped; issuer,
//! audience, expiry and nonce are still verified.
//!
//! Plan options (moduleOptions["auth-oidc"]): issuer, clientId, scopes, audience.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, Runtime, State};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_opener::OpenerExt;
use tokio::sync::oneshot;

use super::secure_storage::{delete_secret, get_secret, set_secret};
use crate::app_config::{app_config, module_option, module_option_str};
use crate::error::{AppError, AppResult};

const TOKEN_KEY: &str = "auth-oidc.tokens";
const USER_KEY: &str = "auth-oidc.user";
const CALLBACK_TIMEOUT: Duration = Duration::from_secs(5 * 60);
#[allow(dead_code)]
/// Refresh this long before expiry so a request never carries a token that expires mid-flight.
const REFRESH_MARGIN_MS: u64 = 60_000;

/// Sign-ins waiting for their browser callback, keyed by `state`.
#[derive(Default)]
pub struct PendingSignIns(Mutex<HashMap<String, oneshot::Sender<url::Url>>>);

#[derive(Clone, Serialize, Deserialize)]
pub struct TokenSet {
    access_token: String,
    refresh_token: Option<String>,
    id_token: Option<String>,
    /// Unix time in milliseconds.
    expires_at: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UserClaims {
    pub sub: String,
    pub name: Option<String>,
    pub email: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatus {
    signed_in: bool,
    user: Option<UserClaims>,
}

#[derive(Deserialize)]
struct Discovery {
    issuer: String,
    authorization_endpoint: String,
    token_endpoint: String,
    end_session_endpoint: Option<String>,
}

struct Settings {
    issuer: String,
    client_id: String,
    redirect_uri: String,
    scopes: String,
    audience: Option<String>,
}

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn other(error: impl std::fmt::Display) -> AppError {
    AppError::Other(error.to_string())
}

fn settings() -> AppResult<Settings> {
    let missing = || AppError::Invalid("Set moduleOptions[\"auth-oidc\"].issuer and clientId in the project plan.".into());
    let scopes = match module_option("auth-oidc", "scopes") {
        Some(serde_json::Value::Array(items)) => {
            items.iter().filter_map(|item| item.as_str()).collect::<Vec<_>>().join(" ")
        }
        Some(serde_json::Value::String(text)) if !text.is_empty() => text.replace(',', " "),
        _ => "openid profile email offline_access".to_string(),
    };
    Ok(Settings {
        issuer: module_option_str("auth-oidc", "issuer").ok_or_else(missing)?.trim_end_matches('/').to_string(),
        client_id: module_option_str("auth-oidc", "clientId").ok_or_else(missing)?.to_string(),
        redirect_uri: format!("{}://auth/callback", app_config().scheme),
        scopes,
        audience: module_option_str("auth-oidc", "audience").map(str::to_string),
    })
}

fn random_token(bytes: usize) -> String {
    let data: Vec<u8> = (0..bytes).map(|_| rand::random::<u8>()).collect();
    URL_SAFE_NO_PAD.encode(data)
}

/// PKCE S256 challenge (RFC 7636): base64url(SHA-256(verifier)).
pub fn code_challenge(verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()))
}

/// Checks the claims that matter for a token received directly from the token endpoint.
pub fn validate_id_token(token: &str, issuer: &str, client_id: &str, nonce: &str, now_seconds: u64) -> AppResult<UserClaims> {
    let payload = token.split('.').nth(1).ok_or_else(|| AppError::Invalid("Malformed ID token.".into()))?;
    let bytes = URL_SAFE_NO_PAD.decode(payload.trim_end_matches('=')).map_err(other)?;
    let claims: serde_json::Value = serde_json::from_slice(&bytes).map_err(other)?;

    if claims["iss"].as_str() != Some(issuer) {
        return Err(AppError::Invalid("ID token issuer does not match.".into()));
    }
    let audience_ok = match &claims["aud"] {
        serde_json::Value::String(aud) => aud == client_id,
        serde_json::Value::Array(list) => list.iter().any(|aud| aud.as_str() == Some(client_id)),
        _ => false,
    };
    if !audience_ok {
        return Err(AppError::Invalid("ID token audience does not include this client.".into()));
    }
    if claims["exp"].as_u64().is_none_or(|exp| exp < now_seconds) {
        return Err(AppError::Invalid("ID token expired.".into()));
    }
    if claims["nonce"].as_str() != Some(nonce) {
        return Err(AppError::Invalid("ID token nonce does not match this sign-in.".into()));
    }
    Ok(UserClaims {
        sub: claims["sub"].as_str().unwrap_or_default().to_string(),
        name: claims["name"].as_str().map(str::to_string),
        email: claims["email"].as_str().map(str::to_string),
    })
}

fn http() -> AppResult<reqwest::Client> {
    reqwest::Client::builder().timeout(Duration::from_secs(30)).build().map_err(other)
}

async fn discover(client: &reqwest::Client, issuer: &str) -> AppResult<Discovery> {
    let url = format!("{issuer}/.well-known/openid-configuration");
    let response = client.get(url).send().await.map_err(other)?.error_for_status().map_err(other)?;
    response.json().await.map_err(other)
}

async fn token_request(client: &reqwest::Client, endpoint: &str, params: &[(&str, &str)]) -> AppResult<TokenSet> {
    let response = client
        .post(endpoint)
        .header("Accept", "application/json")
        .form(params)
        .send()
        .await
        .map_err(other)?
        .error_for_status()
        .map_err(other)?;
    let body: serde_json::Value = response.json().await.map_err(other)?;
    let access_token = body["access_token"]
        .as_str()
        .ok_or_else(|| AppError::Other("Token response has no access_token.".into()))?;
    Ok(TokenSet {
        access_token: access_token.to_string(),
        refresh_token: body["refresh_token"].as_str().map(str::to_string),
        id_token: body["id_token"].as_str().map(str::to_string),
        expires_at: now_ms() + body["expires_in"].as_u64().unwrap_or(3600) * 1000,
    })
}

fn read_tokens() -> AppResult<Option<TokenSet>> {
    get_secret(TOKEN_KEY)?.map(|raw| serde_json::from_str(&raw).map_err(other)).transpose()
}

fn read_user() -> AppResult<Option<UserClaims>> {
    get_secret(USER_KEY)?.map(|raw| serde_json::from_str(&raw).map_err(other)).transpose()
}

/// A valid access token for API calls from Rust, refreshing it when needed.
/// Call it from your own commands; it is unused until you do.
#[allow(dead_code)]
pub async fn access_token() -> AppResult<Option<String>> {
    let Some(tokens) = read_tokens()? else { return Ok(None) };
    if tokens.expires_at > now_ms() + REFRESH_MARGIN_MS {
        return Ok(Some(tokens.access_token));
    }
    let Some(refresh_token) = tokens.refresh_token.clone() else { return Ok(None) };
    let settings = settings()?;
    let client = http()?;
    let discovery = discover(&client, &settings.issuer).await?;
    let mut refreshed = token_request(
        &client,
        &discovery.token_endpoint,
        &[("grant_type", "refresh_token"), ("refresh_token", &refresh_token), ("client_id", &settings.client_id)],
    )
    .await?;
    refreshed.refresh_token = refreshed.refresh_token.or(Some(refresh_token));
    set_secret(TOKEN_KEY, &serde_json::to_string(&refreshed).map_err(other)?)?;
    Ok(Some(refreshed.access_token))
}

#[tauri::command]
pub fn auth_status() -> AppResult<AuthStatus> {
    Ok(AuthStatus { signed_in: read_tokens()?.is_some(), user: read_user()? })
}

#[tauri::command]
pub async fn auth_sign_in<R: Runtime>(app: AppHandle<R>, pending: State<'_, PendingSignIns>) -> AppResult<AuthStatus> {
    let settings = settings()?;
    let client = http()?;
    let discovery = discover(&client, &settings.issuer).await?;

    let verifier = random_token(48);
    let state = random_token(16);
    let nonce = random_token(16);
    let mut authorize = url::Url::parse(&discovery.authorization_endpoint).map_err(other)?;
    {
        let mut query = authorize.query_pairs_mut();
        query
            .append_pair("response_type", "code")
            .append_pair("client_id", &settings.client_id)
            .append_pair("redirect_uri", &settings.redirect_uri)
            .append_pair("scope", &settings.scopes)
            .append_pair("state", &state)
            .append_pair("nonce", &nonce)
            .append_pair("code_challenge", &code_challenge(&verifier))
            .append_pair("code_challenge_method", "S256");
        if let Some(audience) = &settings.audience {
            query.append_pair("audience", audience);
        }
    }

    let (sender, receiver) = oneshot::channel();
    pending.0.lock().map_err(other)?.insert(state.clone(), sender);
    app.opener().open_url(authorize.as_str(), None::<&str>).map_err(other)?;

    let callback = tokio::time::timeout(CALLBACK_TIMEOUT, receiver).await;
    pending.0.lock().map_err(other)?.remove(&state);
    let callback = callback
        .map_err(|_| AppError::Other("Sign-in timed out.".into()))?
        .map_err(|_| AppError::Other("Sign-in was cancelled.".into()))?;

    let params: HashMap<String, String> = callback.query_pairs().into_owned().collect();
    if let Some(error) = params.get("error") {
        let detail = params.get("error_description").unwrap_or(error);
        return Err(AppError::Other(format!("Sign-in was not completed: {detail}")));
    }
    let code = params.get("code").ok_or_else(|| AppError::Other("Callback had no authorization code.".into()))?;
    let tokens = token_request(
        &client,
        &discovery.token_endpoint,
        &[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", &settings.redirect_uri),
            ("code_verifier", &verifier),
            ("client_id", &settings.client_id),
        ],
    )
    .await?;
    let user = match &tokens.id_token {
        Some(id_token) => Some(validate_id_token(id_token, &discovery.issuer, &settings.client_id, &nonce, now_ms() / 1000)?),
        None => None,
    };
    set_secret(TOKEN_KEY, &serde_json::to_string(&tokens).map_err(other)?)?;
    if let Some(user) = &user {
        set_secret(USER_KEY, &serde_json::to_string(user).map_err(other)?)?;
    }
    Ok(AuthStatus { signed_in: true, user })
}

#[tauri::command]
pub async fn auth_sign_out<R: Runtime>(app: AppHandle<R>) -> AppResult<AuthStatus> {
    let id_token = read_tokens()?.and_then(|tokens| tokens.id_token);
    delete_secret(TOKEN_KEY)?;
    delete_secret(USER_KEY)?;
    if let (Ok(settings), Ok(client)) = (settings(), http())
        && let Ok(discovery) = discover(&client, &settings.issuer).await
        && let Some(endpoint) = discovery.end_session_endpoint
        && let Ok(mut logout) = url::Url::parse(&endpoint)
    {
        if let Some(hint) = id_token {
            logout.query_pairs_mut().append_pair("id_token_hint", &hint);
        }
        logout.query_pairs_mut().append_pair("client_id", &settings.client_id);
        let _ = app.opener().open_url(logout.as_str(), None::<&str>);
    }
    Ok(AuthStatus { signed_in: false, user: None })
}

pub fn register<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.manage(PendingSignIns::default())
}

pub fn setup<R: Runtime>(app: &mut tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle().clone();
    let scheme = app_config().scheme.clone();
    app.deep_link().on_open_url(move |event| {
        for url in event.urls() {
            if url.scheme() != scheme || url.host_str() != Some("auth") || url.path() != "/callback" {
                continue;
            }
            let state = url.query_pairs().find(|(key, _)| key == "state").map(|(_, value)| value.into_owned());
            let pending = handle.state::<PendingSignIns>();
            let sender = state.and_then(|state| pending.0.lock().ok()?.remove(&state));
            match sender {
                Some(sender) => {
                    let _ = sender.send(url);
                }
                None => log::warn!("Ignored sign-in callback with an unknown state."),
            }
        }
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn token(claims: serde_json::Value) -> String {
        format!("e30.{}.", URL_SAFE_NO_PAD.encode(claims.to_string()))
    }

    #[test]
    fn derives_the_rfc7636_example_challenge() {
        assert_eq!(
            code_challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }

    #[test]
    fn accepts_a_matching_id_token() {
        let id = token(serde_json::json!({"iss": "https://id.example.com", "aud": "app", "exp": 2000, "nonce": "n", "sub": "u1", "email": "a@example.com"}));
        let user = validate_id_token(&id, "https://id.example.com", "app", "n", 1000).expect("valid token");
        assert_eq!(user.sub, "u1");
        assert_eq!(user.email.as_deref(), Some("a@example.com"));
    }

    #[test]
    fn rejects_wrong_audience_nonce_or_expiry() {
        let claims = |aud: &str, nonce: &str, exp: u64| {
            token(serde_json::json!({"iss": "https://id.example.com", "aud": aud, "exp": exp, "nonce": nonce, "sub": "u"}))
        };
        assert!(validate_id_token(&claims("other", "n", 2000), "https://id.example.com", "app", "n", 1000).is_err());
        assert!(validate_id_token(&claims("app", "x", 2000), "https://id.example.com", "app", "n", 1000).is_err());
        assert!(validate_id_token(&claims("app", "n", 10), "https://id.example.com", "app", "n", 1000).is_err());
    }
}
