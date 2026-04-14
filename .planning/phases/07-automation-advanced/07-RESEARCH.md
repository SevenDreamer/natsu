# Phase 7: Automation Advanced - Research

**Gathered:** 2026-04-14
**Phase:** 7 - Automation Advanced
**Requirements:** AUTO-05, AUTO-06

---

## Domain Analysis

### Phase Boundary

Phase 7 implements advanced automation features:
- Scheduled Tasks (AUTO-05)
- Task Execution Logs
- Android System Control (AUTO-06): Bluetooth, Wi-Fi, Brightness, Volume

**Out of Scope:**
- Other Android controls (airplane mode, mobile data, etc.) - deferred
- Location services - deferred
- Battery optimization settings - deferred

### Requirements Mapping

| Requirement | Description | Priority |
|-------------|-------------|----------|
| AUTO-05 | User can schedule tasks for timed execution | Core |
| AUTO-06 | User can control Android system settings | Core |

---

## Existing Architecture

### Reusable Components from Phase 6

| Component | Location | Reusability |
|-----------|----------|-------------|
| Script Execution | `src-tauri/src/commands/script.rs` | Direct reuse for scheduled tasks |
| API Execution | `src-tauri/src/commands/api.rs` | Direct reuse for scheduled API calls |
| Command Safety Analysis | `src-tauri/src/commands/script.rs` | Reuse for task safety checks |
| File Watcher Service | `src-tauri/src/file_watcher.rs` | Pattern reference for task scheduler |
| Scheduler Framework | `src-tauri/src/scheduler/mod.rs` | Extend for general task scheduling |
| Automation Store | `src/stores/automationStore.ts` | Extend with scheduled tasks state |
| Automation Panel | `src/components/automation/AutomationPanel.tsx` | Add new tabs |

### Current Tech Stack

- **Backend:** Rust + Tauri 2.x
- **Database:** SQLite (rusqlite) with bundled feature
- **Frontend:** React 19 + TypeScript + Tailwind CSS 4
- **UI Components:** shadcn/ui + Radix UI
- **State Management:** Zustand 5
- **Async Runtime:** tokio (full features)
- **HTTP Client:** reqwest (already available)
- **File Watching:** notify 6 (already available)
- **Date/Time:** chrono 0.4 (already available)
- **Terminal:** alacritty_terminal 0.26

---

## AUTO-05: Scheduled Tasks Implementation

### 1. Cron Expression Parsing

**Recommended Library:** `cron` crate

```toml
# Add to Cargo.toml
cron = "0.12"
```

**Why `cron` crate:**
- Pure Rust implementation
- Standard cron expression parsing (5 or 6 fields)
- Iterator-based scheduling
- Works well with tokio async

**Alternative Considered:** `tokio-cron-scheduler`
- More opinionated, includes job storage
- May be overkill for our use case
- We already have SQLite for persistence

**Usage Pattern:**

```rust
use cron::Schedule;
use chrono::{DateTime, Utc};
use std::str::FromStr;

// Parse cron expression
let schedule = Schedule::from_str("0 9 * * 1-5")?; // Every weekday at 9:00

// Get next execution time
let next = schedule.after(&Utc::now()).next();
```

### 2. Scheduling Modes (Per D-01)

**Simple Interval Mode:**
```rust
pub struct SimpleInterval {
    pub interval_secs: u64,
    pub start_time: Option<DateTime<Utc>>,
}
```

**Cron Expression Mode:**
```rust
pub struct CronSchedule {
    pub expression: String,  // "0 9 * * 1-5"
    pub timezone: String,    // "Asia/Shanghai"
}
```

**Unified Task Schedule:**
```rust
pub enum TaskSchedule {
    Simple(SimpleInterval),
    Cron(CronSchedule),
    Once(DateTime<Utc>),  // One-time execution
}
```

### 3. Database Schema

**New Tables:**

```sql
-- Scheduled tasks
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    schedule_type TEXT NOT NULL,  -- 'simple', 'cron', 'once'
    schedule_config TEXT NOT NULL, -- JSON: interval_secs or cron_expression
    task_type TEXT NOT NULL,       -- 'script', 'command', 'api'
    task_config TEXT NOT NULL,     -- JSON: script_id, command, or api_config
    retry_config TEXT,             -- JSON: max_retries, retry_interval_secs
    enabled INTEGER DEFAULT 1,
    last_run_at INTEGER,
    next_run_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_enabled ON scheduled_tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at);

-- Task execution history
CREATE TABLE IF NOT EXISTS task_executions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    scheduled_time INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    status TEXT NOT NULL,  -- 'pending', 'running', 'success', 'failed', 'cancelled'
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_task_executions_task ON task_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_executions_time ON task_executions(scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_task_executions_status ON task_executions(status);
```

