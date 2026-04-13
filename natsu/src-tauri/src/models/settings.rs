use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub storage_path: Option<String>,
    pub case_insensitive_links: bool,
    pub theme: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            storage_path: None,
            case_insensitive_links: false,
            theme: "system".to_string(),
        }
    }
}
