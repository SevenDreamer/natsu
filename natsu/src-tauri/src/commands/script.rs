use std::sync::Arc;
use tauri::State;
use rusqlite::Connection;
use std::collections::HashMap;
use uuid::Uuid;
use std::fs;
use std::path::PathBuf;
use std::time::Instant;

use crate::models::{
    Script, ScriptParameter, CreateScriptInput, UpdateScriptInput,
    ScriptExecutionInput, ScriptExecutionResult, ScriptSafetyInfo,
};

type DbState = Arc<std::sync::Mutex<Connection>>;
type StoragePathState = Arc<std::sync::Mutex<Option<String>>>;

/// List all scripts in the library
#[tauri::command]
pub fn list_scripts(conn: State<DbState>) -> Result<Vec<Script>, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare(
            "SELECT id, name, description, script_path, interpreter, tags, parameters, created_at, updated_at
             FROM scripts ORDER BY name ASC"
        )
        .map_err(|e| e.to_string())?;

    let scripts = stmt
        .query_map([], |row| {
            Ok(Script {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                script_path: row.get(3)?,
                interpreter: row.get(4)?,
                tags: serde_json::from_str(&row.get::<_, String>(5)?).unwrap_or_default(),
                parameters: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(scripts)
}

/// Get a single script by ID
#[tauri::command]
pub fn get_script(id: String, conn: State<DbState>) -> Result<Script, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    db.query_row(
        "SELECT id, name, description, script_path, interpreter, tags, parameters, created_at, updated_at
         FROM scripts WHERE id = ?",
        [&id],
        |row| {
            Ok(Script {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                script_path: row.get(3)?,
                interpreter: row.get(4)?,
                tags: serde_json::from_str(&row.get::<_, String>(5)?).unwrap_or_default(),
                parameters: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| format!("Script not found: {}", e))
}

/// Get script content
#[tauri::command]
pub fn get_script_content(id: String, conn: State<DbState>, storage_path: State<StoragePathState>) -> Result<String, String> {
    let script = get_script(id, conn)?;

    let base_path = storage_path
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("Storage path not set")?;

    let script_file = PathBuf::from(&base_path).join(&script.script_path);
    fs::read_to_string(&script_file).map_err(|e| format!("Failed to read script file: {}", e))
}

/// Create a new script
#[tauri::command]
pub fn create_script(
    input: CreateScriptInput,
    conn: State<DbState>,
    storage_path: State<StoragePathState>,
) -> Result<Script, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    // Get storage path
    let base_path = storage_path
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("Storage path not set")?;

    // Create scripts directory if it doesn't exist
    let scripts_dir = PathBuf::from(&base_path).join("scripts");
    fs::create_dir_all(&scripts_dir).map_err(|e| format!("Failed to create scripts directory: {}", e))?;

    // Generate unique ID and filename
    let id = Uuid::new_v4().to_string();
    let interpreter = input.interpreter.unwrap_or_else(|| detect_interpreter(&input.content));
    let extension = get_extension(&interpreter);
    let filename = format!("{}.{}", id, extension);
    let script_path = format!("scripts/{}", filename);

    // Write script file
    let script_file = scripts_dir.join(&filename);
    fs::write(&script_file, &input.content).map_err(|e| format!("Failed to write script file: {}", e))?;

    // Set permissions (Unix only)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&script_file, fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("Failed to set script permissions: {}", e))?;
    }

    let now = chrono::Utc::now().timestamp();
    let tags_json = serde_json::to_string(&input.tags.unwrap_or_default()).map_err(|e| e.to_string())?;
    let params_json = serde_json::to_string(&input.parameters.unwrap_or_default()).map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO scripts (id, name, description, script_path, interpreter, tags, parameters, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            &id,
            &input.name,
            &input.description,
            &script_path,
            &interpreter,
            &tags_json,
            &params_json,
            now,
            now,
        ],
    )
    .map_err(|e| format!("Failed to insert script: {}", e))?;

    Ok(Script {
        id,
        name: input.name,
        description: input.description,
        script_path,
        interpreter,
        tags: input.tags.unwrap_or_default(),
        parameters: input.parameters.unwrap_or_default(),
        created_at: now,
        updated_at: now,
    })
}

/// Update an existing script
#[tauri::command]
pub fn update_script(
    id: String,
    input: UpdateScriptInput,
    conn: State<DbState>,
    storage_path: State<StoragePathState>,
) -> Result<Script, String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    // Get existing script
    let existing = get_script(id.clone(), State::clone(&conn))?;

    // Update content if provided
    if let Some(content) = &input.content {
        let base_path = storage_path
            .lock()
            .map_err(|e| e.to_string())?
            .clone()
            .ok_or("Storage path not set")?;

        let script_file = PathBuf::from(&base_path).join(&existing.script_path);
        fs::write(&script_file, content).map_err(|e| format!("Failed to write script file: {}", e))?;
    }

    // Update metadata
    let name = input.name.unwrap_or(existing.name);
    let description = input.description.or(existing.description);
    let tags = input.tags.unwrap_or(existing.tags);
    let parameters = input.parameters.unwrap_or(existing.parameters);
    let now = chrono::Utc::now().timestamp();

    let tags_json = serde_json::to_string(&tags).map_err(|e| e.to_string())?;
    let params_json = serde_json::to_string(&parameters).map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE scripts SET name = ?, description = ?, tags = ?, parameters = ?, updated_at = ? WHERE id = ?",
        rusqlite::params![&name, &description, &tags_json, &params_json, now, &id],
    )
    .map_err(|e| format!("Failed to update script: {}", e))?;

    Ok(Script {
        id,
        name,
        description,
        script_path: existing.script_path,
        interpreter: existing.interpreter,
        tags,
        parameters,
        created_at: existing.created_at,
        updated_at: now,
    })
}

