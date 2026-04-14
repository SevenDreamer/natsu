use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::process::Command;
use std::path::PathBuf;
use crate::models::{
    ScheduledTask, TaskExecution, TaskTypeConfig,
    ScriptTaskConfig, CommandTaskConfig, ApiTaskConfig,
    RetryConfig,
};

pub struct TaskRunner {
    app_handle: AppHandle,
    storage_path: PathBuf,
}

impl TaskRunner {
    pub fn new(app_handle: AppHandle, storage_path: PathBuf) -> Self {
        Self { app_handle, storage_path }
    }

    /// Execute a script task
    pub async fn execute_script(&self, config: &ScriptTaskConfig) -> Result<ExecutionResult, String> {
        // Read script content
        let script_path = self.storage_path.join("scripts").join(&config.script_id);
        let content = tokio::fs::read_to_string(&script_path)
            .await
            .map_err(|e| format!("Failed to read script: {}", e))?;

        // Replace parameters
        let mut parameterized = content.clone();
        for (key, value) in &config.parameters {
            let placeholder = format!("{{{{{}}}}}", key);
            parameterized = parameterized.replace(&placeholder, value);
        }

        // Write to temp file
        let temp_path = std::env::temp_dir().join(format!("task_{}.sh", uuid::Uuid::new_v4()));
        tokio::fs::write(&temp_path, &parameterized)
            .await
            .map_err(|e| format!("Failed to write temp script: {}", e))?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&temp_path, std::fs::Permissions::from_mode(0o755))
                .map_err(|e| format!("Failed to set permissions: {}", e))?;
        }

        let start = Instant::now();
        let timeout = Duration::from_secs(config.timeout_secs);

        let output = tokio::time::timeout(
            timeout,
            Command::new("bash")
                .arg(&temp_path)
                .current_dir(&self.storage_path)
                .output(),
        )
        .await
        .map_err(|_| "Script execution timed out".to_string())?
        .map_err(|e| format!("Failed to execute script: {}", e))?;

        // Clean up
        let _ = tokio::fs::remove_file(&temp_path).await;

        Ok(ExecutionResult {
            exit_code: output.status.code().unwrap_or(-1),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Execute a command task
    pub async fn execute_command(&self, config: &CommandTaskConfig) -> Result<ExecutionResult, String> {
        let start = Instant::now();
        let timeout = Duration::from_secs(config.timeout_secs);

        let cwd = config.working_directory.as_ref()
            .map(PathBuf::from)
            .unwrap_or_else(|| self.storage_path.clone());

        let output = tokio::time::timeout(
            timeout,
            Command::new("bash")
                .arg("-c")
                .arg(&config.command)
                .current_dir(&cwd)
                .output(),
        )
        .await
        .map_err(|_| "Command execution timed out".to_string())?
        .map_err(|e| format!("Failed to execute command: {}", e))?;

        Ok(ExecutionResult {
            exit_code: output.status.code().unwrap_or(-1),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Execute an API task
    pub async fn execute_api(&self, config: &ApiTaskConfig) -> Result<ExecutionResult, String> {
        let start = Instant::now();
        let timeout = Duration::from_secs(config.timeout_secs);

        let client = reqwest::Client::builder()
            .timeout(timeout)
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let mut request = match config.method.to_uppercase().as_str() {
            "GET" => client.get(&config.url),
            "POST" => client.post(&config.url),
            "PUT" => client.put(&config.url),
            "DELETE" => client.delete(&config.url),
            "PATCH" => client.patch(&config.url),
            _ => return Err(format!("Unsupported HTTP method: {}", config.method)),
        };

        if let Some(headers) = &config.headers {
            for (key, value) in headers {
                request = request.header(key, value);
            }
        }

        if let Some(body) = &config.body {
            request = request.body(body.clone());
        }

        let response = request
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        let status = response.status().as_u16() as i32;
        let body = response.text()
            .await
            .unwrap_or_else(|_| "Failed to read response body".to_string());

        Ok(ExecutionResult {
            exit_code: if status >= 200 && status < 300 { 0 } else { status },
            stdout: body,
            stderr: String::new(),
            duration_ms: start.elapsed().as_millis() as u64,
        })
    }

    /// Emit task output event
    pub fn emit_output(&self, task_id: &str, content: &str) {
        let _ = self.app_handle.emit(&format!("task-output-{}", task_id), content);
    }

    /// Emit task completion event
    pub fn emit_complete(&self, task_id: &str, result: &TaskExecution) {
        let _ = self.app_handle.emit(&format!("task-complete-{}", task_id), result);
    }

    /// Run task with retry logic
    pub async fn run_with_retry(
        &self,
        task: &ScheduledTask,
        retry_config: Option<&RetryConfig>,
    ) -> TaskExecution {
        let config: TaskTypeConfig = serde_json::from_str(&task.task_config)
            .unwrap_or_else(|_| TaskTypeConfig::Command(CommandTaskConfig {
                command: "echo 'Invalid task config'".to_string(),
                working_directory: None,
                timeout_secs: 60,
            }));

        let max_retries = retry_config.map(|r| r.max_retries).unwrap_or(0);
        let mut attempt = 0u32;

        loop {
            let result = match &config {
                TaskTypeConfig::Script(cfg) => self.execute_script(cfg).await,
                TaskTypeConfig::Command(cfg) => self.execute_command(cfg).await,
                TaskTypeConfig::Api(cfg) => self.execute_api(cfg).await,
            };

            match result {
                Ok(exec_result) if exec_result.exit_code == 0 => {
                    return TaskExecution {
                        id: uuid::Uuid::new_v4().to_string(),
                        task_id: task.id.clone(),
                        scheduled_time: chrono::Utc::now().timestamp(),
                        started_at: Some(chrono::Utc::now().timestamp()),
                        completed_at: Some(chrono::Utc::now().timestamp()),
                        status: "success".to_string(),
                        exit_code: Some(exec_result.exit_code),
                        stdout: Some(exec_result.stdout),
                        stderr: Some(exec_result.stderr),
                        error_message: None,
                        duration_ms: Some(exec_result.duration_ms as i64),
                        retry_count: attempt,
                    };
                }
                Ok(exec_result) => {
                    // Non-zero exit code
                    if attempt < max_retries {
                        attempt += 1;
                        let delay = retry_config
                            .map(|r| r.calculate_delay(attempt))
                            .unwrap_or(60);
                        tokio::time::sleep(Duration::from_secs(delay)).await;
                        continue;
                    }

                    return TaskExecution {
                        id: uuid::Uuid::new_v4().to_string(),
                        task_id: task.id.clone(),
                        scheduled_time: chrono::Utc::now().timestamp(),
                        started_at: Some(chrono::Utc::now().timestamp()),
                        completed_at: Some(chrono::Utc::now().timestamp()),
                        status: "failed".to_string(),
                        exit_code: Some(exec_result.exit_code),
                        stdout: Some(exec_result.stdout),
                        stderr: Some(exec_result.stderr),
                        error_message: Some(format!("Exit code: {}", exec_result.exit_code)),
                        duration_ms: Some(exec_result.duration_ms as i64),
                        retry_count: attempt,
                    };
                }
                Err(e) => {
                    if attempt < max_retries {
                        attempt += 1;
                        let delay = retry_config
                            .map(|r| r.calculate_delay(attempt))
                            .unwrap_or(60);
                        tokio::time::sleep(Duration::from_secs(delay)).await;
                        continue;
                    }

                    return TaskExecution {
                        id: uuid::Uuid::new_v4().to_string(),
                        task_id: task.id.clone(),
                        scheduled_time: chrono::Utc::now().timestamp(),
                        started_at: Some(chrono::Utc::now().timestamp()),
                        completed_at: Some(chrono::Utc::now().timestamp()),
                        status: "failed".to_string(),
                        exit_code: None,
                        stdout: None,
                        stderr: None,
                        error_message: Some(e),
                        duration_ms: None,
                        retry_count: attempt,
                    };
                }
            }
        }
    }
}

/// Result of task execution
pub struct ExecutionResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
}
