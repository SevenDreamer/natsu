use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use crate::models::TaskExecution;

pub struct HistoryManager {
    db: Arc<Mutex<Connection>>,
}

impl HistoryManager {
    pub fn new(db: Arc<Mutex<Connection>>) -> Self {
        Self { db }
    }

    /// Create a new execution record
    pub fn create_execution(&self, task_id: &str, scheduled_time: i64) -> Result<TaskExecution, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        db.execute(
            "INSERT INTO task_executions (id, task_id, scheduled_time, status, retry_count, started_at)
             VALUES (?, ?, ?, 'pending', 0, ?)",
            rusqlite::params![&id, task_id, scheduled_time, now],
        ).map_err(|e| format!("Failed to create execution: {}", e))?;

        Ok(TaskExecution {
            id,
            task_id: task_id.to_string(),
            scheduled_time,
            started_at: Some(now),
            status: "pending".to_string(),
            exit_code: None,
            stdout: None,
            stderr: None,
            error_message: None,
            duration_ms: None,
            retry_count: 0,
            completed_at: None,
        })
    }

    /// Mark execution as running
    pub fn start_execution(&self, execution_id: &str) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.execute(
            "UPDATE task_executions SET status = 'running', started_at = ? WHERE id = ?",
            rusqlite::params![chrono::Utc::now().timestamp(), execution_id],
        ).map_err(|e| format!("Failed to start execution: {}", e))?;
        Ok(())
    }

    /// Complete execution with result
    pub fn complete_execution(&self, execution: &TaskExecution) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().timestamp();

        db.execute(
            "UPDATE task_executions SET
                status = ?, completed_at = ?, exit_code = ?, stdout = ?,
                stderr = ?, error_message = ?, duration_ms = ?, retry_count = ?
             WHERE id = ?",
            rusqlite::params![
                &execution.status,
                now,
                execution.exit_code,
                &execution.stdout,
                &execution.stderr,
                &execution.error_message,
                execution.duration_ms,
                execution.retry_count,
                &execution.id,
            ],
        ).map_err(|e| format!("Failed to complete execution: {}", e))?;

        // Update last_run_at on the task
        db.execute(
            "UPDATE scheduled_tasks SET last_run_at = ? WHERE id = ?",
            rusqlite::params![now, &execution.task_id],
        ).map_err(|e| format!("Failed to update task last_run_at: {}", e))?;

        Ok(())
    }

    /// Get executions for a specific task
    pub fn get_executions_for_task(&self, task_id: &str, limit: u32) -> Result<Vec<TaskExecution>, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;

        let mut stmt = db.prepare(
            "SELECT id, task_id, scheduled_time, started_at, completed_at, status,
                    exit_code, stdout, stderr, error_message, duration_ms, retry_count
             FROM task_executions
             WHERE task_id = ?
             ORDER BY scheduled_time DESC
             LIMIT ?"
        ).map_err(|e| format!("Failed to prepare query: {}", e))?;

        let executions = stmt.query_map(
            rusqlite::params![task_id, limit],
            |row| Ok(TaskExecution {
                id: row.get(0)?,
                task_id: row.get(1)?,
                scheduled_time: row.get(2)?,
                started_at: row.get(3)?,
                completed_at: row.get(4)?,
                status: row.get(5)?,
                exit_code: row.get(6)?,
                stdout: row.get(7)?,
                stderr: row.get(8)?,
                error_message: row.get(9)?,
                duration_ms: row.get(10)?,
                retry_count: row.get::<_, i32>(11)? as u32,
            }),
        ).map_err(|e| format!("Failed to query executions: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect executions: {}", e))?;

        Ok(executions)
    }

    /// Get recent executions across all tasks
    pub fn get_recent_executions(&self, limit: u32) -> Result<Vec<TaskExecution>, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;

        let mut stmt = db.prepare(
            "SELECT id, task_id, scheduled_time, started_at, completed_at, status,
                    exit_code, stdout, stderr, error_message, duration_ms, retry_count
             FROM task_executions
             ORDER BY scheduled_time DESC
             LIMIT ?"
        ).map_err(|e| format!("Failed to prepare query: {}", e))?;

        let executions = stmt.query_map(
            rusqlite::params![limit],
            |row| Ok(TaskExecution {
                id: row.get(0)?,
                task_id: row.get(1)?,
                scheduled_time: row.get(2)?,
                started_at: row.get(3)?,
                completed_at: row.get(4)?,
                status: row.get(5)?,
                exit_code: row.get(6)?,
                stdout: row.get(7)?,
                stderr: row.get(8)?,
                error_message: row.get(9)?,
                duration_ms: row.get(10)?,
                retry_count: row.get::<_, i32>(11)? as u32,
            }),
        ).map_err(|e| format!("Failed to query executions: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect executions: {}", e))?;

        Ok(executions)
    }
}
