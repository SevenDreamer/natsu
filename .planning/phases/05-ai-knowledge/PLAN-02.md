---
phase: 05-ai-knowledge
plan: 02
subsystem: backend
tags: [terminal, command, tool, security]

requires:
  - phase: PLAN-01
    provides: Tool calling framework
provides:
  - execute_command tool implementation
  - Command whitelist/blacklist
affects: []

tech-stack:
  added: []
  patterns: [Command validation, Security sandbox]

key-files:
  created:
    - natsu/src-tauri/src/ai/tools/execute_command.rs
  modified:
    - natsu/src-tauri/src/ai/mod.rs
---

# Phase 5 Plan 02: Terminal Command Tool

**Execute terminal commands via AI tool calling**

## Goal

实现 `execute_command` 工具，让 AI 能够执行终端命令，带安全确认机制。

## Tasks

### Task 1: Create Execute Command Tool

Create `natsu/src-tauri/src/ai/tools/execute_command.rs`:

```rust
use crate::ai::tool::{ToolDefinition, ToolExecutor};
use tokio::process::Command;
use serde_json::Value;

pub struct ExecuteCommandTool;

impl ToolExecutor for ExecuteCommandTool {
    fn name(&self) -> &str {
        "execute_command"
    }

    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: "execute_command".to_string(),
            description: "Execute a shell command in the terminal. Use this to run system commands, scripts, or utilities.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The shell command to execute"
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "Timeout in milliseconds (default 30000)",
                        "default": 30000
                    }
                },
                "required": ["command"]
            }),
        }
    }

    fn execute(&self, input: Value) -> Result<String, String> {
        let command = input["command"].as_str()
            .ok_or("Missing 'command' parameter")?;

        // Check if command is safe
        let safety = check_command_safety(command);
        if safety == CommandSafety::Dangerous {
            return Err("Command requires user approval".to_string());
        }

        // Execute command
        execute_shell_command(command)
    }
}
```

### Task 2: Implement Safety Check

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum CommandSafety {
    Safe,      // Auto-execute
    Caution,   // Show warning, ask confirmation
    Dangerous, // Require explicit approval
}

fn check_command_safety(command: &str) -> CommandSafety {
    let command = command.trim();

    // Dangerous patterns
    let dangerous_patterns = [
        "rm -rf", "rm -r", "rm -R",
        "sudo", "su ",
        "chmod 777",
        "dd if=",
        "> /dev/",
        "mkfs",
        "fdisk",
        ":(){ :|:& };:",  // Fork bomb
    ];

    for pattern in dangerous_patterns {
        if command.contains(pattern) {
            return CommandSafety::Dangerous;
        }
    }

    // Safe commands (read-only)
    let safe_commands = [
        "ls", "cat", "pwd", "echo", "head", "tail",
        "grep", "find", "which", "type", "whoami",
        "date", "uptime", "df", "du", "free",
        "git status", "git log", "git diff", "git branch",
    ];

    let first_word = command.split_whitespace().next().unwrap_or("");
    if safe_commands.iter().any(|c| command.starts_with(c)) {
        return CommandSafety::Safe;
    }

    // Everything else needs confirmation
    CommandSafety::Caution
}

pub fn get_safety_info(command: &str) -> (CommandSafety, String) {
    let safety = check_command_safety(command);
    let message = match safety {
        CommandSafety::Safe => "Command is safe to execute.".to_string(),
        CommandSafety::Caution => "Command requires confirmation.".to_string(),
        CommandSafety::Dangerous => format!(
            "⚠️ Dangerous command detected: '{}'. This may cause data loss or system changes.",
            command.split_whitespace().next().unwrap_or("")
        ),
    };
    (safety, message)
}
```

### Task 3: Execute Shell Command

```rust
use tokio::process::Command;
use std::time::Duration;

async fn execute_shell_command(command: &str) -> Result<String, String> {
    let output = Command::new("sh")
        .arg("-c")
        .arg(command)
        .output()
        .await
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        Ok(stdout.to_string())
    } else {
        Err(format!("Command failed with exit code {:?}\n{}",
            output.status.code(), stderr))
    }
}
```

### Task 4: Register Tool

Update `natsu/src-tauri/src/ai/mod.rs`:

```rust
pub mod tools;
pub mod tool_manager;

use tools::execute_command::ExecuteCommandTool;

// In initialization
fn register_tools(manager: &mut ToolManager) {
    manager.register(Arc::new(ExecuteCommandTool));
}
```

### Task 5: Add Confirmation Event

Update commands to emit confirmation request:

```rust
// When tool_use requires confirmation
app.emit("tool-confirmation-required", ToolConfirmationRequest {
    tool_use_id: tool_use.id.clone(),
    tool_name: tool_use.name.clone(),
    input: tool_use.input.clone(),
    safety_level: safety,
    message: safety_message,
})?;
```

## Verification

1. Tool is registered
2. Safe commands execute automatically
3. Dangerous commands require confirmation
4. Command output is returned correctly
5. Errors are handled gracefully

---

*Phase: 05-ai-knowledge*
