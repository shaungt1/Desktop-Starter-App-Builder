//! Auto-update module: signed updates through the official updater plugin.
//!
//! Plan options (moduleOptions["auto-update"]):
//! - endpoint: URL of the update manifest (latest.json), for example
//!   https://github.com/OWNER/REPO/releases/latest/download/latest.json
//! - pubkey: the public key printed by `bun run tauri signer generate`.
//!
//! Every update is verified against `pubkey` before it is installed.
//! Releases must be built with TAURI_SIGNING_PRIVATE_KEY set and
//! "createUpdaterArtifacts": true under "bundle" in tauri.conf.json.

use serde::Serialize;
use tauri::{AppHandle, Runtime};
use tauri_plugin_updater::UpdaterExt;

use crate::app_config::module_option_str;
use crate::error::{AppError, AppResult};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheck {
    configured: bool,
    available: bool,
    current_version: String,
    version: Option<String>,
    notes: Option<String>,
}

fn updater<R: Runtime>(app: &AppHandle<R>) -> AppResult<Option<tauri_plugin_updater::Updater>> {
    let (Some(endpoint), Some(pubkey)) =
        (module_option_str("auto-update", "endpoint"), module_option_str("auto-update", "pubkey"))
    else {
        return Ok(None);
    };
    let endpoint = endpoint.parse().map_err(|_| AppError::Invalid("auto-update endpoint is not a URL.".into()))?;
    let updater = app
        .updater_builder()
        .pubkey(pubkey)
        .endpoints(vec![endpoint])
        .and_then(|builder| builder.build())
        .map_err(|error| AppError::Other(error.to_string()))?;
    Ok(Some(updater))
}

#[tauri::command]
pub async fn update_check<R: Runtime>(app: AppHandle<R>) -> AppResult<UpdateCheck> {
    let current_version = app.package_info().version.to_string();
    let Some(updater) = updater(&app)? else {
        return Ok(UpdateCheck { configured: false, available: false, current_version, version: None, notes: None });
    };
    let update = updater.check().await.map_err(|error| AppError::Other(error.to_string()))?;
    Ok(UpdateCheck {
        configured: true,
        available: update.is_some(),
        current_version,
        version: update.as_ref().map(|update| update.version.clone()),
        notes: update.and_then(|update| update.body),
    })
}

/// Downloads, verifies and installs the update, then restarts the app.
#[tauri::command]
pub async fn update_install<R: Runtime>(app: AppHandle<R>) -> AppResult<()> {
    let updater = updater(&app)?.ok_or_else(|| AppError::Invalid("Updates are not configured.".into()))?;
    let update = updater
        .check()
        .await
        .map_err(|error| AppError::Other(error.to_string()))?
        .ok_or_else(|| AppError::Invalid("No update available.".into()))?;
    update
        .download_and_install(|_chunk, _total| {}, || log::info!("update downloaded"))
        .await
        .map_err(|error| AppError::Other(error.to_string()))?;
    app.restart();
}

pub fn register<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.plugin(tauri_plugin_updater::Builder::new().build()).plugin(tauri_plugin_process::init())
}
