use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformInfo {
    pub os: String,
    pub is_android: bool,
    pub is_desktop: bool,
    pub arch: String,
}

/// Get current platform information
pub fn get_platform_info() -> PlatformInfo {
    PlatformInfo {
        os: std::env::consts::OS.to_string(),
        is_android: cfg!(target_os = "android"),
        is_desktop: !cfg!(target_os = "android"),
        arch: std::env::consts::ARCH.to_string(),
    }
}

/// Check if running on Android
pub fn is_android() -> bool {
    cfg!(target_os = "android")
}

/// Check if running on desktop (Windows, macOS, Linux)
pub fn is_desktop() -> bool {
    !cfg!(target_os = "android")
}