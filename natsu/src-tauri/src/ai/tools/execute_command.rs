//! Execute Command Tool
//!
//! Allows AI to execute shell commands with safety checks.
//! Commands are categorized as Safe, Caution, or Dangerous based on patterns.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::time::Duration;
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::time::timeout;

use super::super::tool::{ToolDefinition, ToolExecutor, build_object_schema};

/// Safety level for a command
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CommandSafety {
    /// Safe commands that can execute without confirmation
    Safe,
    /// Commands that need caution but can proceed
    Caution,
    /// Dangerous commands that require explicit confirmation
    Dangerous,
}

impl CommandSafety {
    /// Check if this safety level requires confirmation
    pub fn requires_confirmation(&self) -> bool {
        matches!(self, CommandSafety::Caution | CommandSafety::Dangerous)
    }
}

/// Safety information about a command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyInfo {
    /// Safety level
    pub level: CommandSafety,
    /// Human-readable message explaining the safety assessment
    pub message: String,
}

/// Input for the execute_command tool
#[derive(Debug, Clone, Deserialize)]
pub struct ExecuteCommandInput {
    /// The command to execute
    pub command: String,
    /// Optional timeout in seconds (default: 30)
    #[serde(default = "default_timeout")]
    pub timeout: u64,
    /// Optional working directory
    #[serde(default)]
    pub working_directory: Option<String>,
}

fn default_timeout() -> u64 {
    30
}

/// Check the safety of a command
pub fn check_command_safety(command: &str) -> SafetyInfo {
    let command_lower = command.to_lowercase();

    // Check for empty command
    if command_lower.trim().is_empty() {
        return SafetyInfo {
            level: CommandSafety::Dangerous,
            message: "Empty command".to_string(),
        };
    }

    // Dangerous patterns - always require confirmation
    // Order matters: more specific patterns first (e.g., "curl | bash" before "curl")
    let dangerous_patterns = [
        // Shell execution from network (most dangerous)
        "curl | bash",
        "curl | sh",
        "wget | bash",
        "wget | sh",
        "| bash",
        "| sh",
        // Filesystem destruction
        "rm -rf",
        "rm -r",
        "rm -fr",
        "rmdir",
        "shred",
        "wipe",
        // System modification
        "sudo",
        "su ",
        "chmod 777",
        "chown",
        // Disk operations
        "dd if=",
        "dd of=",
        "mkfs",
        "fdisk",
        "parted",
        "format",
        // Network dangerous
        "iptables",
        "ufw",
        "firewall-cmd",
        // System control
        "shutdown",
        "reboot",
        "halt",
        "poweroff",
        "init 0",
        "init 6",
        "systemctl stop",
        "systemctl disable",
        "systemctl restart",
        "service stop",
        "kill -9",
        "kill -kill",
        "pkill -9",
        "killall -9",
        // Package management (can modify system)
        "apt install",
        "apt remove",
        "apt purge",
        "apt-get install",
        "apt-get remove",
        "yum install",
        "yum remove",
        "dnf install",
        "dnf remove",
        "pacman -s",
        "pacman -r",
        "npm install -g",
        "pip install",
        "cargo install",
        // Shell execution
        "> /dev/sd",
    ];

    // Caution patterns - need confirmation but less severe
    let caution_patterns = [
        // File operations
        "rm ",
        "mv ",
        "cp ",
        "chmod ",
        "mkdir ",
        "touch ",
        "unlink",
        // Network requests
        "curl",
        "wget",
        "ssh",
        "scp",
        "rsync",
        "nc ",
        "netcat",
        // Process management
        "kill ",
        "pkill",
        "killall",
        "nohup",
        // Git potentially destructive
        "git push",
        "git reset",
        "git rebase",
        "git clean",
        "git stash pop",
        // Docker
        "docker rm",
        "docker rmi",
        "docker stop",
        "docker kill",
        "docker system prune",
    ];

    // Safe patterns - can execute without confirmation
    let safe_commands = [
        "ls",
        "ls ",
        "cat ",
        "head ",
        "tail ",
        "pwd",
        "echo ",
        "whoami",
        "date",
        "uptime",
        "uname",
        "hostname",
        "id",
        "env",
        "printenv",
        "which ",
        "type ",
        "stat ",
        "file ",
        "wc ",
        "du ",
        "df ",
        "free",
        "top",
        "htop",
        "ps ",
        "ps",
        "git status",
        "git log",
        "git diff",
        "git branch",
        "git remote",
        "git tag",
        "git show",
        "git stash list",
        "git fetch",
        "cargo check",
        "cargo test",
        "cargo build",
        "cargo clippy",
        "cargo doc",
        "cargo tree",
        "npm list",
        "npm outdated",
        "pip list",
        "pip show",
        "python --version",
        "python3 --version",
        "node --version",
        "rustc --version",
        "cargo --version",
        "go version",
    ];

    // Check if it matches a safe command
    for pattern in &dangerous_patterns {
        if command_lower.contains(pattern) {
            return SafetyInfo {
                level: CommandSafety::Dangerous,
                message: format!("Command contains dangerous pattern: '{}'. This may cause irreversible changes.", pattern),
            };
        }
    }

    // Check caution patterns
    for pattern in &caution_patterns {
        if command_lower.contains(pattern) {
            return SafetyInfo {
                level: CommandSafety::Caution,
                message: format!("Command contains caution pattern: '{}'. Please review before execution.", pattern),
            };
        }
    }

    // Check if it matches a safe command
    for safe in &safe_commands {
        if command_lower == *safe || command_lower.starts_with(safe) {
            // Make sure it doesn't have dangerous pipes
            if !command_lower.contains("|") && !command_lower.contains("&&") && !command_lower.contains("||") {
                return SafetyInfo {
                    level: CommandSafety::Safe,
                    message: "Command is considered safe for automatic execution.".to_string(),
                };
            }
            // Safe command with pipes/operators needs caution
            return SafetyInfo {
                level: CommandSafety::Caution,
                message: "Safe command combined with other operations. Please review.".to_string(),
            };
        }
    }

    // Default to caution for unknown commands
    SafetyInfo {
        level: CommandSafety::Caution,
        message: "Unknown command. Please review before execution.".to_string(),
    }
}

