use regex::Regex;
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::State;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

lazy_static::lazy_static! {
    // Match [[link-text]] and [[link-text|display-text]]
    // Using Unicode-aware pattern for Chinese support (D-11)
    static ref WIKI_LINK_REGEX: Regex =
        Regex::new(r"\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]").unwrap();
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WikiLink {
    pub link_text: String,
    pub target_note_id: Option<String>,
    pub is_broken: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Backlink {
    pub source_note_id: String,
    pub source_title: String,
    pub link_text: String,
}

/// Extract wiki-links from note content
pub fn extract_wiki_links(content: &str) -> HashSet<String> {
    WIKI_LINK_REGEX
        .captures_iter(content)
        .filter_map(|cap| cap.get(1).map(|m| m.as_str().trim().to_string()))
        .collect()
}

/// Resolve link text to note ID
fn resolve_link_to_note_id(
    link_text: &str,
    case_insensitive: bool,
    conn: &Connection,
) -> Option<String> {
    let sql = if case_insensitive {
        "SELECT id FROM notes WHERE title = ? COLLATE NOCASE"
    } else {
        "SELECT id FROM notes WHERE title = ?"
    };

    conn.query_row(sql, rusqlite::params![link_text], |row| row.get(0)).ok()
}

/// Update note links and backlinks
#[tauri::command]
pub async fn update_note_links(
    note_id: String,
    content: String,
    case_insensitive: bool,
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<WikiLink>, String> {
    let links = extract_wiki_links(&content);
    let conn = db.lock().unwrap();

    // Remove old backlinks for this note
    conn.execute(
        "DELETE FROM backlinks WHERE source_note_id = ?1",
        rusqlite::params![&note_id],
    ).map_err(|e| e.to_string())?;

    let mut result = Vec::new();

    for link_text in links {
        let target_id = resolve_link_to_note_id(&link_text, case_insensitive, &conn);
        let is_broken = target_id.is_none();

        conn.execute(
            "INSERT OR REPLACE INTO backlinks (source_note_id, target_note_id, link_text, is_broken) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![&note_id, &target_id, &link_text, is_broken as i32],
        ).map_err(|e| e.to_string())?;

        result.push(WikiLink {
            link_text,
            target_note_id: target_id,
            is_broken,
        });
    }

    Ok(result)
}

/// Get backlinks for a note
#[tauri::command]
pub async fn get_backlinks(
    note_id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<Backlink>, String> {
    let conn = db.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT b.source_note_id, n.title, b.link_text
         FROM backlinks b
         LEFT JOIN notes n ON b.source_note_id = n.id
         WHERE b.target_note_id = ?1
         ORDER BY n.updated_at DESC"
    ).map_err(|e| e.to_string())?;

    let backlinks = stmt.query_map(rusqlite::params![&note_id], |row| {
        Ok(Backlink {
            source_note_id: row.get(0)?,
            source_title: row.get(1)?,
            link_text: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(backlinks)
}

/// Get outlinks for a note
#[tauri::command]
pub async fn get_outlinks(
    note_id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<WikiLink>, String> {
    let conn = db.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT link_text, target_note_id, is_broken
         FROM backlinks
         WHERE source_note_id = ?1"
    ).map_err(|e| e.to_string())?;

    let links = stmt.query_map(rusqlite::params![&note_id], |row| {
        Ok(WikiLink {
            link_text: row.get(0)?,
            target_note_id: row.get(1)?,
            is_broken: row.get::<_, i64>(2)? != 0,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(links)
}

/// Search notes by title for autocomplete
#[tauri::command]
pub async fn search_notes_by_title(
    query: String,
    case_insensitive: bool,
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<(String, String)>, String> {
    let conn = db.lock().unwrap();
    let pattern = format!("%{}%", query);

    let sql = if case_insensitive {
        "SELECT id, title FROM notes WHERE title LIKE ? COLLATE NOCASE ORDER BY title LIMIT 20"
    } else {
        "SELECT id, title FROM notes WHERE title LIKE ? ORDER BY title LIMIT 20"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let results = stmt.query_map(rusqlite::params![&pattern], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(results)
}
