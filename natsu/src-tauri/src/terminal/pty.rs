//! PTY Backend implementation using alacritty_terminal
//!
//! This module provides a PTY session management layer that integrates
//! alacritty_terminal's terminal emulation with Tauri's event system.

use std::collections::HashMap;
use std::io;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use alacritty_terminal::event::{Event, EventListener, Notify, OnResize, WindowSize};
use alacritty_terminal::event_loop::{EventLoop, Msg, Notifier};
use alacritty_terminal::grid::Dimensions;
use alacritty_terminal::sync::FairMutex;
use alacritty_terminal::term::test::TermSize;
use alacritty_terminal::term::Term;
use alacritty_terminal::tty::{self, Options};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

/// Custom event listener that forwards terminal events to Tauri
#[derive(Clone)]
pub struct TauriEventListener {
    app_handle: AppHandle,
    session_id: String,
}

impl EventListener for TauriEventListener {
    fn send_event(&self, event: Event) {
        match event {
            Event::Wakeup => {
                // Terminal content has changed, notify frontend
                let _ = self.app_handle.emit(
                    &format!("pty-output-{}", self.session_id),
                    (),
                );
            }
            Event::Title(title) => {
                let _ = self.app_handle.emit(
                    &format!("pty-title-{}", self.session_id),
                    title,
                );
            }
            Event::Bell => {
                let _ = self.app_handle.emit(
                    &format!("pty-bell-{}", self.session_id),
                    (),
                );
            }
            Event::ChildExit(status) => {
                let _ = self.app_handle.emit(
                    &format!("pty-exit-{}", self.session_id),
                    status.code(),
                );
            }
            Event::Exit => {
                let _ = self.app_handle.emit(
                    &format!("pty-exit-{}", self.session_id),
                    None::<i32>,
                );
            }
            _ => {}
        }
    }
}

/// Configuration for spawning a new PTY session
#[derive(Debug, Clone)]
pub struct PtyConfig {
    /// Shell program to run (e.g., "/bin/bash", "/bin/zsh")
    pub shell: Option<String>,
    /// Arguments to pass to the shell
    pub args: Vec<String>,
    /// Working directory for the shell
    pub working_directory: Option<String>,
    /// Environment variables to set
    pub env: HashMap<String, String>,
    /// Initial terminal size (columns, rows)
    pub cols: u16,
    /// Initial terminal size (rows)
    pub rows: u16,
}

impl Default for PtyConfig {
    fn default() -> Self {
        Self {
            shell: None,
            args: Vec::new(),
            working_directory: None,
            env: HashMap::new(),
            cols: 80,
            rows: 24,
        }
    }
}

/// A PTY session that manages a terminal process
pub struct PtySession {
    /// Unique session identifier
    pub id: String,
    /// Terminal instance
    terminal: Arc<FairMutex<Term<TauriEventListener>>>,
    /// Event loop handle
    #[allow(dead_code)]
    event_loop_handle: JoinHandle<(EventLoop<tty::Pty, TauriEventListener>, alacritty_terminal::event_loop::State)>,
    /// Notifier for sending input to PTY
    notifier: Notifier,
    /// Application handle for event emission
    #[allow(dead_code)]
    app_handle: AppHandle,
}

