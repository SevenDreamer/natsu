// JNI implementation for Volume control (Android only)

#[cfg(target_os = "android")]
use jni::JNIEnv;
#[cfg(target_os = "android")]
use jni::objects::{JObject, JValue};

use crate::commands::android::VolumeStatus;

// AudioManager stream types
const STREAM_MUSIC: i32 = 3;

/// Get media volume status (Android only)
#[cfg(target_os = "android")]
pub fn get_volume(env: &mut JNIEnv, context: &JObject) -> Result<VolumeStatus, String> {
    let service_name = env.new_string("audio")
        .map_err(|e| format!("Failed to create string: {}", e))?;

    let audio_manager = env
        .call_method(
            context,
            "getSystemService",
            "(Ljava/lang/String;)Ljava/lang/Object;",
            &[JValue::Object(&service_name)],
        )
        .map_err(|e| format!("Failed to get AudioManager: {}", e))?;

    let manager_obj = audio_manager.l().map_err(|e| e.to_string())?;

    // Get current volume
    let level = env
        .call_method(
            &manager_obj,
            "getStreamVolume",
            "(I)I",
            &[JValue::Int(STREAM_MUSIC)],
        )
        .map_err(|e| format!("Failed to get volume: {}", e))?
        .i()
        .map_err(|e| e.to_string())? as u32;

    // Get max volume
    let max_level = env
        .call_method(
            &manager_obj,
            "getStreamMaxVolume",
            "(I)I",
            &[JValue::Int(STREAM_MUSIC)],
        )
        .map_err(|e| format!("Failed to get max volume: {}", e))?
        .i()
        .map_err(|e| e.to_string())? as u32;

    // Check if muted (volume = 0)
    let muted = level == 0;

    Ok(VolumeStatus {
        level,
        max_level,
        muted,
    })
}

/// Set media volume (Android only)
#[cfg(target_os = "android")]
pub fn set_volume(env: &mut JNIEnv, context: &JObject, level: u32) -> Result<(), String> {
    let service_name = env.new_string("audio")
        .map_err(|e| format!("Failed to create string: {}", e))?;

    let audio_manager = env
        .call_method(
            context,
            "getSystemService",
            "(Ljava/lang/String;)Ljava/lang/Object;",
            &[JValue::Object(&service_name)],
        )
        .map_err(|e| format!("Failed to get AudioManager: {}", e))?;

    let manager_obj = audio_manager.l().map_err(|e| e.to_string())?;

    // Set volume with no flags (0)
    env.call_method(
        &manager_obj,
        "setStreamVolume",
        "(III)V",
        &[JValue::Int(STREAM_MUSIC), JValue::Int(level as i32), JValue::Int(0)],
    )
    .map_err(|e| format!("Failed to set volume: {}", e))?;

    Ok(())
}

/// Mute or unmute media volume (Android only)
#[cfg(target_os = "android")]
pub fn set_mute(env: &mut JNIEnv, context: &JObject, muted: bool) -> Result<(), String> {
    let service_name = env.new_string("audio")
        .map_err(|e| format!("Failed to create string: {}", e))?;

    let audio_manager = env
        .call_method(
            context,
            "getSystemService",
            "(Ljava/lang/String;)Ljava/lang/Object;",
            &[JValue::Object(&service_name)],
        )
        .map_err(|e| format!("Failed to get AudioManager: {}", e))?;

    let manager_obj = audio_manager.l().map_err(|e| e.to_string())?;

    // Use adjustStreamVolume for mute
    // ADJUST_MUTE = -100, ADJUST_UNMUTE = 100
    let adjust_value = if muted { -100 } else { 100 };

    env.call_method(
        &manager_obj,
        "adjustStreamVolume",
        "(III)V",
        &[JValue::Int(STREAM_MUSIC), JValue::Int(adjust_value), JValue::Int(0)],
    )
    .map_err(|e| format!("Failed to adjust mute state: {}", e))?;

    Ok(())
}

/// Placeholder implementations for non-Android builds
#[cfg(not(target_os = "android"))]
pub fn get_volume() -> Result<VolumeStatus, String> {
    Err("Volume requires Android".to_string())
}

#[cfg(not(target_os = "android"))]
pub fn set_volume(_level: u32) -> Result<(), String> {
    Err("Volume requires Android".to_string())
}

#[cfg(not(target_os = "android"))]
pub fn set_mute(_muted: bool) -> Result<(), String> {
    Err("Mute requires Android".to_string())
}
