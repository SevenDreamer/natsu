use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use super::tool::{ToolDefinition, ToolExecutor, ToolResult};

/// Manager for registering and executing tools
pub struct ToolManager {
    executors: Arc<RwLock<HashMap<String, Arc<dyn ToolExecutor>>>>,
}

impl ToolManager {
    /// Create a new empty tool manager
    pub fn new() -> Self {
        Self {
            executors: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register a tool executor
    pub async fn register<E: ToolExecutor + 'static>(&self, executor: E) {
        let def = executor.definition();
        let name = def.name.clone();
        let mut executors = self.executors.write().await;
        executors.insert(name, Arc::new(executor));
    }

    /// Register a tool executor from an Arc
    pub async fn register_arc(&self, executor: Arc<dyn ToolExecutor>) {
        let def = executor.definition();
        let name = def.name.clone();
        let mut executors = self.executors.write().await;
        executors.insert(name, executor);
    }

    /// Unregister a tool by name
    pub async fn unregister(&self, name: &str) -> bool {
        let mut executors = self.executors.write().await;
        executors.remove(name).is_some()
    }

    /// Get all registered tool definitions
    pub async fn get_definitions(&self) -> Vec<ToolDefinition> {
        let executors = self.executors.read().await;
        executors.values().map(|e| e.definition()).collect()
    }

    /// Check if a tool is registered
    pub async fn has_tool(&self, name: &str) -> bool {
        let executors = self.executors.read().await;
        executors.contains_key(name)
    }

    /// Execute a tool by name
    pub async fn execute(&self, name: &str, input: serde_json::Value, tool_use_id: String) -> ToolResult {
        let executors = self.executors.read().await;

        match executors.get(name) {
            Some(executor) => {
                match executor.execute(input).await {
                    Ok(result) => ToolResult::success(tool_use_id, result),
                    Err(error) => ToolResult::error(tool_use_id, error),
                }
            }
            None => ToolResult::error(
                tool_use_id,
                format!("Unknown tool: {}", name),
            ),
        }
    }

    /// Get a tool definition by name
    pub async fn get_definition(&self, name: &str) -> Option<ToolDefinition> {
        let executors = self.executors.read().await;
        executors.get(name).map(|e| e.definition())
    }
}

impl Default for ToolManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Builder for creating a tool manager with pre-registered tools
pub struct ToolManagerBuilder {
    executors: HashMap<String, Arc<dyn ToolExecutor>>,
}

impl ToolManagerBuilder {
    /// Create a new builder
    pub fn new() -> Self {
        Self {
            executors: HashMap::new(),
        }
    }

    /// Add a tool executor
    pub fn with_tool<E: ToolExecutor + 'static>(mut self, executor: E) -> Self {
        let def = executor.definition();
        let name = def.name.clone();
        self.executors.insert(name, Arc::new(executor));
        self
    }

    /// Add a tool executor from an Arc
    pub fn with_tool_arc(mut self, executor: Arc<dyn ToolExecutor>) -> Self {
        let def = executor.definition();
        let name = def.name.clone();
        self.executors.insert(name, executor);
        self
    }

    /// Build the tool manager
    pub fn build(self) -> ToolManager {
        ToolManager {
            executors: Arc::new(RwLock::new(self.executors)),
        }
    }
}

impl Default for ToolManagerBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::tool::SimpleToolExecutor;
    use serde_json::json;

    #[tokio::test]
    async fn test_register_and_execute() {
        let manager = ToolManager::new();

        let executor = SimpleToolExecutor::new(
            "echo",
            "Echo the input",
            json!({"type": "object", "properties": {"message": {"type": "string"}}}),
            |input| Ok(input["message"].as_str().unwrap_or("").to_string()),
        );

        manager.register(executor).await;

        let result = manager.execute(
            "echo",
            json!({"message": "hello"}),
            "tool_123".to_string(),
        ).await;

        assert!(!result.is_error);
        assert_eq!(result.content, "hello");
    }

    #[tokio::test]
    async fn test_unknown_tool() {
        let manager = ToolManager::new();

        let result = manager.execute(
            "unknown",
            json!({}),
            "tool_456".to_string(),
        ).await;

        assert!(result.is_error);
        assert!(result.content.contains("Unknown tool"));
    }

    #[tokio::test]
    async fn test_get_definitions() {
        let manager = ToolManagerBuilder::new()
            .with_tool(SimpleToolExecutor::new(
                "tool1",
                "First tool",
                json!({"type": "object"}),
                |_| Ok("result1".to_string()),
            ))
            .with_tool(SimpleToolExecutor::new(
                "tool2",
                "Second tool",
                json!({"type": "object"}),
                |_| Ok("result2".to_string()),
            ))
            .build();

        let definitions = manager.get_definitions().await;
        assert_eq!(definitions.len(), 2);

        let names: Vec<&str> = definitions.iter().map(|d| d.name.as_str()).collect();
        assert!(names.contains(&"tool1"));
        assert!(names.contains(&"tool2"));
    }

    #[tokio::test]
    async fn test_unregister() {
        let manager = ToolManager::new();

        let executor = SimpleToolExecutor::new(
            "temp",
            "Temporary tool",
            json!({"type": "object"}),
            |_| Ok("temp".to_string()),
        );

        manager.register(executor).await;
        assert!(manager.has_tool("temp").await);

        let removed = manager.unregister("temp").await;
        assert!(removed);
        assert!(!manager.has_tool("temp").await);
    }
}
