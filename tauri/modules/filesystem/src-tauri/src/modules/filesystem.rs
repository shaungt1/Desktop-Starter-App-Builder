//! File access module: native open/save dialogs (dialog plugin, called from
//! Rust) and reading or writing only the files the user picked during this
//! session. The interface gets no general file-system permission.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime, State};
use tauri_plugin_dialog::DialogExt;

use crate::error::{AppError, AppResult};

/// Largest text file the interface may open in one call.
const MAX_TEXT_BYTES: u64 = 5 * 1024 * 1024;

#[derive(Default)]
pub struct GrantedFiles(Mutex<HashSet<PathBuf>>);

impl GrantedFiles {
    fn grant(&self, path: &Path) -> AppResult<PathBuf> {
        let absolute = std::path::absolute(path)?;
        self.0.lock().map_err(|e| AppError::Other(e.to_string()))?.insert(absolute.clone());
        Ok(absolute)
    }

    fn check(&self, path: &Path) -> AppResult<PathBuf> {
        let absolute = std::path::absolute(path)?;
        let granted = self.0.lock().map_err(|e| AppError::Other(e.to_string()))?.contains(&absolute);
        if granted {
            Ok(absolute)
        } else {
            Err(AppError::Invalid("This file was not chosen in a dialog during this session.".into()))
        }
    }
}

#[derive(Serialize)]
pub struct OpenedFile {
    path: String,
    name: String,
    content: String,
}

#[derive(Serialize)]
pub struct SavedFile {
    path: String,
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRequest {
    path: Option<String>,
    suggested_name: Option<String>,
    content: String,
}

fn file_name(path: &Path) -> String {
    path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default()
}

#[tauri::command]
pub async fn fs_open_text_file<R: Runtime>(app: AppHandle<R>, grants: State<'_, GrantedFiles>) -> AppResult<Option<OpenedFile>> {
    let mut dialog = app
        .dialog()
        .file()
        .add_filter("Text", &["txt", "md", "json", "csv", "log"])
        .add_filter("All files", &["*"]);
    if let Some(window) = app.get_webview_window(crate::window::MAIN_WINDOW) {
        dialog = dialog.set_parent(&window);
    }
    let Some(chosen) = dialog.blocking_pick_file() else { return Ok(None) };
    let path = chosen.into_path().map_err(|e| AppError::Other(e.to_string()))?;
    let path = grants.grant(&path)?;
    if std::fs::metadata(&path)?.len() > MAX_TEXT_BYTES {
        return Err(AppError::Invalid("File is larger than 5 MB.".into()));
    }
    let content = std::fs::read_to_string(&path)?;
    Ok(Some(OpenedFile { name: file_name(&path), path: path.to_string_lossy().into_owned(), content }))
}

#[tauri::command]
pub async fn fs_save_text_file<R: Runtime>(
    app: AppHandle<R>,
    grants: State<'_, GrantedFiles>,
    request: SaveRequest,
) -> AppResult<Option<SavedFile>> {
    let path = match &request.path {
        Some(existing) => grants.check(Path::new(existing))?,
        None => {
            let mut dialog = app
                .dialog()
                .file()
                .set_file_name(request.suggested_name.clone().unwrap_or_else(|| "untitled.txt".into()));
            if let Some(window) = app.get_webview_window(crate::window::MAIN_WINDOW) {
                dialog = dialog.set_parent(&window);
            }
            let Some(chosen) = dialog.blocking_save_file() else { return Ok(None) };
            grants.grant(&chosen.into_path().map_err(|e| AppError::Other(e.to_string()))?)?
        }
    };
    std::fs::write(&path, request.content)?;
    Ok(Some(SavedFile { name: file_name(&path), path: path.to_string_lossy().into_owned() }))
}

pub fn register<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.plugin(tauri_plugin_dialog::init()).manage(GrantedFiles::default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_granted_files_are_usable() {
        let grants = GrantedFiles::default();
        let chosen = grants.grant(Path::new("notes/todo.txt")).expect("grant");
        assert_eq!(grants.check(Path::new("notes/todo.txt")).expect("granted"), chosen);
        assert!(grants.check(Path::new("secrets/id_rsa")).is_err());
    }
}
