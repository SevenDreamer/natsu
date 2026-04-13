use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;
use rusqlite::Connection;
use uuid::Uuid;
use chrono::Utc;

use crate::models::Note;

/// Create a new note
#[tauri::command]
pub async fn create_note(
    title: String,
    storage_path: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Note, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    // Sanitize title for filename
    let filename = sanitize_filename(&title);
    let path = format!("wiki/{}.md", filename);
    let full_path = PathBuf::from(&storage_path).join(&path);

    // Validate path is within storage root (security check T-01-01)
    let canonical_storage = PathBuf::from(&storage_path)
        .canonicalize()
        .map_err(|e| format!("Invalid storage path: {}", e))?;
    let canonical_full = full_path
        .canonicalize()
        .unwrap_or_else(|_| full_path.clone());

    if !canonical_full.starts_with(&canonical_storage) && full_path.exists() {
        return Err("Invalid path: must be within storage root".to_string());
    }

    // Create directory if needed
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Create empty markdown file
    fs::write(&full_path, "").map_err(|e| e.to_string())?;

    let note = Note {
        id: id.clone(),
        title: title.clone(),
        content: String::new(),
        path: path.clone(),
        created_at: now,
        updated_at: now,
    };

    // Insert into database
    let conn = db.lock().unwrap();
    conn.execute(
        "INSERT INTO notes (id, title, path, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&note.id, &note.title, &note.path, note.created_at, note.updated_at],
    ).map_err(|e| e.to_string())?;

    Ok(note)
}

/// Get a note by ID
#[tauri::command]
pub async fn get_note(
    id: String,
    storage_path: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Note, String> {
    let conn = db.lock().unwrap();
    let path: String = conn.query_row(
        "SELECT path FROM notes WHERE id = ?1",
        rusqlite::params![&id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let full_path = PathBuf::from(&storage_path).join(&path);
    let content = fs::read_to_string(&full_path).map_err(|e| e.to_string())?;

    let note = conn.query_row(
        "SELECT id, title, path, created_at, updated_at FROM notes WHERE id = ?1",
        rusqlite::params![&id],
        |row| Ok(Note {
            id: row.get(0)?,
            title: row.get(1)?,
            path: row.get(2)?,
            content: content.clone(),
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(note)
}

/// Save note content
#[tauri::command]
pub async fn save_note(
    id: String,
    content: String,
    storage_path: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let now = Utc::now().timestamp();

    // Get note path from database
    let conn = db.lock().unwrap();
    let path: String = conn.query_row(
        "SELECT path FROM notes WHERE id = ?1",
        rusqlite::params![&id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    // Write content to file
    let full_path = PathBuf::from(&storage_path).join(&path);
    fs::write(&full_path, &content).map_err(|e| e.to_string())?;

    // Update FTS index
    conn.execute(
        "UPDATE notes_fts SET content = ?1 WHERE id = ?2",
        rusqlite::params![&content, &id],
    ).map_err(|e| e.to_string())?;

    // Update timestamp
    conn.execute(
        "UPDATE notes SET updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, &id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// List all notes
#[tauri::command]
pub async fn list_notes(db: State<'_, Mutex<Connection>>) -> Result<Vec<Note>, String> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, title, path, created_at, updated_at FROM notes ORDER BY updated_at DESC"
    ).map_err(|e| e.to_string())?;

    let notes = stmt.query_map([], |row| {
        Ok(Note {
            id: row.get(0)?,
            title: row.get(1)?,
            path: row.get(2)?,
            content: String::new(),
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(notes)
}

/// Delete a note
#[tauri::command]
pub async fn delete_note(
    id: String,
    storage_path: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().unwrap();

    // Get note path
    let path: String = conn.query_row(
        "SELECT path FROM notes WHERE id = ?1",
        rusqlite::params![&id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    // Delete file
    let full_path = PathBuf::from(&storage_path).join(&path);
    fs::remove_file(&full_path).map_err(|e| e.to_string())?;

    // Delete from database (FTS trigger handles cleanup)
    conn.execute(
        "DELETE FROM notes WHERE id = ?1",
        rusqlite::params![&id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Sanitize title for use as filename
fn sanitize_filename(title: &str) -> String {
    title
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_lowercase()
}
