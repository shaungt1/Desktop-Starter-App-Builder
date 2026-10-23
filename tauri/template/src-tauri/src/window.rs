//! Creates the main window. Its content depends on the profile in
//! app.config.json: the bundled interface (native) or a hosted site (remote).

#[cfg(desktop)]
use tauri::Manager;
use tauri::{AppHandle, Runtime, WebviewUrl, WebviewWindowBuilder};

use crate::app_config::app_config;

pub const MAIN_WINDOW: &str = "main";

fn content_url() -> WebviewUrl {
    let config = app_config();
    match (config.profile.as_str(), config.remote_url.as_deref()) {
        ("remote", Some(url)) => WebviewUrl::External(url.parse().expect("remoteUrl in app.config.json is not a URL")),
        _ => WebviewUrl::App("index.html".into()),
    }
}

pub fn create_main<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let builder = WebviewWindowBuilder::new(app, MAIN_WINDOW, content_url());
    // Title and size exist only on desktop; on Android and iOS the window fills the screen.
    #[cfg(desktop)]
    let builder = builder
        .title(&app_config().name)
        .inner_size(1100.0, 720.0)
        .min_inner_size(720.0, 480.0);
    builder.build()?;
    Ok(())
}

/// Shows, un-minimizes and focuses the main window (used by the single-instance handler and the tray).
#[cfg(desktop)]
pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