### 4. Task Scheduler Architecture

**Extending Existing Scheduler:**

Current `scheduler/mod.rs` uses `tokio::interval` for fixed schedules. Extend to support dynamic scheduling:

```rust
// New scheduler module structure
src-tauri/src/scheduler/
├── mod.rs           // Main scheduler coordinator
├── task.rs          // Task definition and execution
├── cron.rs          // Cron expression handling
├── runner.rs        // Task runner with retry logic
└── history.rs       // Execution history management
```

**Core Components:**

1. **TaskQueue**: In-memory queue of upcoming tasks
2. **TaskRunner**: Executes tasks with timeout and retry support
3. **HistoryManager**: Records execution results to SQLite
4. **EventEmitter**: Notifies frontend of task events

**Key Design Decisions:**

- **Persistent Queue**: Tasks survive app restart (stored in SQLite)
- **Next Run Calculation**: Calculate on task creation and after each run
- **Missed Tasks**: On app start, check for tasks that should have run
- **Concurrency**: Use tokio::spawn for parallel task execution

### 5. Retry Strategy (Per D-03)

```rust
pub struct RetryConfig {
    pub max_retries: u32,
    pub retry_interval_secs: u64,
    pub backoff_multiplier: Option<f64>,  // Exponential backoff
}

impl RetryConfig {
    pub fn calculate_delay(&self, attempt: u32) -> u64 {
        if let Some(multiplier) = self.backoff_multiplier {
            // Exponential backoff: 1, 2, 4, 8...
            let base = self.retry_interval_secs as f64;
            let delay = base * multiplier.powi(attempt as i32);
            delay as u64
        } else {
            self.retry_interval_secs
        }
    }
}
```

**Default Values:**
- `max_retries`: 0 (no retry by default)
- `retry_interval_secs`: 60
- `backoff_multiplier`: 2.0 (if exponential enabled)

### 6. Task Types (Per D-02)

**Script Task:**
```rust
pub struct ScriptTaskConfig {
    pub script_id: String,
    pub parameters: HashMap<String, String>,
    pub timeout_secs: u64,
}
```

**Command Task:**
```rust
pub struct CommandTaskConfig {
    pub command: String,
    pub working_directory: Option<String>,
    pub timeout_secs: u64,
}
```

**API Task:**
```rust
pub struct ApiTaskConfig {
    pub config_id: Option<String>,
    pub url: String,
    pub method: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    pub timeout_secs: u64,
}
```

---

## AUTO-06: Android System Control

### 1. Platform Detection (Per D-05)

**Compile-time Detection:**
```rust
#[cfg(target_os = "android")]
fn is_android() -> bool { true }

#[cfg(not(target_os = "android"))]
fn is_android() -> bool { false }
```

**Runtime Detection:**
```rust
pub fn is_android_runtime() -> bool {
    std::env::consts::OS == "android"
}
```

**Tauri Command:**
```rust
#[tauri::command]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}
```

### 2. Control Scope (Per D-04)

| Control | Actions | Android API |
|---------|---------|-------------|
| **Bluetooth** | On/Off, List Devices, Device Name | BluetoothAdapter |
| **Wi-Fi** | On/Off, Connection Status, SSID | WifiManager |
| **Brightness** | Get/Set Level (0-255) | Settings.System |
| **Volume** | Get/Set Level, Mute | AudioManager |

### 3. Tauri Android Integration

**Required Dependencies:**

```toml
# For Android-specific code
[target.'cfg(target_os = "android")'.dependencies]
jni = "0.21"
```

**Project Configuration:**

1. **Generate Android Project:**
   ```bash
   tauri android init
   ```

2. **Android Manifest Permissions:**
   ```xml
   <!-- In gen/android/app/src/main/AndroidManifest.xml -->
   <uses-permission android:name="android.permission.BLUETOOTH" />
   <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
   <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
   <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
   <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
   <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
   <uses-permission android:name="android.permission.WRITE_SETTINGS" />
   <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
   ```

3. **Tauri Plugin Pattern:**

```rust
// src-tauri/src/android/mod.rs
#[cfg(target_os = "android")]
pub mod bluetooth {
    use jni::JNIEnv;
    use jni::objects::{JObject, JValue};

    pub fn enable_bluetooth(env: &mut JNIEnv, context: &JObject) -> Result<(), String> {
        // Call Android BluetoothAdapter.enable()
        // ...
    }

    pub fn disable_bluetooth(env: &mut JNIEnv, context: &JObject) -> Result<(), String> {
        // Call Android BluetoothAdapter.disable()
        // ...
    }
}
```

