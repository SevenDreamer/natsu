use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};
use rusqlite::Connection;
use uuid::Uuid;
use crate::models::{
    ScheduledTask, TaskExecution, CreateScheduledTaskInput, UpdateScheduledTaskInput,
};
use crate::scheduler::{HistoryManager, TaskRunner, calculate_next_run_timestamp};

type DbState = Arc<Mutex<Connection>>;
type StoragePathState = Arc<Mutex<Option<String>>>;

/// List all scheduled tasks
#[tauri::command]
pub fn list_scheduled_tasks(conn: State<DbState>) -> Result<Vec<ScheduledTask>, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = db.prepare(
        "SELECT id, name, description, schedule_type, schedule_config, task_type,
                task_config, retry_config, enabled, last_run_at, next_run_at,
                created_at, updated_at
         FROM scheduled_tasks ORDER BY name ASC"
    ).map_err(|e| e.to_string())?;

    let tasks = stmt.query_map([], |row| {
        Ok(ScheduledTask {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            schedule_type: row.get(3)?,
            schedule_config: row.get(4)?,
            task_type: row.get(5)?,
            task_config: row.get(6)?,
            retry_config: row.get(7)?,
            enabled: row.get::<_, i32>(8)? != 0,
            last_run_at: row.get(9)?,
            next_run_at: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(tasks)
}

/// Create a new scheduled task
#[tauri::command]
pub fn create_scheduled_task(
    input: CreateScheduledTaskInput,
    conn: State<DbState>,
) -> Result<ScheduledTask, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let enabled = input.enabled.unwrap_or(true);

    // Calculate next run time based on schedule type
    let next_run_at = if input.schedule_type == "cron" {
        let config: serde_json::Value = serde_json::from_str(&input.schedule_config)
            .map_err(|e| format!("Invalid schedule config: {}", e))?;
        let expression = config.get("expression")
            .and_then(|v| v.as_str())
            .ok_or("Missing cron expression in config")?;
        Some(calculate_next_run_timestamp(expression)?)
    } else if input.schedule_type == "simple" {
        let config: serde_json::Value = serde_json::from_str(&input.schedule_config)
            .map_err(|e| format!("Invalid schedule config: {}", e))?;
        let interval_secs = config.get("interval_secs")
            .and_then(|v| v.as_u64())
            .ok_or("Missing interval_secs in config")?;
        Some(now + interval_secs as i64)
    } else if input.schedule_type == "once" {
        let config: serde_json::Value = serde_json::from_str(&input.schedule_config)
            .map_err(|e| format!("Invalid schedule config: {}", e))?;
        config.get("execute_at").and_then(|v| v.as_i64())
    } else {
        None
    };

    db.execute(
        "INSERT INTO scheduled_tasks
         (id, name, description, schedule_type, schedule_config, task_type,
          task_config, retry_config, enabled, next_run_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            &id, &input.name, &input.description, &input.schedule_type,
            &input.schedule_config, &input.task_type, &input.task_config,
            &input.retry_config, enabled as i32, next_run_at, now, now
        ],
    ).map_err(|e| format!("Failed to create task: {}", e))?;

    Ok(ScheduledTask {
        id,
        name: input.name,
        description: input.description,
        schedule_type: input.schedule_type,
        schedule_config: input.schedule_config,
        task_type: input.task_type,
        task_config: input.task_config,
        retry_config: input.retry_config,
        enabled,
        last_run_at: None,
        next_run_at,
        created_at: now,
        updated_at: now,
    })
}

/// Update a scheduled task
#[tauri::command]
pub fn update_scheduled_task(
    id: String,
    input: UpdateScheduledTaskInput,
    conn: State<DbState>,
) -> Result<ScheduledTask, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp();

    // Get existing task
    let existing = db.query_row(
        "SELECT id, name, description, schedule_type, schedule_config, task_type,
                task_config, retry_config, enabled, last_run_at, next_run_at,
                created_at, updated_at
         FROM scheduled_tasks WHERE id = ?",
        [&id],
        |row| Ok(ScheduledTask {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            schedule_type: row.get(3)?,
            schedule_config: row.get(4)?,
            task_type: row.get(5)?,
            task_config: row.get(6)?,
            retry_config: row.get(7)?,
            enabled: row.get::<_, i32>(8)? != 0,
            last_run_at: row.get(9)?,
            next_run_at: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        }),
    ).map_err(|e| format!("Task not found: {}", e))?;

    let updated = ScheduledTask {
        id: id.clone(),
        name: input.name.unwrap_or(existing.name),
        description: input.description.or(existing.description),
        schedule_type: input.schedule_type.unwrap_or(existing.schedule_type),
        schedule_config: input.schedule_config.unwrap_or(existing.schedule_config),
        task_type: input.task_type.unwrap_or(existing.task_type),
        task_config: input.task_config.unwrap_or(existing.task_config),
        retry_config: input.retry_config.or(existing.retry_config),
        enabled: input.enabled.unwrap_or(existing.enabled),
        last_run_at: existing.last_run_at,
        next_run_at: existing.next_run_at,
        created_at: existing.created_at,
        updated_at: now,
    };

    db.execute(
        "UPDATE scheduled_tasks SET
         name = ?, description = ?, schedule_type = ?, schedule_config = ?,
         task_type = ?, task_config = ?, retry_config = ?, enabled = ?, updated_at = ?
         WHERE id = ?",
        rusqlite::params![
            &updated.name, &updated.description, &updated.schedule_type,
            &updated.schedule_config, &updated.task_type, &updated.task_config,
            &updated.retry_config, updated.enabled as i32, now, &id
        ],
    ).map_err(|e| format!("Failed to update task: {}", e))?;

    Ok(updated)
}

/// Delete a scheduled task
#[tauri::command]
pub fn delete_scheduled_task(id: String, conn: State<DbState>) -> Result<(), String> {
    let db = conn.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM scheduled_tasks WHERE id = ?", [&id])
        .map_err(|e| format!("Failed to delete task: {}", e))?;
    Ok(())
}

/// Toggle task enabled state
#[tauri::command]
pub fn toggle_scheduled_task(
    id: String,
    enabled: bool,
    conn: State<DbState>,
) -> Result<(), String> {
    let db = conn.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE scheduled_tasks SET enabled = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![enabled as i32, chrono::Utc::now().timestamp(), &id],
    ).map_err(|e| format!("Failed to toggle task: {}", e))?;
    Ok(())
}

