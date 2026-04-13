use crate::ai::provider::{AIProvider, AIError, ProviderConfig, StreamResult};
use async_trait::async_trait;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const OPENAI_API_URL: &str = "https://api.openai.com/v1/chat/completions";

#[derive(Debug, Clone, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
    max_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAIResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Clone, Deserialize)]
struct Choice {
    message: Message,
}

pub struct OpenAIProvider {
    client: Client,
    api_key: String,
    model: String,
}

impl OpenAIProvider {
    pub fn new(config: &ProviderConfig) -> Self {
        Self {
            client: Client::new(),
            api_key: config.api_key.clone().unwrap_or_default(),
            model: config.model.clone().unwrap_or_else(|| "gpt-4o".to_string()),
        }
    }
}

#[async_trait]
impl AIProvider for OpenAIProvider {
    async fn stream_completion(
        &self,
        prompt: &str,
        context: Option<&str>,
    ) -> Result<StreamResult, AIError> {
        let full_prompt = match context {
            Some(ctx) => format!("Context:\n{}\n\n{}", ctx, prompt),
            None => prompt.to_string(),
        };

        let request = OpenAIRequest {
            model: self.model.clone(),
            messages: vec![Message {
                role: "user".to_string(),
                content: full_prompt,
            }],
            stream: true,
            max_tokens: Some(4096),
        };

        let response = self.client
            .post(OPENAI_API_URL)
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

        Ok(Box::pin(parse_openai_stream(stream)))
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

        let request = OpenAIRequest {
            model: self.model.clone(),
            messages: vec![Message {
                role: "user".to_string(),
                content: full_prompt,
            }],
            stream: false,
            max_tokens: Some(4096),
        };

        let response = self.client
            .post(OPENAI_API_URL)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let result: OpenAIResponse = response
            .json()
            .await
            .map_err(|e| AIError::ApiError(e.to_string()))?;

        Ok(result.choices.first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default())
    }

    fn name(&self) -> &str {
        "OpenAI"
    }

    fn is_configured(&self) -> bool {
        !self.api_key.is_empty()
    }
}

fn parse_openai_stream(
    stream: impl Stream<Item = Result<String, AIError>> + Send + 'static
) -> impl Stream<Item = Result<String, AIError>> + Send {
    stream.filter_map(|chunk| async move {
        match chunk {
            Ok(text) => {
                // OpenAI SSE format: data: {"choices":[{"delta":{"content":"..."}}]}
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
