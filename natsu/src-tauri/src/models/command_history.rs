//! Command history model for automation
//!
//! Stores executed terminal commands for history and re-execution.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single command history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandHistoryEntry {
    /// Unique identifier
    pub id: String,
    /// The command that was executed
    pub command: String,
    /// Working directory where the command was executed
    pub working_directory: Option<String>,
    /// Exit code of the command (None if still running or timed out)
    pub exit_code: Option<i32>,
    /// Duration of execution in milliseconds
    pub duration_ms: Option<i64>,
    /// Timestamp when the command was executed
    pub executed_at: i64,
    /// Terminal session ID (if applicable)
    pub session_id: Option<String>,
}

impl CommandHistoryEntry {
    /// Create a new command history entry
    pub fn new(command: String, working_directory: Option<String>, session_id: Option<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            command,
            working_directory,
            exit_code: None,
            duration_ms: None,
            executed_at: Utc::now().timestamp(),
            session_id,
        }
    }

    /// Get the executed_at as a DateTime
    pub fn executed_at_datetime(&self) -> DateTime<Utc> {
        DateTime::from_timestamp(self.executed_at, 0).unwrap_or_else(|| Utc::now())
    }

    /// Check if the command was successful
    pub fn is_success(&self) -> Option<bool> {
        self.exit_code.map(|code| code == 0)
    }
}

/// Query parameters for searching command history
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CommandHistoryQuery {
    /// Search string to filter commands
    pub search: Option<String>,
    /// Maximum number of results
    pub limit: Option<usize>,
    /// Offset for pagination
    pub offset: Option<usize>,
    /// Filter by session ID
    pub session_id: Option<String>,
}

impl Default for CommandHistoryQuery {
    fn default() -> Self {
        Self {
            search: None,
            limit: Some(100),
            offset: Some(0),
            session_id: None,
        }
    }
}

/// Input for recording a command execution
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RecordCommandInput {
    /// The command that was executed
    pub command: String,
    /// Working directory
    pub working_directory: Option<String>,
    /// Exit code
    pub exit_code: Option<i32>,
    /// Duration in milliseconds
    pub duration_ms: Option<i64>,
    /// Session ID
    pub session_id: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_entry() {
        let entry = CommandHistoryEntry::new(
            "ls -la".to_string(),
            Some("/home/user".to_string()),
            Some("session-123".to_string()),
        );

        assert!(!entry.id.is_empty());
        assert_eq!(entry.command, "ls -la");
        assert_eq!(entry.working_directory, Some("/home/user".to_string()));
        assert!(entry.exit_code.is_none());
    }

    #[test]
    fn test_is_success() {
        let mut entry = CommandHistoryEntry::new("test".to_string(), None, None);
        assert!(entry.is_success().is_none());

        entry.exit_code = Some(0);
        assert_eq!(entry.is_success(), Some(true));

        entry.exit_code = Some(1);
        assert_eq!(entry.is_success(), Some(false));
    }
}
