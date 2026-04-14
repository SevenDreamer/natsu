---
phase: 04-ai-integration
plan: 02
subsystem: backend
tags: [database, sqlite, history, conversation]

requires: []
provides:
  - SQLite schema for conversations
  - Tauri commands for conversation CRUD
  - Conversation persistence
affects: [PLAN-03]

tech-stack:
  added: []
  patterns: [Database migration, CRUD commands]

key-files:
  created:
    - natsu/src-tauri/src/commands/conversation.rs
    - natsu/src-tauri/src/models/conversation.rs
  modified:
    - natsu/src-tauri/src/lib.rs
    - natsu/src-tauri/src/commands/mod.rs
    - natsu/src-tauri/src/models/mod.rs
---

# Phase 4 Plan 02: Conversation History Storage

**SQLite-based conversation persistence**

## Goal

实现对话历史的存储和加载，支持多对话管理。

## Tasks

### Task 1: Create Database Schema

The existing SQLite database needs new tables. Add migration in `natsu/src-tauri/src/db/migrations.rs`:

```sql
-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Index for faster message lookup
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
```

### Task 2: Create Models

Create `natsu/src-tauri/src/models/conversation.rs`:

```rust
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String, // "user", "assistant", "system"
    pub content: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationWithMessages {
    pub conversation: Conversation,
    pub messages: Vec<Message>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateConversationRequest {
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddMessageRequest {
    pub conversation_id: String,
    pub role: String,
    pub content: String,
}
```

### Task 3: Create Conversation Commands

Create `natsu/src-tauri/src/commands/conversation.rs`:

```rust
use crate::db::Database;
use crate::models::conversation::*;
use tauri::State;
use std::sync::Mutex;
use chrono::Utc;

#[tauri::command]
pub async fn create_conversation(
    title: Option<String>,
    db: State<'_, Mutex<Database>>,
) -> Result<Conversation, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();
    let title = title.unwrap_or_else(|| "New Conversation".to_string());

    db.execute(
        "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [&id, &title, &now.to_string(), &now.to_string()]
    ).map_err(|e| e.to_string())?;

    Ok(Conversation { id, title, created_at: now, updated_at: now })
}

#[tauri::command]
pub async fn list_conversations(
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<Conversation>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.query(
        "SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC",
        [],
        |row| Ok(Conversation {
            id: row.get(0)?,
            title: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
        })
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_conversation(
    id: String,
    db: State<'_, Mutex<Database>>,
) -> Result<ConversationWithMessages, String> {
    let db = db.lock().map_err(|e| e.to_string())?;

    let conversation: Conversation = db.query_one(
        "SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?",
        [&id],
        |row| Ok(Conversation {
            id: row.get(0)?,
            title: row.get(1)?,
            created_at: row.get(2)?,
            updated_at: row.get(3)?,
        })
    ).map_err(|e| e.to_string())?.ok_or("Conversation not found")?;

    let messages: Vec<Message> = db.query(
        "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        [&id],
        |row| Ok(Message {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            created_at: row.get(4)?,
        })
    ).map_err(|e| e.to_string())?;

    Ok(ConversationWithMessages { conversation, messages })
}

#[tauri::command]
pub async fn add_message(
    request: AddMessageRequest,
    db: State<'_, Mutex<Database>>,
) -> Result<Message, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    db.execute(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        [&id, &request.conversation_id, &request.role, &request.content, &now.to_string()]
    ).map_err(|e| e.to_string())?;

    // Update conversation updated_at
    db.execute(
        "UPDATE conversations SET updated_at = ? WHERE id = ?",
        [&now.to_string(), &request.conversation_id]
    ).ok();

    Ok(Message {
        id,
        conversation_id: request.conversation_id,
        role: request.role,
        content: request.content,
        created_at: now,
    })
}

#[tauri::command]
pub async fn delete_conversation(
    id: String,
    db: State<'_, Mutex<Database>>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM conversations WHERE id = ?", [&id])
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_conversation(
    id: String,
    title: String,
    db: State<'_, Mutex<Database>>,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.execute("UPDATE conversations SET title = ? WHERE id = ?", [&title, &id])
        .map_err(|e| e.to_string())
}
```

### Task 4: Register Commands

Update `natsu/src-tauri/src/lib.rs`:

```rust
mod models;
mod commands;

use commands::conversation;

.invoke_handler(tauri::generate_handler![
    // ... existing commands
    conversation::create_conversation,
    conversation::list_conversations,
    conversation::get_conversation,
    conversation::add_message,
    conversation::delete_conversation,
    conversation::rename_conversation,
])
```

## Verification

1. Can create a new conversation
2. Can list all conversations
3. Can add messages to conversation
4. Can load conversation with messages
5. Can delete conversation

---

*Phase: 04-ai-integration*
