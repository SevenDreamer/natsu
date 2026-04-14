---
phase: 03-terminal-core
plan: 01
subsystem: backend
tags: [pty, terminal, rust, tokio, alacritty]

requires: []
provides:
  - PTY process management via Tauri commands
  - Terminal spawn/resize/write operations
  - PTY output events to frontend
affects: [PLAN-02, PLAN-03]

tech-stack:
  added: [alacritty_terminal, tokio-stream]
  patterns: [PTY abstraction, Event-driven output]

key-files:
  created:
    - natsu/src-tauri/src/terminal/mod.rs
    - natsu/src-tauri/src/terminal/pty.rs
    - natsu/src-tauri/src/commands/terminal.rs
  modified:
    - natsu/src-tauri/Cargo.toml
    - natsu/src-tauri/src/lib.rs
    - natsu/src-tauri/src/commands/mod.rs
---

# Phase 3 Plan 01: PTY Backend

**Cross-platform PTY management using alacritty_terminal with Tauri command integration**

## Goal

实现 PTY 后端，支持在 Tauri 中启动 shell 进程、发送输入、接收输出。

## Tasks

### Task 1: Add Dependencies

Add to `natsu/src-tauri/Cargo.toml`:

```toml
alacritty_terminal = "0.24"
tokio-stream = "0.1"
```

### Task 2: Create Terminal Module

Create `natsu/src-tauri/src/terminal/mod.rs`:

```rust
pub mod pty;

pub use pty::*;
```

### Task 3: Implement PTY Wrapper

Create `natsu/src-tauri/src/terminal/pty.rs`:

```rust
use alacritty_terminal::tty::setup_env;
use alacritty_terminal::event::{Event, EventListener};
use alacritty_terminal::event_loop::{EventLoop, Msg, Notifier};
use alacritty_terminal::grid::Grid;
use alacritty_terminal::term::SizeInfo;
use std::sync::Arc;
use tokio::sync::Mutex;

// PTY wrapper that manages terminal process
pub struct PtySession {
    pub id: String,
    notifier: Notifier,
    // ... handle output events
}

impl PtySession {
    pub async fn spawn(id: String, size: (u16, u16)) -> Result<Self, String> {
        // Setup PTY with alacritty_terminal
    }

    pub fn write(&self, data: &[u8]) -> Result<(), String> {
        // Write to PTY
    }

    pub fn resize(&self, size: (u16, u16)) -> Result<(), String> {
        // Resize PTY
    }
}
```

### Task 4: Create Terminal Commands

Create `natsu/src-tauri/src/commands/terminal.rs`:

```rust
use tauri::{AppHandle, Emitter, State};
use std::sync::Arc;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn spawn_terminal(
    id: String,
    cols: u16,
    rows: u16,
    sessions: State<'_, Arc<Mutex<Vec<PtySession>>>>,
    app: AppHandle,
) -> Result<(), String> {
    // Spawn PTY and setup event forwarding
}

#[tauri::command]
pub async fn write_to_pty(
    id: String,
    data: Vec<u8>,
    sessions: State<'_, Arc<Mutex<Vec<PtySession>>>>,
) -> Result<(), String> {
    // Write data to PTY
}

#[tauri::command]
pub async fn resize_pty(
    id: String,
    cols: u16,
    rows: u16,
    sessions: State<'_, Arc<Mutex<Vec<PtySession>>>>,
) -> Result<(), String> {
    // Resize PTY
}

#[tauri::command]
pub async fn kill_terminal(
    id: String,
    sessions: State<'_, Arc<Mutex<Vec<PtySession>>>>,
) -> Result<(), String> {
    // Kill PTY session
}
```

### Task 5: Register Commands

Update `natsu/src-tauri/src/lib.rs`:

```rust
mod terminal;

// In run()
let pty_sessions: Arc<Mutex<Vec<PtySession>>> = Arc::new(Mutex::new(Vec::new()));

.invoke_handler(tauri::generate_handler![
    // ... existing commands
    terminal::commands::spawn_terminal,
    terminal::commands::write_to_pty,
    terminal::commands::resize_pty,
    terminal::commands::kill_terminal,
])
.manage(pty_sessions)
```

### Task 6: Event Forwarding

Setup PTY output to emit Tauri events:

```rust
// When PTY produces output, emit to frontend
app.emit("terminal-output", TerminalOutputEvent {
    id: session_id,
    data: output_bytes,
}).ok();
```

## Verification

1. `cargo check` passes
2. Can spawn a PTY session from frontend
3. PTY output events are received
4. Write to PTY produces output
5. Resize works correctly

## Platform Notes

- Windows: Uses ConPTY
- macOS/Linux: Uses Unix PTY
- alacritty_terminal handles abstraction

## Risks

- alacritty_terminal API may change between versions
- Android PTY not supported (handled separately)

---

*Phase: 03-terminal-core*
