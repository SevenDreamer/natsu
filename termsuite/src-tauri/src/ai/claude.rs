use crate::ai::provider::{AIProvider, AIError, ProviderConfig, StreamResult};
use async_trait::async_trait;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const CLAUDE_API_URL: &str = "https://api.anthropic.com/v1/messages";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClaudeRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<Message>,
    stream: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ClaudeResponse {
    content: Vec<ContentBlock>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ContentBlock {
    text: String,
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
            messages: vec![Message {
                role: "user".to_string(),
                content: full_prompt,
            }],
            stream: true,
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
            messages: vec![Message {
                role: "user".to_string(),
                content: full_prompt,
            }],
            stream: false,
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

        Ok(result.content.first()
            .map(|c| c.text.clone())
            .unwrap_or_default())
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
