use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Schedule Configuration Types
// ============================================================================

/// Simple interval schedule configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimpleInterval {
    pub interval_secs: u64,
    pub start_time: Option<i64>,
}

/// Cron expression schedule configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CronSchedule {
    pub expression: String,
    pub timezone: String,
}

/// One-time execution schedule configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnceTime {
    pub execute_at: i64,
}

/// Task schedule configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TaskSchedule {
    Simple(SimpleInterval),
    Cron(CronSchedule),
    Once(OnceTime),
}

// ============================================================================
// Task Configuration Types
// ============================================================================

/// Script task configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptTaskConfig {
    pub script_id: String,
    pub parameters: HashMap<String, String>,
    pub timeout_secs: u64,
}

/// Command task configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandTaskConfig {
    pub command: String,
    pub working_directory: Option<String>,
    pub timeout_secs: u64,
}

/// API task configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiTaskConfig {
    pub config_id: Option<String>,
    pub url: String,
    pub method: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    pub timeout_secs: u64,
}

/// Task type configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TaskTypeConfig {
    Script(ScriptTaskConfig),
    Command(CommandTaskConfig),
    Api(ApiTaskConfig),
}

// ============================================================================
// Retry Configuration
// ============================================================================

/// Retry configuration for failed tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetryConfig {
    pub max_retries: u32,
    pub retry_interval_secs: u64,
    pub backoff_multiplier: Option<f64>,
}

impl RetryConfig {
    /// Calculate delay for a given retry attempt
    pub fn calculate_delay(&self, attempt: u32) -> u64 {
        if let Some(multiplier) = self.backoff_multiplier {
            // Exponential backoff: 1, 2, 4, 8...
            let base = self.retry_interval_secs as f64;
            let delay = base * multiplier.powi(attempt as i32);
            delay as u64
        } else {
            self.retry_interval_secs
        }
    }
}

// ============================================================================
// Main Models
// ============================================================================

/// A scheduled task definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub schedule_type: String,
    pub schedule_config: String, // JSON
    pub task_type: String,
    pub task_config: String, // JSON
    pub retry_config: Option<String>, // JSON
    pub enabled: bool,
    pub last_run_at: Option<i64>,
    pub next_run_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// A task execution record
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskExecution {
    pub id: String,
    pub task_id: String,
    pub scheduled_time: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub status: String,
    pub exit_code: Option<i32>,
    pub stdout: Option<String>,
    pub stderr: Option<String>,
    pub error_message: Option<String>,
    pub duration_ms: Option<i64>,
    pub retry_count: u32,
}

// ============================================================================
// Input Types
// ============================================================================

/// Input for creating a new scheduled task
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateScheduledTaskInput {
    pub name: String,
    pub description: Option<String>,
    pub schedule_type: String,
    pub schedule_config: String,
    pub task_type: String,
    pub task_config: String,
    pub retry_config: Option<String>,
    pub enabled: Option<bool>,
}

/// Input for updating an existing scheduled task
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateScheduledTaskInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub schedule_type: Option<String>,
    pub schedule_config: Option<String>,
    pub task_type: Option<String>,
    pub task_config: Option<String>,
    pub retry_config: Option<String>,
    pub enabled: Option<bool>,
}
