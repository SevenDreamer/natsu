// Android JNI module for system control
// Only compiled on Android target

#[cfg(target_os = "android")]
pub mod bluetooth;
#[cfg(target_os = "android")]
pub mod wifi;
#[cfg(target_os = "android")]
pub mod brightness;
#[cfg(target_os = "android")]
pub mod volume;

// Re-export common types from commands
pub use crate::commands::android::{BluetoothStatus, WifiStatus, VolumeStatus};
