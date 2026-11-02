use crate::error::AppError;
use serde::Serialize;
use std::path::{Path, PathBuf};

pub const MAX_FILE_BYTES: u64 = 20 * 1024 * 1024;
pub const MARKDOWN_EXTENSIONS: &[&str] = &[
    "md", "mkd", "mdwn", "mdown", "mdtxt", "mdtext", "markdown", "text", "txt",
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedDocument {
    pub path: String,
    pub name: String,
    pub dir: String,
    pub content: String,
    pub modified_ms: u64,
    pub encoding: String,
}

pub fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            MARKDOWN_EXTENSIONS
                .iter()
                .any(|allowed| extension.eq_ignore_ascii_case(allowed))
        })
}

pub fn decode_text(bytes: &[u8]) -> (String, &'static str) {
    if let Some(content) = bytes.strip_prefix(b"\xEF\xBB\xBF") {
        return (String::from_utf8_lossy(content).into_owned(), "utf-8-bom");
    }
    if let Some(content) = bytes.strip_prefix(b"\xFF\xFE") {
        let units = content
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]));
        return (
            char::decode_utf16(units)
                .map(|c| c.unwrap_or(char::REPLACEMENT_CHARACTER))
                .collect(),
            "utf-16le",
        );
    }
    if let Some(content) = bytes.strip_prefix(b"\xFE\xFF") {
        let units = content
            .chunks_exact(2)
            .map(|pair| u16::from_be_bytes([pair[0], pair[1]]));
        return (
            char::decode_utf16(units)
                .map(|c| c.unwrap_or(char::REPLACEMENT_CHARACTER))
                .collect(),
            "utf-16be",
        );
    }
    match std::str::from_utf8(bytes) {
        Ok(content) => (content.to_owned(), "utf-8"),
        Err(_) => {
            let (content, _, _) = encoding_rs::WINDOWS_1252.decode(bytes);
            (content.into_owned(), "windows-1252")
        }
    }
}

pub fn read_document(path: &Path) -> Result<OpenedDocument, AppError> {
    if !is_markdown_path(path) {
        return Err(AppError::UnsupportedExtension(
            path.extension()
                .and_then(|extension| extension.to_str())
                .unwrap_or_default()
                .to_owned(),
        ));
    }

    let canonical = dunce::canonicalize(path).map_err(AppError::from)?;
    let metadata = std::fs::metadata(&canonical).map_err(AppError::from)?;
    if metadata.len() > MAX_FILE_BYTES {
        return Err(AppError::TooLarge {
            size: metadata.len(),
            max: MAX_FILE_BYTES,
        });
    }
    let bytes = std::fs::read(&canonical).map_err(AppError::from)?;
    let (content, encoding) = decode_text(&bytes);
    let modified_ms = metadata
        .modified()
        .map_err(AppError::from)?
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let name = canonical
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_owned();
    let dir: PathBuf = canonical
        .parent()
        .ok_or_else(|| AppError::Io("Document has no parent directory".into()))?
        .to_path_buf();

    Ok(OpenedDocument {
        path: canonical.to_string_lossy().into_owned(),
        name,
        dir: dir.to_string_lossy().into_owned(),
        content,
        modified_ms,
        encoding: encoding.to_owned(),
    })
}

#[tauri::command]
pub fn open_document(app: tauri::AppHandle, path: String) -> Result<OpenedDocument, AppError> {
    use tauri::Manager;
    use tauri_plugin_fs::FsExt;

    let document = read_document(Path::new(&path))?;
    let dir = Path::new(&document.dir);
    app.asset_protocol_scope()
        .allow_directory(dir, true)
        .map_err(|error| AppError::Io(error.to_string()))?;
    app.fs_scope()
        .allow_directory(dir, false)
        .map_err(|error| AppError::Io(error.to_string()))?;
    Ok(document)
}

#[tauri::command]
pub fn paths_exist(paths: Vec<String>) -> Vec<bool> {
    paths.iter().map(|path| Path::new(path).exists()).collect()
}

#[cfg(test)]
mod tests {
    use super::{decode_text, is_markdown_path, read_document};
    use crate::error::AppError;
    use std::path::Path;

    #[test]
    fn accepts_markdown_extensions_case_insensitive() {
        for path in ["a.md", "B.MD", "c.Markdown", "d.txt", "e.mdown", "f.text"] {
            assert!(is_markdown_path(Path::new(path)), "{path}");
        }
        for path in ["a.exe", "b", "c.md.exe", "d.html"] {
            assert!(!is_markdown_path(Path::new(path)), "{path}");
        }
    }

    #[test]
    fn decodes_utf8() {
        assert_eq!(decode_text("ñandú".as_bytes()), ("ñandú".into(), "utf-8"));
    }

    #[test]
    fn strips_utf8_bom() {
        assert_eq!(
            decode_text(b"\xEF\xBB\xBF# Hola"),
            ("# Hola".into(), "utf-8-bom")
        );
    }

    #[test]
    fn decodes_utf16le_bom() {
        let mut bytes = vec![0xFF, 0xFE];
        for unit in "Introducción".encode_utf16() {
            bytes.extend_from_slice(&unit.to_le_bytes());
        }
        assert_eq!(decode_text(&bytes), ("Introducción".into(), "utf-16le"));
    }

    #[test]
    fn decodes_utf16be_bom() {
        let mut bytes = vec![0xFE, 0xFF];
        for unit in "año".encode_utf16() {
            bytes.extend_from_slice(&unit.to_be_bytes());
        }
        assert_eq!(decode_text(&bytes), ("año".into(), "utf-16be"));
    }

    #[test]
    fn falls_back_to_windows_1252() {
        assert_eq!(
            decode_text(b"Espa\xF1a caf\xE9"),
            ("España café".into(), "windows-1252")
        );
    }

    #[test]
    fn read_document_errors() {
        let dir = tempfile::tempdir().unwrap();
        assert!(matches!(
            read_document(&dir.path().join("no.md")),
            Err(AppError::NotFound(_))
        ));
        let executable = dir.path().join("a.exe");
        std::fs::write(&executable, "x").unwrap();
        assert!(matches!(
            read_document(&executable),
            Err(AppError::UnsupportedExtension(_))
        ));
        let big = dir.path().join("big.md");
        std::fs::File::create(&big)
            .unwrap()
            .set_len(20 * 1024 * 1024 + 1)
            .unwrap();
        assert!(matches!(
            read_document(&big),
            Err(AppError::TooLarge { .. })
        ));
    }

    #[test]
    fn read_document_ok() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("Introducción.md");
        std::fs::write(&path, "# Hola").unwrap();
        let document = read_document(&path).unwrap();
        assert_eq!(document.name, "Introducción.md");
        assert_eq!(document.content, "# Hola");
        assert_eq!(document.encoding, "utf-8");
        assert!(document.modified_ms > 0);
    }
}
