use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

use crate::db::schema::extract_directory;

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
            Ok(extract_directory(&path))
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
    let candidates_vec: Vec<&String> = all_candidates.iter().collect();
    let placeholders: Vec<String> = candidates_vec.iter().map(|_| "?".to_string()).collect();
    let placeholders_str = placeholders.join(",");

    let sql = format!(
        "SELECT id, title FROM notes WHERE id IN ({})",
        placeholders_str
    );

    let mut title_stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let params: Vec<&String> = candidates_vec.iter().map(|s| *s).collect();

    let mut param_refs: Vec<&dyn rusqlite::ToSql> = Vec::new();
    for p in &params {
        param_refs.push(p);
    }

    let titles: HashMap<String, String> = title_stmt
        .query_map(rusqlite::params_from_iter(param_refs.iter().cloned()), |row| {
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
        // 2 * 0.15 = 0.3, but capped at 0.2
        let score = calculate_relatedness(false, 2, 0, false);
        assert!((score - 0.2).abs() < 0.001); // Capped at max 0.2
    }

    #[test]
    fn test_max_score() {
        let score = calculate_relatedness(true, 5, 5, true);
        assert!((score - 1.0).abs() < 0.001); // Capped at 1.0
    }

    #[test]
    fn test_all_factors() {
        let score = calculate_relatedness(true, 1, 1, true);
        assert!((score - 0.9).abs() < 0.001); // 0.5 + 0.15 + 0.15 + 0.1 = 0.9
    }
}
