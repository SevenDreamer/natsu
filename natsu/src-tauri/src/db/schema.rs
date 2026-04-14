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

-- Scripts table for script library
CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    script_path TEXT NOT NULL,
    interpreter TEXT DEFAULT 'bash',
    tags TEXT,
    parameters TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scripts_name ON scripts(name);

-- File watchers for automation
CREATE TABLE IF NOT EXISTS file_watchers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    recursive INTEGER DEFAULT 1,
    event_types TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    trigger_script_id TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (trigger_script_id) REFERENCES scripts(id)
);

-- File events log
CREATE TABLE IF NOT EXISTS file_events (
    id TEXT PRIMARY KEY,
    watcher_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    path TEXT NOT NULL,
    details TEXT,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (watcher_id) REFERENCES file_watchers(id)
);

CREATE INDEX IF NOT EXISTS idx_file_events_time ON file_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_file_events_watcher ON file_events(watcher_id);

-- Scheduled tasks table (AUTO-05)
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    schedule_type TEXT NOT NULL,  -- 'simple', 'cron', 'once'
    schedule_config TEXT NOT NULL, -- JSON: interval_secs or cron_expression
    task_type TEXT NOT NULL,       -- 'script', 'command', 'api'
    task_config TEXT NOT NULL,     -- JSON: script_id, command, or api_config
    retry_config TEXT,             -- JSON: max_retries, retry_interval_secs, backoff_multiplier
    enabled INTEGER DEFAULT 1,
    last_run_at INTEGER,
    next_run_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled ON scheduled_tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at);

-- Task execution history (AUTO-05)
CREATE TABLE IF NOT EXISTS task_executions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    scheduled_time INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    status TEXT NOT NULL,  -- 'pending', 'running', 'success', 'failed', 'cancelled'
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_task_executions_task ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_time ON task_executions(scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
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
