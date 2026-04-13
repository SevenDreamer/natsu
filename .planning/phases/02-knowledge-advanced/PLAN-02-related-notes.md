---
wave: 1
depends_on: []
files_modified:
  - termsuite/src-tauri/src/db/schema.rs
  - termsuite/src-tauri/src/commands/links.rs
files_created:
  - termsuite/src-tauri/src/commands/relations.rs
requirements: [KNOW-05]
autonomous: true
---

# PLAN-02: Related Notes Discovery

**Objective:** Implement AI-powered relationship discovery between notes based on D-01 to D-03 decisions.

---

## Task 1: Extend Database Schema for Relations

<objective>
Add tables to support relationship scoring and caching (optional optimization).
</objective>

<read_first>
- termsuite/src-tauri/src/db/schema.rs (existing schema)
</read_first>

<action>
Add the following to `termsuite/src-tauri/src/db/schema.rs` after the existing `CREATE INDEX` statements:

```rust
pub const SCHEMA: &str = r#"
-- ... existing schema content ...

-- Related notes cache (optional, for performance)
CREATE TABLE IF NOT EXISTS related_notes (
    source_note_id TEXT NOT NULL,
    related_note_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    score REAL NOT NULL,
    computed_at INTEGER NOT NULL,
    PRIMARY KEY (source_note_id, related_note_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_related_source ON related_notes(source_note_id);
CREATE INDEX IF NOT EXISTS idx_related_score ON related_notes(score DESC);

-- Note directories for proximity analysis
CREATE TABLE IF NOT EXISTS note_directories (
    note_id TEXT PRIMARY KEY,
    directory TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_note_directories ON note_directories(directory);
"#;
```

Also add a helper function to compute directory from path in the same file:

```rust
pub fn extract_directory(path: &str) -> String {
    std::path::Path::new(path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}
```
</action>

<acceptance_criteria>
- `grep "related_notes\|note_directories" termsuite/src-tauri/src/db/schema.rs` returns 4+ lines
- `grep "idx_related_source\|idx_related_score\|idx_note_directories" termsuite/src-tauri/src/db/schema.rs` returns 3 lines
- `cargo check --manifest-path termsuite/src-tauri/Cargo.toml` exits with code 0
</acceptance_criteria>

---

## Task 2: Create Relationship Types

<objective>
Define Rust types for relationship data structures.
</objective>

<read_first>
- termsuite/src-tauri/src/commands/links.rs (existing WikiLink and Backlink types)
</read_first>

<action>
Create `termsuite/src-tauri/src/commands/relations.rs` with the following content:

```rust
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

/// Relationship types between notes (D-03)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RelationshipType {
    DirectLink,
    CoCitation,     // A and B both link to C
    CoReference,    // C links to both A and B
    Proximity,      // Same directory
}

/// Related note with relationship metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelatedNote {
    pub note_id: String,
    pub title: String,
    pub relationship_type: RelationshipType,
    pub score: f64,
}

/// Full relationship analysis for a note
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelationshipAnalysis {
    pub note_id: String,
    pub related_notes: Vec<RelatedNote>,
    pub total_connections: usize,
}
```
</action>

<acceptance_criteria>
- `grep "pub enum RelationshipType" termsuite/src-tauri/src/commands/relations.rs` returns 1 line
- `grep "DirectLink\|CoCitation\|CoReference\|Proximity" termsuite/src-tauri/src/commands/relations.rs` returns 4 lines
- `grep "pub struct RelatedNote" termsuite/src-tauri/src/commands/relations.rs` returns 1 line
</acceptance_criteria>

---

## Task 3: Implement Relationship Scoring

<objective>
Implement the scoring function based on D-03 formula.
</objective>

<read_first>
- .planning/phases/02-knowledge-advanced/02-RESEARCH.md (Section 4: scoring formula)
</read_first>

<action>
Add scoring function to `termsuite/src-tauri/src/commands/relations.rs`:

