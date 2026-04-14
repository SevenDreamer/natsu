//! Terminal commands for Tauri
//!
//! Provides Tauri commands to manage PTY sessions from the frontend.

use crate::terminal::{PtyConfig, SharedPtyManager};
use crate::models::{CommandHistoryEntry, CommandHistoryQuery, RecordCommandInput};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};

/// Response for spawn_terminal command
#[derive(Debug, Serialize, Deserialize)]
pub struct TerminalInfo {
    /// Session ID
    pub id: String,
    /// Initial columns
    pub cols: u16,
    /// Initial rows
    pub rows: u16,
}

/// Configuration for spawning a terminal
#[derive(Debug, Serialize, Deserialize)]
pub struct SpawnTerminalConfig {
    /// Shell program to run
    pub shell: Option<String>,
    /// Shell arguments
    pub args: Option<Vec<String>>,
    /// Working directory
    pub working_directory: Option<String>,
    /// Environment variables
    pub env: Option<HashMap<String, String>>,
    /// Initial columns
    pub cols: Option<u16>,
    /// Initial rows
    pub rows: Option<u16>,
}

impl From<SpawnTerminalConfig> for PtyConfig {
    fn from(config: SpawnTerminalConfig) -> Self {
        PtyConfig {
            shell: config.shell,
            args: config.args.unwrap_or_default(),
            working_directory: config.working_directory,
            env: config.env.unwrap_or_default(),
            cols: config.cols.unwrap_or(80),
            rows: config.rows.unwrap_or(24),
        }
    }
}

/// Spawn a new terminal session
#[tauri::command]
pub fn spawn_terminal(
    config: Option<SpawnTerminalConfig>,
    manager: State<SharedPtyManager>,
) -> Result<TerminalInfo, String> {
    let pty_config = config
        .map(PtyConfig::from)
        .unwrap_or_default();

    let mut manager = manager.lock().map_err(|e| e.to_string())?;
    let id = manager.spawn(pty_config).map_err(|e| e.to_string())?;

    Ok(TerminalInfo {
        id,
        cols: 80,
        rows: 24,
    })
}

/// Write data to a terminal session
#[tauri::command]
pub fn write_to_pty(
    id: String,
    data: Vec<u8>,
    manager: State<SharedPtyManager>,
) -> Result<(), String> {
    let mut manager = manager.lock().map_err(|e| e.to_string())?;

    if let Some(session) = manager.get_mut(&id) {
        session.write(&data).map_err(|e| e.to_string())
    } else {
        Err(format!("Terminal session {} not found", id))
    }
}

/// Resize a terminal session
#[tauri::command]
pub fn resize_pty(
    id: String,
    cols: u16,
    rows: u16,
    manager: State<SharedPtyManager>,
) -> Result<(), String> {
    let mut manager = manager.lock().map_err(|e| e.to_string())?;

    if let Some(session) = manager.get_mut(&id) {
        session.resize(cols, rows);
        Ok(())
    } else {
        Err(format!("Terminal session {} not found", id))
    }
}

/// Kill a terminal session
#[tauri::command]
pub fn kill_terminal(
    id: String,
    manager: State<SharedPtyManager>,
) -> Result<(), String> {
    let mut manager = manager.lock().map_err(|e| e.to_string())?;

    if manager.kill(&id) {
        Ok(())
    } else {
        Err(format!("Terminal session {} not found", id))
    }
}

/// Get terminal content
#[tauri::command]
pub fn get_terminal_content(
    id: String,
    manager: State<SharedPtyManager>,
) -> Result<String, String> {
    let manager = manager.lock().map_err(|e| e.to_string())?;

    if let Some(session) = manager.get(&id) {
        Ok(session.get_content())
    } else {
        Err(format!("Terminal session {} not found", id))
    }
}

/// List all active terminal sessions
#[tauri::command]
pub fn list_terminals(
    manager: State<SharedPtyManager>,
) -> Result<Vec<String>, String> {
    let manager = manager.lock().map_err(|e| e.to_string())?;
    Ok(manager.list())
}

/// Initialize the PTY manager with the app handle
pub fn init_pty_manager(app_handle: AppHandle) -> SharedPtyManager {
    crate::terminal::create_pty_manager(app_handle)
}

