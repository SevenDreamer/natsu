---
wave: 1
depends_on: []
files_modified:
  - termsuite/src-tauri/Cargo.toml
  - termsuite/src-tauri/src/lib.rs
files_created:
  - termsuite/src-tauri/src/ai/mod.rs
  - termsuite/src-tauri/src/ai/provider.rs
  - termsuite/src-tauri/src/ai/claude.rs
  - termsuite/src-tauri/src/ai/openai.rs
  - termsuite/src-tauri/src/ai/deepseek.rs
  - termsuite/src-tauri/src/ai/ollama.rs
  - termsuite/src-tauri/src/commands/ai.rs
requirements: [KNOW-05, KNOW-07]
autonomous: true
---

# PLAN-01: AI Provider Abstraction Layer

**Objective:** Implement the Rust backend AI Provider abstraction layer with support for Claude, OpenAI, DeepSeek, and Ollama (D-12 to D-15).

---

## Task 1: Add Dependencies

<objective>
Add required Rust dependencies for AI provider implementation.
</objective>

<read_first>
- termsuite/src-tauri/Cargo.toml (existing dependencies)
</read_first>

<action>
Add the following dependencies to `termsuite/src-tauri/Cargo.toml`:

```toml
# AI Provider dependencies
async-trait = "0.1"
reqwest = { version = "0.12", features = ["json", "stream"] }
tokio-stream = "0.1"
futures = "0.3"
keyring = "3"
serde_repr = "0.1"
```

These enable:
- `async-trait`: Trait object support for async methods
- `reqwest`: HTTP client with streaming support
- `tokio-stream`: Stream wrappers for async
- `futures`: Stream utilities
- `keyring`: OS-level secure storage for API keys (D-15)
</action>

<acceptance_criteria>
- `grep -E "async-trait|reqwest|tokio-stream|futures|keyring" termsuite/src-tauri/Cargo.toml` returns 5 lines
- `cargo check --manifest-path termsuite/src-tauri/Cargo.toml` exits with code 0
</acceptance_criteria>

---

## Task 2: Create AI Provider Trait

<objective>
Define the AIProvider trait that all providers will implement.
</objective>

<read_first>
- termsuite/src-tauri/src/commands/links.rs (existing Tauri command patterns)
</read_first>

<action>
Create `termsuite/src-tauri/src/ai/mod.rs` with module structure:

```rust
pub mod provider;
pub mod claude;
pub mod openai;
pub mod deepseek;
pub mod ollama;

pub use provider::{AIProvider, ProviderConfig, ProviderType, AIError};
pub use claude::ClaudeProvider;
pub use openai::OpenAIProvider;
pub use deepseek::DeepSeekProvider;
pub use ollama::OllamaProvider;
```

Create `termsuite/src-tauri/src/ai/provider.rs`:

```rust
use async_trait::async_trait;
use futures::Stream;
use serde::{Deserialize, Serialize};
use std::pin::Pin;

#[derive(Debug, Clone, Serialize, Deserialize)]
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
```
</action>

<acceptance_criteria>
- `grep -E "pub trait AIProvider" termsuite/src-tauri/src/ai/provider.rs` returns 1 line
- `grep -E "stream_completion|complete|name|is_configured" termsuite/src-tauri/src/ai/provider.rs` returns 4+ lines
- `grep "pub enum ProviderType" termsuite/src-tauri/src/ai/provider.rs` returns 1 line
</acceptance_criteria>

---

## Task 3: Implement Claude Provider

<objective>
Implement Claude (Anthropic) provider with streaming support.
</objective>

<read_first>
- termsuite/src-tauri/src/ai/provider.rs (trait definition)
</read_first>

<action>
Create `termsuite/src-tauri/src/ai/claude.rs`:

```rust
use crate::ai::provider::{AIProvider, AIError, ProviderConfig, StreamResult};
use async_trait::async_trait;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::pin::Pin;

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
```
</action>

<acceptance_criteria>
- `grep "impl AIProvider for ClaudeProvider" termsuite/src-tauri/src/ai/claude.rs` returns 1 line
- `grep "CLAUDE_API_URL" termsuite/src-tauri/src/ai/claude.rs` returns 1 line with anthropic.com
- `grep "stream_completion\|complete\|name\|is_configured" termsuite/src-tauri/src/ai/claude.rs` returns 4+ lines
</acceptance_criteria>

---

## Task 4: Implement OpenAI Provider

<objective>
Implement OpenAI GPT provider with streaming support.
</objective>

<read_first>
- termsuite/src-tauri/src/ai/provider.rs (trait definition)
- termsuite/src-tauri/src/ai/claude.rs (reference implementation)
</read_first>

<action>
Create `termsuite/src-tauri/src/ai/openai.rs`:

```rust
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
```
</action>

