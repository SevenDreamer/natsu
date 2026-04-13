use std::fs;
use std::path::PathBuf;
use tauri::State;
use std::sync::Mutex;
use rusqlite::Connection;

/// Opens native directory picker dialog
#[tauri::command]
pub async fn select_storage_path() -> Result<Option<String>, String> {
    // In Tauri, this would use tauri-plugin-dialog
    // For now, return None as this requires the dialog plugin to be properly configured
    // The frontend will handle this via the dialog API directly
    Ok(None)
}

/// Creates raw/, wiki/, outputs/ directories at selected path
#[tauri::command]
pub async fn init_storage(path: String) -> Result<(), String> {
    let storage_path = PathBuf::from(&path);

    // Validate path doesn't contain path traversal
    let path_str = storage_path.to_string_lossy();
    if path_str.contains("..") {
        return Err("Invalid path: path traversal not allowed".to_string());
    }

    // Create directory structure
    let dirs = ["raw", "wiki", "outputs"];
    for dir in dirs {
        let dir_path = storage_path.join(dir);
        fs::create_dir_all(&dir_path).map_err(|e| format!("Failed to create {}: {}", dir, e))?;
    }

    Ok(())
}

/// Returns persisted storage path from settings DB
#[tauri::command]
pub async fn get_storage_path(db: State<'_, Mutex<Connection>>) -> Result<Option<String>, String> {
    let conn = db.lock().unwrap();
    let result: Result<String, _> = conn.query_row(
        "SELECT value FROM settings WHERE key = 'storage_path'",
        [],
        |row| row.get(0),
    );

    match result {
        Ok(path) => Ok(Some(path)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Persists storage path to settings DB
#[tauri::command]
pub async fn set_storage_path(path: String, db: State<'_, Mutex<Connection>>) -> Result<(), String> {
    let conn = db.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('storage_path', ?1)",
        rusqlite::params![&path],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
