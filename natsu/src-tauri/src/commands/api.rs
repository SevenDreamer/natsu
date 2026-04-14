//! API configuration and execution commands for Tauri
//!
//! Provides Tauri commands to manage and execute HTTP API requests.

use crate::models::{
    ApiConfig, ApiHistoryEntry, ApiResponse, AuthConfig, AuthType, ExecuteApiInput, NewApiConfig,
    UpdateApiConfig,
};
use chrono::Utc;
use reqwest::Client;
use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::State;

/// Database type alias
type DbConn = Arc<Mutex<Connection>>;

// ============================================================================
// API Configuration CRUD
// ============================================================================

/// List all API configurations
#[tauri::command]
pub fn list_api_configs(db: State<DbConn>) -> Result<Vec<ApiConfig>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let configs = conn
        .prepare(
            "SELECT id, name, method, url, headers, body_template, auth_type, auth_config, timeout_secs, created_at, updated_at \
             FROM api_configs ORDER BY name"
        )
        .map_err(|e| e.to_string())?
        .query_map([], |row| {
            Ok(ApiConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                method: row.get(2)?,
                url: row.get(3)?,
                headers: row.get(4)?,
                body_template: row.get(5)?,
                auth_type: row.get(6)?,
                auth_config: row.get(7)?,
                timeout_secs: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(configs)
}

/// Get a single API configuration
#[tauri::command]
pub fn get_api_config(id: String, db: State<DbConn>) -> Result<ApiConfig, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, name, method, url, headers, body_template, auth_type, auth_config, timeout_secs, created_at, updated_at \
         FROM api_configs WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(ApiConfig {
                id: row.get(0)?,
                name: row.get(1)?,
                method: row.get(2)?,
                url: row.get(3)?,
                headers: row.get(4)?,
                body_template: row.get(5)?,
                auth_type: row.get(6)?,
                auth_config: row.get(7)?,
                timeout_secs: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        },
    ).map_err(|e| format!("API config not found: {}", e))
}

/// Create a new API configuration
#[tauri::command]
pub fn create_api_config(input: NewApiConfig, db: State<DbConn>) -> Result<ApiConfig, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let now = Utc::now().timestamp();
    let id = uuid::Uuid::new_v4().to_string();

    let auth_type = input.auth_type.unwrap_or_else(|| "none".to_string());
    let timeout_secs = input.timeout_secs.unwrap_or(30);

    conn.execute(
        "INSERT INTO api_configs (id, name, method, url, headers, body_template, auth_type, auth_config, timeout_secs, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        rusqlite::params![
            id,
            input.name,
            input.method,
            input.url,
            input.headers,
            input.body_template,
            auth_type,
            input.auth_config,
            timeout_secs,
            now,
            now,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(ApiConfig {
        id,
        name: input.name,
        method: input.method,
        url: input.url,
        headers: input.headers,
        body_template: input.body_template,
        auth_type,
        auth_config: input.auth_config,
        timeout_secs,
        created_at: now,
        updated_at: now,
    })
}

/// Update an API configuration
#[tauri::command]
pub fn update_api_config(
    id: String,
    input: UpdateApiConfig,
    db: State<DbConn>,
) -> Result<ApiConfig, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // Get existing config
    let existing = conn.query_row(
        "SELECT name, method, url, headers, body_template, auth_type, auth_config, timeout_secs FROM api_configs WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, i64>(7)?,
            ))
        },
    ).map_err(|e| format!("API config not found: {}", e))?;

    let now = Utc::now().timestamp();
    let name = input.name.unwrap_or(existing.0);
    let method = input.method.unwrap_or(existing.1);
    let url = input.url.unwrap_or(existing.2);
    let headers = input.headers.or(existing.3);
    let body_template = input.body_template.or(existing.4);
    let auth_type = input.auth_type.unwrap_or(existing.5);
    let auth_config = input.auth_config.or(existing.6);
    let timeout_secs = input.timeout_secs.unwrap_or(existing.7);

    conn.execute(
        "UPDATE api_configs SET name = ?1, method = ?2, url = ?3, headers = ?4, body_template = ?5, auth_type = ?6, auth_config = ?7, timeout_secs = ?8, updated_at = ?9 WHERE id = ?10",
        rusqlite::params![name, method, url, headers, body_template, auth_type, auth_config, timeout_secs, now, id],
    ).map_err(|e| e.to_string())?;

    Ok(ApiConfig {
        id,
        name,
        method,
        url,
        headers,
        body_template,
        auth_type,
        auth_config,
        timeout_secs,
        created_at: 0, // Not returned
        updated_at: now,
    })
}

