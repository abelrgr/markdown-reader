use crate::documents::is_markdown_path;
use std::path::Path;
use std::sync::Mutex;

pub struct StartupPaths(pub Mutex<Vec<String>>);

pub fn collect_paths(args: impl IntoIterator<Item = String>, cwd: &Path) -> Vec<String> {
    args.into_iter()
        .filter(|argument| !argument.starts_with('-'))
        .map(|argument| {
            let path = Path::new(&argument);
            if path.is_absolute() {
                path.to_path_buf()
            } else {
                cwd.join(path)
            }
        })
        .filter(|path| path.exists() && is_markdown_path(path))
        .filter_map(|path| dunce::canonicalize(path).ok())
        .map(|path| path.to_string_lossy().into_owned())
        .collect()
}

#[tauri::command]
pub fn take_startup_paths(paths: tauri::State<'_, StartupPaths>) -> Vec<String> {
    paths
        .0
        .lock()
        .map(|mut paths| std::mem::take(&mut *paths))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::collect_paths;
    use std::path::Path;

    #[test]
    fn collects_existing_markdown_args_relative_to_cwd() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("nota uno.md"), "# x").unwrap();
        std::fs::write(dir.path().join("prog.exe"), "x").unwrap();
        let output = collect_paths(
            [
                "nota uno.md".into(),
                "prog.exe".into(),
                "falta.md".into(),
                "--flag".into(),
            ],
            dir.path(),
        );
        assert_eq!(output.len(), 1);
        assert!(output[0].ends_with("nota uno.md"));
        assert!(Path::new(&output[0]).is_absolute());
    }
}
