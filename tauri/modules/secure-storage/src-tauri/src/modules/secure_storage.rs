//! Secure storage module: secrets in the operating system's credential store
//! (Windows Credential Manager, macOS Keychain, Linux Secret Service) via the
//! `keyring` crate. Entries are named after the app identifier.
//!
//! The interface can store, check and delete a secret but never read one
//! back; Rust code reads secrets with `get_secret` (the sign-in module does).

use serde::Serialize;

use crate::app_config::app_config;
use crate::error::{AppError, AppResult};

fn validate_key(key: &str) -> AppResult<()> {
    let valid = !key.is_empty()
        && key.len() <= 128
        && key.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | ':' | '-'));
    if valid {
        Ok(())
    } else {
        Err(AppError::Invalid(
            "Secret keys use letters, digits, '.', '_', ':' or '-' (max 128 characters).".into(),
        ))
    }
}

fn entry(key: &str) -> AppResult<keyring::Entry> {
    validate_key(key)?;
    keyring::Entry::new(&app_config().app_id, key).map_err(|error| AppError::Other(error.to_string()))
}

pub fn get_secret(key: &str) -> AppResult<Option<String>> {
    match entry(key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(AppError::Other(error.to_string())),
    }
}

pub fn set_secret(key: &str, value: &str) -> AppResult<()> {
    entry(key)?
        .set_password(value)
        .map_err(|error| AppError::Other(error.to_string()))
}

pub fn delete_secret(key: &str) -> AppResult<bool> {
    match entry(key)?.delete_credential() {
        Ok(()) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(AppError::Other(error.to_string())),
    }
}

#[derive(Serialize)]
pub struct SecretStatus {
    available: bool,
    detail: Option<String>,
}

#[tauri::command]
pub fn secret_status() -> SecretStatus {
    match keyring::Entry::store_status() {
        Ok(()) => SecretStatus { available: true, detail: None },
        Err(error) => SecretStatus { available: false, detail: Some(error.to_string()) },
    }
}

#[tauri::command]
pub fn secret_has(key: String) -> AppResult<bool> {
    Ok(get_secret(&key)?.is_some())
}

#[tauri::command]
pub fn secret_set(key: String, value: String) -> AppResult<()> {
    if value.len() > 64_000 {
        return Err(AppError::Invalid("Secret is larger than 64 KB.".into()));
    }
    set_secret(&key, &value)
}

#[tauri::command]
pub fn secret_delete(key: String) -> AppResult<bool> {
    delete_secret(&key)
}

pub fn register<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder
}

#[cfg(test)]
mod tests {
    use super::validate_key;

    #[test]
    fn rejects_unsafe_keys() {
        assert!(validate_key("auth-oidc.tokens").is_ok());
        assert!(validate_key("../escape").is_err());
        assert!(validate_key("").is_err());
    }
}