```rust
/// Calculate relationship score based on D-03 factors
/// - Direct link: 0.5
/// - Co-citation: 0.15 per shared reference (max 0.2)
/// - Co-reference: 0.15 per shared referrer (max 0.2)
/// - Same directory: 0.1
pub fn calculate_relatedness(
    direct_link: bool,
    co_citation_count: i32,
    co_reference_count: i32,
    same_directory: bool,
) -> f64 {
    let mut score = 0.0;

    // Direct link is strongest signal (D-03)
    if direct_link {
        score += 0.5;
    }

    // Co-citation: A and B both link to C (weighted)
    score += (co_citation_count as f64 * 0.15).min(0.2);

    // Co-reference: C links to both A and B (weighted)
    score += (co_reference_count as f64 * 0.15).min(0.2);

    // Same directory proximity
    if same_directory {
        score += 0.1;
    }

    score.min(1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_direct_link_score() {
        let score = calculate_relatedness(true, 0, 0, false);
        assert_eq!(score, 0.5);
    }

    #[test]
    fn test_co_citation_score() {
        let score = calculate_relatedness(false, 2, 0, false);
        assert_eq!(score, 0.3); // 2 * 0.15 = 0.3
    }

    #[test]
    fn test_max_score() {
        let score = calculate_relatedness(true, 5, 5, true);
        assert_eq!(score, 1.0); // Capped at 1.0
    }

    #[test]
    fn test_all_factors() {
        let score = calculate_relatedness(true, 1, 1, true);
        assert!((score - 0.9).abs() < 0.001); // 0.5 + 0.15 + 0.15 + 0.1 = 0.9
    }
}
```
</action>

<acceptance_criteria>
- `grep "calculate_relatedness" termsuite/src-tauri/src/commands/relations.rs` returns 3+ lines
- `grep "score += 0.5\|score.min(1.0)" termsuite/src-tauri/src/commands/relations.rs` returns 2 lines
- `grep "#\[cfg(test)\]" termsuite/src-tauri/src/commands/relations.rs` returns 1 line
</acceptance_criteria>

---

## Task 4: Implement Co-Citation Query

<objective>
Implement SQL query to find co-citation relationships.
</objective>

<read_first>
- .planning/phases/02-knowledge-advanced/02-RESEARCH.md (co-citation SQL)
</read_first>

<action>
Add co-citation query function to `termsuite/src-tauri/src/commands/relations.rs`:

```rust
/// Find co-citations: notes that both link to the same target
/// Returns (note_id, co_citation_count) pairs
fn find_co_citations(
    note_id: &str,
    conn: &Connection,
) -> Result<Vec<(String, i32)>, String> {
    let mut stmt = conn.prepare(
        "SELECT b2.source_note_id, COUNT(*) as count
         FROM backlinks b1
         JOIN backlinks b2 ON b1.target_note_id = b2.target_note_id
         WHERE b1.source_note_id = ?1
           AND b2.source_note_id != ?1
           AND b2.target_note_id IS NOT NULL
           AND b2.is_broken = 0
         GROUP BY b2.source_note_id
         ORDER BY count DESC
         LIMIT 20"
    ).map_err(|e| e.to_string())?;

    let results = stmt.query_map(rusqlite::params![note_id], |row| {
        Ok((row.get(0)?, row.get(1)?))
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(results)
}
```
</action>

<acceptance_criteria>
- `grep "find_co_citations" termsuite/src-tauri/src/commands/relations.rs` returns 2+ lines
- `grep "JOIN backlinks b2 ON b1.target_note_id = b2.target_note_id" termsuite/src-tauri/src/commands/relations.rs` returns 1 line
- `grep "LIMIT 20" termsuite/src-tauri/src/commands/relations.rs` returns 1 line
</acceptance_criteria>

---

## Task 5: Implement Co-Reference Query

<objective>
Implement SQL query to find co-reference relationships.
</objective>

<read_first>
- .planning/phases/02-knowledge-advanced/02-RESEARCH.md (co-reference SQL)
</read_first>

<action>
Add co-reference query function to `termsuite/src-tauri/src/commands/relations.rs`:

```rust
/// Find co-references: notes that are both referenced by the same source
/// Returns (note_id, co_reference_count) pairs
fn find_co_references(
    note_id: &str,
    conn: &Connection,
) -> Result<Vec<(String, i32)>, String> {
    let mut stmt = conn.prepare(
        "SELECT b2.target_note_id, COUNT(*) as count
         FROM backlinks b1
         JOIN backlinks b2 ON b1.source_note_id = b2.source_note_id
         WHERE b1.target_note_id = ?1
           AND b2.target_note_id != ?1
           AND b2.target_note_id IS NOT NULL
           AND b2.is_broken = 0
         GROUP BY b2.target_note_id
         ORDER BY count DESC
         LIMIT 20"
    ).map_err(|e| e.to_string())?;

    let results = stmt.query_map(rusqlite::params![note_id], |row| {
        Ok((row.get(0)?, row.get(1)?))
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(results)
}
```
</action>

