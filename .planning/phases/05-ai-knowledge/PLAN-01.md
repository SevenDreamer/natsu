---
phase: 05-ai-knowledge
plan: 01
subsystem: backend
tags: [tool-use, ai, claude, anthropic]

requires: []
provides:
  - Tool calling framework in AI provider
  - Tool definition schema
  - Tool execution orchestration
affects: [PLAN-02, PLAN-03, PLAN-04]

tech-stack:
  added: []
  patterns: [Tool use API, Function calling]

key-files:
  created:
    - natsu/src-tauri/src/ai/tool.rs
  modified:
    - natsu/src-tauri/src/ai/provider.rs
    - natsu/src-tauri/src/ai/claude.rs
    - natsu/src-tauri/src/commands/ai.rs
---

# Phase 5 Plan 01: Tool Calling Framework

**Tool use support for AI providers**

## Goal

实现 AI 工具调用框架，支持定义工具、处理 tool_use 响应、执行工具并返回结果。

## Tasks

### Task 1: Define Tool Schema

Create `natsu/src-tauri/src/ai/tool.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value, // JSON Schema
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolUse {
    pub id: String,
    pub name: String,
    pub input: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_use_id: String,
    pub content: String,
    pub is_error: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContentBlock {
    Text { text: String },
    ToolUse { id: String, name: String, input: serde_json::Value },
    ToolResult { tool_use_id: String, content: String, is_error: bool },
}

pub trait ToolExecutor: Send + Sync {
    fn name(&self) -> &str;
    fn definition(&self) -> ToolDefinition;
    fn execute(&self, input: serde_json::Value) -> Result<String, String>;
}
```

### Task 2: Update Provider Trait

Update `natsu/src-tauri/src/ai/provider.rs`:

```rust
// Add to AIProvider trait
#[async_trait]
pub trait AIProvider: Send + Sync {
    // ... existing methods

    /// Stream completion with tool support
    async fn stream_completion_with_tools(
        &self,
        messages: Vec<Message>,
        tools: Vec<ToolDefinition>,
    ) -> Result<StreamResult, AIError>;

    /// Check if response contains tool use
    fn parse_tool_use(&self, response: &str) -> Option<Vec<ToolUse>>;
}
```

### Task 3: Implement for Claude Provider

Update `natsu/src-tauri/src/ai/claude.rs`:

```rust
use crate::ai::tool::{ToolDefinition, ToolUse, ContentBlock};

impl ClaudeProvider {
    pub async fn chat_with_tools(
        &self,
        messages: Vec<Message>,
        tools: Vec<ToolDefinition>,
    ) -> Result<Vec<ContentBlock>, AIError> {
        // Call Claude API with tools parameter
        // Parse response for content blocks (text + tool_use)
    }
}

// Parse Anthropic's tool_use format
fn parse_content_blocks(response: serde_json::Value) -> Vec<ContentBlock> {
    let content = response["content"].as_array().unwrap();
    content.iter().map(|block| {
        if block["type"] == "text" {
            ContentBlock::Text { text: block["text"].as_str().unwrap().to_string() }
        } else if block["type"] == "tool_use" {
            ContentBlock::ToolUse {
                id: block["id"].as_str().unwrap().to_string(),
                name: block["name"].as_str().unwrap().to_string(),
                input: block["input"].clone(),
            }
        } else {
            // Handle other types
            ContentBlock::Text { text: String::new() }
        }
    }).collect()
}
```

### Task 4: Create Tool Manager

Create `natsu/src-tauri/src/ai/tool_manager.rs`:

```rust
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use super::tool::{ToolDefinition, ToolExecutor, ToolResult};

pub struct ToolManager {
    executors: HashMap<String, Arc<dyn ToolExecutor>>,
}

impl ToolManager {
    pub fn new() -> Self {
        Self { executors: HashMap::new() }
    }

    pub fn register(&mut self, executor: Arc<dyn ToolExecutor>) {
        self.executors.insert(executor.name().to_string(), executor);
    }

    pub fn get_definitions(&self) -> Vec<ToolDefinition> {
        self.executors.values().map(|e| e.definition()).collect()
    }

    pub async fn execute(&self, name: &str, input: serde_json::Value) -> Result<String, String> {
        let executor = self.executors.get(name)
            .ok_or_else(|| format!("Unknown tool: {}", name))?;
        executor.execute(input)
    }
}
```

### Task 5: Add Tauri Commands

Update `natsu/src-tauri/src/commands/ai.rs`:

```rust
use crate::ai::tool::{ToolUse, ToolResult};

#[tauri::command]
pub async fn ai_chat_with_tools(
    messages: Vec<serde_json::Value>,
    provider: String,
    app: AppHandle,
) -> Result<(), String> {
    // 1. Get tool definitions
    // 2. Call AI with tools
    // 3. If tool_use in response, emit event for UI confirmation
    // 4. Execute tool and send result back to AI
}

#[tauri::command]
pub async fn confirm_tool_execution(
    tool_use_id: String,
    approved: bool,
) -> Result<(), String> {
    // Called from UI to approve/deny tool execution
}
```

## Verification

1. Tool definitions can be created
2. AI returns tool_use blocks
3. Tool execution works
4. Results can be sent back to AI

---

*Phase: 05-ai-knowledge*
