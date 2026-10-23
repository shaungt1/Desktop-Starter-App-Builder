//! Background module: tray icon, start at login (autostart plugin) and an
//! async task that keeps running while the window is hidden. Closing the
//! window hides it; "Quit" in the tray menu exits.
//!
//! Replace the heartbeat loop in `setup` with real work (sync, indexing, an
//! agent loop) and stream progress to the interface with events or a Channel.

use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use serde::Serialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, Runtime, State, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

use crate::app_config::app_config;
use crate::error::{AppError, AppResult};
use crate::window::{MAIN_WINDOW, show_main};

const HEARTBEAT: Duration = Duration::from_secs(10);
/// Event the interface can listen to with `listen("background://heartbeat", ...)`.
pub const HEARTBEAT_EVENT: &str = "background://heartbeat";

#[derive(Default)]
pub struct Heartbeats(Arc<AtomicU64>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundStatus {
    worker_running: bool,
    heartbeats: u64,
    launch_at_login: Option<bool>,
}

#[tauri::command]
pub fn background_status<R: Runtime>(app: AppHandle<R>, heartbeats: State<'_, Heartbeats>) -> BackgroundStatus {
    BackgroundStatus {
        worker_running: true,
        heartbeats: heartbeats.0.load(Ordering::Relaxed),
        launch_at_login: app.autolaunch().is_enabled().ok(),
    }
}

#[tauri::command]
pub fn background_set_launch_at_login<R: Runtime>(app: AppHandle<R>, enabled: bool) -> AppResult<bool> {
    let manager = app.autolaunch();
    let result = if enabled { manager.enable() } else { manager.disable() };
    result.map_err(|error| AppError::Other(error.to_string()))?;
    manager.is_enabled().map_err(|error| AppError::Other(error.to_string()))
}

pub fn register<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(Heartbeats::default())
}

pub fn setup<R: Runtime>(app: &mut tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let open = MenuItem::with_id(app, "open", format!("Open {}", app_config().name), true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &PredefinedMenuItem::separator(app)?, &quit])?;

    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip(&app_config().name)
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;

    // Closing the window hides it instead of quitting.
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let hidden = window.clone();
        window.on_window_event(move |event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = hidden.hide();
            }
        });
    }

    let counter = app.state::<Heartbeats>().0.clone();
    let handle = app.handle().clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(HEARTBEAT).await;
            let ticks = counter.fetch_add(1, Ordering::Relaxed) + 1;
            let _ = handle.emit(HEARTBEAT_EVENT, ticks);
        }
    });
    Ok(())
}