// ============================================================================
// Command History API
// ============================================================================

/// Database type alias
type DbConn = Arc<Mutex<Connection>>;

/// Get command history with optional filtering
#[tauri::command]
pub fn get_command_history(
    query: CommandHistoryQuery,
    db: State<DbConn>,
) -> Result<Vec<CommandHistoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let limit = query.limit.unwrap_or(100);
    let offset = query.offset.unwrap_or(0);

    let mut sql = String::from(
        "SELECT id, command, working_directory, exit_code, duration_ms, executed_at, session_id \
         FROM command_history"
    );

    let mut conditions = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    // Search filter
    if let Some(ref search) = query.search {
        if !search.is_empty() {
            conditions.push("command LIKE ?");
            params.push(Box::new(format!("%{}%", search)));
        }
    }

    // Session filter
    if let Some(ref session_id) = query.session_id {
        conditions.push("session_id = ?");
        params.push(Box::new(session_id.clone()));
    }

    if !conditions.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conditions.join(" AND "));
    }

    sql.push_str(" ORDER BY executed_at DESC LIMIT ? OFFSET ?");
    params.push(Box::new(limit as i32));
    params.push(Box::new(offset as i32));

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let entries = stmt
        .query_map(params.as_slice(), |row| {
            Ok(CommandHistoryEntry {
                id: row.get(0)?,
                command: row.get(1)?,
                working_directory: row.get(2)?,
                exit_code: row.get(3)?,
                duration_ms: row.get(4)?,
                executed_at: row.get(5)?,
                session_id: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(entries)
}

/// Record a command execution to history
#[tauri::command]
pub fn record_command(
    input: RecordCommandInput,
    db: State<DbConn>,
) -> Result<CommandHistoryEntry, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let entry = CommandHistoryEntry::new(
        input.command,
        input.working_directory,
        input.session_id,
    );

    conn.execute(
        "INSERT INTO command_history (id, command, working_directory, exit_code, duration_ms, executed_at, session_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            entry.id,
            entry.command,
            entry.working_directory,
            entry.exit_code,
            entry.duration_ms,
            entry.executed_at,
            entry.session_id,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(entry)
}

/// Update a command history entry with execution result
#[tauri::command]
pub fn update_command_result(
    id: String,
    exit_code: Option<i32>,
    duration_ms: Option<i64>,
    db: State<DbConn>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE command_history SET exit_code = ?1, duration_ms = ?2 WHERE id = ?3",
        rusqlite::params![exit_code, duration_ms, id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Delete a single command history entry
#[tauri::command]
pub fn delete_command_history_entry(id: String, db: State<DbConn>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM command_history WHERE id = ?1",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Clear all command history
#[tauri::command]
pub fn clear_command_history(db: State<DbConn>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM command_history", [])
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Rerun a command from history
#[tauri::command]
pub fn rerun_command(
    id: String,
    manager: State<SharedPtyManager>,
    db: State<DbConn>,
) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // Get the command from history
    let command: String = conn
        .query_row(
            "SELECT command FROM command_history WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Command not found: {}", e))?;

    // Get working directory if available
    let working_directory: Option<String> = conn
        .query_row(
            "SELECT working_directory FROM command_history WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .ok();

    // Write to PTY
    let mut manager = manager.lock().map_err(|e| e.to_string())?;
    let session_id = manager.list().first().cloned();

    if let Some(sid) = session_id {
        if let Some(session) = manager.get_mut(&sid) {
            // Add newline to execute the command
            let cmd_bytes = format!("{}\n", command).into_bytes();
            session.write(&cmd_bytes).map_err(|e| e.to_string())?;
        }
    }

    // Record new history entry
    let new_entry = CommandHistoryEntry::new(command.clone(), working_directory, session_id);
    conn.execute(
        "INSERT INTO command_history (id, command, working_directory, exit_code, duration_ms, executed_at, session_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            new_entry.id,
            new_entry.command,
            new_entry.working_directory,
            new_entry.exit_code,
            new_entry.duration_ms,
            new_entry.executed_at,
            new_entry.session_id,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(new_entry.id)
}
