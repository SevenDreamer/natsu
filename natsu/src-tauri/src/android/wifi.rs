// JNI implementation for Wi-Fi control (Android only)

#[cfg(target_os = "android")]
use jni::JNIEnv;
#[cfg(target_os = "android")]
use jni::objects::{JObject, JValue};

use crate::commands::android::WifiStatus;

/// Get Wi-Fi status (Android only)
#[cfg(target_os = "android")]
pub fn get_status(env: &mut JNIEnv, context: &JObject) -> Result<WifiStatus, String> {
    let service_name = env.new_string("wifi")
        .map_err(|e| format!("Failed to create string: {}", e))?;

    let wifi_manager = env
        .call_method(
            context,
            "getSystemService",
            "(Ljava/lang/String;)Ljava/lang/Object;",
            &[JValue::Object(&service_name)],
        )
        .map_err(|e| format!("Failed to get WifiManager: {}", e))?;

    let manager_obj = wifi_manager.l().map_err(|e| e.to_string())?;

    // Check if Wi-Fi is enabled
    let enabled = env
        .call_method(&manager_obj, "isWifiEnabled", "()Z", &[])
        .map_err(|e| format!("Failed to check Wi-Fi state: {}", e))?
        .z()
        .map_err(|e| e.to_string())?;

    // Get connection info
    let (connected, ssid) = if enabled {
        let connection_info = env
            .call_method(&manager_obj, "getConnectionInfo", "()Landroid/net/wifi/WifiInfo;", &[])
            .map_err(|e| format!("Failed to get connection info: {}", e))?;

        let info_obj = connection_info.l().map_err(|e| e.to_string())?;

        if !info_obj.is_null() {
            let ssid_obj = env
                .call_method(&info_obj, "getSSID", "()Ljava/lang/String;", &[])
                .map_err(|e| format!("Failed to get SSID: {}", e))?;

            let ssid_l = ssid_obj.l().map_err(|e| e.to_string())?;
            if !ssid_l.is_null() {
                let ssid_str: String = env
                    .get_string(&ssid_l.into())
                    .map_err(|e| e.to_string())?
                    .into();
                (true, Some(ssid_str.trim_matches('"').to_string()))
            } else {
                (false, None)
            }
        } else {
            (false, None)
        }
    } else {
        (false, None)
    };

    Ok(WifiStatus {
        enabled,
        connected,
        ssid,
    })
}

/// Enable or disable Wi-Fi (Android only)
#[cfg(target_os = "android")]
pub fn set_enabled(env: &mut JNIEnv, context: &JObject, enabled: bool) -> Result<(), String> {
    let service_name = env.new_string("wifi")
        .map_err(|e| format!("Failed to create string: {}", e))?;

    let wifi_manager = env
        .call_method(
            context,
            "getSystemService",
            "(Ljava/lang/String;)Ljava/lang/Object;",
            &[JValue::Object(&service_name)],
        )
        .map_err(|e| format!("Failed to get WifiManager: {}", e))?;

    let manager_obj = wifi_manager.l().map_err(|e| e.to_string())?;

    env.call_method(&manager_obj, "setWifiEnabled", "(Z)Z", &[JValue::Bool(enabled)])
        .map_err(|e| format!("Failed to set Wi-Fi state: {}", e))?;

    Ok(())
}

/// Placeholder implementations for non-Android builds
#[cfg(not(target_os = "android"))]
pub fn get_status() -> Result<WifiStatus, String> {
    Err("Wi-Fi requires Android".to_string())
}

#[cfg(not(target_os = "android"))]
pub fn set_enabled(_enabled: bool) -> Result<(), String> {
    Err("Wi-Fi requires Android".to_string())
}
