//! Terminal commands for Tauri
//!
//! Provides Tauri commands to manage PTY sessions from the frontend.

use crate::terminal::{PtyConfig, SharedPtyManager};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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
