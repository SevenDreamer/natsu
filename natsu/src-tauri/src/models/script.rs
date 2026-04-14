use serde::{Deserialize, Serialize};

/// A saved script in the script library
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Script {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub script_path: String,
    pub interpreter: String,
    pub tags: Vec<String>,
    pub parameters: Vec<ScriptParameter>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// A parameter definition for parameterized scripts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptParameter {
    pub name: String,
    pub description: Option<String>,
    pub default_value: Option<String>,
    pub required: bool,
}

/// Input for creating a new script
#[derive(Debug, Clone, Deserialize)]
pub struct CreateScriptInput {
    pub name: String,
    pub description: Option<String>,
    pub content: String,
    pub interpreter: Option<String>,
    pub tags: Option<Vec<String>>,
    pub parameters: Option<Vec<ScriptParameter>>,
}

/// Input for updating an existing script
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateScriptInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
    pub parameters: Option<Vec<ScriptParameter>>,
}

/// Input for executing a script
#[derive(Debug, Clone, Deserialize)]
pub struct ScriptExecutionInput {
    pub script_id: String,
    pub parameters: std::collections::HashMap<String, String>,
    pub timeout: Option<u64>,
}

/// Result of script execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptExecutionResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
}

/// Safety info for script execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptSafetyInfo {
    pub level: String, // "safe", "caution", "dangerous"
    pub warnings: Vec<String>,
}
