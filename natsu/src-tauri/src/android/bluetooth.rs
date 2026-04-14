// JNI implementation for Bluetooth control (Android only)

#[cfg(target_os = "android")]
use jni::JNIEnv;
#[cfg(target_os = "android")]
use jni::objects::{JObject, JValue};

use crate::commands::android::BluetoothStatus;

/// Get Bluetooth adapter status (Android only)
#[cfg(target_os = "android")]
pub fn get_status(env: &mut JNIEnv, context: &JObject) -> Result<BluetoothStatus, String> {
    // Get BluetoothManager service
    let service_name = env.new_string("bluetooth")
        .map_err(|e| format!("Failed to create string: {}", e))?;

    let manager = env
        .call_method(
            context,
            "getSystemService",
            "(Ljava/lang/String;)Ljava/lang/Object;",
            &[JValue::Object(&service_name)],
        )
        .map_err(|e| format!("Failed to get BluetoothManager: {}", e))?;

    let adapter = env
        .call_method(
            manager.l().map_err(|e| e.to_string())?,
            "getAdapter",
            "()Landroid/bluetooth/BluetoothAdapter;",
            &[],
        )
        .map_err(|e| format!("Failed to get BluetoothAdapter: {}", e))?;

    let adapter_obj = adapter.l().map_err(|e| e.to_string())?;

    // Check if Bluetooth is enabled
    let enabled = env
        .call_method(&adapter_obj, "isEnabled", "()Z", &[])
        .map_err(|e| format!("Failed to check Bluetooth state: {}", e))?
        .z()
        .map_err(|e| e.to_string())?;

    // Get device name
    let device_name = if enabled {
        let name_obj = env
            .call_method(&adapter_obj, "getName", "()Ljava/lang/String;", &[])
            .map_err(|e| format!("Failed to get device name: {}", e))?;

        let name_l = name_obj.l().map_err(|e| e.to_string())?;
        if !name_l.is_null() {
            Some(
                env.get_string(&name_l.into())
                    .map_err(|e| e.to_string())?
                    .into(),
            )
        } else {
            None
        }
    } else {
        None
    };

    Ok(BluetoothStatus {
        enabled,
        connected_device: None,
        device_name,
    })
}

/// Enable or disable Bluetooth (Android only)
#[cfg(target_os = "android")]
pub fn set_enabled(env: &mut JNIEnv, context: &JObject, enabled: bool) -> Result<(), String> {
    let service_name = env.new_string("bluetooth")
        .map_err(|e| format!("Failed to create string: {}", e))?;

    let manager = env
        .call_method(
            context,
            "getSystemService",
            "(Ljava/lang/String;)Ljava/lang/Object;",
            &[JValue::Object(&service_name)],
        )
        .map_err(|e| format!("Failed to get BluetoothManager: {}", e))?;

    let adapter = env
        .call_method(
            manager.l().map_err(|e| e.to_string())?,
            "getAdapter",
            "()Landroid/bluetooth/BluetoothAdapter;",
            &[],
        )
        .map_err(|e| format!("Failed to get BluetoothAdapter: {}", e))?;

    let adapter_obj = adapter.l().map_err(|e| e.to_string())?;

    if enabled {
        env.call_method(&adapter_obj, "enable", "()Z", &[])
            .map_err(|e| format!("Failed to enable Bluetooth: {}", e))?;
    } else {
        env.call_method(&adapter_obj, "disable", "()Z", &[])
            .map_err(|e| format!("Failed to disable Bluetooth: {}", e))?;
    }

    Ok(())
}

/// Placeholder implementations for non-Android builds
#[cfg(not(target_os = "android"))]
pub fn get_status() -> Result<BluetoothStatus, String> {
    Err("Bluetooth requires Android".to_string())
}

#[cfg(not(target_os = "android"))]
pub fn set_enabled(_enabled: bool) -> Result<(), String> {
    Err("Bluetooth requires Android".to_string())
}
