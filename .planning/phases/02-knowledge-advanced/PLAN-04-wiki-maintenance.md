---
wave: 3
depends_on: [PLAN-01-ai-provider]
files_modified:
  - termsuite/src-tauri/src/lib.rs
  - termsuite/src-tauri/src/commands/mod.rs
  - termsuite/package.json
  - termsuite/src/components/layout/PreviewPanel.tsx
  - termsuite/src/stores/settingsStore.ts
files_created:
  - termsuite/src-tauri/src/scheduler/mod.rs
  - termsuite/src-tauri/src/commands/wiki.rs
  - termsuite/src/components/wiki/RelatedNotesPanel.tsx
  - termsuite/src/components/wiki/DiffViewer.tsx
  - termsuite/src/stores/aiStore.ts
requirements: [KNOW-05, KNOW-07]
autonomous: true
---

# PLAN-04: AI Wiki Maintenance and Related Notes UI

**Objective:** Implement AI-powered wiki maintenance from raw sources (D-08 to D-11) and Related Notes UI per UI-SPEC Feature 2 and 3.

---

## Task 1: Create AI Store for Provider Settings

<objective>
Create Zustand store for AI provider configuration per D-12 to D-15.
</objective>

<read_first>
- termsuite/src/stores/settingsStore.ts (existing store pattern)
- .planning/phases/02-knowledge-advanced/02-UI-SPEC.md (AI Settings section)
</read_first>

<action>
Create `termsuite/src/stores/aiStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface ProviderConfig {
  providerType: 'Claude' | 'OpenAI' | 'DeepSeek' | 'Ollama';
  isConfigured: boolean;
  model?: string;
}

interface AIState {
  defaultProvider: string;
  providers: ProviderConfig[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProviders: () => Promise<void>;
  setDefaultProvider: (provider: string) => void;
  storeApiKey: (provider: string, apiKey: string) => Promise<void>;
  deleteApiKey: (provider: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      defaultProvider: 'Claude',
      providers: [],
      isLoading: false,
      error: null,

      fetchProviders: async () => {
        set({ isLoading: true });
        try {
          const providers = await invoke<ProviderConfig[]>('list_providers');
          set({ providers, isLoading: false });
        } catch (err) {
          set({ error: String(err), isLoading: false });
        }
      },

      setDefaultProvider: (provider) => {
        set({ defaultProvider: provider });
      },

      storeApiKey: async (provider, apiKey) => {
        set({ isLoading: true });
        try {
          await invoke('store_api_key', { provider, apiKey });
          await get().fetchProviders();
        } catch (err) {
          set({ error: String(err), isLoading: false });
          throw err;
        }
      },

      deleteApiKey: async (provider) => {
        try {
          await invoke('delete_api_key', { provider });
          await get().fetchProviders();
        } catch (err) {
          set({ error: String(err) });
          throw err;
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'termsuite-ai-settings',
      partialize: (state) => ({
        defaultProvider: state.defaultProvider,
      }),
    }
  )
);
```
</action>

<acceptance_criteria>
- `grep "interface AIState" termsuite/src/stores/aiStore.ts` returns 1 line
- `grep "fetchProviders\|setDefaultProvider\|storeApiKey" termsuite/src/stores/aiStore.ts` returns 6+ lines
- `grep "termsuite-ai-settings" termsuite/src/stores/aiStore.ts` returns 1 line
</acceptance_criteria>

---

## Task 2: Create Wiki Maintenance Scheduler

<objective>
Implement background scheduler for wiki maintenance per D-08 and D-09.
</objective>

<read_first>
- .planning/phases/02-knowledge-advanced/02-RESEARCH.md (Section 3: Scheduler)
</read_first>

<action>
Create `termsuite/src-tauri/src/scheduler/mod.rs`:

