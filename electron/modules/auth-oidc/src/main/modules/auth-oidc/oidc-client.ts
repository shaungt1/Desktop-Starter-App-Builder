/**
 * Provider-agnostic OpenID Connect sign-in for desktop apps, following
 * RFC 8252 (OAuth for native apps):
 *
 * 1. Fetch the provider's discovery document.
 * 2. Open the authorization page in the user's default browser (never an
 *    embedded window), with a PKCE challenge, state and nonce.
 * 3. The provider redirects to <scheme>://auth/callback; the operating
 *    system hands that link to this app (deep-links.ts).
 * 4. Exchange the code plus the PKCE verifier for tokens.
 *
 * The ID token arrives directly from the token endpoint over TLS, so per
 * OpenID Connect Core 3.1.3.7 the TLS connection authenticates the issuer and
 * signature verification may be skipped; issuer, audience, expiry and nonce
 * are still checked.
 */
import { createPkceRequest, decodeJwtPayload } from "./pkce";

export interface OidcSettings {
  issuer: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  audience?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
}

export interface UserClaims {
  sub: string;
  name?: string;
  email?: string;
}

export interface OidcDependencies {
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  openBrowser: (url: string) => Promise<void>;
  /** Resolves with the callback URL whose `state` matches, or rejects on timeout. */
  waitForCallback: (state: string) => Promise<URL>;
  now?: () => number;
}

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
}

async function json<T>(response: Response, what: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${what} failed with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export function createOidcClient(settings: OidcSettings, deps: OidcDependencies) {
  const now = deps.now ?? Date.now;
  let discovery: Discovery | undefined;

  async function discover(): Promise<Discovery> {
    if (!discovery) {
      const url = `${settings.issuer.replace(/\/$/u, "")}/.well-known/openid-configuration`;
      discovery = await json<Discovery>(await deps.fetch(url), "OIDC discovery");
    }
    return discovery;
  }

  function toTokenSet(body: Record<string, unknown>): TokenSet {
    if (typeof body.access_token !== "string") {
      throw new Error("Token response has no access_token.");
    }
    return {
      accessToken: body.access_token,
      refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : undefined,
      idToken: typeof body.id_token === "string" ? body.id_token : undefined,
      expiresAt: now() + (typeof body.expires_in === "number" ? body.expires_in : 3600) * 1000,
    };
  }

  function validateIdToken(idToken: string, issuer: string, nonce: string): UserClaims {
    const claims = decodeJwtPayload(idToken);
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== issuer) {
      throw new Error("ID token issuer does not match.");
    }
    if (!audience.includes(settings.clientId)) {
      throw new Error("ID token audience does not include this client.");
    }
    if (typeof claims.exp !== "number" || claims.exp * 1000 < now()) {
      throw new Error("ID token expired.");
    }
    if (claims.nonce !== nonce) {
      throw new Error("ID token nonce does not match this sign-in.");
    }
    return {
      sub: String(claims.sub),
      name: typeof claims.name === "string" ? claims.name : undefined,
      email: typeof claims.email === "string" ? claims.email : undefined,
    };
  }

  async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
    const { token_endpoint } = await discover();
    const response = await deps.fetch(token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ client_id: settings.clientId, ...params }).toString(),
    });
    return toTokenSet(await json<Record<string, unknown>>(response, "Token request"));
  }

  return {
    async signIn(): Promise<{ tokens: TokenSet; user: UserClaims | undefined }> {
      const config = await discover();
      const pkce = createPkceRequest();
      const authorize = new URL(config.authorization_endpoint);
      authorize.search = new URLSearchParams({
        response_type: "code",
        client_id: settings.clientId,
        redirect_uri: settings.redirectUri,
        scope: settings.scopes.join(" "),
        state: pkce.state,
        nonce: pkce.nonce,
        code_challenge: pkce.challenge,
        code_challenge_method: "S256",
        ...(settings.audience ? { audience: settings.audience } : {}),
      }).toString();

      const callbackPromise = deps.waitForCallback(pkce.state);
      await deps.openBrowser(authorize.toString());
      const callback = await callbackPromise;

      const error = callback.searchParams.get("error");
      if (error) {
        throw new Error(`Sign-in was not completed: ${callback.searchParams.get("error_description") ?? error}`);
      }
      const code = callback.searchParams.get("code");
      if (!code) {
        throw new Error("Sign-in callback had no authorization code.");
      }
      const tokens = await tokenRequest({
        grant_type: "authorization_code",
        code,
        redirect_uri: settings.redirectUri,
        code_verifier: pkce.verifier,
      });
      const user = tokens.idToken ? validateIdToken(tokens.idToken, config.issuer, pkce.nonce) : undefined;
      return { tokens, user };
    },

    async refresh(refreshToken: string): Promise<TokenSet> {
      const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
      return { ...tokens, refreshToken: tokens.refreshToken ?? refreshToken };
    },

    async signOutUrl(idToken?: string): Promise<string | undefined> {
      const { end_session_endpoint } = await discover();
      if (!end_session_endpoint) {
        return undefined;
      }
      const url = new URL(end_session_endpoint);
      if (idToken) {
        url.searchParams.set("id_token_hint", idToken);
      }
      url.searchParams.set("client_id", settings.clientId);
      return url.toString();
    },
  };
}

export type OidcClient = ReturnType<typeof createOidcClient>;
