use std::sync::Mutex;
use tauri::State;
use rusqlite::Connection;
use uuid::Uuid;
use chrono::Utc;

use crate::models::{Conversation, ConversationWithMessages, Message, MessageRole};

/// Create a new conversation
#[tauri::command]
pub async fn create_conversation(
    title: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Conversation, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    let conversation = Conversation {
        id: id.clone(),
        title: title.clone(),
        created_at: now,
        updated_at: now,
    };

    let conn = db.lock().unwrap();
    conn.execute(
        "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![&conversation.id, &conversation.title, conversation.created_at, conversation.updated_at],
    ).map_err(|e| e.to_string())?;

    Ok(conversation)
}

/// List all conversations, ordered by most recently updated
#[tauri::command]
pub async fn list_conversations(
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<Conversation>, String> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC"
    ).map_err(|e| e.to_string())?;

    let conversations = stmt.query_map([], |row| {
        Ok(Conversation {
            id: row.get(0)?,
            title: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(conversations)
}

/// Get a conversation with all its messages
#[tauri::command]
pub async fn get_conversation(
    id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<ConversationWithMessages, String> {
    let conn = db.lock().unwrap();

    // Get conversation
    let conversation = conn.query_row(
        "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?1",
        rusqlite::params![&id],
        |row| Ok(Conversation {
            id: row.get(0)?,
            title: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
        }),
    ).map_err(|e| e.to_string())?;

    // Get messages
    let mut stmt = conn.prepare(
        "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ?1 ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;

    let messages = stmt.query_map(rusqlite::params![&id], |row| {
        let role_str: String = row.get(2)?;
        let role = MessageRole::from_str(&role_str)
            .ok_or_else(|| rusqlite::Error::InvalidQuery)?;
        Ok(Message {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            role,
            content: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(ConversationWithMessages {
        id: conversation.id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        messages,
    })
}

/// Add a message to a conversation
#[tauri::command]
pub async fn add_message(
    conversation_id: String,
    role: MessageRole,
    content: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Message, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    let message = Message {
        id: id.clone(),
        conversation_id: conversation_id.clone(),
        role: role.clone(),
        content: content.clone(),
        created_at: now,
    };

    let conn = db.lock().unwrap();

    // Insert message
    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&message.id, &message.conversation_id, role.as_str(), &message.content, message.created_at],
    ).map_err(|e| e.to_string())?;

    // Update conversation timestamp
    conn.execute(
        "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, &conversation_id],
    ).map_err(|e| e.to_string())?;

    Ok(message)
}

/// Delete a conversation and all its messages
#[tauri::command]
pub async fn delete_conversation(
    id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().unwrap();
    // Messages are deleted automatically via CASCADE
    conn.execute(
        "DELETE FROM conversations WHERE id = ?1",
        rusqlite::params![&id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Rename a conversation
#[tauri::command]
pub async fn rename_conversation(
    id: String,
    title: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Conversation, String> {
    let now = Utc::now().timestamp();

    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE conversations SET title = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![&title, now, &id],
    ).map_err(|e| e.to_string())?;

    let conversation = conn.query_row(
        "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?1",
        rusqlite::params![&id],
        |row| Ok(Conversation {
            id: row.get(0)?,
            title: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
        }),
    ).map_err(|e| e.to_string())?;

    Ok(conversation)
}