<acceptance_criteria>
- `grep "find_co_references" termsuite/src-tauri/src/commands/relations.rs` returns 2+ lines
- `grep "JOIN backlinks b2 ON b1.source_note_id = b2.source_note_id" termsuite/src-tauri/src/commands/relations.rs` returns 1 line
</acceptance_criteria>

---

## Task 6: Implement Directory Proximity Query

<objective>
Find notes in the same directory for proximity-based relationships.
</objective>

<read_first>
- termsuite/src-tauri/src/db/schema.rs (note_directories table)
</read_first>

<action>
Add directory proximity function to `termsuite/src-tauri/src/commands/relations.rs`:

```rust
/// Find notes in the same directory
fn find_same_directory_notes(
    note_id: &str,
    conn: &Connection,
) -> Result<Vec<String>, String> {
    // First get the directory of the current note
    let directory: Option<String> = conn.query_row(
        "SELECT path FROM notes WHERE id = ?1",
        rusqlite::params![note_id],
        |row| {
            let path: String = row.get(0)?;
            Ok(crate::db::schema::extract_directory(&path))
        }
    ).ok();

    let directory = match directory {
        Some(d) => d,
        None => return Ok(Vec::new()),
    };

    // Find other notes in the same directory
    let mut stmt = conn.prepare(
        "SELECT id FROM notes WHERE id != ?1 AND path LIKE ?2 LIMIT 10"
    ).map_err(|e| e.to_string())?;

    let pattern = format!("{}/%", directory);
    let results = stmt.query_map(rusqlite::params![note_id, &pattern], |row| {
        row.get(0)
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(results)
}
```
</action>

<acceptance_criteria>
- `grep "find_same_directory_notes" termsuite/src-tauri/src/commands/relations.rs` returns 2+ lines
- `grep "path LIKE" termsuite/src-tauri/src/commands/relations.rs` returns 1 line
</acceptance_criteria>

---

## Task 7: Implement Get Related Notes Command

<objective>
Create the main Tauri command for getting related notes with real-time computation (D-02).
</objective>

<read_first>
- termsuite/src-tauri/src/commands/links.rs (existing command patterns)
</read_first>

<action>
Add the main command to `termsuite/src-tauri/src/commands/relations.rs`:

