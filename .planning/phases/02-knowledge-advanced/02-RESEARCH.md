# Phase 2: Knowledge Advanced - Research

**Gathered:** 2026-04-14
**Status:** Ready for planning

---

## 1. Cytoscape.js Integration for Knowledge Graph Visualization

### Technical Approach

**Recommended Library:** `cytoscape` + `@cytoscape/react` wrapper

```bash
npm install cytoscape @cytoscape/react
```

**Integration Pattern:**

1. Create a dedicated `GraphView` component as full-screen modal or route
2. Use Cytoscape's `fcose` layout (force-directed, good for 500-2000 nodes)
3. Data flow: Rust backend provides node/edge data via Tauri command → React renders graph

**Key Configuration:**

```typescript
// Recommended fcose layout settings for knowledge graphs
const layout = {
  name: 'fcose',
  quality: 'proof',
  animate: true,
  animationDuration: 500,
  fit: true,
  padding: 50,
  nodeDimensionsIncludeLabels: true,
  idealEdgeLength: 100,
  nodeRepulsion: 4500,
  // Critical for performance with 1000+ nodes
  numIter: 1000,
  sampleSize: 25
};
```

**Performance Considerations:**

| Node Count | Strategy |
|------------|----------|
| < 500 | Full graph, all interactions |
| 500-2000 | fcose layout, consider clustering |
| 2000+ | WebGL renderer (`cytoscape-cxtsvfc`), level-of-detail filtering |

**Click-to-Navigate Pattern:**

```typescript
cy.on('tap', 'node', (evt) => {
  const noteId = evt.target.id();
  // Option A: Navigate via router
  navigate(`/notes/${noteId}`);
  // Option B: Open in preview panel
  setActiveNoteId(noteId);
});
```

**Search/Filter Highlighting:**

```typescript
// Highlight matching nodes
cy.elements().removeClass('highlighted');
cy.getElementById(matchingIds).addClass('highlighted');
// CSS: .highlighted { border-width: 3px; border-color: #0969DA; }
```

### Integration with Existing Code

- Add `GraphView` component in `src/components/graph/`
- Extend `Sidebar` with "Knowledge Graph" button
- Create new Tauri command: `get_graph_data()` returning `{ nodes, edges }`
- Extend `links.rs` to provide graph data (reuse existing backlinks table)

---

## 2. AI Provider Abstraction in Rust

### Trait Design

```rust
// src-tauri/src/ai/mod.rs
pub use async_trait::async_trait;

#[async_trait]
pub trait AIProvider: Send + Sync {
    /// Stream response chunks
    async fn stream_completion(
        &self,
        prompt: &str,
        context: Option<&str>,
    ) -> Result<impl Stream<Item = Result<String, AIError>>, AIError>;

    /// Get provider name
    fn name(&self) -> &str;
}

// Provider implementations
pub struct ClaudeProvider { api_key: String }
pub struct OpenAIProvider { api_key: String }
pub struct DeepSeekProvider { api_key: String }
pub struct OllamaProvider { base_url: String }

// Factory pattern
pub fn create_provider(config: &ProviderConfig) -> Box<dyn AIProvider> {
    match config.provider_type {
        ProviderType::Claude => Box::new(ClaudeProvider::new(&config.api_key)),
        ProviderType::OpenAI => Box::new(OpenAIProvider::new(&config.api_key)),
        ProviderType::DeepSeek => Box::new(DeepSeekProvider::new(&config.api_key)),
        ProviderType::Ollama => Box::new(OllamaProvider::new(&config.base_url)),
    }
}
```

### Streaming Response Handling

```rust
use futures::StreamExt;
use tokio_stream::wrappers::ReceiverStream;

#[tauri::command]
pub async fn ai_stream_completion(
    prompt: String,
    provider: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let provider = create_provider(&config);

    let mut stream = provider.stream_completion(&prompt, None)
        .await
        .map_err(|e| e.to_string())?;

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(text) => {
                // Emit event to frontend
                app.emit("ai-chunk", &text).ok();
            }
            Err(e) => {
                app.emit("ai-error", &e.to_string()).ok();
                break;
            }
        }
    }

    app.emit("ai-complete", ()).ok();
    Ok(())
}
```

### Secure API Key Storage

**Recommended Approach:** Use platform-specific encrypted storage via Tauri plugin.

```toml
# Add to Cargo.toml
[dependencies]
tauri-plugin-keyring = "2"  # Or use tauri-plugin-store with encryption
keyring = "3"               # Cross-platform secure storage
```

```rust
// Store API key
pub fn store_api_key(provider: &str, key: &str) -> Result<(), String> {
    let entry = keyring::Entry::new("termsuite", provider)?;
    entry.set_password(key)?;
    Ok(())
}

// Retrieve API key
pub fn get_api_key(provider: &str) -> Result<String, String> {
    let entry = keyring::Entry::new("termsuite", provider)?;
    entry.get_password().map_err(|e| e.to_string())
}
```

