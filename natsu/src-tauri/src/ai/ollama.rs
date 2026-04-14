use crate::ai::provider::{AIProvider, AIError, ProviderConfig, StreamResult, StreamContentResult, AIResponse};
use crate::ai::tool::{Message as ToolMessage, ToolDefinition};
use async_trait::async_trait;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const DEFAULT_OLLAMA_URL: &str = "http://localhost:11434";

#[derive(Debug, Clone, Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
    context: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct OllamaResponse {
    response: String,
}

pub struct OllamaProvider {
    client: Client,
    base_url: String,
    model: String,
}

impl OllamaProvider {
    pub fn new(config: &ProviderConfig) -> Self {
        Self {
            client: Client::new(),
            base_url: config.base_url.clone().unwrap_or_else(|| DEFAULT_OLLAMA_URL.to_string()),
            model: config.model.clone().unwrap_or_else(|| "llama3.2".to_string()),
        }
    }
}

#[async_trait]
impl AIProvider for OllamaProvider {
    async fn stream_completion(
        &self,
        prompt: &str,
        context: Option<&str>,
    ) -> Result<StreamResult, AIError> {
        let request = OllamaRequest {
            model: self.model.clone(),
            prompt: prompt.to_string(),
            stream: true,
            context: context.map(|s| s.to_string()),
        };

        let url = format!("{}/api/generate", self.base_url);
        let response = self.client
            .post(&url)
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

        Ok(Box::pin(parse_ollama_stream(stream)))
    }

    async fn complete(
        &self,
        prompt: &str,
        context: Option<&str>,
    ) -> Result<String, AIError> {
        let request = OllamaRequest {
            model: self.model.clone(),
            prompt: prompt.to_string(),
            stream: false,
            context: context.map(|s| s.to_string()),
        };

        let url = format!("{}/api/generate", self.base_url);
        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AIError::NetworkError(e.to_string()))?;

        let result: OllamaResponse = response
            .json()
            .await
            .map_err(|e| AIError::ApiError(e.to_string()))?;

        Ok(result.response)
    }

    fn name(&self) -> &str {
        "Ollama"
    }

    fn is_configured(&self) -> bool {
        // Ollama doesn't require API key, just needs running server
        true
    }

    async fn stream_completion_with_tools(
        &self,
        _messages: &[ToolMessage],
        _tools: &[ToolDefinition],
    ) -> Result<StreamContentResult, AIError> {
        // TODO: Implement Ollama tools support
        Err(AIError::ApiError("Tool calling not yet implemented for Ollama provider".to_string()))
    }

    async fn complete_with_tools(
        &self,
        _messages: &[ToolMessage],
        _tools: &[ToolDefinition],
    ) -> Result<AIResponse, AIError> {
        // TODO: Implement Ollama tools support
        Err(AIError::ApiError("Tool calling not yet implemented for Ollama provider".to_string()))
    }
}

fn parse_ollama_stream(
    stream: impl Stream<Item = Result<String, AIError>> + Send + 'static
) -> impl Stream<Item = Result<String, AIError>> + Send {
    // Ollama returns newline-delimited JSON
    stream.filter_map(|chunk| async move {
        match chunk {
            Ok(text) => {
                for line in text.lines() {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(line) {
                        if let Some(response) = parsed["response"].as_str() {
                            if !response.is_empty() {
                                return Some(Ok(response.to_string()));
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
