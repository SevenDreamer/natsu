use crate::ai::provider::{AIProvider, ProviderConfig, ProviderType, AIError, create_provider};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use futures::StreamExt;

const KEYRING_SERVICE: &str = "natsu";

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

    let provider_impl = create_provider(&config);
    let mut stream = provider_impl.stream_completion(&prompt, context.as_deref())
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

    let provider_impl = create_provider(&config);
    provider_impl.complete(&prompt, context.as_deref())
        .await
        .map_err(|e| e.to_string())
}