**Note:** D-15 specifies keys are locally encrypted; switching devices requires re-entry. The `keyring` crate uses OS-level credential storage (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux).

---

## 3. Scheduled Tasks in Tauri/Rust

### Recommended Approach: Custom Scheduler

Tauri does not have a built-in scheduler plugin. Two options:

| Option | Pros | Cons |
|--------|------|------|
| Custom tokio interval | Full control, no extra deps | Must handle app lifecycle |
| `tokio-cron-scheduler` crate | Cron syntax, persistence | Additional dependency |

**Recommended:** Custom scheduler with tokio intervals (simpler for hourly/daily tasks).

```rust
// src-tauri/src/scheduler/mod.rs
use std::time::Duration;
use tokio::time::interval;

pub fn start_scheduler(app_handle: tauri::AppHandle) {
    tokio::spawn(async move {
        // Hourly incremental processing
        let mut hourly = interval(Duration::from_secs(60 * 60));

        // Daily full processing (at 3 AM)
        let mut daily = interval(Duration::from_secs(24 * 60 * 60));

        loop {
            tokio::select! {
                _ = hourly.tick() => {
                    run_incremental_processing(&app_handle).await;
                }
                _ = daily.tick() => {
                    run_full_processing(&app_handle).await;
                }
            }
        }
    });
}

// Initialize in lib.rs run()
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            start_scheduler(handle);
            Ok(())
        })
        // ...
}
```

**Important:** Scheduler should check app state before processing (user might have unsaved changes).

---

## 4. Link Relationship Analysis

### Algorithms

**Co-citation (A and B both link to C):**

```sql
-- Find notes A and B that both link to C (co-citation)
SELECT
    b1.source_note_id as note_a,
    b2.source_note_id as note_b,
    COUNT(*) as co_citation_count
FROM backlinks b1
JOIN backlinks b2 ON b1.target_note_id = b2.target_note_id
WHERE b1.source_note_id < b2.source_note_id  -- Avoid duplicates
GROUP BY b1.source_note_id, b2.source_note_id
ORDER BY co_citation_count DESC;
```

**Co-reference (C links to both A and B):**

```sql
-- Find notes A and B that are both referenced by C
SELECT
    b1.target_note_id as note_a,
    b2.target_note_id as note_b,
    COUNT(*) as co_reference_count
FROM backlinks b1
JOIN backlinks b2 ON b1.source_note_id = b2.source_note_id
WHERE b1.target_note_id < b2.target_note_id
  AND b1.target_note_id IS NOT NULL
  AND b2.target_note_id IS NOT NULL
GROUP BY b1.target_note_id, b2.target_note_id
ORDER BY co_reference_count DESC;
```

**Relationship Scoring Formula:**

```rust
pub fn calculate_relatedness(
    direct_link: bool,
    co_citation_count: i32,
    co_reference_count: i32,
    same_directory: bool,
) -> f64 {
    let mut score = 0.0;

    // Direct link is strongest signal
    if direct_link {
        score += 0.5;
    }

    // Co-citation and co-reference weighted equally
    score += (co_citation_count as f64 * 0.15).min(0.2);
    score += (co_reference_count as f64 * 0.15).min(0.2);

    // Same directory proximity
    if same_directory {
        score += 0.1;
    }

    score.min(1.0)
}
```

### Real-time Computation Pattern

**On-demand (Obsidian-style):** Calculate when user opens "Related Notes" panel.

```rust
#[tauri::command]
pub async fn get_related_notes(
    note_id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<Vec<RelatedNote>, String> {
    // 1. Get all outgoing links from this note
    // 2. Get all incoming links (backlinks)
    // 3. Calculate co-citation via SQL
    // 4. Calculate co-reference via SQL
    // 5. Get notes in same directory
    // 6. Score and sort
}
```

**Optional Caching:** Store precomputed scores in a `related_notes` table, refresh on note save.

---

## 5. Git Diff Style Version Comparison UI

### Approach

**Recommended Library:** `react-diff-viewer-continued` or custom implementation with `diff` library.

```bash
npm install react-diff-viewer-continued
# or
npm install diff
```

**UI Pattern:**

```
+------------------------------------------+
|  AI Suggests Changes to: [[note-name]]   |
+------------------------------------------+
|  Original         |  AI Suggestion       |
|  -----------------|----------------------|
|  Line 1          |  Line 1 (unchanged)  |
| -Line 2 (deleted) |                      |
|                   | +Line 2 (new)        |
|  Line 3          |  Line 3 (unchanged)  |
+------------------------------------------+
|  [Reject]  [Accept]  [Edit & Accept]     |
+------------------------------------------+
```

**Component Structure:**

