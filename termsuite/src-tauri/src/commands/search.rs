use std::sync::Mutex;
use tauri::State;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub note_id: String,
    pub title: String,
    pub snippet: String,
    pub rank: f64,
}

/// Search notes using FTS5
#[tauri::command]
pub async fn search_notes(
    query: String,
    limit: Option<i32>,
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<SearchResult>, String> {
    let conn = db.lock().unwrap();
    let limit = limit.unwrap_or(50);

    // Escape special FTS5 characters and build query
    let fts_query = escape_fts_query(&query);

    // Use FTS5 BM25 ranking for relevance
    // snippet() highlights matching text
    let sql = r#"
        SELECT
            n.id,
            n.title,
            snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
            bm25(notes_fts) as rank
        FROM notes_fts
        JOIN notes n ON notes_fts.id = n.id
        WHERE notes_fts MATCH ?
        ORDER BY rank
        LIMIT ?
    "#;

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let results = stmt.query_map(rusqlite::params![&fts_query, limit], |row| {
        Ok(SearchResult {
            note_id: row.get(0)?,
            title: row.get(1)?,
            snippet: row.get(2)?,
            rank: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(results)
}

/// Search notes by tag
#[tauri::command]
pub async fn search_notes_by_tag(
    tag: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<SearchResult>, String> {
    let conn = db.lock().unwrap();
    let fts_query = format!("\"#{}\"", tag);

    let sql = r#"
        SELECT
            n.id,
            n.title,
            snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
            bm25(notes_fts) as rank
        FROM notes_fts
        JOIN notes n ON notes_fts.id = n.id
        WHERE notes_fts MATCH ?
        ORDER BY rank
        LIMIT 50
    "#;

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let results = stmt.query_map(rusqlite::params![&fts_query], |row| {
        Ok(SearchResult {
            note_id: row.get(0)?,
            title: row.get(1)?,
            snippet: row.get(2)?,
            rank: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(results)
}

/// Escape special FTS5 characters in query
fn escape_fts_query(query: &str) -> String {
    // For simple queries, just wrap in quotes for phrase matching
    // For complex queries with operators, pass through
    if query.contains('"') || query.contains('*') || query.contains('^')
       || query.contains('(') || query.contains(')') {
        query.to_string()
    } else {
        format!("\"{}\"", query)
    }
}
