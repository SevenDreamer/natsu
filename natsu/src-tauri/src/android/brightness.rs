// JNI implementation for Brightness control (Android only)

#[cfg(target_os = "android")]
use jni::JNIEnv;
#[cfg(target_os = "android")]
use jni::objects::{JObject, JValue};

/// Get screen brightness (0-255) (Android only)
#[cfg(target_os = "android")]
pub fn get_brightness(env: &mut JNIEnv, context: &JObject) -> Result<u32, String> {
    let resolver = env
        .call_method(
            context,
            "getContentResolver",
            "()Landroid/content/ContentResolver;",
            &[],
        )
        .map_err(|e| format!("Failed to get ContentResolver: {}", e))?;

    let resolver_obj = resolver.l().map_err(|e| e.to_string())?;

    let settings_class = env
        .find_class("android/provider/Settings$System")
        .map_err(|e| format!("Failed to find Settings$System class: {}", e))?;

    let brightness_str = env.new_string("screen_brightness")
        .map_err(|e| format!("Failed to create string: {}", e))?;

    let brightness = env
        .call_static_method(
            settings_class,
            "getInt",
            "(Landroid/content/ContentResolver;Ljava/lang/String;)I",
            &[
                JValue::Object(&resolver_obj),
                JValue::Object(&brightness_str),
            ],
        )
        .map_err(|e| format!("Failed to get brightness: {}", e))?
        .i()
        .map_err(|e| e.to_string())?;

    Ok(brightness.max(0).min(255) as u32)
}

/// Set screen brightness (0-255) (Android only)
/// Note: Requires WRITE_SETTINGS permission
#[cfg(target_os = "android")]
pub fn set_brightness(env: &mut JNIEnv, context: &JObject, level: u32) -> Result<(), String> {
    let level = level.max(0).min(255);

    let resolver = env
        .call_method(
            context,
            "getContentResolver",
            "()Landroid/content/ContentResolver;",
            &[],
        )
        .map_err(|e| format!("Failed to get ContentResolver: {}", e))?;

    let resolver_obj = resolver.l().map_err(|e| e.to_string())?;

    let settings_class = env
        .find_class("android/provider/Settings$System")
        .map_err(|e| format!("Failed to find Settings$System class: {}", e))?;

    let brightness_str = env.new_string("screen_brightness")
        .map_err(|e| format!("Failed to create string: {}", e))?;

    env.call_static_method(
        settings_class,
        "putInt",
        "(Landroid/content/ContentResolver;Ljava/lang/String;I)Z",
        &[
            JValue::Object(&resolver_obj),
            JValue::Object(&brightness_str),
            JValue::Int(level as i32),
        ],
    )
    .map_err(|e| format!("Failed to set brightness: {}", e))?;

    Ok(())
}

/// Placeholder implementations for non-Android builds
#[cfg(not(target_os = "android"))]
pub fn get_brightness() -> Result<u32, String> {
    Err("Brightness requires Android".to_string())
}

#[cfg(not(target_os = "android"))]
pub fn set_brightness(_level: u32) -> Result<(), String> {
    Err("Brightness requires Android".to_string())
}