/// Result of command execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    /// Exit code of the process
    pub exit_code: Option<i32>,
    /// Standard output
    pub stdout: String,
    /// Standard error
    pub stderr: String,
    /// Whether the command timed out
    pub timed_out: bool,
    /// Working directory used
    pub working_directory: Option<String>,
}

/// Execute Command Tool implementation
pub struct ExecuteCommandTool {
    /// Default working directory for commands
    default_cwd: Option<String>,
}

impl ExecuteCommandTool {
    /// Create a new execute command tool
    pub fn new() -> Self {
        Self {
            default_cwd: None,
        }
    }

    /// Create with a default working directory
    pub fn with_cwd(cwd: impl Into<String>) -> Self {
        Self {
            default_cwd: Some(cwd.into()),
        }
    }

    /// Get safety info for a command
    pub fn get_safety_info(command: &str) -> SafetyInfo {
        check_command_safety(command)
    }

    /// Execute the command
    pub async fn execute_command(&self, input: ExecuteCommandInput) -> Result<CommandResult, String> {
        let timeout_secs = if input.timeout == 0 { 30 } else { input.timeout };
        let timeout_duration = Duration::from_secs(timeout_secs);

        // Determine working directory
        let cwd = input.working_directory.or(self.default_cwd.clone());

        // Build the command - use shell to support pipes and redirects
        let mut cmd = Command::new("sh");
        cmd.arg("-c").arg(&input.command);

        if let Some(ref dir) = cwd {
            cmd.current_dir(dir);
        }

        // Spawn the process
        let mut child = cmd
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn command: {}", e))?;

        // Read stdout and stderr with timeout
        let stdout_result = child.stdout.take();
        let stderr_result = child.stderr.take();

        let stdout_future = async {
            if let Some(stdout) = stdout_result {
                let mut output = String::new();
                let mut reader = BufReader::new(stdout).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    output.push_str(&line);
                    output.push('\n');
                }
                output
            } else {
                String::new()
            }
        };

        let stderr_future = async {
            if let Some(stderr) = stderr_result {
                let mut output = String::new();
                let mut reader = BufReader::new(stderr).lines();
                while let Ok(Some(line)) = reader.next_line().await {
                    output.push_str(&line);
                    output.push('\n');
                }
                output
            } else {
                String::new()
            }
        };

        // Execute with timeout
        let result = timeout(timeout_duration, async {
            let (stdout, stderr) = tokio::join!(stdout_future, stderr_future);
            let exit_status = child.wait().await;
            (stdout, stderr, exit_status)
        }).await;

        match result {
            Ok((stdout, stderr, exit_status)) => {
                let exit_code = exit_status
                    .map(|s| s.code())
                    .map_err(|e| format!("Failed to wait for process: {}", e))?;

                Ok(CommandResult {
                    exit_code,
                    stdout,
                    stderr,
                    timed_out: false,
                    working_directory: cwd,
                })
            }
            Err(_) => {
                // Timeout occurred - kill the process
                let _ = child.kill().await;

                Ok(CommandResult {
                    exit_code: None,
                    stdout: String::new(),
                    stderr: format!("Command timed out after {} seconds", timeout_secs),
                    timed_out: true,
                    working_directory: cwd,
                })
            }
        }
    }
}