### 4. Desktop Handling (Per D-06)

```rust
#[tauri::command]
pub fn control_bluetooth(enable: bool) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        // Android implementation
        android::bluetooth::set_enabled(enable)
    }

    #[cfg(not(target_os = "android"))]
    {
        Err("Bluetooth control is only available on Android devices".to_string())
    }
}
```

**Frontend Handling:**

```typescript
async function handleBluetoothControl(enable: boolean) {
  try {
    await invoke('control_bluetooth', { enable });
  } catch (error) {
    // Show user-friendly message on desktop
    toast.error('请在 Android 设备上使用此功能');
  }
}
```

### 5. Android JNI Bridge Pattern

**Getting Android Context:**

```rust
#[cfg(target_os = "android")]
fn get_android_context(app_handle: &tauri::AppHandle) -> Result<JObject, String> {
    // Access Android context through Tauri's Android activity
    // Tauri 2 provides access to the Android Activity
    // ...
}
```

**Bluetooth Control Example:**

```rust
#[cfg(target_os = "android")]
pub fn get_bluetooth_status(env: &mut JNIEnv, context: &JObject) -> Result<BluetoothStatus, String> {
    let adapter = env.call_method(
        context,
        "getSystemService",
        "(Ljava/lang/String;)Ljava/lang/Object;",
        &[JValue::Object(&env.new_string("bluetooth")?)],
    )?;

    // Query adapter state
    let enabled = env.call_method(&adapter.l()?, "isEnabled", "()Z", &[])?.z()?;

    Ok(BluetoothStatus {
        enabled,
        // ... other fields
    })
}
```

---

## Notifications (Per D-10)

### Tauri Notification Plugin

**Add Plugin:**

```toml
# Cargo.toml
tauri-plugin-notification = "2"
```

```bash
# npm
npm install @tauri-apps/plugin-notification
```

**Capability Permission:**

```json
// capabilities/default.json
{
  "permissions": [
    "notification:default",
    "notification:allow-is-permission-granted",
    "notification:allow-request-permission",
    "notification:allow-notify"
  ]
}
```

**Usage:**

```rust
use tauri_plugin_notification::NotificationExt;

// Send notification on task failure
fn notify_task_failure(app: &AppHandle, task_name: &str, error: &str) {
    app.notification()
        .builder()
        .title("Task Failed")
        .body(format!("{}: {}", task_name, error))
        .show()
        .ok();
}
```

**Android Considerations:**
- Requires `POST_NOTIFICATIONS` permission (Android 13+)
- Request runtime permission before showing notifications
- Notification channel setup for task alerts

---

## Real-time Output Streaming

### Approach Comparison

| Approach | Pros | Cons |
|----------|------|------|
| **Tauri Events** | Built-in, simple, type-safe | Single-process only |
| **WebSocket** | Cross-process, standard protocol | More complex setup |
| **SSE** | Simple, HTTP-based | One-way only |

**Recommendation:** Use **Tauri Events** for task output streaming

**Why:**
- All task execution happens in-app (no separate process needed)
- Already used for file watcher events
- Pattern established in `file_watcher.rs`

**Implementation Pattern:**

```rust
// Emit task output events
app_handle.emit(&format!("task-output-{}", task_id), OutputChunk {
    timestamp: Utc::now().timestamp(),
    content: stdout_chunk,
})?;

// Emit task completion
app_handle.emit(&format!("task-complete-{}", task_id), TaskResult {
    exit_code,
    duration_ms,
})?;
```

**Frontend Subscription:**

```typescript
import { listen } from '@tauri-apps/api/event';

// Subscribe to task output
const unlisten = await listen<OutputChunk>(`task-output-${taskId}`, (event) => {
  appendOutput(event.payload.content);
});
```

---

## UI Integration

### Tab Structure (Per D-07, D-09)

**Updated AutomationPanel:**

```
[历史] [脚本] [文件] [API] [定时] [系统]
```

- **定时 (Scheduled Tasks):** New tab for AUTO-05
- **系统 (System Control):** New tab for AUTO-06 (Android only)

### Component Structure