```rust
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tokio::time::interval;

/// Start the wiki maintenance scheduler
/// - Hourly incremental processing (D-09)
/// - Daily full processing (D-09)
pub fn start_scheduler(app_handle: AppHandle) {
    tokio::spawn(async move {
        // Hourly incremental processing
        let mut hourly = interval(Duration::from_secs(60 * 60));
        
        // Daily full processing (every 24 hours)
        let mut daily = interval(Duration::from_secs(24 * 60 * 60));

        // Track last daily run time (run at startup + 24h intervals)
        let mut first_hourly = true;
        let mut first_daily = true;

        loop {
            tokio::select! {
                _ = hourly.tick() => {
                    if first_hourly {
                        first_hourly = false;
                        continue; // Skip first tick
                    }
                    
                    log::info!("Running hourly incremental wiki processing");
                    if let Err(e) = run_incremental_processing(&app_handle).await {
                        log::error!("Incremental processing failed: {}", e);
                    }
                }
                
                _ = daily.tick() => {
                    if first_daily {
                        first_daily = false;
                        continue; // Skip first tick
                    }
                    
                    log::info!("Running daily full wiki processing");
                    if let Err(e) = run_full_processing(&app_handle).await {
                        log::error!("Full processing failed: {}", e);
                    }
                }
            }
        }
    });
}

/// Run incremental processing on recently modified raw files
async fn run_incremental_processing(app: &AppHandle) -> Result<(), String> {
    // Get modified raw files from last hour
    let db = app.state::<std::sync::Mutex<rusqlite::Connection>>();
    
    // Emit event to frontend about processing start
    app.emit("wiki-processing-start", &"incremental").ok();
    
    // TODO: Implement actual processing logic
    // 1. Find raw files modified in last hour
    // 2. Extract concepts using AI
    // 3. Update corresponding wiki pages
    // 4. Emit changes for user confirmation
    
    // Emit completion event
    app.emit("wiki-processing-complete", &"incremental").ok();
    
    Ok(())
}

/// Run full processing on all raw files
async fn run_full_processing(app: &AppHandle) -> Result<(), String> {
    // Emit event to frontend
    app.emit("wiki-processing-start", &"full").ok();
    
    // TODO: Implement full processing
    // 1. Scan all raw/ files
    // 2. Analyze each with AI
    // 3. Generate wiki update suggestions
    // 4. Present to user for confirmation
    
    app.emit("wiki-processing-complete", &"full").ok();
    
    Ok(())
}

/// Manual trigger for wiki processing
pub async fn trigger_wiki_processing(
    app: AppHandle,
    mode: String,
) -> Result<(), String> {
    match mode.as_str() {
        "incremental" => run_incremental_processing(&app).await,
        "full" => run_full_processing(&app).await,
        _ => Err(format!("Unknown processing mode: {}", mode)),
    }
}
```
</action>

<acceptance_criteria>
- `grep "pub fn start_scheduler" termsuite/src-tauri/src/scheduler/mod.rs` returns 1 line
- `grep "run_incremental_processing\|run_full_processing" termsuite/src-tauri/src/scheduler/mod.rs` returns 4+ lines
- `grep "wiki-processing-start\|wiki-processing-complete" termsuite/src-tauri/src/scheduler/mod.rs` returns 4 lines
</acceptance_criteria>

---

## Task 3: Create Wiki Commands

<objective>
Create Tauri commands for wiki maintenance operations.
</objective>

<read_first>
- termsuite/src-tauri/src/commands/notes.rs (existing note patterns)
- termsuite/src-tauri/src/ai/mod.rs (AI provider)
</read_first>

<action>
Create `termsuite/src-tauri/src/commands/wiki.rs`:

```rust
use crate::ai::{AIProvider, ProviderConfig, ProviderType, create_provider};
use keyring::Entry;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

const KEYRING_SERVICE: &str = "termsuite";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WikiSuggestion {
    pub target_note_id: String,
    pub target_title: String,
    pub original_content: String,
    pub suggested_content: String,
    pub change_type: WikiChangeType,
    pub source_raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WikiChangeType {
    Append,
    Prepend,
    Update,
    CreateNew,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawFileAnalysis {
    pub path: String,
    pub concepts: Vec<String>,
    pub suggested_wiki_links: Vec<String>,
    pub summary: String,
}

/// Analyze a raw file and generate wiki suggestions
#[tauri::command]
pub async fn analyze_raw_file(
    path: String,
    content: String,
    default_provider: String,
) -> Result<RawFileAnalysis, String> {
    let provider_type = parse_provider_type(&default_provider)?;
    let api_key = get_api_key_for_provider(&provider_type)?;
    
    let config = ProviderConfig {
        provider_type,
        api_key: Some(api_key),
        base_url: None,
        model: None,
    };
    
    let provider = create_provider(&config);
    
    let prompt = format!(
        "Analyze the following content and extract:\n\
        1. Key concepts that could become wiki pages\n\
        2. Suggested wiki-links to existing topics\n\
        3. A brief summary\n\n\
        Content:\n{}\n\n\
        Respond in JSON format with fields: concepts (array), suggested_wiki_links (array), summary (string)",
        content
    );
    
    let response = provider.complete(&prompt, None)
        .await
        .map_err(|e| e.to_string())?;
    
    // Parse JSON response
    let analysis: RawFileAnalysis = serde_json::from_str(&response)
        .map_err(|e| format!("Failed to parse AI response: {}", e))?;
    
    Ok(analysis)
}

/// Generate wiki update suggestion for a note
#[tauri::command]
pub async fn generate_wiki_suggestion(
    raw_path: String,
    raw_content: String,
    wiki_note_id: String,
    wiki_content: String,
    default_provider: String,
) -> Result<WikiSuggestion, String> {
    let provider_type = parse_provider_type(&default_provider)?;
    let api_key = get_api_key_for_provider(&provider_type)?;
    
    let config = ProviderConfig {
        provider_type,
        api_key: Some(api_key),
        base_url: None,
        model: None,
    };
    
    let provider = create_provider(&config);
    
    let prompt = format!(
        "Given the raw content and existing wiki page, suggest how to update the wiki.\n\n\
        Raw content from {}:\n{}\n\n\
        Existing wiki content:\n{}\n\n\
        Suggest an update that integrates relevant information from the raw content.\n\
        Respond with just the suggested new wiki content, nothing else.",
        raw_path, raw_content, wiki_content
    );
    
    let suggested = provider.complete(&prompt, None)
        .await
        .map_err(|e| e.to_string())?;
    
    // Determine change type based on content
    let change_type = if wiki_content.is_empty() {
        WikiChangeType::CreateNew
    } else if suggested.starts_with(&wiki_content) {
        WikiChangeType::Append
    } else {
        WikiChangeType::Update
    };
    
    Ok(WikiSuggestion {
        target_note_id: wiki_note_id.clone(),
        target_title: wiki_note_id, // TODO: Get actual title
        original_content: wiki_content,
        suggested_content: suggested,
        change_type,
        source_raw: raw_path,
    })
}

/// Apply a wiki suggestion (after user confirmation per D-10)
#[tauri::command]
pub async fn apply_wiki_suggestion(
    note_id: String,
    new_content: String,
    storage_path: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    // Write the new content to the note file
    let path = format!("{}/wiki/{}.md", storage_path, note_id);
    std::fs::write(&path, &new_content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    // Update database
    let conn = db.lock().unwrap();
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "UPDATE notes SET updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, &note_id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Trigger manual wiki processing
#[tauri::command]
pub async fn trigger_wiki_processing(
    mode: String,
    app: AppHandle,
) -> Result<(), String> {
    crate::scheduler::trigger_wiki_processing(app, mode).await
}

// Helper functions
fn parse_provider_type(s: &str) -> Result<ProviderType, String> {
    match s {
        "Claude" => Ok(ProviderType::Claude),
        "OpenAI" => Ok(ProviderType::OpenAI),
        "DeepSeek" => Ok(ProviderType::DeepSeek),
        "Ollama" => Ok(ProviderType::Ollama),
        _ => Err(format!("Unknown provider: {}", s)),
    }
}

fn get_api_key_for_provider(provider_type: &ProviderType) -> Result<String, String> {
    let key_name = format!("{:?}", provider_type);
    let entry = Entry::new(KEYRING_SERVICE, &key_name)
        .map_err(|e| format!("Keyring error: {}", e))?;
    entry.get_password()
        .map_err(|e| format!("API key not found: {}", e))
}
```
</action>