<acceptance_criteria>
- `grep "impl AIProvider for OpenAIProvider" termsuite/src-tauri/src/ai/openai.rs` returns 1 line
- `grep "OPENAI_API_URL" termsuite/src-tauri/src/ai/openai.rs` returns 1 line with openai.com
- `cargo check --manifest-path termsuite/src-tauri/Cargo.toml` exits with code 0
</acceptance_criteria>

---

## Task 5: Implement DeepSeek Provider

<objective>
Implement DeepSeek provider (compatible with OpenAI API format).
</objective>

<read_first>
- termsuite/src-tauri/src/ai/openai.rs (reference for OpenAI-compatible API)
</read_first>

<action>
Create `termsuite/src-tauri/src/ai/deepseek.rs`:

```rust
use crate::ai::provider::{AIProvider, AIError, ProviderConfig, StreamResult};
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
```
</action>

<acceptance_criteria>
- `grep "impl AIProvider for DeepSeekProvider" termsuite/src-tauri/src/ai/deepseek.rs` returns 1 line
- `grep "DEEPSEEK_API_URL" termsuite/src-tauri/src/ai/deepseek.rs` returns 1 line with deepseek.com
</acceptance_criteria>

---

## Task 6: Implement Ollama Provider

<objective>
Implement Ollama local model provider.
</objective>

<read_first>
- termsuite/src-tauri/src/ai/provider.rs (trait definition)
</read_first>

<action>
Create `termsuite/src-tauri/src/ai/ollama.rs`:

```rust
use crate::ai::provider::{AIProvider, AIError, ProviderConfig, StreamResult};
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
```
</action>

<acceptance_criteria>
- `grep "impl AIProvider for OllamaProvider" termsuite/src-tauri/src/ai/ollama.rs` returns 1 line
- `grep "DEFAULT_OLLAMA_URL" termsuite/src-tauri/src/ai/ollama.rs` returns 1 line with localhost:11434
</acceptance_criteria>

---

## Task 7: Create AI Tauri Commands

<objective>
Create Tauri commands for AI provider operations including API key management.
</objective>

<read_first>
- termsuite/src-tauri/src/lib.rs (existing command registration pattern)
- termsuite/src-tauri/src/commands/notes.rs (existing command patterns)
</read_first>

<action>
Create `termsuite/src-tauri/src/commands/ai.rs`:

```rust
use crate::ai::{AIProvider, ProviderConfig, ProviderType, create_provider};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use futures::StreamExt;

const KEYRING_SERVICE: &str = "termsuite";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub provider_type: ProviderType,
    pub is_configured: bool,
    pub model: Option<String>,
}

/// Store API key in OS keyring
#[tauri::command]
pub async fn store_api_key(
    provider: String,
    api_key: String,
) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, &provider)
        .map_err(|e| format!("Keyring error: {}", e))?;
    entry.set_password(&api_key)
        .map_err(|e| format!("Failed to store key: {}", e))?;
    Ok(())
}

/// Retrieve API key from OS keyring
#[tauri::command]
pub async fn get_api_key(
    provider: String,
) -> Result<String, String> {
    let entry = Entry::new(KEYRING_SERVICE, &provider)
        .map_err(|e| format!("Keyring error: {}", e))?;
    entry.get_password()
        .map_err(|e| format!("Failed to retrieve key: {}", e))
}

/// Check if API key exists for provider
#[tauri::command]
pub async fn has_api_key(
    provider: String,
) -> Result<bool, String> {
    let entry = Entry::new(KEYRING_SERVICE, &provider)
        .map_err(|e| format!("Keyring error: {}", e))?;
    Ok(entry.get_password().is_ok())
}

/// Delete API key from OS keyring
#[tauri::command]
pub async fn delete_api_key(
    provider: String,
) -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, &provider)
        .map_err(|e| format!("Keyring error: {}", e))?;
    entry.delete_credential()
        .map_err(|e| format!("Failed to delete key: {}", e))?;
    Ok(())
}

/// Get list of available providers and their status
#[tauri::command]
pub async fn list_providers() -> Result<Vec<ProviderInfo>, String> {
    let providers = vec![
        ProviderType::Claude,
        ProviderType::OpenAI,
        ProviderType::DeepSeek,
        ProviderType::Ollama,
    ];

    let mut result = Vec::new();
    for p in providers {
        let key_name = format!("{:?}", p);
        let is_configured = if p == ProviderType::Ollama {
            true // Ollama doesn't need API key
        } else {
            Entry::new(KEYRING_SERVICE, &key_name)
                .and_then(|e| e.get_password())
                .is_ok()
        };
        result.push(ProviderInfo {
            provider_type: p,
            is_configured,
            model: None,
        });
    }
    Ok(result)
}

/// Stream AI completion
#[tauri::command]
pub async fn ai_stream_completion(
    prompt: String,
    provider: String,
    context: Option<String>,
    app: AppHandle,
) -> Result<(), String> {
    let provider_type = match provider.as_str() {
        "Claude" => ProviderType::Claude,
        "OpenAI" => ProviderType::OpenAI,
        "DeepSeek" => ProviderType::DeepSeek,
        "Ollama" => ProviderType::Ollama,
        _ => return Err(format!("Unknown provider: {}", provider)),
    };

    let api_key = if provider_type != ProviderType::Ollama {
        let key_name = format!("{:?}", provider_type);
        let entry = Entry::new(KEYRING_SERVICE, &key_name)
            .map_err(|e| format!("Keyring error: {}", e))?;
        Some(entry.get_password()
            .map_err(|e| format!("API key not found: {}", e))?)
    } else {
        None
    };

    let config = ProviderConfig {
        provider_type,
        api_key,
        base_url: None,
        model: None,
    };

    let provider = create_provider(&config);
    let mut stream = provider.stream_completion(&prompt, context.as_deref())
        .await
        .map_err(|e| e.to_string())?;

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(text) => {
                app.emit("ai-chunk", &text).map_err(|e| e.to_string())?;
            }
            Err(e) => {
                app.emit("ai-error", &e.to_string()).ok();
                break;
            }
        }
    }

    app.emit("ai-complete", ()).map_err(|e| e.to_string())?;
    Ok(())
}

/// Single AI completion (non-streaming)
#[tauri::command]
pub async fn ai_complete(
    prompt: String,
    provider: String,
    context: Option<String>,
) -> Result<String, String> {
    let provider_type = match provider.as_str() {
        "Claude" => ProviderType::Claude,
        "OpenAI" => ProviderType::OpenAI,
        "DeepSeek" => ProviderType::DeepSeek,
        "Ollama" => ProviderType::Ollama,
        _ => return Err(format!("Unknown provider: {}", provider)),
    };

    let api_key = if provider_type != ProviderType::Ollama {
        let key_name = format!("{:?}", provider_type);
        let entry = Entry::new(KEYRING_SERVICE, &key_name)
            .map_err(|e| format!("Keyring error: {}", e))?;
        Some(entry.get_password()
            .map_err(|e| format!("API key not found: {}", e))?)
    } else {
        None
    };

    let config = ProviderConfig {
        provider_type,
        api_key,
        base_url: None,
        model: None,
    };

    let provider = create_provider(&config);
    provider.complete(&prompt, context.as_deref())
        .await
        .map_err(|e| e.to_string())
}
```
</action>

