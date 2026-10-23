//! Application entry point: core plugins, enabled modules, the main window
//! and the command handler.

mod app_config;
mod commands;
mod error;
mod modules;
mod window;

pub use app_config::{app_config, module_option, module_option_str};
pub use error::{AppError, AppResult};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Must be registered first: a second launch (for example from a deep link)
    // forwards its arguments here and exits; the deep-link feature re-emits the URL.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        window::show_main(app);
    }));

    let builder = builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_window_state::Builder::new().build());

    modules::register(builder)
        .setup(|app| {
            // Registers the URL scheme at run time on Windows and Linux so deep links
            // work during development (installers register it permanently).
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                if let Err(error) = app.deep_link().register_all() {
                    log::warn!("deep link registration failed: {error}");
                }
            }
            window::create_main(app.handle())?;
            modules::setup(app)?;
            log::info!("{} started ({} profile)", app_config().name, app_config().profile);
            Ok(())
        })
        .invoke_handler(modules::handler())
        .run(tauri::generate_context!())
        .expect("error while running the application");
}