<acceptance_criteria>
- `grep "pub struct WikiSuggestion\|pub struct RawFileAnalysis" termsuite/src-tauri/src/commands/wiki.rs` returns 2 lines
- `grep "#\[tauri::command\]" termsuite/src-tauri/src/commands/wiki.rs` returns 4 lines
- `grep "analyze_raw_file\|generate_wiki_suggestion\|apply_wiki_suggestion" termsuite/src-tauri/src/commands/wiki.rs` returns 6+ lines
</acceptance_criteria>

---

## Task 4: Register Scheduler and Wiki Commands

<objective>
Register the scheduler and wiki commands in lib.rs.
</objective>

<read_first>
- termsuite/src-tauri/src/lib.rs (existing structure)
</read_first>

<action>
1. Add module declarations to `termsuite/src-tauri/src/lib.rs`:
```rust
mod scheduler;
```

2. Add to imports:
```rust
use commands::wiki;
```

3. Add to commands/mod.rs:
```rust
pub mod wiki;
```

4. Add to invoke_handler:
```rust
// Wiki commands
wiki::analyze_raw_file,
wiki::generate_wiki_suggestion,
wiki::apply_wiki_suggestion,
wiki::trigger_wiki_processing,
```

5. Start scheduler in run() function, inside setup:
```rust
.setup(|app| {
    let handle = app.handle().clone();
    scheduler::start_scheduler(handle);
    Ok(())
})
```
</action>

<acceptance_criteria>
- `grep "mod scheduler;" termsuite/src-tauri/src/lib.rs` returns 1 line
- `grep "use commands::wiki" termsuite/src-tauri/src/lib.rs` returns 1 line
- `grep "scheduler::start_scheduler" termsuite/src-tauri/src/lib.rs` returns 1 line
- `cargo check --manifest-path termsuite/src-tauri/Cargo.toml` exits with code 0
</acceptance_criteria>

---

## Task 5: Create Related Notes Panel Component

<objective>
Create the Related Notes panel component per UI-SPEC Feature 2.
</objective>

<read_first>
- .planning/phases/02-knowledge-advanced/02-UI-SPEC.md (Related Notes Panel)
- termsuite/src/components/editor/BacklinksList.tsx (existing panel pattern)
</read_first>

<action>
Create `termsuite/src/components/wiki/RelatedNotesPanel.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface RelatedNote {
  note_id: string;
  title: string;
  relationship_type: 'direct_link' | 'co_citation' | 'co_reference' | 'proximity';
  score: number;
}

interface RelatedNotesPanelProps {
  noteId: string | null;
  onNavigate: (noteId: string) => void;
}

const relationshipLabels: Record<string, string> = {
  direct_link: '直接链接',
  co_citation: '共同引用',
  co_reference: '共同被引用',
  proximity: '同目录',
};

export function RelatedNotesPanel({ noteId, onNavigate }: RelatedNotesPanelProps) {
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noteId) {
      setRelatedNotes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    invoke<RelatedNote[]>('get_related_notes', { noteId })
      .then(setRelatedNotes)
      .catch((err) => setError(String(err)))
      .finally(() => setIsLoading(false));
  }, [noteId]);

  if (!noteId) return null;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-4 w-24" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        加载失败: {error}
      </div>
    );
  }

  if (relatedNotes.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        暂无相关笔记
      </div>
    );
  }

  return (
    <div className="p-4">
      <h4 className="font-medium text-sm mb-3">相关笔记</h4>
      <div className="space-y-3">
        {relatedNotes.map((note) => (
          <button
            key={note.note_id}
            className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
            onClick={() => onNavigate(note.note_id)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-accent-foreground truncate">
                [[{note.title}]]
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={note.score * 100} 
                className="h-1 flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {note.score.toFixed(2)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground italic">
              {relationshipLabels[note.relationship_type]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```
