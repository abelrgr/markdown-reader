use crate::documents::{decode_text, is_markdown_path};
use crate::error::AppError;
use crate::folders::MAX_FOLDER_FILES;
use ignore::WalkBuilder;
use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub path: String,
    pub rel_path: String,
    pub line: u32,
    pub column: u32,
    pub preview: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResults {
    pub hits: Vec<SearchHit>,
    pub truncated: bool,
}

pub fn search_markdown(
    root: &Path,
    query: &str,
    case_sensitive: bool,
    max: usize,
) -> Result<SearchResults, AppError> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(SearchResults {
            hits: Vec::new(),
            truncated: false,
        });
    }
    let canonical_root = dunce::canonicalize(root).map_err(AppError::from)?;
    if !canonical_root.is_dir() {
        return Err(AppError::Io("Folder path is not a directory".into()));
    }

    let needle = if case_sensitive {
        query.to_owned()
    } else {
        query.to_lowercase()
    };
    let mut hits = Vec::new();
    let mut truncated = false;
    let mut files_seen = 0usize;
    for result in WalkBuilder::new(&canonical_root)
        .hidden(true)
        .git_ignore(true)
        .git_global(false)
        .git_exclude(true)
        .require_git(false)
        .sort_by_file_name(|left, right| left.cmp(right))
        .build()
    {
        let entry = match result {
            Ok(entry) => entry,
            Err(error) => {
                log::warn!("Skipping unreadable search entry: {error}");
                continue;
            }
        };
        let path = entry.path();
        if !path.is_file() || !is_markdown_path(path) {
            continue;
        }
        files_seen += 1;
        if files_seen > MAX_FOLDER_FILES {
            truncated = true;
            break;
        }
        let bytes = match fs::read(path) {
            Ok(bytes) => bytes,
            Err(error) => {
                log::warn!(
                    "Skipping unreadable search file {}: {error}",
                    path.display()
                );
                continue;
            }
        };
        let (content, _) = decode_text(&bytes);
        let relative = match path.strip_prefix(&canonical_root) {
            Ok(relative) => relative
                .components()
                .map(|component| component.as_os_str().to_string_lossy())
                .collect::<Vec<_>>()
                .join("/"),
            Err(_) => continue,
        };
        for (line_index, line) in content.lines().enumerate() {
            let haystack = if case_sensitive {
                line.to_owned()
            } else {
                line.to_lowercase()
            };
            let Some(byte_column) = haystack.find(&needle) else {
                continue;
            };
            if hits.len() >= max {
                truncated = true;
                break;
            }
            let column = line[..byte_column.min(line.len())].chars().count() as u32 + 1;
            let chars = line.chars().collect::<Vec<_>>();
            let start = column.saturating_sub(41) as usize;
            let end = (start + 200).min(chars.len());
            let mut preview = chars[start..end].iter().collect::<String>();
            if start > 0 {
                preview.insert(0, '…');
            }
            if end < chars.len() {
                preview.push('…');
            }
            hits.push(SearchHit {
                path: path.to_string_lossy().into_owned(),
                rel_path: relative.clone(),
                line: line_index as u32 + 1,
                column,
                preview,
            });
        }
        if truncated {
            break;
        }
    }
    Ok(SearchResults { hits, truncated })
}

#[tauri::command]
pub async fn search_folder(
    root: String,
    query: String,
    case_sensitive: bool,
) -> Result<SearchResults, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        search_markdown(Path::new(&root), &query, case_sensitive, 500)
    })
    .await
    .map_err(|error| AppError::Io(error.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::search_markdown;
    use std::fs;

    #[test]
    fn finds_lines_case_options_utf16_and_limits() {
        let temp = tempfile::tempdir().unwrap();
        fs::write(
            temp.path().join("a.md"),
            "one\n\nHola mundo\nthree\n\n\nHOLA mundo\n",
        )
        .unwrap();
        fs::write(
            temp.path().join("b.md"),
            [0xff, 0xfe, b'H', 0, b'o', 0, b'l', 0, b'a', 0],
        )
        .unwrap();
        let insensitive = search_markdown(temp.path(), "hola", false, 10).unwrap();
        assert_eq!(
            insensitive
                .hits
                .iter()
                .map(|hit| hit.line)
                .collect::<Vec<_>>(),
            [3, 7, 1]
        );
        assert_eq!(insensitive.hits[0].column, 1);
        assert_eq!(insensitive.hits[0].rel_path, "a.md");
        let sensitive = search_markdown(temp.path(), "HOLA", true, 10).unwrap();
        assert_eq!(sensitive.hits.len(), 1);
        let limited = search_markdown(temp.path(), "hola", false, 1).unwrap();
        assert_eq!(limited.hits.len(), 1);
        assert!(limited.truncated);
        assert!(search_markdown(temp.path(), "", false, 10)
            .unwrap()
            .hits
            .is_empty());
    }
}
