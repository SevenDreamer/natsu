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

-- Related notes cache (optional, for performance)
CREATE TABLE IF NOT EXISTS related_notes (
    source_note_id TEXT NOT NULL,
    related_note_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    score REAL NOT NULL,
    computed_at INTEGER NOT NULL,
    PRIMARY KEY (source_note_id, related_note_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_related_source ON related_notes(source_note_id);
CREATE INDEX IF NOT EXISTS idx_related_score ON related_notes(score DESC);

-- Note directories for proximity analysis
CREATE TABLE IF NOT EXISTS note_directories (
    note_id TEXT PRIMARY KEY,
    directory TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_note_directories ON note_directories(directory);

-- Conversations table for AI chat history
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- Messages table for AI conversation messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- Command history for automation
CREATE TABLE IF NOT EXISTS command_history (
    id TEXT PRIMARY KEY,
    command TEXT NOT NULL,
    working_directory TEXT,
    exit_code INTEGER,
    duration_ms INTEGER,
    executed_at INTEGER NOT NULL,
    session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_command_history_time ON command_history(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_history_command ON command_history(command);

-- API configurations for automation
CREATE TABLE IF NOT EXISTS api_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    headers TEXT,
    body_template TEXT,
    auth_type TEXT DEFAULT 'none',
    auth_config TEXT,
    timeout_secs INTEGER DEFAULT 30,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- API request history
CREATE TABLE IF NOT EXISTS api_history (
    id TEXT PRIMARY KEY,
    config_id TEXT,
    url TEXT NOT NULL,
    method TEXT NOT NULL,
    request_headers TEXT,
    request_body TEXT,
    response_status INTEGER,
    response_headers TEXT,
    response_body TEXT,
    duration_ms INTEGER,
    error TEXT,
    executed_at INTEGER NOT NULL,
    FOREIGN KEY (config_id) REFERENCES api_configs(id)
);

CREATE INDEX IF NOT EXISTS idx_api_history_time ON api_history(executed_at DESC);
"#;

pub fn init(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(SCHEMA).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn extract_directory(path: &str) -> String {
    std::path::Path::new(path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}
