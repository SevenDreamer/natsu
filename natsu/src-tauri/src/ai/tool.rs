use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

/// Definition of a tool that can be called by AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    /// Name of the tool (must be unique)
    pub name: String,
    /// Human-readable description of what the tool does
    pub description: String,
    /// JSON Schema for the tool's input parameters
    pub input_schema: Value,
}

/// Represents a tool use request from the AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolUse {
    /// Unique identifier for this tool use
    pub id: String,
    /// Name of the tool to call
    pub name: String,
    /// Input parameters for the tool
    pub input: Value,
}

/// Result from executing a tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    /// ID of the tool use this result corresponds to
    pub tool_use_id: String,
    /// Content of the result (usually JSON or text)
    pub content: String,
    /// Whether the tool execution resulted in an error
    #[serde(default)]
    pub is_error: bool,
}

impl ToolResult {
    /// Create a successful tool result
    pub fn success(tool_use_id: String, content: String) -> Self {
        Self {
            tool_use_id,
            content,
            is_error: false,
        }
    }

    /// Create an error tool result
    pub fn error(tool_use_id: String, error_message: String) -> Self {
        Self {
            tool_use_id,
            content: error_message,
            is_error: true,
        }
    }
}

/// Content block in AI messages - supports text, tool use, and tool results
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlock {
    /// Plain text content
    Text {
        text: String,
    },
    /// Tool use request from the AI
    ToolUse {
        id: String,
        name: String,
        input: Value,
    },
    /// Tool execution result
    ToolResult {
        tool_use_id: String,
        content: String,
        #[serde(default)]
        is_error: bool,
    },
}

impl ContentBlock {
    /// Create a text content block
    pub fn text(text: impl Into<String>) -> Self {
        ContentBlock::Text { text: text.into() }
    }

    /// Create a tool use content block
    pub fn tool_use(id: impl Into<String>, name: impl Into<String>, input: Value) -> Self {
        ContentBlock::ToolUse {
            id: id.into(),
            name: name.into(),
            input,
        }
    }

    /// Create a tool result content block
    pub fn tool_result(tool_use_id: impl Into<String>, content: impl Into<String>, is_error: bool) -> Self {
        ContentBlock::ToolResult {
            tool_use_id: tool_use_id.into(),
            content: content.into(),
            is_error,
        }
    }

    /// Check if this is a tool use block
    pub fn is_tool_use(&self) -> bool {
        matches!(self, ContentBlock::ToolUse { .. })
    }

    /// Get tool use info if this is a tool use block
    pub fn as_tool_use(&self) -> Option<(&str, &str, &Value)> {
        match self {
            ContentBlock::ToolUse { id, name, input } => Some((id, name, input)),
            _ => None,
        }
    }
}

/// Message in a conversation with support for content blocks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    /// Role: "user" or "assistant"
    pub role: String,
    /// Content as either a simple string or array of content blocks
    #[serde(with = "message_content")]
    pub content: MessageContent,
}

/// Message content can be either simple text or structured blocks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessageContent {
    /// Simple text content
    Text(String),
    /// Structured content blocks
    Blocks(Vec<ContentBlock>),
}

mod message_content {
    use super::{ContentBlock, MessageContent};
    use serde::{self, Deserialize, Deserializer, Serializer, Serialize};

    pub fn serialize<S>(content: &MessageContent, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match content {
            MessageContent::Text(text) => serializer.serialize_str(text),
            MessageContent::Blocks(blocks) => blocks.serialize(serializer),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<MessageContent, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = serde_json::Value::deserialize(deserializer)?;
        match value {
            serde_json::Value::String(s) => Ok(MessageContent::Text(s)),
            serde_json::Value::Array(_) => {
                let blocks: Vec<ContentBlock> = serde_json::from_value(value)
                    .map_err(serde::de::Error::custom)?;
                Ok(MessageContent::Blocks(blocks))
            }
            _ => Err(serde::de::Error::custom("expected string or array")),
        }
    }
}

impl Message {
    /// Create a user message with text content
    pub fn user(text: impl Into<String>) -> Self {
        Self {
            role: "user".to_string(),
            content: MessageContent::Text(text.into()),
        }
    }

    /// Create an assistant message with text content
    pub fn assistant(text: impl Into<String>) -> Self {
        Self {
            role: "assistant".to_string(),
            content: MessageContent::Text(text.into()),
        }
    }

    /// Create a user message with content blocks
    pub fn user_blocks(blocks: Vec<ContentBlock>) -> Self {
        Self {
            role: "user".to_string(),
            content: MessageContent::Blocks(blocks),
        }
    }

