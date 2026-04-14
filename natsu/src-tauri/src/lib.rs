mod commands;
mod db;
mod models;
mod ai;
mod scheduler;
mod terminal;

use commands::{storage, notes, links, search};
use commands::ai as ai_commands;
use commands::relations;
use commands::graph;
use commands::wiki;
use commands::terminal as terminal_commands;
use commands::conversation;
use std::sync::Mutex;
use tauri::Manager;
use rusqlite::Connection;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = db::init_database().expect("Failed to init database");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(db))
        .setup(|app| {
            let handle = app.handle().clone();
            scheduler::start_scheduler(handle.clone());

            // Initialize PTY manager for terminal sessions
            let pty_manager = terminal_commands::init_pty_manager(handle);
            app.manage(pty_manager);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Storage commands
            storage::select_storage_path,
            storage::init_storage,
            storage::get_storage_path,
            storage::set_storage_path,
            // Note commands
            notes::create_note,
            notes::get_note,
            notes::save_note,
            notes::list_notes,
            notes::delete_note,
            // Link commands
            links::update_note_links,
            links::get_backlinks,
            links::get_outlinks,
            links::search_notes_by_title,
            // Search commands
            search::search_notes,
            search::search_notes_by_tag,
            // AI commands
            ai_commands::store_api_key,
            ai_commands::get_api_key,
            ai_commands::has_api_key,
            ai_commands::delete_api_key,
            ai_commands::list_providers,
            ai_commands::ai_stream_completion,
            ai_commands::ai_complete,
            // Relations commands
            relations::get_related_notes,
            relations::get_relationship_analysis,
            // Graph commands
            graph::get_graph_data,
            graph::get_note_connections,
            // Wiki commands
            wiki::analyze_raw_file,
            wiki::generate_wiki_suggestion,
            wiki::apply_wiki_suggestion,
            wiki::trigger_wiki_processing,
            // Terminal commands
            terminal_commands::spawn_terminal,
            terminal_commands::write_to_pty,
            terminal_commands::resize_pty,
            terminal_commands::kill_terminal,
            terminal_commands::get_terminal_content,
            terminal_commands::list_terminals,
            // Conversation commands
            conversation::create_conversation,
            conversation::list_conversations,
            conversation::get_conversation,
            conversation::add_message,
            conversation::delete_conversation,
            conversation::rename_conversation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
