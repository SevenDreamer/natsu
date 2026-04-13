mod commands;
mod db;
mod models;

use commands::{storage, notes, links, search};
use std::sync::Mutex;
use rusqlite::Connection;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = db::init_database().expect("Failed to init database");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(db))
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}