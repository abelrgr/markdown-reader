mod documents;
mod error;
mod folders;
mod search;
mod startup;

use documents::{open_document, paths_exist};
use folders::open_folder;
use search::search_folder;
use startup::{collect_paths, take_startup_paths, StartupPaths};
use std::path::Path;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

const MAX_PRINT_IMAGE_BYTES: u64 = 12 * 1024 * 1024;

fn print_image_mime(path: &std::path::Path) -> Option<&'static str> {
    match path.extension()?.to_str()?.to_ascii_lowercase().as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "gif" => Some("image/gif"),
        "webp" => Some("image/webp"),
        "bmp" => Some("image/bmp"),
        "avif" => Some("image/avif"),
        _ => None,
    }
}

#[tauri::command]
fn read_image_data_url(app: tauri::AppHandle, path: String) -> Result<String, error::AppError> {
    let path = dunce::canonicalize(path).map_err(error::AppError::from)?;
    if !app.asset_protocol_scope().is_allowed(&path) {
        return Err(error::AppError::Io(
            "Image path is outside the authorized document scope".into(),
        ));
    }
    let mime = print_image_mime(&path)
        .ok_or_else(|| error::AppError::Io("Unsupported image type for printing".into()))?;
    let metadata = std::fs::metadata(&path).map_err(error::AppError::from)?;
    if !metadata.is_file() || metadata.len() > MAX_PRINT_IMAGE_BYTES {
        return Err(error::AppError::Io(
            "Image is not a regular file or exceeds the print size limit".into(),
        ));
    }
    let bytes = std::fs::read(path).map_err(error::AppError::from)?;
    use base64::Engine;
    Ok(format!(
        "data:{mime};base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    ))
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), error::AppError> {
    if !std::path::Path::new(&path)
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("html"))
    {
        return Err(error::AppError::Io(
            "Only .html files can be written by this command".into(),
        ));
    }
    std::fs::write(path, content).map_err(error::AppError::from)
}

#[tauri::command]
fn print_document(webview: tauri::Webview) -> Result<(), error::AppError> {
    #[cfg(target_os = "macos")]
    let result = webview.print();
    #[cfg(not(target_os = "macos"))]
    let result = webview.eval("window.print()");
    result.map_err(|error| error::AppError::Io(error.to_string()))
}

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
            open_folder,
            search_folder,
            print_document,
            write_text_file,
            read_image_data_url,
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

#[cfg(test)]
mod print_image_tests {
    use super::print_image_mime;
    use std::path::Path;

    #[test]
    fn limits_print_inline_mime_types_to_raster_images() {
        assert_eq!(print_image_mime(Path::new("image.png")), Some("image/png"));
        assert_eq!(
            print_image_mime(Path::new("image.JPEG")),
            Some("image/jpeg")
        );
        assert_eq!(
            print_image_mime(Path::new("image.webp")),
            Some("image/webp")
        );
        assert_eq!(print_image_mime(Path::new("document.svg")), None);
        assert_eq!(print_image_mime(Path::new("secret.txt")), None);
    }
}
