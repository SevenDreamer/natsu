use crate::ai::provider::{ProviderConfig, ProviderType, create_provider};
use crate::ai::tool::{ContentBlock, Message, ToolDefinition, ToolResult};
use crate::ai::tool_manager::ToolManager;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use futures::StreamExt;
use std::sync::Arc;

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

/// Tool execution state for pending tool calls
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingToolCall {
    pub id: String,
    pub name: String,
    pub input: serde_json::Value,
    pub requires_confirmation: bool,
}

/// Response from AI chat with tools
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatWithToolsResponse {
    /// Content blocks from the AI response
    pub content: Vec<ContentBlock>,
    /// Pending tool calls that need execution
    pub pending_tool_calls: Vec<PendingToolCall>,
    /// Stop reason: "end_turn", "tool_use", "max_tokens"
    pub stop_reason: String,
}

/// AI chat with tool support - non-streaming
/// Returns response with any pending tool calls that need confirmation
#[tauri::command]
pub async fn ai_chat_with_tools(
    messages: Vec<Message>,
    tools: Vec<ToolDefinition>,
    provider: String,
    auto_confirm_tools: bool,
    tool_manager: State<'_, Arc<ToolManager>>,
    app: AppHandle,
) -> Result<ChatWithToolsResponse, String> {
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

    // Call AI with tools
    let response = provider_impl
        .complete_with_tools(&messages, &tools)
        .await
        .map_err(|e| e.to_string())?;

    // Collect tool use blocks
    let pending_tool_calls: Vec<PendingToolCall> = response.content.iter()
        .filter_map(|block| {
            if let ContentBlock::ToolUse { id, name, input } = block {
                Some(PendingToolCall {
                    id: id.clone(),
                    name: name.clone(),
                    input: input.clone(),
                    requires_confirmation: !auto_confirm_tools,
                })
            } else {
                None
            }
        })
        .collect();

    // If auto-confirm is enabled, execute tools immediately
    let final_response = if auto_confirm_tools && !pending_tool_calls.is_empty() {
        // Execute tools and collect results
        let mut tool_results: Vec<ContentBlock> = Vec::new();
        for tool_call in &pending_tool_calls {
            let result = tool_manager.execute(&tool_call.name, tool_call.input.clone(), tool_call.id.clone()).await;
            tool_results.push(ContentBlock::ToolResult {
                tool_use_id: result.tool_use_id,
                content: result.content,
                is_error: result.is_error,
            });
        }

        // Add tool results to messages and call AI again
        let mut updated_messages = messages.clone();
        updated_messages.push(Message::assistant_blocks(response.content.clone()));
        updated_messages.push(Message::user_blocks(tool_results));

        provider_impl
            .complete_with_tools(&updated_messages, &tools)
            .await
            .map_err(|e| e.to_string())?
    } else {
        response
    };

    // Emit events for any tool use
    for block in &final_response.content {
        if let ContentBlock::ToolUse { id, name, input } = block {
            app.emit("ai-tool-use", serde_json::json!({
                "id": id,
                "name": name,
                "input": input
            })).ok();
        }
    }

    Ok(ChatWithToolsResponse {
        content: final_response.content,
        pending_tool_calls,
        stop_reason: final_response.stop_reason,
    })
}

/// Confirm and execute a pending tool call
#[tauri::command]
pub async fn confirm_tool_execution(
    tool_use_id: String,
    tool_name: String,
    input: serde_json::Value,
    tool_manager: State<'_, Arc<ToolManager>>,
) -> Result<ToolResult, String> {
    // Execute the tool
    let result = tool_manager.execute(&tool_name, input, tool_use_id).await;
    Ok(result)
}

/// Stream AI chat with tool support
/// Emits events for each content block and tool use
#[tauri::command]
pub async fn ai_stream_chat_with_tools(
    messages: Vec<Message>,
    tools: Vec<ToolDefinition>,
    provider: String,
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

    // Stream with tools
    let mut stream = provider_impl
        .stream_completion_with_tools(&messages, &tools)
        .await
        .map_err(|e| e.to_string())?;

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(block) => {
                match &block {
                    ContentBlock::Text { text } => {
                        app.emit("ai-chunk", text).map_err(|e| e.to_string())?;
                    }
                    ContentBlock::ToolUse { id, name, input } => {
                        app.emit("ai-tool-use", serde_json::json!({
                            "id": id,
                            "name": name,
                            "input": input
                        })).map_err(|e| e.to_string())?;
                    }
                    ContentBlock::ToolResult { tool_use_id, content, is_error } => {
                        app.emit("ai-tool-result", serde_json::json!({
                            "tool_use_id": tool_use_id,
                            "content": content,
                            "is_error": is_error
                        })).map_err(|e| e.to_string())?;
                    }
                }
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

/// Get registered tool definitions from the tool manager
#[tauri::command]
pub async fn get_registered_tools(
    tool_manager: State<'_, Arc<ToolManager>>,
) -> Result<Vec<ToolDefinition>, String> {
    Ok(tool_manager.get_definitions().await)
}

/// Register a simple tool from the frontend
#[tauri::command]
pub async fn register_tool(
    name: String,
    description: String,
    input_schema: serde_json::Value,
    tool_manager: State<'_, Arc<ToolManager>>,
) -> Result<(), String> {
    use crate::ai::tool::SimpleToolExecutor;

    // Create a simple executor that returns a placeholder
    // In real usage, the frontend would handle actual execution
    let executor = SimpleToolExecutor::new(
        name,
        description,
        input_schema,
        |input| Ok(serde_json::to_string(&input).unwrap_or_default()),
    );

    tool_manager.register(executor).await;
    Ok(())
}