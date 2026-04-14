use std::sync::Arc;
use tauri::State;
use rusqlite::Connection;
use uuid::Uuid;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::file_watcher::{FileWatcher, FileEvent, CreateFileWatcherInput, FileInfo, FileWatcherService};
use crate::models::Script;

type DbState = Arc<std::sync::Mutex<Connection>>;
type WatcherServiceState = Arc<Mutex<FileWatcherService>>;

/// List all file watchers
#[tauri::command]
pub fn list_file_watchers(conn: State<DbState>) -> Result<Vec<FileWatcher>, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(
            "SELECT id, name, path, recursive, event_types, enabled, trigger_script_id, created_at
             FROM file_watchers ORDER BY name ASC"
        )
        .map_err(|e| e.to_string())?;

    let watchers = stmt
        .query_map([], |row| {
            Ok(FileWatcher {
                id: row.get(0)?,
                name: row.get(1)?,
                path: row.get(2)?,
                recursive: row.get::<_, i32>(3)? != 0,
                event_types: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
                enabled: row.get::<_, i32>(5)? != 0,
                trigger_script_id: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(watchers)
}

/// Create a new file watcher
#[tauri::command]
pub fn create_file_watcher(
    input: CreateFileWatcherInput,
    conn: State<DbState>,
    service: State<WatcherServiceState>,
    app_handle: tauri::AppHandle,
) -> Result<FileWatcher, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let recursive = input.recursive.unwrap_or(true);
    let event_types = input.event_types.unwrap_or_else(|| vec!["any".to_string()]);
    let event_types_json = serde_json::to_string(&event_types).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO file_watchers (id, name, path, recursive, event_types, enabled, trigger_script_id, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
        rusqlite::params![
            &id,
            &input.name,
            &input.path,
            recursive as i32,
            &event_types_json,
            &input.trigger_script_id,
            now,
        ],
    )
    .map_err(|e| format!("Failed to insert watcher: {}", e))?;

    // Start watching
    let mut svc = service.lock().map_err(|e| e.to_string())?;
    svc.start_watcher(id.clone(), input.path.clone(), recursive, event_types.clone(), app_handle)?;

    Ok(FileWatcher {
        id,
        name: input.name,
        path: input.path,
        recursive,
        event_types,
        enabled: true,
        trigger_script_id: input.trigger_script_id,
        created_at: now,
    })
}

/// Update file watcher (mainly enable/disable)
#[tauri::command]
pub fn update_file_watcher(
    id: String,
    enabled: Option<bool>,
    conn: State<DbState>,
    service: State<WatcherServiceState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    if let Some(is_enabled) = enabled {
        let enabled_int = if is_enabled { 1 } else { 0 };
        db.execute(
            "UPDATE file_watchers SET enabled = ? WHERE id = ?",
            rusqlite::params![enabled_int, &id],
        )
        .map_err(|e| format!("Failed to update watcher: {}", e))?;

        // Start or stop watching
        if is_enabled {
            // Get watcher details
            let watcher = db.query_row(
                "SELECT path, recursive, event_types FROM file_watchers WHERE id = ?",
                [&id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, i32>(1)? != 0,
                        row.get::<_, String>(2)?,
                    ))
                },
            ).map_err(|e| format!("Watcher not found: {}", e))?;

            let event_types: Vec<String> = serde_json::from_str(&watcher.2).unwrap_or_default();
            let mut svc = service.lock().map_err(|e| e.to_string())?;
            svc.start_watcher(id, watcher.0, watcher.1, event_types, app_handle)?;
        } else {
            let mut svc = service.lock().map_err(|e| e.to_string())?;
            svc.stop_watcher(&id)?;
        }
    }

    Ok(())
}

/// Delete a file watcher
#[tauri::command]
pub fn delete_file_watcher(
    id: String,
    conn: State<DbState>,
    service: State<WatcherServiceState>,
) -> Result<(), String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    // Stop watching
    let mut svc = service.lock().map_err(|e| e.to_string())?;
    svc.stop_watcher(&id)?;

    // Delete events
    db.execute("DELETE FROM file_events WHERE watcher_id = ?", [&id])
        .map_err(|e| format!("Failed to delete events: {}", e))?;

    // Delete watcher
    db.execute("DELETE FROM file_watchers WHERE id = ?", [&id])
        .map_err(|e| format!("Failed to delete watcher: {}", e))?;

    Ok(())
}

