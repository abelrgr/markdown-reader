use crate::documents::is_markdown_path;
use crate::error::AppError;
use ignore::WalkBuilder;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

pub const MAX_FOLDER_FILES: usize = 20_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub rel_path: String,
    pub name: String,
    pub modified_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderListing {
    pub root: String,
    pub entries: Vec<FileEntry>,
    pub truncated: bool,
}

pub fn list_markdown(root: &Path, max: usize) -> Result<FolderListing, AppError> {
    let canonical_root = dunce::canonicalize(root).map_err(AppError::from)?;
    if !canonical_root.is_dir() {
        return Err(AppError::Io("Folder path is not a directory".into()));
    }

    let mut entries = Vec::new();
    let mut truncated = false;
    for result in WalkBuilder::new(&canonical_root)
        .hidden(true)
        .git_ignore(true)
        .git_global(false)
        .git_exclude(true)
        .require_git(false)
        .build()
    {
        let entry = match result {
            Ok(entry) => entry,
            Err(error) => {
                log::warn!("Skipping unreadable folder entry: {error}");
                continue;
            }
        };
        let path = entry.path();
        if path == canonical_root || !path.is_file() || !is_markdown_path(path) {
            continue;
        }
        if entries.len() >= max {
            truncated = true;
            break;
        }
        let relative = match path.strip_prefix(&canonical_root) {
            Ok(relative) => relative,
            Err(_) => continue,
        };
        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(error) => {
                log::warn!(
                    "Skipping unreadable Markdown file {}: {error}",
                    path.display()
                );
                continue;
            }
        };
        let modified_ms = metadata
            .modified()
            .ok()
            .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or_default();
        let rel_path = relative
            .components()
            .map(|component| component.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/");
        let name = path
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        entries.push(FileEntry {
            path: path.to_string_lossy().into_owned(),
            rel_path,
            name,
            modified_ms,
        });
    }

    Ok(FolderListing {
        root: canonical_root.to_string_lossy().into_owned(),
        entries,
        truncated,
    })
}

#[tauri::command]
pub fn open_folder(app: tauri::AppHandle, path: String) -> Result<FolderListing, AppError> {
    use tauri::Manager;
    use tauri_plugin_fs::FsExt;

    let listing = list_markdown(Path::new(&path), MAX_FOLDER_FILES)?;
    let root = PathBuf::from(&listing.root);
    app.asset_protocol_scope()
        .allow_directory(&root, true)
        .map_err(|error| AppError::Io(error.to_string()))?;
    app.fs_scope()
        .allow_directory(&root, true)
        .map_err(|error| AppError::Io(error.to_string()))?;
    Ok(listing)
}

#[cfg(test)]
mod tests {
    use super::list_markdown;
    use crate::error::AppError;
    use std::fs;
    use std::path::Path;

    fn make_tree() -> tempfile::TempDir {
        let temp = tempfile::tempdir().expect("temp folder");
        fs::create_dir_all(temp.path().join("sub")).unwrap();
        fs::create_dir_all(temp.path().join(".oculta")).unwrap();
        fs::create_dir_all(temp.path().join("node_modules")).unwrap();
        fs::write(temp.path().join(".gitignore"), "node_modules/\n").unwrap();
        fs::write(temp.path().join("a.md"), "# a").unwrap();
        fs::write(temp.path().join("sub/b.MD"), "# b").unwrap();
        fs::write(temp.path().join("sub/c.txt"), "# c").unwrap();
        fs::write(temp.path().join(".oculta/d.md"), "# hidden").unwrap();
        fs::write(temp.path().join("node_modules/e.md"), "# ignored").unwrap();
        fs::write(temp.path().join("img.png"), [0_u8, 1, 2]).unwrap();
        temp
    }

    #[test]
    fn lists_markdown_files_excluding_hidden_and_ignored_paths() {
        let temp = make_tree();
        let listing = list_markdown(temp.path(), 100).unwrap();
        let mut paths = listing
            .entries
            .iter()
            .map(|entry| entry.rel_path.as_str())
            .collect::<Vec<_>>();
        paths.sort_unstable();
        assert_eq!(paths, ["a.md", "sub/b.MD", "sub/c.txt"]);
        assert!(!listing.truncated);
        assert!(listing
            .entries
            .iter()
            .all(|entry| Path::new(&entry.path).is_absolute()));
        assert!(listing.entries.iter().all(|entry| entry.modified_ms > 0));
    }

    #[test]
    fn caps_the_number_of_returned_files_and_reports_truncation() {
        let temp = make_tree();
        let listing = list_markdown(temp.path(), 2).unwrap();
        assert_eq!(listing.entries.len(), 2);
        assert!(listing.truncated);
    }

    #[test]
    fn reports_nonexistent_folder() {
        let missing = std::env::temp_dir().join("markdown-reader-missing-folder-test");
        let result = list_markdown(&missing, 10);
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }
}
