---
phase: 05-ai-knowledge
plan: 03
subsystem: backend
tags: [knowledge-base, search, tool, ai]

requires:
  - phase: PLAN-01
    provides: Tool calling framework
provides:
  - query_knowledge_base tool implementation
  - Note search and retrieval for AI context
affects: []

tech-stack:
  added: []
  patterns: [Full-text search, Context building]

key-files:
  created:
    - natsu/src-tauri/src/ai/tools/query_knowledge_base.rs
  modified:
    - natsu/src-tauri/src/ai/mod.rs
---

# Phase 5 Plan 03: Knowledge Base Query Tool

**Query knowledge base via AI tool calling**

## Goal

实现 `query_knowledge_base` 工具，让 AI 能够搜索和检索知识库内容来回答问题。

## Tasks

### Task 1: Create Query Knowledge Base Tool

Create `natsu/src-tauri/src/ai/tools/query_knowledge_base.rs`:

```rust
use crate::ai::tool::{ToolDefinition, ToolExecutor};
use crate::db::Database;
use serde_json::Value;

pub struct QueryKnowledgeBaseTool {
    db: std::sync::Arc<tokio::sync::Mutex<Database>>,
}

impl QueryKnowledgeBaseTool {
    pub fn new(db: std::sync::Arc<tokio::sync::Mutex<Database>>) -> Self {
        Self { db }
    }
}

impl ToolExecutor for QueryKnowledgeBaseTool {
    fn name(&self) -> &str {
        "query_knowledge_base"
    }

    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: "query_knowledge_base".to_string(),
            description: "Search the user's knowledge base for relevant notes and content. Use this when the user asks questions about their notes, documents, or stored information.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant notes"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }),
        }
    }

    fn execute(&self, input: Value) -> Result<String, String> {
        let query = input["query"].as_str()
            .ok_or("Missing 'query' parameter")?;
        let limit = input["limit"].as_i64().unwrap_or(5) as usize;

        // Search knowledge base
        let results = self.search_notes(query, limit)?;

        // Format results
        Ok(self.format_results(results))
    }
}
```

### Task 2: Implement Search

```rust
use crate::models::note::Note;

impl QueryKnowledgeBaseTool {
    fn search_notes(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>, String> {
        let db = self.db.blocking_lock();

        // Use FTS5 for full-text search
        let sql = r#"
            SELECT
                n.id, n.title, n.content,
                bm25(notes_fts) as rank
            FROM notes n
            JOIN notes_fts fts ON n.id = fts.rowid
            WHERE notes_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        "#;

        let results = db.query(sql, [query, &limit.to_string()], |row| {
            Ok(SearchResult {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                rank: row.get::<_, f64>(3)?,
            })
        }).map_err(|e| e.to_string())?;

        Ok(results)
    }
}

#[derive(Debug)]
struct SearchResult {
    id: String,
    title: String,
    content: String,
    rank: f64,
}
```

### Task 3: Format Results for AI

```rust
impl QueryKnowledgeBaseTool {
    fn format_results(&self, results: Vec<SearchResult>) -> String {
        if results.is_empty() {
            return "No relevant notes found in the knowledge base.".to_string();
        }

        let mut output = String::from("Found the following relevant notes:\n\n");

        for (i, result) in results.iter().enumerate() {
            output.push_str(&format!("## {}. {}\n", i + 1, result.title));
            output.push_str(&format!("ID: {}\n", result.id));

            // Truncate content if too long
            let preview = if result.content.len() > 500 {
                format!("{}...[truncated]", &result.content[..500])
            } else {
                result.content.clone()
            };

            output.push_str(&format!("Content:\n{}\n\n", preview));
        }

        output
    }
}
```

### Task 4: Add Wiki Links Parser

For better context, extract and resolve `[[wiki-links]]`:

```rust
fn extract_wiki_links(content: &str) -> Vec<String> {
    let re = regex::Regex::new(r"\[\[([^\]]+)\]\]").unwrap();
    re.captures_iter(content)
        .filter_map(|cap| cap.get(1).map(|m| m.as_str().to_string()))
        .collect()
}

fn resolve_wiki_link(title: &str, db: &Database) -> Option<String> {
    // Find note by title
    db.query_one(
        "SELECT content FROM notes WHERE title = ? COLLATE NOCASE",
        [title],
        |row| row.get(0)
    ).ok().flatten()
}
```

### Task 5: Register Tool

Update `natsu/src-tauri/src/ai/mod.rs`:

```rust
use tools::query_knowledge_base::QueryKnowledgeBaseTool;

fn register_tools(manager: &mut ToolManager, db: Arc<Mutex<Database>>) {
    manager.register(Arc::new(QueryKnowledgeBaseTool::new(db)));
}
```

## Verification

1. Tool is registered
2. Search returns relevant notes
3. Results are formatted for AI
4. Empty results are handled
5. Wiki links can be resolved

---

*Phase: 05-ai-knowledge*
