# Android Permissions

Required permissions for Android system control features (AUTO-06).

## Required Permissions

Add these permissions to `gen/android/app/src/main/AndroidManifest.xml` before the `<application>` tag:

```xml
<!-- Bluetooth permissions -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />

<!-- Wi-Fi permissions -->
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- System settings permissions -->
<uses-permission android:name="android.permission.WRITE_SETTINGS" />

<!-- Notification permission (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## Permission Descriptions

| Permission | Purpose | Feature |
|------------|---------|---------|
| `BLUETOOTH` | Basic Bluetooth operations | Bluetooth control |
| `BLUETOOTH_ADMIN` | Bluetooth adapter configuration | Bluetooth control |
| `BLUETOOTH_CONNECT` | Connect to Bluetooth devices (Android 12+) | Bluetooth control |
| `BLUETOOTH_SCAN` | Scan for Bluetooth devices (Android 12+) | Bluetooth control |
| `ACCESS_WIFI_STATE` | Read Wi-Fi connection state | Wi-Fi control |
| `CHANGE_WIFI_STATE` | Enable/disable Wi-Fi | Wi-Fi control |
| `ACCESS_NETWORK_STATE` | Read network state | Wi-Fi control |
| `WRITE_SETTINGS` | Modify system settings | Brightness control |
| `POST_NOTIFICATIONS` | Show notifications (Android 13+) | Task notifications |

## Runtime Permissions

Some permissions require runtime user approval on Android 6.0+:

- `BLUETOOTH_CONNECT` (Android 12+)
- `BLUETOOTH_SCAN` (Android 12+)
- `POST_NOTIFICATIONS` (Android 13+)

The app should request these permissions before attempting to use the corresponding features.

## Initialization

After running `tauri android init`, merge these permissions into the generated `AndroidManifest.xml`.