<acceptance_criteria>
- `grep "store_api_key\|get_api_key\|ai_stream_completion\|ai_complete" termsuite/src-tauri/src/commands/ai.rs` returns 8+ lines
- `grep "#\[tauri::command\]" termsuite/src-tauri/src/commands/ai.rs` returns 6+ lines
- `grep "KEYRING_SERVICE" termsuite/src-tauri/src/commands/ai.rs` returns 1 line with "termsuite"
</acceptance_criteria>

---

## Task 8: Register AI Module and Commands

<objective>
Register the AI module and commands in lib.rs.
</objective>

<read_first>
- termsuite/src-tauri/src/lib.rs (existing module structure)
</read_first>

<action>
Modify `termsuite/src-tauri/src/lib.rs` to add AI module and register commands:

1. Add module declaration after `mod models;`:
```rust
mod ai;
```

2. Add import for ai commands after `use commands::{storage, notes, links, search};`:
```rust
use commands::ai;
```

3. Add commands to invoke_handler after `search::search_notes_by_tag,`:
```rust
// AI commands
ai::store_api_key,
ai::get_api_key,
ai::has_api_key,
ai::delete_api_key,
ai::list_providers,
ai::ai_stream_completion,
ai::ai_complete,
```
</action>

<acceptance_criteria>
- `grep "mod ai;" termsuite/src-tauri/src/lib.rs` returns 1 line
- `grep "use commands::ai" termsuite/src-tauri/src/lib.rs` returns 1 line
- `grep "ai::store_api_key\|ai::ai_stream_completion\|ai::ai_complete" termsuite/src-tauri/src/lib.rs` returns 3+ lines
- `cargo check --manifest-path termsuite/src-tauri/Cargo.toml` exits with code 0
</acceptance_criteria>

---

## Validation

After completing all tasks:

1. **Build Check:**
   ```bash
   cargo build --manifest-path termsuite/src-tauri/Cargo.toml
   ```

2. **Module Structure:**
   ```bash
   find termsuite/src-tauri/src/ai -name "*.rs"
   # Should list: mod.rs, provider.rs, claude.rs, openai.rs, deepseek.rs, ollama.rs
   ```

3. **Command Registration:**
   ```bash
   grep -c "#\[tauri::command\]" termsuite/src-tauri/src/commands/ai.rs
   # Should be >= 6
   ```

---

*Plan created: 2026-04-14*
*Phase: 02-knowledge-advanced*
