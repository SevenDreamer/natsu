use crate::ai::provider::{AIProvider, AIError, ProviderConfig, StreamResult, StreamContentResult, AIResponse};
use crate::ai::tool::{Message as ToolMessage, ToolDefinition};
use async_trait::async_trait;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const DEEPSEEK_API_URL: &str = "https://api.deepseek.com/v1/chat/completions";

#[derive(Debug, Clone, Serialize)]
struct DeepSeekRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Clone, Deserialize)]
struct DeepSeekResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Clone, Deserialize)]
struct Choice {
    message: Message,
}

pub struct DeepSeekProvider {
    client: Client,
    api_key: String,
    model: String,
}

impl DeepSeekProvider {
    pub fn new(config: &ProviderConfig) -> Self {
        Self {
            client: Client::new(),
            api_key: config.api_key.clone().unwrap_or_default(),
            model: config.model.clone().unwrap_or_else(|| "deepseek-chat".to_string()),
        }
    }
}

#[async_trait]
impl AIProvider for DeepSeekProvider {
    async fn stream_completion(
        &self,
        prompt: &str,
        context: Option<&str>,
    ) -> Result<StreamResult, AIError> {
        let full_prompt = match context {
            Some(ctx) => format!("Context:\n{}\n\n{}", ctx, prompt),
            None => prompt.to_string(),
        };

        let request = DeepSeekRequest {
            model: self.model.clone(),
            messages: vec![Message {
                role: "user".to_string(),
                content: full_prompt,
            }],
            stream: true,
        };

        let response = self.client
            .post(DEEPSEEK_API_URL)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let stream = response.bytes_stream()
            .map(|chunk| {
                chunk.map_err(|e| AIError::NetworkError(e.to_string()))
                    .map(|bytes| String::from_utf8_lossy(&bytes).to_string())
            });

        Ok(Box::pin(parse_deepseek_stream(stream)))
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

        let request = DeepSeekRequest {
            model: self.model.clone(),
            messages: vec![Message {
                role: "user".to_string(),
                content: full_prompt,
            }],
            stream: false,
        };

        let response = self.client
            .post(DEEPSEEK_API_URL)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let result: DeepSeekResponse = response
            .json()
            .await
            .map_err(|e| AIError::ApiError(e.to_string()))?;

        Ok(result.choices.first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default())
    }

    fn name(&self) -> &str {
        "DeepSeek"
    }

    fn is_configured(&self) -> bool {
        !self.api_key.is_empty()
    }

    async fn stream_completion_with_tools(
        &self,
        _messages: &[ToolMessage],
        _tools: &[ToolDefinition],
    ) -> Result<StreamContentResult, AIError> {
        // TODO: Implement DeepSeek tools support
        Err(AIError::ApiError("Tool calling not yet implemented for DeepSeek provider".to_string()))
    }

    async fn complete_with_tools(
        &self,
        _messages: &[ToolMessage],
        _tools: &[ToolDefinition],
    ) -> Result<AIResponse, AIError> {
        // TODO: Implement DeepSeek tools support
        Err(AIError::ApiError("Tool calling not yet implemented for DeepSeek provider".to_string()))
    }
}

fn parse_deepseek_stream(
    stream: impl Stream<Item = Result<String, AIError>> + Send + 'static
) -> impl Stream<Item = Result<String, AIError>> + Send {
    // DeepSeek uses OpenAI-compatible SSE format
    stream.filter_map(|chunk| async move {
        match chunk {
            Ok(text) => {
                for line in text.lines() {
                    if line.starts_with("data: ") && !line.contains("[DONE]") {
                        let json_str = &line[6..];
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str) {
                            if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                                return Some(Ok(content.to_string()));
                            }
                        }
                    }
                }
                None
            }
            Err(e) => Some(Err(e)),
        }
    })
}