</action>

<acceptance_criteria>
- `grep "export function RelatedNotesPanel" termsuite/src/components/wiki/RelatedNotesPanel.tsx` returns 1 line
- `grep "相关笔记\|暂无相关笔记\|直接链接\|共同引用" termsuite/src/components/wiki/RelatedNotesPanel.tsx` returns 4+ lines
- `grep "get_related_notes" termsuite/src/components/wiki/RelatedNotesPanel.tsx` returns 1 line
</acceptance_criteria>

---

## Task 6: Install Diff Viewer Dependencies

<objective>
Add react-diff-viewer for wiki change comparison.
</objective>

<read_first>
- termsuite/package.json (existing dependencies)
</read_first>

<action>
Run:
```bash
npm install react-diff-viewer-continued --prefix termsuite
```

Or add to package.json:
```json
"react-diff-viewer-continued": "^4.0"
```
</action>

<acceptance_criteria>
- `grep "react-diff-viewer-continued" termsuite/package.json` returns 1 line
</acceptance_criteria>

---

## Task 7: Create Wiki Diff Viewer Component

<objective>
Create the diff viewer for wiki changes per UI-SPEC Feature 3 and D-10.
</objective>

<read_first>
- .planning/phases/02-knowledge-advanced/02-UI-SPEC.md (Wiki Diff Viewer)
</read_first>

<action>
Create `termsuite/src/components/wiki/DiffViewer.tsx`:

