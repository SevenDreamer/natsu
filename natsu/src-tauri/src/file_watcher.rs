use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::Path;
use std::sync::mpsc::{channel, Receiver, Sender};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

/// A file watcher entry from database
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileWatcher {
    pub id: String,
    pub name: String,
    pub path: String,
    pub recursive: bool,
    pub event_types: Vec<String>,
    pub enabled: bool,
    pub trigger_script_id: Option<String>,
    pub created_at: i64,
}

/// A file event from database
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileEvent {
    pub id: String,
    pub watcher_id: String,
    pub event_type: String,
    pub path: String,
    pub details: Option<String>,
    pub timestamp: i64,
}

/// Input for creating a file watcher
#[derive(Debug, Clone, serde::Deserialize)]
pub struct CreateFileWatcherInput {
    pub name: String,
    pub path: String,
    pub recursive: Option<bool>,
    pub event_types: Option<Vec<String>>,
    pub trigger_script_id: Option<String>,
}

/// File info for directory listing
#[derive(Debug, Clone, serde::Serialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub modified: Option<i64>,
}

/// Service managing active file watchers
pub struct FileWatcherService {
    watchers: HashMap<String, RecommendedWatcher>,
    event_sender: Option<Sender<(String, FileEvent)>>,
}

impl FileWatcherService {
    pub fn new() -> Self {
        Self {
            watchers: HashMap::new(),
            event_sender: None,
        }
    }

    /// Set the event sender for broadcasting events
    pub fn set_event_sender(&mut self, sender: Sender<(String, FileEvent)>) {
        self.event_sender = Some(sender);
    }

    /// Start watching a directory
    pub fn start_watcher(
        &mut self,
        watcher_id: String,
        path: String,
        recursive: bool,
        event_types: Vec<String>,
        app_handle: AppHandle,
    ) -> Result<(), String> {
        let path = Path::new(&path);
        if !path.exists() {
            return Err(format!("Path does not exist: {:?}", path));
        }

        let mode = if recursive {
            RecursiveMode::Recursive
        } else {
            RecursiveMode::NonRecursive
        };

        let wid = watcher_id.clone();
        let event_types_clone = event_types.clone();

        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                match res {
                    Ok(event) => {
                        let event_type = kind_to_string(&event.kind);

                        // Filter by event types
                        if !event_types_clone.is_empty() && !event_types_clone.contains(&event_type) {
                            return;
                        }

                        for path in &event.paths {
                            let file_event = FileEvent {
                                id: Uuid::new_v4().to_string(),
                                watcher_id: wid.clone(),
                                event_type: event_type.clone(),
                                path: path.to_string_lossy().to_string(),
                                details: Some(format!("{:?}", event.kind)),
                                timestamp: chrono::Utc::now().timestamp(),
                            };

                            // Emit to frontend
                            let _ = app_handle.emit("file-event", &file_event);
                        }
                    }
                    Err(e) => {
                        eprintln!("Watch error: {:?}", e);
                    }
                }
            },
            Config::default(),
        )
        .map_err(|e| e.to_string())?;

        watcher.watch(path, mode).map_err(|e| e.to_string())?;

        self.watchers.insert(watcher_id, watcher);

        Ok(())
    }

    /// Stop a specific watcher
    pub fn stop_watcher(&mut self, id: &str) -> Result<(), String> {
        if let Some(_watcher) = self.watchers.remove(id) {
            // Watcher is dropped, which stops it
            Ok(())
        } else {
            Err(format!("Watcher not found: {}", id))
        }
    }

    /// Stop all watchers
    pub fn stop_all(&mut self) {
        self.watchers.clear();
    }

    /// Check if a watcher is active
    pub fn is_watching(&self, id: &str) -> bool {
        self.watchers.contains_key(id)
    }
}

impl Default for FileWatcherService {
    fn default() -> Self {
        Self::new()
    }
}

fn kind_to_string(kind: &EventKind) -> String {
    match kind {
        EventKind::Create(_) => "create".to_string(),
        EventKind::Modify(_) => "modify".to_string(),
        EventKind::Remove(_) => "delete".to_string(),
        EventKind::Access(_) => "access".to_string(),
        EventKind::Any => "any".to_string(),
        _ => "other".to_string(),
    }
}
