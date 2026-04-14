use crate::ai::provider::{AIProvider, AIError, ProviderConfig, StreamResult, StreamContentResult, AIResponse, UsageInfo};
use crate::ai::tool::{ContentBlock, Message, ToolDefinition};
use async_trait::async_trait;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const CLAUDE_API_URL: &str = "https://api.anthropic.com/v1/messages";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<ClaudeMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tools: Vec<ClaudeTool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClaudeMessage {
    role: String,
    content: ClaudeContent,
}

/// Claude API content can be either a string or array of content blocks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
enum ClaudeContent {
    Text(String),
    Blocks(Vec<ClaudeContentBlock>),
}

impl From<&Message> for ClaudeMessage {
    fn from(msg: &Message) -> Self {
        use crate::ai::tool::MessageContent;

        let content = match &msg.content {
            MessageContent::Text(text) => ClaudeContent::Text(text.clone()),
            MessageContent::Blocks(blocks) => {
                let claude_blocks: Vec<ClaudeContentBlock> = blocks
                    .iter()
                    .map(|b| match b {
                        ContentBlock::Text { text } => ClaudeContentBlock::Text { text: text.clone() },
                        ContentBlock::ToolUse { id, name, input } => ClaudeContentBlock::ToolUse {
                            id: id.clone(),
                            name: name.clone(),
                            input: input.clone(),
                        },
                        ContentBlock::ToolResult { tool_use_id, content, is_error } => ClaudeContentBlock::ToolResult {
                            tool_use_id: tool_use_id.clone(),
                            content: content.clone(),
                            is_error: *is_error,
                        },
                    })
                    .collect();
                ClaudeContent::Blocks(claude_blocks)
            }
        };

        Self {
            role: msg.role.clone(),
            content,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ClaudeContentBlock {
    Text { text: String },
    ToolUse { id: String, name: String, input: serde_json::Value },
    ToolResult { tool_use_id: String, content: String, #[serde(default)] is_error: bool },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClaudeTool {
    name: String,
    description: String,
    input_schema: serde_json::Value,
}

impl From<&ToolDefinition> for ClaudeTool {
    fn from(def: &ToolDefinition) -> Self {
        Self {
            name: def.name.clone(),
            description: def.description.clone(),
            input_schema: def.input_schema.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClaudeResponse {
    content: Vec<ClaudeContentBlock>,
    stop_reason: String,
    #[serde(default)]
    usage: Option<ClaudeUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClaudeUsage {
    input_tokens: u32,
    output_tokens: u32,
}

pub struct ClaudeProvider {
    client: Client,
    api_key: String,
    model: String,
}

impl ClaudeProvider {
    pub fn new(config: &ProviderConfig) -> Self {
        Self {
            client: Client::new(),
            api_key: config.api_key.clone().unwrap_or_default(),
            model: config.model.clone().unwrap_or_else(|| "claude-3-5-sonnet-20241022".to_string()),
        }
    }
}

#[async_trait]
impl AIProvider for ClaudeProvider {
    async fn stream_completion(
        &self,
        prompt: &str,
        context: Option<&str>,
    ) -> Result<StreamResult, AIError> {
        let full_prompt = match context {
            Some(ctx) => format!("Context:\n{}\n\n{}", ctx, prompt),
            None => prompt.to_string(),
        };

        let request = ClaudeRequest {
            model: self.model.clone(),
            max_tokens: 4096,
            messages: vec![ClaudeMessage {
                role: "user".to_string(),
                content: ClaudeContent::Text(full_prompt),
            }],
            stream: Some(true),
            tools: vec![],
        };

        let response = self.client
            .post(CLAUDE_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        // Return stream that parses SSE events
        let stream = response.bytes_stream()
            .map(|chunk| {
                chunk.map_err(|e| AIError::NetworkError(e.to_string()))
                    .map(|bytes| String::from_utf8_lossy(&bytes).to_string())
            });

        Ok(Box::pin(parse_claude_stream(stream)))
    }

    async fn complete(
        &self,
        prompt: &str,
        context: Option<&str>,
    ) -> Result<String, AIError> {
        let full_prompt = match context {
            Some(ctx) => format!("Context:\n{}\n\n{}", ctx, prompt),
            None => prompt.to_string(),
        };

        let request = ClaudeRequest {
            model: self.model.clone(),
            max_tokens: 4096,
            messages: vec![ClaudeMessage {
                role: "user".to_string(),
                content: ClaudeContent::Text(full_prompt),
            }],
            stream: None,
            tools: vec![],
        };

        let response = self.client
            .post(CLAUDE_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let result: ClaudeResponse = response
            .json()
            .await
            .map_err(|e| AIError::ApiError(e.to_string()))?;

        // Extract text from content blocks
        let text = result.content.iter()
            .filter_map(|block| match block {
                ClaudeContentBlock::Text { text } => Some(text.clone()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join("");

        Ok(text)
    }

    async fn stream_completion_with_tools(
        &self,
        messages: &[Message],
        tools: &[ToolDefinition],
    ) -> Result<StreamContentResult, AIError> {
        let claude_messages: Vec<ClaudeMessage> = messages.iter().map(ClaudeMessage::from).collect();
        let claude_tools: Vec<ClaudeTool> = tools.iter().map(ClaudeTool::from).collect();

        let request = ClaudeRequest {
            model: self.model.clone(),
            max_tokens: 4096,
            messages: claude_messages,
            stream: Some(true),
            tools: claude_tools,
        };

        let response = self.client
            .post(CLAUDE_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let stream = response.bytes_stream()
            .map(|chunk| {
                chunk.map_err(|e| AIError::NetworkError(e.to_string()))
                    .map(|bytes| String::from_utf8_lossy(&bytes).to_string())
            });

        Ok(Box::pin(parse_claude_content_stream(stream)))
    }

    async fn complete_with_tools(
        &self,
        messages: &[Message],
        tools: &[ToolDefinition],
    ) -> Result<AIResponse, AIError> {
        let claude_messages: Vec<ClaudeMessage> = messages.iter().map(ClaudeMessage::from).collect();
        let claude_tools: Vec<ClaudeTool> = tools.iter().map(ClaudeTool::from).collect();

        let request = ClaudeRequest {
            model: self.model.clone(),
            max_tokens: 4096,
            messages: claude_messages,
            stream: None,
            tools: claude_tools,
        };

        let response = self.client
            .post(CLAUDE_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let result: ClaudeResponse = response
            .json()
            .await
            .map_err(|e| AIError::ApiError(e.to_string()))?;

        // Convert Claude content blocks to our ContentBlock type
        let content: Vec<ContentBlock> = result.content.into_iter()
            .map(|block| match block {
                ClaudeContentBlock::Text { text } => ContentBlock::Text { text },
                ClaudeContentBlock::ToolUse { id, name, input } => ContentBlock::ToolUse { id, name, input },
                ClaudeContentBlock::ToolResult { tool_use_id, content, is_error } => ContentBlock::ToolResult { tool_use_id, content, is_error },
            })
            .collect();

        Ok(AIResponse {
            content,
            stop_reason: result.stop_reason,
            usage: result.usage.map(|u| UsageInfo {
                input_tokens: u.input_tokens,
                output_tokens: u.output_tokens,
            }),
        })
    }

    fn name(&self) -> &str {
        "Claude"
    }

    fn is_configured(&self) -> bool {
        !self.api_key.is_empty()
    }
}

fn parse_claude_stream(
    stream: impl Stream<Item = Result<String, AIError>> + Send + 'static
) -> impl Stream<Item = Result<String, AIError>> + Send {
    // Simplified SSE parser - extracts text from content_block_delta events
    stream.filter_map(|chunk| async move {
        match chunk {
            Ok(text) => {
                // Look for content_block_delta with text delta
                if text.contains("\"type\":\"content_block_delta\"") {
                    // Extract text field from the delta
                    if let Some(start) = text.find("\"text\":\"") {
                        let start = start + 8;
                        if let Some(end) = text[start..].find("\"") {
                            let text_content = &text[start..start + end];
                            // Unescape basic JSON
                            let unescaped = text_content
                                .replace("\\n", "\n")
                                .replace("\\\"", "\"")
                                .replace("\\\\", "\\");
                            return Some(Ok(unescaped));
                        }
                    }
                }
                None
            }
            Err(e) => Some(Err(e)),
        }
    })
}

/// Parse Claude SSE stream into content blocks
/// Note: This simplified version only extracts text content.
/// Full tool_use streaming requires stateful parsing across chunks.
fn parse_claude_content_stream(
    stream: impl Stream<Item = Result<String, AIError>> + Send + 'static
) -> impl Stream<Item = Result<ContentBlock, AIError>> + Send {
    // For now, use text-only streaming (tool_use will come through in complete_with_tools)
    stream.filter_map(|chunk| async move {
        match chunk {
            Ok(text) => {
                // Look for content_block_delta with text delta
                if text.contains("\"type\":\"content_block_delta\"") && text.contains("\"type\":\"text_delta\"") {
                    // Extract text field from the delta
                    if let Some(start) = text.find("\"text\":\"") {
                        let start = start + 8;
                        if let Some(end) = text[start..].find("\"") {
                            let text_content = &text[start..start + end];
                            // Unescape basic JSON
                            let unescaped = text_content
                                .replace("\\n", "\n")
                                .replace("\\\"", "\"")
                                .replace("\\\\", "\\");
                            return Some(Ok(ContentBlock::Text { text: unescaped }));
                        }
                    }
                }
                None
            }
            Err(e) => Some(Err(e)),
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_claude_tool_conversion() {
        let def = ToolDefinition {
            name: "test".to_string(),
            description: "Test tool".to_string(),
            input_schema: serde_json::json!({"type": "object"}),
        };

        let claude_tool = ClaudeTool::from(&def);
        assert_eq!(claude_tool.name, "test");
    }

    #[test]
    fn test_message_conversion() {
        let msg = Message::user("Hello");
        let claude_msg = ClaudeMessage::from(&msg);
        assert_eq!(claude_msg.role, "user");
    }
}
