use async_trait::async_trait;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::{Arc, Mutex};

use super::super::tool::{ToolDefinition, ToolExecutor};

/// Search result from the knowledge base
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeSearchResult {
    pub id: String,
    pub title: String,
    pub content: String,
    pub rank: f64,
}

/// Tool for querying the knowledge base using FTS5 full-text search
pub struct QueryKnowledgeBaseTool {
    db: Arc<Mutex<Connection>>,
}

impl QueryKnowledgeBaseTool {
    /// Create a new query knowledge base tool
    pub fn new(db: Arc<Mutex<Connection>>) -> Self {
        Self { db }
    }

    /// Search the knowledge base using FTS5
    fn search(&self, query: &str, limit: i32) -> Result<Vec<KnowledgeSearchResult>, String> {
        let conn = self.db.lock().map_err(|e| format!("Database lock error: {}", e))?;

        // Escape special FTS5 characters and build query
        let fts_query = Self::escape_fts_query(query);

        // Use FTS5 BM25 ranking for relevance
        // Get content directly from notes_fts for the preview
        let sql = r#"
            SELECT
                n.id,
                n.title,
                COALESCE(notes_fts.content, '') as content,
                bm25(notes_fts) as rank
            FROM notes_fts
            JOIN notes n ON notes_fts.id = n.id
            WHERE notes_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        "#;

        let mut stmt = conn.prepare(sql).map_err(|e| format!("SQL prepare error: {}", e))?;

        let results = stmt
            .query_map(rusqlite::params![&fts_query, limit], |row| {
                Ok(KnowledgeSearchResult {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    rank: row.get(3)?,
                })
            })
            .map_err(|e| format!("Query error: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Result collection error: {}", e))?;

        Ok(results)
    }

    /// Escape special FTS5 characters in query
    fn escape_fts_query(query: &str) -> String {
        // For simple queries, just wrap in quotes for phrase matching
        // For complex queries with operators, pass through
        if query.contains('"')
            || query.contains('*')
            || query.contains('^')
            || query.contains('(')
            || query.contains(')')
        {
            query.to_string()
        } else {
            format!("\"{}\"", query)
        }
    }

    /// Truncate content to a maximum length, preserving the beginning
    fn truncate_content(content: &str, max_len: usize) -> String {
        if content.len() <= max_len {
            content.to_string()
        } else {
            // Try to truncate at a word boundary
            let truncated = &content[..max_len];
            if let Some(last_space) = truncated.rfind(|c: char| c.is_whitespace()) {
                format!("{}...", &content[..last_space])
            } else {
                format!("{}...", truncated)
            }
        }
    }

    /// Format search results as markdown for AI consumption
    fn format_results(results: Vec<KnowledgeSearchResult>) -> String {
        if results.is_empty() {
            return "No relevant notes found in the knowledge base.".to_string();
        }

        let mut output = String::new();
        output.push_str(&format!("Found {} relevant note(s):\n\n", results.len()));

        for result in results {
            output.push_str(&format!("## {} (ID: {})\n\n", result.title, result.id));

            // Truncate content to 500 chars for AI context efficiency
            let preview = Self::truncate_content(&result.content, 500);
            output.push_str(&format!("{}\n\n", preview));

            // Add separator
            output.push_str("---\n\n");
        }

        output
    }
}

#[async_trait]
impl ToolExecutor for QueryKnowledgeBaseTool {
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: "query_knowledge_base".to_string(),
            description: "Search the knowledge base for notes relevant to a query. Returns matching notes with their titles, IDs, and content previews. Use this to find information stored in the user's notes.".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant notes. Can be keywords, phrases, or questions about the topic."
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default: 5, max: 20)",
                        "default": 5,
                        "minimum": 1,
                        "maximum": 20
                    }
                },
                "required": ["query"]
            }),
        }
    }

    async fn execute(&self, input: Value) -> Result<String, String> {
        // Extract query parameter
        let query = input["query"]
            .as_str()
            .ok_or("Missing required parameter: query")?;

        // Extract optional limit parameter (default: 5, max: 20)
        let limit = input["limit"]
            .as_i64()
            .map(|l| l.clamp(1, 20) as i32)
            .unwrap_or(5);

        // Perform the search
        let results = self.search(query, limit)?;

        // Format results for AI
        Ok(Self::format_results(results))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_truncate_content_short() {
        let content = "Short content";
        let result = QueryKnowledgeBaseTool::truncate_content(content, 500);
        assert_eq!(result, content);
    }

    #[test]
    fn test_truncate_content_long() {
        let content = "This is a very long piece of content that definitely exceeds the maximum length limit and should be truncated properly with an ellipsis at the end.";
        let result = QueryKnowledgeBaseTool::truncate_content(content, 50);
        assert!(result.ends_with("..."));
        assert!(result.len() <= 53); // 50 + "..."
    }

    #[test]
    fn test_truncate_content_word_boundary() {
        let content = "This is a test sentence that should be truncated at a word boundary for better readability.";
        let result = QueryKnowledgeBaseTool::truncate_content(content, 30);
        assert!(result.ends_with("..."));
        // Should not cut off mid-word
        assert!(!result.contains("truncat"));
    }

    #[test]
    fn test_format_results_empty() {
        let result = QueryKnowledgeBaseTool::format_results(vec![]);
        assert_eq!(result, "No relevant notes found in the knowledge base.");
    }

    #[test]
    fn test_format_results_with_data() {
        let results = vec![
            KnowledgeSearchResult {
                id: "note-1".to_string(),
                title: "Test Note".to_string(),
                content: "This is the content of the test note.".to_string(),
                rank: -1.5,
            },
        ];

        let formatted = QueryKnowledgeBaseTool::format_results(results);
        assert!(formatted.contains("Found 1 relevant note"));
        assert!(formatted.contains("Test Note"));
        assert!(formatted.contains("note-1"));
        assert!(formatted.contains("This is the content"));
    }

    #[test]
    fn test_escape_fts_query_simple() {
        let query = "hello world";
        let escaped = QueryKnowledgeBaseTool::escape_fts_query(query);
        assert_eq!(escaped, "\"hello world\"");
    }

    #[test]
    fn test_escape_fts_query_with_wildcard() {
        let query = "hello*";
        let escaped = QueryKnowledgeBaseTool::escape_fts_query(query);
        assert_eq!(escaped, "hello*");
    }

    #[test]
    fn test_escape_fts_query_with_quotes() {
        let query = "\"exact phrase\"";
        let escaped = QueryKnowledgeBaseTool::escape_fts_query(query);
        assert_eq!(escaped, "\"exact phrase\"");
    }
}