```rust
use std::collections::HashMap;

/// Get related notes for a given note (real-time computation per D-02)
#[tauri::command]
pub async fn get_related_notes(
    note_id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<RelatedNote>, String> {
    let conn = db.lock().unwrap();

    // 1. Get direct links (outlinks)
    let mut direct_links: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut stmt = conn.prepare(
        "SELECT target_note_id FROM backlinks 
         WHERE source_note_id = ?1 AND target_note_id IS NOT NULL AND is_broken = 0"
    ).map_err(|e| e.to_string())?;
    
    let links = stmt.query_map(rusqlite::params![&note_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<String>, _>>().map_err(|e| e.to_string())?;
    
    for link in links {
        direct_links.insert(link);
    }

    // 2. Get co-citations
    let co_citations = find_co_citations(&note_id, &conn)?;
    let co_citation_map: HashMap<String, i32> = co_citations.into_iter().collect();

    // 3. Get co-references
    let co_references = find_co_references(&note_id, &conn)?;
    let co_reference_map: HashMap<String, i32> = co_references.into_iter().collect();

    // 4. Get same directory notes
    let same_dir_notes = find_same_directory_notes(&note_id, &conn)?;
    let same_dir_set: std::collections::HashSet<String> = same_dir_notes.into_iter().collect();

    // 5. Combine all candidate notes
    let mut all_candidates: std::collections::HashSet<String> = std::collections::HashSet::new();
    all_candidates.extend(direct_links.iter().cloned());
    all_candidates.extend(co_citation_map.keys().cloned());
    all_candidates.extend(co_reference_map.keys().cloned());
    all_candidates.extend(same_dir_set.iter().cloned());

    // 6. Calculate scores and build result
    let mut results: Vec<RelatedNote> = Vec::new();

    // Get note titles
    let mut title_stmt = conn.prepare(
        "SELECT id, title FROM notes WHERE id IN (SELECT value FROM json_each(?1))"
    ).map_err(|e| e.to_string())?;

    let ids_json = serde_json::to_string(&all_candidates.iter().collect::<Vec<_>>())
        .map_err(|e| e.to_string())?;

    let titles: HashMap<String, String> = title_stmt
        .query_map(rusqlite::params![&ids_json], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?
        .into_iter()
        .collect();

    for candidate_id in all_candidates {
        let has_direct = direct_links.contains(&candidate_id);
        let co_cite_count = co_citation_map.get(&candidate_id).copied().unwrap_or(0);
        let co_ref_count = co_reference_map.get(&candidate_id).copied().unwrap_or(0);
        let same_dir = same_dir_set.contains(&candidate_id);

        let score = calculate_relatedness(has_direct, co_cite_count, co_ref_count, same_dir);

        // Determine primary relationship type
        let rel_type = if has_direct {
            RelationshipType::DirectLink
        } else if co_cite_count > 0 {
            RelationshipType::CoCitation
        } else if co_ref_count > 0 {
            RelationshipType::CoReference
        } else {
            RelationshipType::Proximity
        };

        let title = titles.get(&candidate_id)
            .cloned()
            .unwrap_or_else(|| candidate_id.clone());

        results.push(RelatedNote {
            note_id: candidate_id,
            title,
            relationship_type: rel_type,
            score,
        });
    }

    // Sort by score descending
    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(20); // Limit to top 20

    Ok(results)
}

/// Get relationship analysis summary for a note
#[tauri::command]
pub async fn get_relationship_analysis(
    note_id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<RelationshipAnalysis, String> {
    let related = get_related_notes(note_id.clone(), db).await?;
    
    Ok(RelationshipAnalysis {
        note_id,
        total_connections: related.len(),
        related_notes: related,
    })
}
```
</action>

<acceptance_criteria>
- `grep "#\[tauri::command\]" termsuite/src-tauri/src/commands/relations.rs` returns 2 lines
- `grep "get_related_notes\|get_relationship_analysis" termsuite/src-tauri/src/commands/relations.rs` returns 4+ lines
- `grep "calculate_relatedness" termsuite/src-tauri/src/commands/relations.rs` returns 2+ lines
</acceptance_criteria>

---

## Task 8: Register Relations Commands

<objective>
Register the relations module and commands in lib.rs.
</objective>

<read_first>
- termsuite/src-tauri/src/lib.rs (existing command registration)
</read_first>

<action>
Modify `termsuite/src-tauri/src/lib.rs`:

1. Add to imports section (after `use commands::{storage, notes, links, search};`):
```rust
use commands::relations;
```

2. Add commands to invoke_handler (after `links::search_notes_by_title,`):
```rust
// Relations commands
relations::get_related_notes,
relations::get_relationship_analysis,
```
</action>

<acceptance_criteria>
- `grep "use commands::relations" termsuite/src-tauri/src/lib.rs` returns 1 line
- `grep "relations::get_related_notes" termsuite/src-tauri/src/lib.rs` returns 1 line
- `cargo check --manifest-path termsuite/src-tauri/Cargo.toml` exits with code 0
</acceptance_criteria>

---

## Task 9: Add Module Declaration

<objective>
Add relations module to commands/mod.rs.
</objective>

<read_first>
- termsuite/src-tauri/src/commands/mod.rs (existing module declarations)
</read_first>

<action>
Add to `termsuite/src-tauri/src/commands/mod.rs`:
```rust
pub mod relations;
```
</action>

<acceptance_criteria>
- `grep "pub mod relations;" termsuite/src-tauri/src/commands/mod.rs` returns 1 line
</acceptance_criteria>

---

## Validation

After completing all tasks:

1. **Build Check:**
   ```bash
   cargo build --manifest-path termsuite/src-tauri/Cargo.toml
   ```

2. **Test Scoring:**
   ```bash
   cargo test --manifest-path termsuite/src-tauri/Cargo.toml calculate_relatedness
   ```

3. **File Structure:**
   ```bash
   ls termsuite/src-tauri/src/commands/relations.rs
   ```

---

*Plan created: 2026-04-14*
*Phase: 02-knowledge-advanced*