```tsx
// src/components/wiki/DiffViewer.tsx
interface DiffViewerProps {
  originalContent: string;
  suggestedContent: string;
  onAccept: () => void;
  onReject: () => void;
  onEdit: () => void;
}

export function DiffViewer({ originalContent, suggestedContent, onAccept, onReject, onEdit }: DiffViewerProps) {
  const diff = Diff.diffLines(originalContent, suggestedContent);

  return (
    <Dialog>
      <DialogHeader>AI Suggests Changes</DialogHeader>
      <DialogContent className="grid grid-cols-2 gap-4">
        <div className="font-mono text-sm">
          {diff.map((part, i) => (
            <div key={i} className={cn(
              part.added && "bg-green-100 text-green-800",
              part.removed && "bg-red-100 text-red-800"
            )}>
              {part.value}
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onReject}>Reject</Button>
        <Button onClick={onAccept}>Accept</Button>
        <Button variant="secondary" onClick={onEdit}>Edit & Accept</Button>
      </DialogFooter>
    </Dialog>
  );
}
```

---

## Potential Pitfalls and Mitigations

| Area | Pitfall | Mitigation |
|------|---------|------------|
| Cytoscape | Large graphs (2000+) cause lag | Implement level-of-detail filtering; only show notes with 3+ connections by default |
| Cytoscape | React integration complexity | Use `useEffect` to initialize Cytoscape once; store `cy` ref in useRef |
| AI Streaming | Connection drops mid-stream | Implement reconnection with retry; store partial response |
| API Keys | Key exposed in logs | Never log API keys; use debug-safe wrappers |
| Scheduler | Processing during user edit | Lock note during processing; or skip notes modified in last 5 minutes |
| Co-citation | O(n^2) query for large datasets | Limit to top 50 co-citations per note; use materialized view |

---

## Validation Architecture

### What Must Be Verified Before Implementation

| Component | Validation Method | Success Criteria |
|-----------|-------------------|------------------|
| **Cytoscape rendering** | Prototype with 1000 mock nodes | < 2s initial render, < 100ms pan/zoom |
| **AI Provider streaming** | Test with Claude/OpenAI APIs | Real-time chunks, < 5s first token |
| **API Key storage** | Test keyring on target platforms | Keys persist across app restarts |
| **Scheduler reliability** | Run for 24 hours | No missed tasks, no memory leak |
| **Co-citation SQL** | Test with 10,000 backlinks | Query completes < 500ms |
| **Diff viewer** | Test with 1000-line documents | Scrolling smooth, diff accurate |

### Integration Test Points

1. **Graph view loads** from existing backlinks data (no new DB migration needed)
2. **AI completion streams** to frontend via Tauri events
3. **Related notes** panel shows correct scores
4. **Wiki diff** correctly identifies additions/deletions
5. **Scheduler** triggers at correct intervals (verify via logs)

---

## Library Recommendations Summary

| Purpose | Library | Rationale |
|---------|---------|-----------|
| Graph visualization | `cytoscape` + `@cytoscape/react` | Mature, performant, React-friendly |
| Diff viewer | `react-diff-viewer-continued` | Maintained fork, good UX out of box |
| AI HTTP client | `reqwest` (Rust) | Industry standard, async, streaming support |
| API key storage | `keyring` crate | Cross-platform OS-level encryption |
| Scheduler | Custom tokio intervals | Simpler than cron, sufficient for hourly/daily |
| Async runtime | `tokio` (already in use) | Consistent with Tauri |

---

## Integration with Existing Codebase

### Files to Create

| File | Purpose |
|------|---------|
| `src-tauri/src/ai/mod.rs` | AI provider trait and factory |
| `src-tauri/src/ai/claude.rs` | Claude implementation |
| `src-tauri/src/ai/openai.rs` | OpenAI implementation |
| `src-tauri/src/ai/ollama.rs` | Ollama implementation |
| `src-tauri/src/scheduler/mod.rs` | Background task scheduler |
| `src-tauri/src/commands/ai.rs` | Tauri commands for AI |
| `src-tauri/src/commands/relations.rs` | Related notes commands |
| `src/components/graph/GraphView.tsx` | Cytoscape graph component |
| `src/components/wiki/DiffViewer.tsx` | Wiki change diff viewer |
| `src/stores/aiStore.ts` | AI provider settings state |

### Files to Modify

| File | Change |
|------|--------|
| `src-tauri/src/lib.rs` | Register AI commands, start scheduler |
| `src-tauri/src/db/schema.rs` | Add `related_notes` cache table (optional) |
| `src/components/layout/Sidebar.tsx` | Add "Knowledge Graph" button |
| `src/stores/settingsStore.ts` | Add AI provider settings |
| `Cargo.toml` | Add reqwest, keyring, async-trait deps |
| `package.json` | Add cytoscape, react-diff-viewer-continued |

---

*Research completed: 2026-04-14*
*Phase: 02-knowledge-advanced*