    /// Create an assistant message with content blocks
    pub fn assistant_blocks(blocks: Vec<ContentBlock>) -> Self {
        Self {
            role: "assistant".to_string(),
            content: MessageContent::Blocks(blocks),
        }
    }
}

/// Trait for implementing tool executors
#[async_trait]
pub trait ToolExecutor: Send + Sync {
    /// Get the tool definition
    fn definition(&self) -> ToolDefinition;

    /// Execute the tool with given input
    async fn execute(&self, input: Value) -> Result<String, String>;
}

/// A simple tool executor that uses a closure
pub struct SimpleToolExecutor {
    definition: ToolDefinition,
    executor: Box<dyn Fn(Value) -> Result<String, String> + Send + Sync>,
}

impl SimpleToolExecutor {
    /// Create a new simple tool executor
    pub fn new<F>(name: impl Into<String>, description: impl Into<String>, input_schema: Value, executor: F) -> Self
    where
        F: Fn(Value) -> Result<String, String> + Send + Sync + 'static,
    {
        Self {
            definition: ToolDefinition {
                name: name.into(),
                description: description.into(),
                input_schema,
            },
            executor: Box::new(executor),
        }
    }
}

#[async_trait]
impl ToolExecutor for SimpleToolExecutor {
    fn definition(&self) -> ToolDefinition {
        self.definition.clone()
    }

    async fn execute(&self, input: Value) -> Result<String, String> {
        (self.executor)(input)
    }
}

/// An async tool executor that uses an async closure
pub struct AsyncToolExecutor<F> {
    definition: ToolDefinition,
    executor: F,
}

impl<F> AsyncToolExecutor<F>
where
    F: Fn(Value) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send>> + Send + Sync,
{
    /// Create a new async tool executor
    pub fn new(
        name: impl Into<String>,
        description: impl Into<String>,
        input_schema: Value,
        executor: F,
    ) -> Self {
        Self {
            definition: ToolDefinition {
                name: name.into(),
                description: description.into(),
                input_schema,
            },
            executor,
        }
    }
}

#[async_trait]
impl<F> ToolExecutor for AsyncToolExecutor<F>
where
    F: Fn(Value) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<String, String>> + Send>> + Send + Sync,
{
    fn definition(&self) -> ToolDefinition {
        self.definition.clone()
    }

    async fn execute(&self, input: Value) -> Result<String, String> {
        (self.executor)(input).await
    }
}

/// Build a simple JSON Schema for object with properties
pub fn build_object_schema(properties: HashMap<&str, (&str, &str)>) -> Value {
    let mut props = serde_json::Map::new();
    let mut required = Vec::new();

    for (name, (prop_type, description)) in properties {
        props.insert(
            name.to_string(),
            serde_json::json!({
                "type": prop_type,
                "description": description
            }),
        );
        required.push(name.to_string());
    }

    serde_json::json!({
        "type": "object",
        "properties": props,
        "required": required
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_definition() {
        let def = ToolDefinition {
            name: "get_weather".to_string(),
            description: "Get current weather for a location".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name"
                    }
                },
                "required": ["location"]
            }),
        };

        assert_eq!(def.name, "get_weather");
    }

    #[test]
    fn test_tool_result() {
        let success = ToolResult::success("tool_123".to_string(), "72°F".to_string());
        assert!(!success.is_error);

        let error = ToolResult::error("tool_456".to_string(), "Location not found".to_string());
        assert!(error.is_error);
    }

    #[test]
    fn test_content_block() {
        let text = ContentBlock::text("Hello");
        assert!(!text.is_tool_use());

        let tool_use = ContentBlock::tool_use("id1", "get_weather", serde_json::json!({"location": "Tokyo"}));
        assert!(tool_use.is_tool_use());

        let (id, name, input) = tool_use.as_tool_use().unwrap();
        assert_eq!(id, "id1");
        assert_eq!(name, "get_weather");
        assert_eq!(input["location"], "Tokyo");
    }

    #[test]
    fn test_message() {
        let user_msg = Message::user("Hello");
        assert_eq!(user_msg.role, "user");

        let tool_result = ContentBlock::tool_result("tool_123", "Result content", false);
        let user_with_result = Message::user_blocks(vec![tool_result]);
        assert_eq!(user_with_result.role, "user");
    }

    #[test]
    fn test_build_object_schema() {
        let mut props = HashMap::new();
        props.insert("name", ("string", "User name"));
        props.insert("age", ("integer", "User age"));

        let schema = build_object_schema(props);
        assert_eq!(schema["type"], "object");
        assert!(schema["properties"]["name"].is_object());
        assert!(schema["required"].as_array().unwrap().contains(&serde_json::json!("name")));
    }
}