/// Delete an API configuration
#[tauri::command]
pub fn delete_api_config(id: String, db: State<DbConn>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM api_configs WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ============================================================================
// API Execution
// ============================================================================

/// Replace template variables in a string
fn replace_variables(template: &str, variables: &HashMap<String, String>) -> String {
    let mut result = template.to_string();

    // Built-in variables
    result = result.replace(
        "{{timestamp}}",
        &Utc::now().timestamp().to_string(),
    );
    result = result.replace("{{date}}", &Utc::now().format("%Y-%m-%d").to_string());
    result = result.replace("{{datetime}}", &Utc::now().to_rfc3339());
    result = result.replace("{{uuid}}", &uuid::Uuid::new_v4().to_string());
    result = result.replace("{{random}}", &rand::random::<u32>().to_string());

    // Custom variables
    for (key, value) in variables {
        result = result.replace(&format!("{{{{{}}}}}", key), value);
    }

    result
}

/// Execute an API request
#[tauri::command]
pub async fn execute_api_request(
    input: ExecuteApiInput,
    db: State<'_, DbConn>,
) -> Result<ApiResponse, String> {
    let start = Instant::now();

    // Parse variables
    let variables: HashMap<String, String> = input
        .variables
        .and_then(|v| serde_json::from_str(&v).ok())
        .unwrap_or_default();

    // Determine URL and method
    let url = input.url.unwrap_or_default();
    let method = input.method.unwrap_or_else(|| "GET".to_string());
    let timeout_secs = input.timeout_secs.unwrap_or(30);

    // Parse headers
    let headers: HashMap<String, String> = input
        .headers
        .as_ref()
        .and_then(|h| serde_json::from_str(h).ok())
        .unwrap_or_default();

    // Parse auth config
    let auth: Option<AuthConfig> = input
        .auth_config
        .as_ref()
        .and_then(|a| serde_json::from_str(a).ok());

    // Save for history
    let headers_str = input.headers.clone();
    let body_str = input.body.clone();
    let config_id = input.config_id.clone();

    // Build client
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_secs as u64))
        .build()
        .map_err(|e| e.to_string())?;

    // Build request
    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        _ => client.get(&url),
    };

    // Add headers
    for (key, value) in &headers {
        let replaced_value = replace_variables(value, &variables);
        request = request.header(key, replaced_value);
    }

    // Add auth
    if let Some(auth) = &auth {
        match auth.key_location.as_deref() {
            Some("bearer") | None if auth.token.is_some() => {
                request = request.bearer_auth(auth.token.as_ref().unwrap());
            }
            Some("basic") if auth.username.is_some() && auth.password.is_some() => {
                request = request.basic_auth(
                    auth.username.as_ref().unwrap(),
                    Some(auth.password.as_ref().unwrap()),
                );
            }
            Some("header") if auth.key_name.is_some() && auth.key_value.is_some() => {
                request = request.header(
                    auth.key_name.as_ref().unwrap(),
                    auth.key_value.as_ref().unwrap(),
                );
            }
            _ => {}
        }
    }

    // Add body
    if let Some(body) = &input.body {
        let replaced_body = replace_variables(body, &variables);
        request = request.body(replaced_body);
    }

    // Execute request
    let response = request.send().await.map_err(|e| e.to_string())?;

    // Collect response
    let status = response.status().as_u16();
    let resp_headers: HashMap<String, String> = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();
    let body = response.text().await.map_err(|e| e.to_string())?;

    let duration_ms = start.elapsed().as_millis() as i64;

    // Save to history
    let history = ApiHistoryEntry::new(
        config_id,
        url.clone(),
        method.clone(),
        headers_str,
        body_str,
    );

    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO api_history (id, config_id, url, method, request_headers, request_body, response_status, response_headers, response_body, duration_ms, error, executed_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![
            history.id,
            history.config_id,
            history.url,
            history.method,
            history.request_headers,
            history.request_body,
            Some(status),
            serde_json::to_string(&resp_headers).ok(),
            Some(&body),
            Some(duration_ms),
            None::<String>,
            history.executed_at,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(ApiResponse {
        status,
        headers: resp_headers,
        body,
        duration_ms,
    })
}

// ============================================================================
// API History
// ============================================================================

/// Get API history
#[tauri::command]
pub fn get_api_history(
    config_id: Option<String>,
    limit: Option<usize>,
    db: State<DbConn>,
) -> Result<Vec<ApiHistoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let limit = limit.unwrap_or(100);

    let entries = if let Some(cid) = config_id {
        conn.prepare(
            "SELECT id, config_id, url, method, request_headers, request_body, response_status, response_headers, response_body, duration_ms, error, executed_at \
             FROM api_history WHERE config_id = ?1 ORDER BY executed_at DESC LIMIT ?2"
        )
        .map_err(|e| e.to_string())?
        .query_map(rusqlite::params![cid, limit as i32], |row| {
            Ok(ApiHistoryEntry {
                id: row.get(0)?,
                config_id: row.get(1)?,
                url: row.get(2)?,
                method: row.get(3)?,
                request_headers: row.get(4)?,
                request_body: row.get(5)?,
                response_status: row.get(6)?,
                response_headers: row.get(7)?,
                response_body: row.get(8)?,
                duration_ms: row.get(9)?,
                error: row.get(10)?,
                executed_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    } else {
        conn.prepare(
            "SELECT id, config_id, url, method, request_headers, request_body, response_status, response_headers, response_body, duration_ms, error, executed_at \
             FROM api_history ORDER BY executed_at DESC LIMIT ?1"
        )
        .map_err(|e| e.to_string())?
        .query_map(rusqlite::params![limit as i32], |row| {
            Ok(ApiHistoryEntry {
                id: row.get(0)?,
                config_id: row.get(1)?,
                url: row.get(2)?,
                method: row.get(3)?,
                request_headers: row.get(4)?,
                request_body: row.get(5)?,
                response_status: row.get(6)?,
                response_headers: row.get(7)?,
                response_body: row.get(8)?,
                duration_ms: row.get(9)?,
                error: row.get(10)?,
                executed_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    };

    Ok(entries)
}

/// Delete an API history entry
#[tauri::command]
pub fn delete_api_history(id: String, db: State<DbConn>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM api_history WHERE id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Clear all API history
#[tauri::command]
pub fn clear_api_history(db: State<DbConn>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM api_history", [])
        .map_err(|e| e.to_string())?;

    Ok(())
}