impl PtySession {
    /// Create a new PTY session
    pub fn new(config: PtyConfig, app_handle: AppHandle) -> io::Result<Self> {
        let session_id = Uuid::new_v4().to_string();

        // Setup environment
        tty::setup_env();

        // Create event listener
        let event_listener = TauriEventListener {
            app_handle: app_handle.clone(),
            session_id: session_id.clone(),
        };

        // Create terminal with initial size
        let size = TermSize::new(config.cols as usize, config.rows as usize);
        let terminal = Term::new(Default::default(), &size, event_listener.clone());
        let terminal = Arc::new(FairMutex::new(terminal));

        // Create PTY options
        let shell = config.shell.map(|program| tty::Shell::new(program, config.args));
        let pty_config = Options {
            shell,
            working_directory: config.working_directory.map(|p| p.into()),
            drain_on_exit: true,
            env: config.env,
        };

        // Create window size for PTY
        let window_size = WindowSize {
            num_lines: config.rows,
            num_cols: config.cols,
            cell_width: 8,
            cell_height: 16,
        };

        // Create PTY
        let pty = tty::new(&pty_config, window_size, 0)?;

        // Create and spawn event loop
        let event_loop = EventLoop::new(
            terminal.clone(),
            event_listener,
            pty,
            true, // drain_on_exit
            false, // ref_test
        )?;

        let notifier = Notifier(event_loop.channel());
        let event_loop_handle = event_loop.spawn();

        Ok(Self {
            id: session_id,
            terminal,
            event_loop_handle,
            notifier,
            app_handle,
        })
    }

    /// Write input to the PTY
    pub fn write(&mut self, data: &[u8]) -> io::Result<()> {
        self.notifier.notify(data.to_vec());
        Ok(())
    }

    /// Resize the terminal
    pub fn resize(&mut self, cols: u16, rows: u16) {
        let window_size = WindowSize {
            num_lines: rows,
            num_cols: cols,
            cell_width: 8,
            cell_height: 16,
        };
        self.notifier.on_resize(window_size);
    }

    /// Get terminal content as a string
    pub fn get_content(&self) -> String {
        let terminal = self.terminal.lock();
        let mut content = String::new();

        // Get the grid content
        let screen_lines = terminal.screen_lines();
        let columns = terminal.columns();

        for line in 0..screen_lines {
            for col in 0..columns {
                let point = alacritty_terminal::index::Point::new(
                    alacritty_terminal::index::Line(line as i32),
                    alacritty_terminal::index::Column(col),
                );
                let cell = &terminal.grid()[point];
                content.push(cell.c);
            }
            if line < screen_lines - 1 {
                content.push('\n');
            }
        }

        content
    }

    /// Shutdown the PTY session
    pub fn shutdown(self) {
        let _ = self.notifier.0.send(Msg::Shutdown);
    }
}

impl Drop for PtySession {
    fn drop(&mut self) {
        // Send shutdown signal
        let _ = self.notifier.0.send(Msg::Shutdown);
    }
}

/// Manager for PTY sessions
pub struct PtyManager {
    sessions: HashMap<String, PtySession>,
    app_handle: AppHandle,
}

impl PtyManager {
    /// Create a new PTY manager
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            sessions: HashMap::new(),
            app_handle,
        }
    }

    /// Spawn a new PTY session
    pub fn spawn(&mut self, config: PtyConfig) -> io::Result<String> {
        let session = PtySession::new(config, self.app_handle.clone())?;
        let id = session.id.clone();
        self.sessions.insert(id.clone(), session);
        Ok(id)
    }

    /// Get a session by ID
    pub fn get(&self, id: &str) -> Option<&PtySession> {
        self.sessions.get(id)
    }

    /// Get a mutable session by ID
    pub fn get_mut(&mut self, id: &str) -> Option<&mut PtySession> {
        self.sessions.get_mut(id)
    }

    /// Kill a session
    pub fn kill(&mut self, id: &str) -> bool {
        if let Some(session) = self.sessions.remove(id) {
            session.shutdown();
            true
        } else {
            false
        }
    }

    /// Get all active session IDs
    pub fn list(&self) -> Vec<String> {
        self.sessions.keys().cloned().collect()
    }
}

/// Thread-safe wrapper for PtyManager
pub type SharedPtyManager = Arc<Mutex<PtyManager>>;

/// Create a shared PTY manager
pub fn create_pty_manager(app_handle: AppHandle) -> SharedPtyManager {
    Arc::new(Mutex::new(PtyManager::new(app_handle)))
}