/// Get file events
#[tauri::command]
pub fn get_file_events(
    watcher_id: Option<String>,
    limit: Option<usize>,
    conn: State<DbState>,
) -> Result<Vec<FileEvent>, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);

    let events = if let Some(wid) = watcher_id {
        let mut stmt = db
            .prepare(
                "SELECT id, watcher_id, event_type, path, details, timestamp
                 FROM file_events WHERE watcher_id = ?
                 ORDER BY timestamp DESC LIMIT ?"
            )
            .map_err(|e| e.to_string())?;

        stmt.query_map(rusqlite::params![&wid, limit as i32], |row| {
            Ok(FileEvent {
                id: row.get(0)?,
                watcher_id: row.get(1)?,
                event_type: row.get(2)?,
                path: row.get(3)?,
                details: row.get(4)?,
                timestamp: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    } else {
        let mut stmt = db
            .prepare(
                "SELECT id, watcher_id, event_type, path, details, timestamp
                 FROM file_events ORDER BY timestamp DESC LIMIT ?"
            )
            .map_err(|e| e.to_string())?;

        stmt.query_map([limit as i32], |row| {
            Ok(FileEvent {
                id: row.get(0)?,
                watcher_id: row.get(1)?,
                event_type: row.get(2)?,
                path: row.get(3)?,
                details: row.get(4)?,
                timestamp: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    };

    Ok(events)
}

/// Clear events for a watcher
#[tauri::command]
pub fn clear_file_events(
    watcher_id: Option<String>,
    conn: State<DbState>,
) -> Result<(), String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    if let Some(wid) = watcher_id {
        db.execute("DELETE FROM file_events WHERE watcher_id = ?", [&wid])
            .map_err(|e| format!("Failed to clear events: {}", e))?;
    } else {
        db.execute("DELETE FROM file_events", [])
            .map_err(|e| format!("Failed to clear events: {}", e))?;
    }

    Ok(())
}

// ============ File Operations ============

/// Copy a file
#[tauri::command]
pub fn file_copy(src: String, dest: String) -> Result<(), String> {
    fs::copy(&src, &dest)
        .map_err(|e| format!("Failed to copy file: {}", e))?;
    Ok(())
}

/// Move a file
#[tauri::command]
pub fn file_move(src: String, dest: String) -> Result<(), String> {
    fs::rename(&src, &dest)
        .map_err(|e| format!("Failed to move file: {}", e))?;
    Ok(())
}

/// Delete a file
#[tauri::command]
pub fn file_delete(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if p.is_dir() {
        fs::remove_dir_all(&p)
            .map_err(|e| format!("Failed to delete directory: {}", e))?;
    } else {
        fs::remove_file(&p)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    Ok(())
}

/// Rename a file
#[tauri::command]
pub fn file_rename(old: String, new: String) -> Result<(), String> {
    fs::rename(&old, &new)
        .map_err(|e| format!("Failed to rename file: {}", e))?;
    Ok(())
}

/// Check if a file exists
#[tauri::command]
pub fn file_exists(path: String) -> Result<bool, String> {
    Ok(PathBuf::from(&path).exists())
}

/// List directory contents
#[tauri::command]
pub fn file_list_dir(path: String) -> Result<Vec<FileInfo>, String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let entries = fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut files = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let meta = entry.metadata().ok();

        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
            size: meta.as_ref().ok().and_then(|m| m.len().into()),
            modified: meta.as_ref().ok().and_then(|m| {
                m.modified().ok().and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_secs() as i64)
                })
            }),
        });
    }

    // Sort: directories first, then by name
    files.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(files)
}

/// Record a file event (called by the watcher service)
pub fn record_file_event(event: &FileEvent, conn: &Connection) -> Result<(), String> {
    conn.execute(
        "INSERT INTO file_events (id, watcher_id, event_type, path, details, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            &event.id,
            &event.watcher_id,
            &event.event_type,
            &event.path,
            &event.details,
            event.timestamp,
        ],
    )
    .map_err(|e| format!("Failed to record event: {}", e))?;

    Ok(())
}

/// Get scripts for trigger dropdown
#[tauri::command]
pub fn get_scripts_for_trigger(conn: State<DbState>) -> Result<Vec<Script>, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(
            "SELECT id, name, description, script_path, interpreter, tags, parameters, created_at, updated_at
             FROM scripts ORDER BY name ASC"
        )
        .map_err(|e| e.to_string())?;

    let scripts = stmt
        .query_map([], |row| {
            Ok(Script {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                script_path: row.get(3)?,
                interpreter: row.get(4)?,
                tags: serde_json::from_str(&row.get::<_, String>(5)?).unwrap_or_default(),
                parameters: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(scripts)
}