/// Delete a script
#[tauri::command]
pub fn delete_script(
    id: String,
    conn: State<DbState>,
    storage_path: State<StoragePathState>,
) -> Result<(), String> {
    let db = conn.lock().map_err(|e| e.to_string())?;

    // Get script to find file path
    let script = get_script(id.clone(), State::clone(&conn))?;

    // Delete file
    let base_path = storage_path
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("Storage path not set")?;

    let script_file = PathBuf::from(&base_path).join(&script.script_path);
    let _ = fs::remove_file(&script_file); // Ignore errors if file doesn't exist

    // Delete from database
    db.execute("DELETE FROM scripts WHERE id = ?", [&id])
        .map_err(|e| format!("Failed to delete script: {}", e))?;

    Ok(())
}

/// Get safety information for a script
#[tauri::command]
pub fn get_script_safety(
    id: String,
    conn: State<DbState>,
    storage_path: State<StoragePathState>,
) -> Result<ScriptSafetyInfo, String> {
    let content = get_script_content(id, conn, storage_path)?;
    Ok(analyze_script_safety(&content))
}

/// Execute a script
#[tauri::command]
pub async fn execute_script(
    input: ScriptExecutionInput,
    conn: State<'_, DbState>,
    storage_path: State<'_, StoragePathState>,
) -> Result<ScriptExecutionResult, String> {
    // Get script metadata
    let script = {
        let db = conn.lock().map_err(|e| e.to_string())?;
        db.query_row(
            "SELECT id, name, description, script_path, interpreter, tags, parameters, created_at, updated_at
             FROM scripts WHERE id = ?",
            [&input.script_id],
            |row| {
                Ok(Script {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    script_path: row.get(3)?,
                    interpreter: row.get(4)?,
                    tags: serde_json::from_str(&row.get::<_, String>(5)?).unwrap_or_default(),
                    parameters: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .map_err(|e| format!("Script not found: {}", e))?
    };

    // Get storage path
    let base_path = storage_path
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("Storage path not set")?;

    let script_file = PathBuf::from(&base_path).join(&script.script_path);

    // Read and parameterize script content
    let content = fs::read_to_string(&script_file).map_err(|e| format!("Failed to read script: {}", e))?;
    let parameterized = replace_parameters(&content, &input.parameters);

    // Create temporary script file for execution
    let temp_dir = std::env::temp_dir();
    let temp_script = temp_dir.join(format!("script_{}_{}.sh", input.script_id, Uuid::new_v4()));
    fs::write(&temp_script, &parameterized).map_err(|e| format!("Failed to write temp script: {}", e))?;

    // Set permissions
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&temp_script, fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("Failed to set permissions: {}", e))?;
    }

    // Execute script
    let start = Instant::now();
    let timeout_duration = std::time::Duration::from_secs(input.timeout.unwrap_or(60));

    let interpreter = get_interpreter_cmd(&script.interpreter);
    let output = tokio::time::timeout(
        timeout_duration,
        tokio::process::Command::new(&interpreter)
            .arg(&temp_script)
            .current_dir(&base_path)
            .output(),
    )
    .await
    .map_err(|_| "Script execution timed out".to_string())?
    .map_err(|e| format!("Failed to execute script: {}", e))?;

    // Clean up temp file
    let _ = fs::remove_file(&temp_script);

    let duration_ms = start.elapsed().as_millis() as u64;

    // Clean up temp file
    let _ = fs::remove_file(&temp_script);

    Ok(ScriptExecutionResult {
        exit_code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        duration_ms,
    })
}

// Helper functions

fn detect_interpreter(content: &str) -> String {
    // Check shebang
    if content.starts_with("#!") {
        if let Some(first_line) = content.lines().next() {
            if first_line.contains("python") {
                return "python".to_string();
            }
            if first_line.contains("node") {
                return "node".to_string();
            }
            if first_line.contains("ruby") {
                return "ruby".to_string();
            }
            if first_line.contains("perl") {
                return "perl".to_string();
            }
        }
    }

    // Default to bash
    "bash".to_string()
}

fn get_extension(interpreter: &str) -> &str {
    match interpreter {
        "python" => "py",
        "node" => "js",
        "ruby" => "rb",
        "perl" => "pl",
        _ => "sh",
    }
}

fn get_interpreter_cmd(interpreter: &str) -> String {
    match interpreter {
        "python" => "python3".to_string(),
        "node" => "node".to_string(),
        "ruby" => "ruby".to_string(),
        "perl" => "perl".to_string(),
        _ => "bash".to_string(),
    }
}

fn replace_parameters(content: &str, params: &HashMap<String, String>) -> String {
    let mut result = content.to_string();
    for (key, value) in params {
        let placeholder = format!("{{{{{}}}}}", key);
        result = result.replace(&placeholder, value);
    }
    result
}

fn analyze_script_safety(content: &str) -> ScriptSafetyInfo {
    let dangerous_patterns = [
        ("rm -rf", "Recursive delete without confirmation"),
        ("rm -r", "Recursive delete without confirmation"),
        (":(){ :|:& };:", "Fork bomb"),
        ("> /dev/sd", "Direct disk write"),
        ("mkfs", "Filesystem format"),
        ("dd if=", "Disk duplication"),
        ("chmod -R 777", "Insecure permissions"),
        (":(){:|:&};:", "Fork bomb variant"),
        ("curl | bash", "Remote script execution"),
        ("wget | bash", "Remote script execution"),
        ("curl | sh", "Remote script execution"),
        ("wget | sh", "Remote script execution"),
        ("> /dev/null 2>&1", "Output suppression (review carefully)"),
    ];

    let caution_patterns = [
        ("rm ", "File deletion"),
        ("mv ", "File move"),
        ("cp ", "File copy"),
        ("kill ", "Process termination"),
        ("pkill ", "Process termination"),
        ("killall ", "Process termination"),
        ("sudo ", "Elevated privileges"),
        ("su ", "User switch"),
        ("apt ", "Package management"),
        ("yum ", "Package management"),
        ("dnf ", "Package management"),
        ("pacman ", "Package management"),
    ];

    let mut warnings = Vec::new();
    let mut level = "safe".to_string();

    for (pattern, msg) in dangerous_patterns.iter() {
        if content.contains(pattern) {
            warnings.push(format!("DANGEROUS: {}", msg));
            level = "dangerous".to_string();
        }
    }

    if level != "dangerous" {
        for (pattern, msg) in caution_patterns.iter() {
            if content.contains(pattern) {
                warnings.push(format!("CAUTION: {}", msg));
                if level != "caution" {
                    level = "caution".to_string();
                }
            }
        }
    }

    ScriptSafetyInfo { level, warnings }
}