impl Default for ExecuteCommandTool {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ToolExecutor for ExecuteCommandTool {
    fn definition(&self) -> ToolDefinition {
        let mut props = std::collections::HashMap::new();
        props.insert("command", ("string", "The shell command to execute"));
        props.insert("timeout", ("integer", "Timeout in seconds (default: 30, max: 300)"));
        props.insert("working_directory", ("string", "Optional working directory for the command"));

        ToolDefinition {
            name: "execute_command".to_string(),
            description: "Execute a shell command on the system. Commands are safety-checked before execution. Safe commands (like ls, cat, pwd) execute automatically. Dangerous commands (like rm -rf, sudo) require user confirmation.".to_string(),
            input_schema: build_object_schema(props),
        }
    }

    async fn execute(&self, input: Value) -> Result<String, String> {
        // Parse input
        let cmd_input: ExecuteCommandInput = serde_json::from_value(input)
            .map_err(|e| format!("Invalid input: {}", e))?;

        // Validate timeout
        if cmd_input.timeout > 300 {
            return Err("Timeout cannot exceed 300 seconds".to_string());
        }

        // Execute the command
        let result = self.execute_command(cmd_input).await?;

        // Format output
        let output = if result.timed_out {
            json!({
                "success": false,
                "error": result.stderr,
                "timed_out": true
            })
        } else if result.exit_code.map(|c| c == 0).unwrap_or(false) {
            json!({
                "success": true,
                "stdout": result.stdout.trim_end(),
                "stderr": result.stderr.trim_end(),
                "exit_code": result.exit_code,
                "working_directory": result.working_directory
            })
        } else {
            json!({
                "success": false,
                "stdout": result.stdout.trim_end(),
                "stderr": result.stderr.trim_end(),
                "exit_code": result.exit_code,
                "working_directory": result.working_directory
            })
        };

        Ok(output.to_string())
    }
}

/// Information about a tool that needs confirmation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolConfirmationRequest {
    /// ID of the tool use
    pub tool_use_id: String,
    /// Name of the tool
    pub tool_name: String,
    /// Input to the tool
    pub input: Value,
    /// Safety level
    pub safety_level: CommandSafety,
    /// Safety message
    pub safety_message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_safe_commands() {
        let safe_commands = [
            "ls",
            "ls -la",
            "pwd",
            "whoami",
            "cat /etc/hosts",
            "git status",
            "git log",
            "cargo check",
        ];

        for cmd in safe_commands {
            let info = check_command_safety(cmd);
            assert_eq!(info.level, CommandSafety::Safe, "Expected '{}' to be safe", cmd);
        }
    }

    #[test]
    fn test_dangerous_commands() {
        let dangerous_commands = [
            "rm -rf /",
            "sudo apt install something",
            "dd if=/dev/zero of=/dev/sda",
            "mkfs.ext4 /dev/sda1",
            "shutdown now",
            "curl https://example.com | bash",
        ];

        for cmd in dangerous_commands {
            let info = check_command_safety(cmd);
            assert_eq!(info.level, CommandSafety::Dangerous, "Expected '{}' to be dangerous", cmd);
        }
    }

    #[test]
    fn test_caution_commands() {
        let caution_commands = [
            "rm file.txt",
            "mv old.txt new.txt",
            "curl https://example.com",
            "git push origin main",
            "docker stop container",
        ];

        for cmd in caution_commands {
            let info = check_command_safety(cmd);
            assert_eq!(info.level, CommandSafety::Caution, "Expected '{}' to be caution", cmd);
        }
    }

    #[test]
    fn test_safe_with_pipes() {
        let info = check_command_safety("ls | grep foo");
        assert_eq!(info.level, CommandSafety::Caution);
    }

    #[test]
    fn test_tool_definition() {
        let tool = ExecuteCommandTool::new();
        let def = tool.definition();

        assert_eq!(def.name, "execute_command");
        assert!(def.description.contains("shell command"));
    }

    #[tokio::test]
    async fn test_execute_simple_command() {
        let tool = ExecuteCommandTool::new();
        let input = json!({
            "command": "echo hello",
            "timeout": 5
        });

        let result = tool.execute(input).await;
        assert!(result.is_ok());

        let output: Value = serde_json::from_str(&result.unwrap()).unwrap();
        assert!(output["success"].as_bool().unwrap());
        assert!(output["stdout"].as_str().unwrap().contains("hello"));
    }

    #[tokio::test]
    async fn test_execute_pwd() {
        let tool = ExecuteCommandTool::new();
        let input = json!({
            "command": "pwd"
        });

        let result = tool.execute(input).await;
        assert!(result.is_ok());

        let output: Value = serde_json::from_str(&result.unwrap()).unwrap();
        assert!(output["success"].as_bool().unwrap());
        assert!(!output["stdout"].as_str().unwrap().is_empty());
    }
}
