use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "code", content = "detail", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AppError {
    #[error("File not found: {0}")]
    NotFound(String),
    #[error("Unsupported file extension: {0}")]
    UnsupportedExtension(String),
    #[error("File is too large ({size} bytes; maximum {max} bytes)")]
    TooLarge { size: u64, max: u64 },
    #[error("I/O error: {0}")]
    Io(String),
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        if error.kind() == std::io::ErrorKind::NotFound {
            Self::NotFound(error.to_string())
        } else {
            Self::Io(error.to_string())
        }
    }
}
