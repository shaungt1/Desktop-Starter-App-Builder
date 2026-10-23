//! Commands every generated app has, regardless of modules.

use serde::Serialize;
use tauri::{AppHandle, Runtime};
use tauri_plugin_opener::OpenerExt;

use crate::app_config::app_config;
use crate::error::{AppError, AppResult};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    name: String,
    version: String,
    platform: &'static str,
    arch: &'static str,
    tauri: &'static str,
    profile: String,
    modules: Vec<String>,
}

#[tauri::command]
pub fn app_info<R: Runtime>(app: AppHandle<R>) -> AppInfo {
    let config = app_config();
    AppInfo {
        name: config.name.clone(),
        version: app.package_info().version.to_string(),
        platform: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        tauri: tauri::VERSION,
        profile: config.profile.clone(),
        modules: config.modules.clone(),
    }
}

/// Only web and mail links are handed to the operating system.
pub fn is_external_web_url(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    lower.starts_with("https://") || lower.starts_with("http://") || lower.starts_with("mailto:")
}

#[tauri::command]
pub fn open_external<R: Runtime>(app: AppHandle<R>, url: String) -> AppResult<()> {
    if !is_external_web_url(&url) {
        return Err(AppError::Invalid("Only http, https and mailto links can be opened.".into()));
    }
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| AppError::Other(error.to_string()))
}

#[cfg(test)]
mod tests {
    use super::is_external_web_url;

    #[test]
    fn allows_only_web_and_mail_links() {
        assert!(is_external_web_url("https://example.com"));
        assert!(is_external_web_url("mailto:team@example.com"));
        assert!(!is_external_web_url("file:///etc/passwd"));
        assert!(!is_external_web_url("javascript:alert(1)"));
    }
}
