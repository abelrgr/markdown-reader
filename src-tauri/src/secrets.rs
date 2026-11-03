use crate::error::AppError;

const SERVICE: &str = "com.abelgallo.markdownreader";

fn entry(account: &str) -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(SERVICE, account).map_err(|error| AppError::Io(error.to_string()))
}

pub fn secret_get(account: &str) -> Result<Option<String>, AppError> {
    match entry(account)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(AppError::Io(error.to_string())),
    }
}

pub fn secret_set(account: &str, value: &str) -> Result<(), AppError> {
    entry(account)?
        .set_password(value)
        .map_err(|error| AppError::Io(error.to_string()))
}

pub fn secret_exists(account: &str) -> bool {
    entry(account)
        .and_then(|credential| {
            credential
                .get_password()
                .map(|_| ())
                .map_err(|error| AppError::Io(error.to_string()))
        })
        .is_ok()
}

pub fn secret_delete(account: &str) -> Result<(), AppError> {
    match entry(account)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(AppError::Io(error.to_string())),
    }
}
