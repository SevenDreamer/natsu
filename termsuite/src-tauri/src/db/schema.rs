use rusqlite::Connection;

pub const SCHEMA: &str = r#"
-- Settings table for app configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    id,
    title,
    content,
    content='notes',
    content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, id, title, content)
    VALUES (new.rowid, new.id, new.title, '');
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, id, title, content)
    VALUES ('delete', old.rowid, old.id, old.title, '');
END;

-- Backlinks table
CREATE TABLE IF NOT EXISTS backlinks (
    source_note_id TEXT NOT NULL,
    target_note_id TEXT,
    link_text TEXT NOT NULL,
    is_broken INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (source_note_id, link_text)
);

CREATE INDEX IF NOT EXISTS idx_backlinks_target ON backlinks(target_note_id);
CREATE INDEX IF NOT EXISTS idx_backlinks_source ON backlinks(source_note_id);
"#;

pub fn init(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(SCHEMA).map_err(|e| e.to_string())?;
    Ok(())
}
