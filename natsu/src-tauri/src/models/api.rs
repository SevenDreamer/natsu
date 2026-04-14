//! API configuration and history models
//!
//! Stores HTTP API request configurations and execution history.

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// HTTP methods supported
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
    Patch,
}

impl HttpMethod {
    pub fn as_str(&self) -> &'static str {
        match self {
            HttpMethod::Get => "GET",
            HttpMethod::Post => "POST",
            HttpMethod::Put => "PUT",
            HttpMethod::Delete => "DELETE",
            HttpMethod::Patch => "PATCH",
        }
    }
}

impl std::fmt::Display for HttpMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Authentication type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum AuthType {
    #[default]
    None,
    Basic,
    Bearer,
    ApiKey,
}

/// Authentication configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthConfig {
    /// Username for Basic auth
    pub username: Option<String>,
    /// Password for Basic auth
    pub password: Option<String>,
    /// Token for Bearer auth
    pub token: Option<String>,
    /// API key name
    pub key_name: Option<String>,
    /// API key value
    pub key_value: Option<String>,
    /// Where to put API key: "header" or "query"
    pub key_location: Option<String>,
}

/// API configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    /// Unique identifier
    pub id: String,
    /// Display name
    pub name: String,
    /// HTTP method
    pub method: String,
    /// Request URL
    pub url: String,
    /// Request headers (JSON object)
    pub headers: Option<String>,
    /// Request body template
    pub body_template: Option<String>,
    /// Authentication type
    pub auth_type: String,
    /// Authentication configuration (JSON)
    pub auth_config: Option<String>,
    /// Request timeout in seconds
    pub timeout_secs: i64,
    /// Creation timestamp
    pub created_at: i64,
    /// Last update timestamp
    pub updated_at: i64,
}

impl ApiConfig {
    /// Create a new API configuration
    pub fn new(name: String, method: String, url: String) -> Self {
        let now = Utc::now().timestamp();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            method,
            url,
            headers: None,
            body_template: None,
            auth_type: "none".to_string(),
            auth_config: None,
            timeout_secs: 30,
            created_at: now,
            updated_at: now,
        }
    }

    /// Parse headers from JSON string
    pub fn parse_headers(&self) -> HashMap<String, String> {
        self.headers
            .as_ref()
            .and_then(|h| serde_json::from_str(h).ok())
            .unwrap_or_default()
    }

    /// Parse auth config from JSON string
    pub fn parse_auth_config(&self) -> Option<AuthConfig> {
        self.auth_config
            .as_ref()
            .and_then(|a| serde_json::from_str(a).ok())
    }
}

/// Input for creating a new API config
#[derive(Debug, Clone, Deserialize)]
pub struct NewApiConfig {
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: Option<String>,
    pub body_template: Option<String>,
    pub auth_type: Option<String>,
    pub auth_config: Option<String>,
    pub timeout_secs: Option<i64>,
}

/// Input for updating an API config
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateApiConfig {
    pub name: Option<String>,
    pub method: Option<String>,
    pub url: Option<String>,
    pub headers: Option<String>,
    pub body_template: Option<String>,
    pub auth_type: Option<String>,
    pub auth_config: Option<String>,
    pub timeout_secs: Option<i64>,
}

/// API history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiHistoryEntry {
    /// Unique identifier
    pub id: String,
    /// Associated config ID (if any)
    pub config_id: Option<String>,
    /// Request URL
    pub url: String,
    /// HTTP method
    pub method: String,
    /// Request headers (JSON)
    pub request_headers: Option<String>,
    /// Request body
    pub request_body: Option<String>,
    /// Response status code
    pub response_status: Option<u16>,
    /// Response headers (JSON)
    pub response_headers: Option<String>,
    /// Response body
    pub response_body: Option<String>,
    /// Execution duration in milliseconds
    pub duration_ms: Option<i64>,
    /// Error message (if failed)
    pub error: Option<String>,
    /// Execution timestamp
    pub executed_at: i64,
}

impl ApiHistoryEntry {
    /// Create a new history entry
    pub fn new(
        config_id: Option<String>,
        url: String,
        method: String,
        request_headers: Option<String>,
        request_body: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            config_id,
            url,
            method,
            request_headers,
            request_body,
            response_status: None,
            response_headers: None,
            response_body: None,
            duration_ms: None,
            error: None,
            executed_at: Utc::now().timestamp(),
        }
    }

    /// Check if the request was successful
    pub fn is_success(&self) -> bool {
        self.error.is_none()
            && self
                .response_status
                .map(|s| s >= 200 && s < 300)
                .unwrap_or(false)
    }
}

/// API response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse {
    /// HTTP status code
    pub status: u16,
    /// Response headers
    pub headers: HashMap<String, String>,
    /// Response body
    pub body: String,
    /// Duration in milliseconds
    pub duration_ms: i64,
}

/// Input for executing an API request
#[derive(Debug, Clone, Deserialize)]
pub struct ExecuteApiInput {
    /// Config ID to use (optional)
    pub config_id: Option<String>,
    /// URL (required if no config_id)
    pub url: Option<String>,
    /// HTTP method (default: GET)
    pub method: Option<String>,
    /// Request headers
    pub headers: Option<String>,
    /// Request body
    pub body: Option<String>,
    /// Authentication config
    pub auth_config: Option<String>,
    /// Timeout in seconds
    pub timeout_secs: Option<i64>,
    /// Template variables
    pub variables: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_api_config() {
        let config = ApiConfig::new(
            "Test API".to_string(),
            "GET".to_string(),
            "https://api.example.com".to_string(),
        );

        assert!(!config.id.is_empty());
        assert_eq!(config.name, "Test API");
        assert_eq!(config.method, "GET");
        assert_eq!(config.timeout_secs, 30);
    }

    #[test]
    fn test_http_method() {
        assert_eq!(HttpMethod::Get.as_str(), "GET");
        assert_eq!(HttpMethod::Post.as_str(), "POST");
    }

    #[test]
    fn test_parse_headers() {
        let mut config = ApiConfig::new("Test".into(), "GET".into(), "https://example.com".into());
        config.headers = Some(r#"{"Content-Type": "application/json"}"#.to_string());

        let headers = config.parse_headers();
        assert_eq!(headers.get("Content-Type"), Some(&"application/json".to_string()));
    }
}