```typescript
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useSettingsStore } from '@/stores/settingsStore';

interface WikiSuggestion {
  target_note_id: string;
  target_title: string;
  original_content: string;
  suggested_content: string;
  change_type: 'append' | 'prepend' | 'update' | 'create_new';
  source_raw: string;
}

interface DiffViewerProps {
  suggestion: WikiSuggestion;
  onAccept: (newContent: string) => void;
  onReject: () => void;
  onEdit: () => void;
  open: boolean;
}

export function DiffViewer({
  suggestion,
  onAccept,
  onReject,
  onEdit,
  open,
}: DiffViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(suggestion.suggested_content);
  const theme = useSettingsStore((s) => s.theme);

  const changeCount = useMemo(() => {
    const original = suggestion.original_content.split('\n');
    const suggested = suggestion.suggested_content.split('\n');
    return Math.abs(original.length - suggested.length);
  }, [suggestion]);

  const handleAccept = () => {
    onAccept(isEditing ? editedContent : suggestion.suggested_content);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const diffStyles = {
    variables: {
      dark: {
        diffViewerBackground: '#0D1117',
        diffViewerColor: '#E6EDF3',
        addedBackground: '#1E3A2F',
        addedColor: '#3FB950',
        removedBackground: '#3D1F20',
        removedColor: '#F85149',
      },
      light: {
        diffViewerBackground: '#FFFFFF',
        diffViewerColor: '#24292F',
        addedBackground: '#DAE8E0',
        addedColor: '#1A7F37',
        removedBackground: '#FFEBE9',
        removedColor: '#CF222E',
      },
    },
  };

  const currentStyles = theme === 'dark' 
    ? diffStyles.variables.dark 
    : diffStyles.variables.light;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onReject()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            AI 建议修改：
            <span className="text-accent-foreground ml-2">
              [[{suggestion.target_title}]]
            </span>
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({changeCount} 处修改)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isEditing ? (
            <textarea
              className="w-full h-96 p-4 font-mono text-sm bg-muted rounded-md border"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
            />
          ) : (
            <div className="font-mono text-sm">
              <ReactDiffViewer
                oldValue={suggestion.original_content}
                newValue={suggestion.suggested_content}
                splitView={true}
                leftTitle="原文"
                rightTitle="AI 建议"
                styles={{
                  diffContainer: {
                    fontSize: '13px',
                  },
                  line: {
                    ...currentStyles,
                  },
                }}
              />
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          来源: {suggestion.source_raw}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onReject}>
            拒绝
          </Button>
          {!isEditing && (
            <Button variant="secondary" onClick={handleEdit}>
              编辑后接受
            </Button>
          )}
          <Button onClick={handleAccept}>
            {isEditing ? '保存修改' : '接受'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
</action>

<acceptance_criteria>
- `grep "export function DiffViewer" termsuite/src/components/wiki/DiffViewer.tsx` returns 1 line
- `grep "AI 建议修改\|原文\|AI 建议\|拒绝\|接受\|编辑后接受" termsuite/src/components/wiki/DiffViewer.tsx` returns 6+ lines
- `grep "ReactDiffViewer" termsuite/src/components/wiki/DiffViewer.tsx` returns 2+ lines
</acceptance_criteria>

---

## Task 8: Integrate Related Notes into Preview Panel

<objective>
Add Related Notes panel to the existing PreviewPanel component.
</objective>

<read_first>
- termsuite/src/components/layout/PreviewPanel.tsx (existing structure)
</read_first>

<action>
Modify `termsuite/src/components/layout/PreviewPanel.tsx`:

1. Add import:
```typescript
import { RelatedNotesPanel } from '@/components/wiki/RelatedNotesPanel';
```

2. Add Separator and related notes section after BacklinksList:
```tsx
<Separator />
<div className="flex-1 overflow-auto">
  <BacklinksList noteId={activeNoteId} onNavigate={handleNavigate} />
  <Separator />
  <RelatedNotesPanel noteId={activeNoteId} onNavigate={handleNavigate} />
</div>
```
</action>

<acceptance_criteria>
- `grep "RelatedNotesPanel" termsuite/src/components/layout/PreviewPanel.tsx` returns 2+ lines
</acceptance_criteria>

---

## Task 9: Update Settings Store with AI Provider Default

<objective>
Add AI provider settings to the settings store.
</objective>

<read_first>
- termsuite/src/stores/settingsStore.ts (existing structure)
</read_first>

<action>
Add to `termsuite/src/stores/settingsStore.ts`:

1. Add to SettingsState interface:
```typescript
defaultAIProvider: string;
setDefaultAIProvider: (provider: string) => void;
```

2. Add to initial state:
```typescript
defaultAIProvider: 'Claude',
```

3. Add to set function:
```typescript
setDefaultAIProvider: (provider) => set({ defaultAIProvider: provider }),
```

4. Add to partialize:
```typescript
defaultAIProvider: state.defaultAIProvider,
```
</action>

<acceptance_criteria>
- `grep "defaultAIProvider" termsuite/src/stores/settingsStore.ts` returns 4+ lines
</acceptance_criteria>

---

## Validation

After completing all tasks:

1. **Build Check:**
   ```bash
   npm run build --prefix termsuite
   cargo build --manifest-path termsuite/src-tauri/Cargo.toml
   ```

2. **Component Structure:**
   ```bash
   ls termsuite/src/components/wiki/
   # Should list: RelatedNotesPanel.tsx, DiffViewer.tsx
   ```

3. **Scheduler Check:**
   ```bash
   ls termsuite/src-tauri/src/scheduler/mod.rs
   grep "start_scheduler" termsuite/src-tauri/src/lib.rs
   ```

---

*Plan created: 2026-04-14*
*Phase: 02-knowledge-advanced*
