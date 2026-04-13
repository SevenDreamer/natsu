use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub connection_count: i32,
    pub directory: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(rename = "type")]
    pub edge_type: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphStats {
    pub total_nodes: usize,
    pub total_edges: usize,
    pub isolated_nodes: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub stats: GraphStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphFilter {
    pub node_type: Option<String>,
    pub min_connections: Option<i32>,
    pub directory: Option<String>,
    pub search_query: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionsCount {
    pub incoming: i32,
    pub outgoing: i32,
}

/// Determine note type from path
fn get_note_type(path: &str) -> String {
    if path.contains("/raw/") {
        "raw".to_string()
    } else if path.contains("/wiki/") {
        "wiki".to_string()
    } else if path.contains("/outputs/") {
        "outputs".to_string()
    } else {
        "wiki".to_string() // Default
    }
}

/// Extract directory from path
fn get_directory(path: &str) -> String {
    std::path::Path::new(path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}

/// Get graph data for visualization
#[tauri::command]
pub async fn get_graph_data(
    filter: Option<GraphFilter>,
    db: State<'_, Mutex<Connection>>,
) -> Result<GraphData, String> {
    let conn = db.lock().unwrap();

    // Build node query with optional filters
    let mut node_query = String::from(
        "SELECT n.id, n.title, n.path,
            (SELECT COUNT(*) FROM backlinks b WHERE b.source_note_id = n.id OR b.target_note_id = n.id) as conn_count
         FROM notes n"
    );

    let mut conditions: Vec<String> = Vec::new();

    if let Some(ref f) = filter {
        if let Some(ref node_type) = f.node_type {
            if node_type != "all" {
                match node_type.as_str() {
                    "raw" => conditions.push("n.path LIKE '%/raw/%'".to_string()),
                    "wiki" => conditions.push("n.path LIKE '%/wiki/%'".to_string()),
                    "outputs" => conditions.push("n.path LIKE '%/outputs/%'".to_string()),
                    _ => {}
                }
            }
        }
        if let Some(min_conn) = f.min_connections {
            if min_conn > 0 {
                conditions.push(format!("conn_count >= {}", min_conn));
            }
        }
        if let Some(ref dir) = f.directory {
            conditions.push(format!("n.path LIKE '%{}%'", dir));
        }
        if let Some(ref query) = f.search_query {
            if !query.is_empty() {
                conditions.push(format!("n.title LIKE '%{}%'", query));
            }
        }
    }

    if !conditions.is_empty() {
        node_query.push_str(" WHERE ");
        node_query.push_str(&conditions.join(" AND "));
    }

    let mut stmt = conn.prepare(&node_query).map_err(|e| e.to_string())?;

    let nodes: Vec<GraphNode> = stmt.query_map([], |row| {
        let path: String = row.get(2)?;
        Ok(GraphNode {
            id: row.get(0)?,
            label: row.get(1)?,
            node_type: get_note_type(&path),
            connection_count: row.get(3)?,
            directory: get_directory(&path),
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    // Get edges from backlinks
    let mut edge_stmt = conn.prepare(
        "SELECT source_note_id, target_note_id, link_text
         FROM backlinks
         WHERE target_note_id IS NOT NULL AND is_broken = 0"
    ).map_err(|e| e.to_string())?;

    let edges: Vec<GraphEdge> = edge_stmt.query_map([], |row| {
        let source: String = row.get(0)?;
        let target: String = row.get(1)?;
        Ok(GraphEdge {
            id: format!("{}-{}", source, target),
            source,
            target,
            edge_type: "direct".to_string(),
            score: 1.0,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    // Calculate stats before moving edges
    let connected_nodes: std::collections::HashSet<&str> = edges.iter()
        .flat_map(|e| vec![e.source.as_str(), e.target.as_str()])
        .collect();

    let isolated_count = nodes.iter()
        .filter(|n| !connected_nodes.contains(n.id.as_str()))
        .count();

    let total_nodes = nodes.len();
    let total_edges = edges.len();

    Ok(GraphData {
        nodes,
        edges,
        stats: GraphStats {
            total_nodes,
            total_edges,
            isolated_nodes: isolated_count,
        },
    })
}

/// Get connection counts for a specific note
#[tauri::command]
pub async fn get_note_connections(
    note_id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<ConnectionsCount, String> {
    let conn = db.lock().unwrap();

    let incoming: i32 = conn.query_row(
        "SELECT COUNT(*) FROM backlinks WHERE target_note_id = ?1 AND is_broken = 0",
        rusqlite::params![&note_id],
        |row| row.get(0)
    ).unwrap_or(0);

    let outgoing: i32 = conn.query_row(
        "SELECT COUNT(*) FROM backlinks WHERE source_note_id = ?1 AND is_broken = 0",
        rusqlite::params![&note_id],
        |row| row.get(0)
    ).unwrap_or(0);

    Ok(ConnectionsCount { incoming, outgoing })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_note_type() {
        assert_eq!(get_note_type("/path/to/raw/note.md"), "raw");
        assert_eq!(get_note_type("/path/to/wiki/note.md"), "wiki");
        assert_eq!(get_note_type("/path/to/outputs/note.md"), "outputs");
        assert_eq!(get_note_type("/path/to/note.md"), "wiki"); // Default
    }

    #[test]
    fn test_get_directory() {
        assert_eq!(get_directory("/wiki/my-note.md"), "/wiki");
        assert_eq!(get_directory("/raw/folder/note.md"), "/raw/folder");
        assert_eq!(get_directory("note.md"), "");
    }

    #[test]
    fn test_graph_edge_id_format() {
        let edge = GraphEdge {
            id: "source-target".to_string(),
            source: "source".to_string(),
            target: "target".to_string(),
            edge_type: "direct".to_string(),
            score: 1.0,
        };
        assert!(edge.id.contains('-'));
    }
}