/// Run a task immediately
#[tauri::command]
pub async fn run_task_now(
    id: String,
    app: AppHandle,
    conn: State<'_, DbState>,
    storage_path: State<'_, StoragePathState>,
) -> Result<TaskExecution, String> {
    // Get task
    let task = {
        let db = conn.lock().map_err(|e| e.to_string())?;
        db.query_row(
            "SELECT id, name, description, schedule_type, schedule_config, task_type,
                    task_config, retry_config, enabled, last_run_at, next_run_at,
                    created_at, updated_at
             FROM scheduled_tasks WHERE id = ?",
            [&id],
            |row| Ok(ScheduledTask {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                schedule_type: row.get(3)?,
                schedule_config: row.get(4)?,
                task_type: row.get(5)?,
                task_config: row.get(6)?,
                retry_config: row.get(7)?,
                enabled: row.get::<_, i32>(8)? != 0,
                last_run_at: row.get(9)?,
                next_run_at: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            }),
        ).map_err(|e| format!("Task not found: {}", e))?
    };

    let base_path = storage_path.lock().map_err(|e| e.to_string())?
        .clone().ok_or("Storage path not set")?;

    let runner = TaskRunner::new(app, std::path::PathBuf::from(base_path));

    let retry_config: Option<crate::models::RetryConfig> = task.retry_config
        .as_ref()
        .and_then(|s| serde_json::from_str(s).ok());

    let result = runner.run_with_retry(&task, retry_config.as_ref()).await;
    runner.emit_complete(&id, &result);

    // Save to history
    let history = HistoryManager::new(Arc::clone(&conn));
    history.complete_execution(&result)?;

    Ok(result)
}

/// Get task execution history
#[tauri::command]
pub fn get_task_executions(
    task_id: String,
    limit: Option<u32>,
    conn: State<DbState>,
) -> Result<Vec<TaskExecution>, String> {
    let history = HistoryManager::new(Arc::clone(&conn));
    history.get_executions_for_task(&task_id, limit.unwrap_or(50))
}

/// Get recent executions across all tasks
#[tauri::command]
pub fn get_recent_task_executions(
    limit: Option<u32>,
    conn: State<DbState>,
) -> Result<Vec<TaskExecution>, String> {
    let history = HistoryManager::new(Arc::clone(&conn));
    history.get_recent_executions(limit.unwrap_or(50))
}

/// Validate cron expression
#[tauri::command]
pub fn validate_cron_expression_cmd(expression: String) -> Result<Vec<String>, String> {
    crate::scheduler::validate_cron_expression(&expression)
}
