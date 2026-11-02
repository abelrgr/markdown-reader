mod documents;
mod error;
mod startup;

use documents::{open_document, paths_exist};
use startup::{collect_paths, take_startup_paths, StartupPaths};
use std::path::Path;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(desktop)]
    let builder =
        tauri::Builder::default().plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let paths = collect_paths(argv.into_iter().skip(1), Path::new(&cwd));
            let _ = app.emit("open-paths", paths);
        }));

    #[cfg(not(desktop))]
    let builder = tauri::Builder::default();

    let app = builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: None,
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                ])
                .level(log::LevelFilter::Info)
                .max_file_size(5_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                .build(),
        )
        .setup(|app| {
            let cwd = std::env::current_dir()?;
            let paths = collect_paths(std::env::args().skip(1), &cwd);
            app.manage(StartupPaths(Mutex::new(paths)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_document,
            paths_exist,
            take_startup_paths
        ])
        .build(tauri::generate_context!())
        .expect("error while building Markdown Reader");

    app.run(|_app_handle, _event| {
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        if let tauri::RunEvent::Opened { urls } = _event {
            let args = urls
                .into_iter()
                .filter_map(|url| url.to_file_path().ok())
                .map(|path| path.to_string_lossy().into_owned());
            let paths = collect_paths(args, Path::new("/"));
            if let Some(state) = _app_handle.try_state::<StartupPaths>() {
                if let Ok(mut queue) = state.0.lock() {
                    queue.extend(paths.iter().cloned());
                }
            }
            let _ = _app_handle.emit("open-paths", paths);
        }
    });
}
