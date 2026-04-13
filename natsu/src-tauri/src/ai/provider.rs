use async_trait::async_trait;
use futures::Stream;
use serde::{Deserialize, Serialize};
use std::pin::Pin;

use super::claude::ClaudeProvider;
use super::openai::OpenAIProvider;
use super::deepseek::DeepSeekProvider;
use super::ollama::OllamaProvider;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProviderType {
    Claude,
    OpenAI,
    DeepSeek,
    Ollama,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub provider_type: ProviderType,
    pub api_key: Option<String>,
    pub base_url: Option<String>,  // For Ollama
    pub model: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum AIError {
    #[error("API error: {0}")]
    ApiError(String),
    #[error("Network error: {0}")]
    NetworkError(String),
    #[error("Authentication error: {0}")]
    AuthError(String),
    #[error("Keyring error: {0}")]
    KeyringError(String),
}

pub type StreamResult = Pin<Box<dyn Stream<Item = Result<String, AIError>> + Send>>;

#[async_trait]
pub trait AIProvider: Send + Sync {
    /// Stream response chunks
    async fn stream_completion(
        &self,
        prompt: &str,
        context: Option<&str>,
    ) -> Result<StreamResult, AIError>;

    /// Single completion (non-streaming)
    async fn complete(
        &self,
        prompt: &str,
        context: Option<&str>,
    ) -> Result<String, AIError>;

    /// Get provider name
    fn name(&self) -> &str;

    /// Check if provider is configured
    fn is_configured(&self) -> bool;
}

/// Factory function to create provider instances
pub fn create_provider(config: &ProviderConfig) -> Box<dyn AIProvider> {
    match config.provider_type {
        ProviderType::Claude => Box::new(ClaudeProvider::new(config)),
        ProviderType::OpenAI => Box::new(OpenAIProvider::new(config)),
        ProviderType::DeepSeek => Box::new(DeepSeekProvider::new(config)),
        ProviderType::Ollama => Box::new(OllamaProvider::new(config)),
    }
}