```
src/components/automation/
├── AutomationPanel.tsx      # Updated with 6 tabs
├── ScheduledTasks.tsx       # NEW: Task list and management
├── TaskEditor.tsx           # NEW: Create/edit scheduled task
├── TaskHistory.tsx          # NEW: Execution history viewer
├── TaskOutput.tsx           # NEW: Real-time output display
├── AndroidControl.tsx       # NEW: Android system controls
├── CommandHistory.tsx       # Existing
├── ScriptLibrary.tsx        # Existing
├── FileWatchers.tsx         # Existing
└── ApiCalls.tsx             # Existing
```

### Store Extension

```typescript
// Add to automationStore.ts

interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  scheduleType: 'simple' | 'cron' | 'once';
  scheduleConfig: SimpleInterval | CronSchedule | OnceTime;
  taskType: 'script' | 'command' | 'api';
  taskConfig: ScriptTaskConfig | CommandTaskConfig | ApiTaskConfig;
  retryConfig?: RetryConfig;
  enabled: boolean;
  lastRunAt?: number;
  nextRunAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface TaskExecution {
  id: string;
  taskId: string;
  scheduledTime: number;
  startedAt?: number;
  completedAt?: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  errorMessage?: string;
  durationMs?: number;
  retryCount: number;
}

interface AndroidStatus {
  bluetooth: BluetoothStatus;
  wifi: WifiStatus;
  brightness: number;
  volume: VolumeStatus;
}
```

---

## Dependencies

### New Rust Crates

```toml
[dependencies]
# Cron expression parsing
cron = "0.12"

# Tauri notification plugin
tauri-plugin-notification = "2"

# Android JNI (Android target only)
[target.'cfg(target_os = "android")'.dependencies]
jni = "0.21"
```

### New Frontend Packages

```bash
npm install @tauri-apps/plugin-notification
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Cron expression complexity | Provide UI builder, validate on save |
| Task queue persistence | Store next_run_at in SQLite, recover on start |
| Android permission denied | Check permissions before control, guide user |
| JNI bridge complexity | Test thoroughly, provide fallbacks |
| Notification spam | Rate limit, group similar notifications |
| Task execution timeout | Configurable timeout, default 60s |
| Timezone handling | Store in UTC, display in local time |

---

## Validation Architecture

### AUTO-05: Scheduled Tasks

| Test | Method | Criteria |
|------|--------|----------|
| Create simple task | Integration | Saved to DB, shows next run |
| Create cron task | Integration | Parses expression, calculates runs |
| Execute task | Integration | Runs at scheduled time |
| Retry on failure | Integration | Retries per config |
| Notification on fail | Integration | Shows system notification |
| Task history | Unit | Records all executions |

### AUTO-06: Android Control

| Test | Method | Criteria |
|------|--------|----------|
| Platform detection | Unit | Returns correct platform |
| Bluetooth control | Integration (Android) | Enables/disables |
| Wi-Fi control | Integration (Android) | Enables/disables |
| Brightness control | Integration (Android) | Adjusts level |
| Volume control | Integration (Android) | Adjusts level |
| Desktop fallback | Integration | Shows disabled state |

---

## Recommended Plan Order

| Wave | Plans | Dependencies |
|------|-------|--------------|
| 1 | AUTO-05 Core (Scheduler + DB) | None |
| 2 | AUTO-05 UI (Task Management) | Wave 1 |
| 3 | AUTO-06 Platform Detection | None |
| 4 | AUTO-06 Android Controls | Wave 3 |

---

## References

- [cron crate](https://docs.rs/cron/latest/cron/)
- [Tauri Notifications Plugin](https://v2.tauri.app/plugin/notification/)
- [Tauri Android Guide](https://v2.tauri.app/reference/android/)
- [Android BluetoothAdapter](https://developer.android.com/reference/android/bluetooth/BluetoothAdapter)
- [Android WifiManager](https://developer.android.com/reference/android/net/wifi/WifiManager)
- [jni crate](https://docs.rs/jni/latest/jni/)

---

## Key Questions for Planning

1. **Cron UI:** Should we provide a visual cron builder, or accept text input only?
   - **Recommendation:** Visual builder for simple cases, text input for advanced

2. **Task Queue:** Should missed tasks (app closed) run on next start?
   - **Recommendation:** Configurable per task (default: yes for important, no for others)

3. **Android Testing:** How to test Android controls without physical device?
   - **Recommendation:** Use Android emulator with sensor simulation

4. **Notification Grouping:** How to handle multiple failed tasks?
   - **Recommendation:** Group by task type, show summary notification

5. **Task Priority:** Should urgent tasks take priority over scheduled?
   - **Recommendation:** Keep simple for MVP, no priority system

---

*Research completed: 2026-04-14*
