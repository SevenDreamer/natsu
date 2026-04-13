use crate::ai::provider::{ProviderConfig, ProviderType, create_provider};
use keyring::Entry;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, State};

const KEYRING_SERVICE: &str = "termsuite";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WikiSuggestion {
    pub target_note_id: String,
    pub target_title: String,
    pub original_content: String,
    pub suggested_content: String,
    pub change_type: WikiChangeType,
    pub source_raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WikiChangeType {
    Append,
    Prepend,
    Update,
    CreateNew,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawFileAnalysis {
    pub path: String,
    pub concepts: Vec<String>,
    pub suggested_wiki_links: Vec<String>,
    pub summary: String,
}

/// Analyze a raw file and generate wiki suggestions
#[tauri::command]
pub async fn analyze_raw_file(
    path: String,
    content: String,
    default_provider: String,
) -> Result<RawFileAnalysis, String> {
    let provider_type = parse_provider_type(&default_provider)?;
    let api_key = get_api_key_for_provider(&provider_type)?;

    let config = ProviderConfig {
        provider_type,
        api_key: Some(api_key),
        base_url: None,
        model: None,
    };

    let provider = create_provider(&config);

    let prompt = format!(
        "Analyze the following content and extract:\n\
        1. Key concepts that could become wiki pages\n\
        2. Suggested wiki-links to existing topics\n\
        3. A brief summary\n\n\
        Content:\n{}\n\n\
        Respond in JSON format with fields: concepts (array), suggested_wiki_links (array), summary (string)",
        content
    );

    let response = provider.complete(&prompt, None)
        .await
        .map_err(|e| e.to_string())?;

    // Parse JSON response - for now, return a basic analysis
    Ok(RawFileAnalysis {
        path,
        concepts: vec![],
        suggested_wiki_links: vec![],
        summary: response,
    })
}

/// Generate wiki update suggestion for a note
#[tauri::command]
pub async fn generate_wiki_suggestion(
    raw_path: String,
    raw_content: String,
    wiki_note_id: String,
    wiki_content: String,
    default_provider: String,
) -> Result<WikiSuggestion, String> {
    let provider_type = parse_provider_type(&default_provider)?;
    let api_key = get_api_key_for_provider(&provider_type)?;

    let config = ProviderConfig {
        provider_type,
        api_key: Some(api_key),
        base_url: None,
        model: None,
    };

    let provider = create_provider(&config);

    let prompt = format!(
        "Given the raw content and existing wiki page, suggest how to update the wiki.\n\n\
        Raw content from {}:\n{}\n\n\
        Existing wiki content:\n{}\n\n\
        Suggest an update that integrates relevant information from the raw content.\n\
        Respond with just the suggested new wiki content, nothing else.",
        raw_path, raw_content, wiki_content
    );

    let suggested = provider.complete(&prompt, None)
        .await
        .map_err(|e| e.to_string())?;

    // Determine change type based on content
    let change_type = if wiki_content.is_empty() {
        WikiChangeType::CreateNew
    } else if suggested.starts_with(&wiki_content) {
        WikiChangeType::Append
    } else {
        WikiChangeType::Update
    };

    Ok(WikiSuggestion {
        target_note_id: wiki_note_id.clone(),
        target_title: wiki_note_id,
        original_content: wiki_content,
        suggested_content: suggested,
        change_type,
        source_raw: raw_path,
    })
}

/// Apply a wiki suggestion (after user confirmation per D-10)
#[tauri::command]
pub async fn apply_wiki_suggestion(
    note_id: String,
    new_content: String,
    storage_path: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    // Write the new content to the note file
    let path = format!("{}/wiki/{}.md", storage_path, note_id);
    std::fs::write(&path, &new_content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    // Update database
    let conn = db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "UPDATE notes SET updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, &note_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Trigger manual wiki processing
#[tauri::command]
pub async fn trigger_wiki_processing(
    mode: String,
    app: AppHandle,
) -> Result<(), String> {
    crate::scheduler::trigger_wiki_processing(app, mode).await
}

// Helper functions
fn parse_provider_type(s: &str) -> Result<ProviderType, String> {
    match s {
        "Claude" => Ok(ProviderType::Claude),
        "OpenAI" => Ok(ProviderType::OpenAI),
        "DeepSeek" => Ok(ProviderType::DeepSeek),
        "Ollama" => Ok(ProviderType::Ollama),
        _ => Err(format!("Unknown provider: {}", s)),
    }
}

fn get_api_key_for_provider(provider_type: &ProviderType) -> Result<String, String> {
    let key_name = format!("{:?}", provider_type);
    let entry = Entry::new(KEYRING_SERVICE, &key_name)
        .map_err(|e| format!("Keyring error: {}", e))?;
    entry.get_password()
        .map_err(|e| format!("API key not found: {}", e))
}
