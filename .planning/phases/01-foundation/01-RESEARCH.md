# Phase 1: Foundation - Research

**Researched:** 2026-04-13
**Domain:** Tauri 2.x + React + Rust backend
**Confidence:** HIGH (verified versions from npm registry and crates.io)

## Summary

Phase 1 establishes the core foundation for TermSuite: a Tauri 2.x application with React frontend, Rust backend for file operations and SQLite FTS5 search, and a real-time Markdown editor with wiki-link support. The technology stack is mature and well-documented, with Tauri 2.x now stable for production use.

**Primary recommendation:** Use Tauri 2.10.x with React 19, shadcn/ui for components, Milkdown 7.x for the Markdown editor, Zustand for state management, and rusqlite 0.39 with FTS5 feature for full-text search.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Frontend Framework**
- **D-01:** Use React as frontend framework (user explicitly selected)
- **D-02:** Use TypeScript for type-safe development

**UI Layout**
- **D-03:** Desktop/Web uses three-column layout:
  - Left: Menu bar (navigation, settings)
  - Center: AI chat interface (main interaction area)
  - Right: Preview area/file list
- **D-04:** Mobile uses chat-style layout:
  - Main: AI chat
  - Side drawer: File list, settings
- **D-05:** Responsive design, auto-switch layout by screen width

**Storage**
- **D-06:** Knowledge base storage location user-selected at first launch
- **D-07:** User can change storage location anytime (settings option)
- **D-08:** raw/wiki/outputs directory structure created under user-selected knowledge base root

**Wiki-link Behavior**
- **D-09:** Link parsing case-sensitive by default
- **D-10:** Provide "case-insensitive" option (user toggle in settings)
- **D-11:** Support Chinese links (e.g., `[[My Note]]`)
- **D-12:** Links to non-existent notes show as broken links, do NOT auto-create
- **D-13:** Typing `[[` shows existing note suggestions, supports fuzzy matching

**Editor**
- **D-14:** Real-time rendering editor (Typora-like, edit = preview)
- **D-15:** Markdown rendering style: GitHub-style minimalist

### Claude's Discretion

- Specific React component library choice (e.g., shadcn/ui, Ant Design)
- State management solution (e.g., Zustand, Redux Toolkit)
- Specific Markdown editor library choice
- Styling solution (CSS Modules, Tailwind, styled-components)

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KNOW-01 | User can create and edit markdown notes stored locally as .md files | Tauri 2.x file API + Milkdown editor |
| KNOW-02 | User can create bi-directional wiki links using `[[note-name]]` syntax | Custom wiki-link parser + backlink tracking in SQLite |
| KNOW-03 | User can search all notes using full-text search | SQLite FTS5 with rusqlite crate |
| KNOW-04 | System maintains raw/wiki/outputs three-layer directory structure | Rust file system operations via Tauri commands |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **tauri** | 2.10.3 [VERIFIED: crates.io] | Desktop framework | Production-ready, lightweight (~30MB vs Electron ~700MB) |
| **@tauri-apps/cli** | 2.10.1 [VERIFIED: npm] | Tauri CLI tooling | Official CLI for project scaffolding |
| **@tauri-apps/api** | 2.10.1 [VERIFIED: npm] | Frontend IPC | Official API for invoke, events, dialogs |
| **react** | 19.2.5 [VERIFIED: npm] | UI framework | User decision D-01 |
| **react-dom** | 19.2.5 [VERIFIED: npm] | React DOM renderer | Paired with React |
| **typescript** | 6.0.2 [VERIFIED: npm] | Type system | User decision D-02 |
| **vite** | 8.0.8 [VERIFIED: npm] | Build tool | Fast dev server, native ESM |
| **@vitejs/plugin-react** | 6.0.1 [VERIFIED: npm] | Vite React support | Official Vite plugin |

### UI Components

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **shadcn/ui** | via CLI | Component library | Core UI components (Button, Dialog, etc.) |
| **@radix-ui/react-dialog** | 1.1.15 [VERIFIED: npm] | Dialog primitive | shadcn dependency |
| **@radix-ui/react-dropdown-menu** | 2.1.16 [VERIFIED: npm] | Dropdown primitive | shadcn dependency |
| **class-variance-authority** | 0.7.1 [VERIFIED: npm] | Variant styling | shadcn dependency |
| **clsx** | 2.1.1 [VERIFIED: npm] | Class utility | shadcn dependency |
| **tailwind-merge** | 3.5.0 [VERIFIED: npm] | Tailwind class merge | shadcn dependency |
| **tailwindcss** | 4.2.2 [VERIFIED: npm] | CSS framework | Styling foundation |
| **lucide-react** | 1.8.0 [VERIFIED: npm] | Icons | Icon library per UI-SPEC |

### Markdown Editor

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@milkdown/core** | 7.20.0 [VERIFIED: npm] | Editor core | Foundation for Typora-like editor |
| **@milkdown/react** | 7.20.0 [VERIFIED: npm] | React bindings | React integration |
| **@milkdown/ctx** | 7.20.0 [VERIFIED: npm] | Context system | Editor state management |
| **@milkdown/preset-commonmark** | 7.20.0 [VERIFIED: npm] | CommonMark support | Basic markdown |
| **@milkdown/preset-gfm** | 7.20.0 [VERIFIED: npm] | GitHub Flavored Markdown | Tables, strikethrough, etc. |
| **@milkdown/plugin-listener** | 7.20.0 [VERIFIED: npm] | Change listeners | Sync to backend |
| **@milkdown/plugin-history** | 7.20.0 [VERIFIED: npm] | Undo/redo | Editor history |
| **@milkdown/plugin-slash** | 7.20.0 [VERIFIED: npm] | Slash commands | Command palette |

### State Management

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zustand** | 5.0.12 [VERIFIED: npm] | Global state | UI state, note list, search results |

### Routing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **react-router-dom** | 7.14.0 [VERIFIED: npm] | Client routing | Navigation between notes |

### Backend (Rust)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **rusqlite** | 0.39.0 [VERIFIED: crates.io] | SQLite wrapper | Ergonomic, FTS5 support |
| **pulldown-cmark** | 0.13.3 [VERIFIED: crates.io] | Markdown parser | Rust native, performant |
| **tokio** | latest | Async runtime | Tauri uses tokio internally |
| **serde** | latest | Serialization | JSON for IPC |
| **serde_json** | latest | JSON handling | IPC data format |
| **notify** | latest | File watching | Watch for file changes |

### Testing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **vitest** | 4.1.4 [VERIFIED: npm] | Unit testing | Frontend tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Milkdown | Toast UI Editor | Milkdown has better real-time rendering, more modern architecture |
| Zustand | Redux Toolkit | Zustand is simpler, less boilerplate for this use case |
| shadcn/ui | Ant Design | shadcn gives full control, better Tailwind integration |
| rusqlite | sqlx | rusqlite simpler for local SQLite, sqlx overkill for MVP |

**Installation:**

```bash
# Create Tauri project with React
npm create tauri-app@latest termsuite -- --template react-ts

# Frontend dependencies
cd termsuite
npm install zustand react-router-dom lucide-react

# Milkdown editor
npm install @milkdown/core @milkdown/react @milkdown/ctx \
  @milkdown/preset-commonmark @milkdown/preset-gfm \
  @milkdown/plugin-listener @milkdown/plugin-history @milkdown/plugin-slash

# shadcn/ui initialization
npx shadcn init
npx shadcn add button dialog input scroll-area separator tooltip

# Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Rust dependencies (Cargo.toml):**

```toml
[dependencies]
tauri = { version = "2.10", features = ["devtools"] }
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.39", features = ["bundled"] }
pulldown-cmark = "0.13"
tokio = { version = "1", features = ["full"] }
notify = "6"
regex = "1"
walkdir = "2"
```

## Architecture Patterns

### Recommended Project Structure

```
termsuite/
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs               # Tauri commands registration
│   │   ├── commands/            # IPC command handlers
│   │   │   ├── mod.rs
│   │   │   ├── notes.rs         # Note CRUD operations
│   │   │   ├── search.rs        # FTS5 search
│   │   │   └── links.rs         # Wiki-link parsing
│   │   ├── db/                  # Database layer
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs        # SQLite schema
│   │   │   └── fts.rs           # FTS5 operations
│   │   ├── fs/                  # File system operations
│   │   │   ├── mod.rs
│   │   │   └── watcher.rs       # File watching
│   │   └── models/              # Data models
│   │       ├── mod.rs
│   │       └── note.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                          # React frontend
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Root component
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # Root layout
│   │   │   ├── Sidebar.tsx      # Left sidebar
│   │   │   ├── MainPanel.tsx    # Center content
│   │   │   ├── PreviewPanel.tsx # Right panel
│   │   │   └── MobileDrawer.tsx # Mobile drawer
│   │   ├── editor/
│   │   │   ├── MarkdownEditor.tsx
│   │   │   ├── WikiLinkInput.tsx
│   │   │   └── BacklinksList.tsx
│   │   ├── navigation/
│   │   │   ├── FileTree.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── NoteListItem.tsx
│   │   └── ui/                   # shadcn components
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       └── ...
│   ├── stores/                   # Zustand stores
│   │   ├── noteStore.ts
│   │   ├── searchStore.ts
│   │   └── uiStore.ts
│   ├── hooks/                    # Custom hooks
│   │   ├── useNotes.ts
│   │   ├── useSearch.ts
│   │   └── useTauri.ts
│   ├── lib/                      # Utilities
│   │   ├── tauri.ts             # Tauri API wrappers
│   │   └── utils.ts             # Helper functions
│   └── styles/
│       └── globals.css          # Tailwind imports
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### Pattern 1: Tauri Command Pattern

**What:** Use Tauri's `#[tauri::command]` attribute to expose Rust functions to frontend.

**When to use:** All backend operations (file I/O, database, search).

**Example:**

```rust
// src-tauri/src/commands/notes.rs
use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub path: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub note_id: String,
    pub title: String,
    pub snippet: String,
}

#[tauri::command]
pub async fn create_note(
    title: String,
    storage_path: String,
) -> Result<Note, String> {
    // Create file in wiki/ directory
    let path = format!("{}/wiki/{}.md", storage_path, sanitize_filename(&title));
    // ... implementation
    Ok(note)
}

#[tauri::command]
pub async fn save_note(
    id: String,
    content: String,
    db: State<'_, Mutex<Database>>,
) -> Result<(), String> {
    // Update file and FTS index
    // ... implementation
    Ok(())
}

#[tauri::command]
pub async fn search_notes(
    query: String,
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<SearchResult>, String> {
    // FTS5 search
    // ... implementation
    Ok(results)
}

#[tauri::command]
pub async fn get_backlinks(
    note_id: String,
    db: State<'_, Mutex<Database>>,
) -> Result<Vec<String>, String> {
    // Query backlinks from database
    Ok(backlinks)
}
```

```typescript
// src/lib/tauri.ts
import { invoke } from '@tauri-apps/api/core';

export const notesApi = {
  create: (title: string, storagePath: string) =>
    invoke<Note>('create_note', { title, storagePath }),
  
  save: (id: string, content: string) =>
    invoke<void>('save_note', { id, content }),
  
  search: (query: string) =>
    invoke<SearchResult[]>('search_notes', { query }),
  
  getBacklinks: (noteId: string) =>
    invoke<string[]>('get_backlinks', { noteId }),
};
```

### Pattern 2: SQLite FTS5 with rusqlite

**What:** Use SQLite's built-in FTS5 for full-text search.

**When to use:** All note content search.

**Example:**

```rust
// src-tauri/src/db/schema.rs
pub const SCHEMA: &str = r#"
-- Main notes table
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    id,
    title,
    content,
    content='notes',
    content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, id, title, content)
    VALUES (new.rowid, new.id, new.title, '');
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, id, title, content)
    VALUES ('delete', old.rowid, old.id, old.title, '');
END;

-- Backlinks table
CREATE TABLE IF NOT EXISTS backlinks (
    source_note_id TEXT NOT NULL,
    target_note_id TEXT NOT NULL,
    PRIMARY KEY (source_note_id, target_note_id)
);
"#;
```

```rust
// src-tauri/src/db/fts.rs
use rusqlite::{Connection, params};

pub fn search_notes(conn: &Connection, query: &str) -> rusqlite::Result<Vec<SearchResult>> {
    // Use FTS5 BM25 ranking
    let sql = r#"
        SELECT 
            n.id,
            n.title,
            snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
            bm25(notes_fts) as rank
        FROM notes_fts
        JOIN notes n ON notes_fts.id = n.id
        WHERE notes_fts MATCH ?
        ORDER BY rank
        LIMIT 50
    "#;
    
    let mut stmt = conn.prepare(sql)?;
    let results = stmt.query_map(params![query], |row| {
        Ok(SearchResult {
            note_id: row.get(0)?,
            title: row.get(1)?,
            snippet: row.get(2)?,
        })
    })?.collect::<Result<Vec<_>, _>>()?;
    
    Ok(results)
}

pub fn update_fts_content(conn: &Connection, note_id: &str, content: &str) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE notes_fts SET content = ? WHERE id = ?",
        params![content, note_id]
    )?;
    Ok(())
}
```

### Pattern 3: Wiki-link Parsing

**What:** Parse `[[note-name]]` syntax using regex and build backlink graph.

**When to use:** On note save/update, extract and store links.

**Example:**

```rust
// src-tauri/src/commands/links.rs
use regex::Regex;
use std::collections::HashSet;

lazy_static::lazy_static! {
    static ref WIKI_LINK_REGEX: Regex = 
        Regex::new(r"\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]").unwrap();
}

pub fn extract_wiki_links(content: &str) -> HashSet<String> {
    WIKI_LINK_REGEX
        .captures_iter(content)
        .filter_map(|cap| cap.get(1).map(|m| m.as_str().to_string()))
        .collect()
}

pub fn resolve_link_to_note_id(link_text: &str, conn: &Connection) -> Option<String> {
    // Try exact match first
    let mut stmt = conn.prepare("SELECT id FROM notes WHERE title = ?")?;
    if let Ok(id) = stmt.query_row(params![link_text], |row| row.get(0)) {
        return Some(id);
    }
    
    // Try case-insensitive if setting enabled
    // ... (based on user settings)
    
    None
}

#[tauri::command]
pub async fn update_backlinks(
    note_id: String,
    content: String,
    db: State<'_, Mutex<Database>>,
) -> Result<(), String> {
    let links = extract_wiki_links(&content);
    let conn = db.lock().unwrap();
    
    // Remove old backlinks
    conn.execute("DELETE FROM backlinks WHERE source_note_id = ?", params![note_id])?;
    
    // Insert new backlinks
    for link_text in links {
        if let Some(target_id) = resolve_link_to_note_id(&link_text, &conn) {
            conn.execute(
                "INSERT OR IGNORE INTO backlinks (source_note_id, target_note_id) VALUES (?, ?)",
                params![note_id, target_id]
            )?;
        }
    }
    
    Ok(())
}
```

### Pattern 4: Milkdown Editor with Wiki-link Support

**What:** Configure Milkdown for real-time rendering with custom wiki-link node.

**When to use:** Main editor component.

**Example:**

```typescript
// src/components/editor/MarkdownEditor.tsx
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { ReactEditor, useEditor } from '@milkdown/react';
import { wikiLinkPlugin } from './wikiLinkPlugin';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onWikiLinkClick: (noteId: string) => void;
}

export function MarkdownEditor({ content, onChange, onWikiLinkClick }: MarkdownEditorProps) {
  const { get } = useEditor(root =>
    Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          onChange(markdown);
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(wikiLinkPlugin({ onClick: onWikiLinkClick }))
  );

  return <ReactEditor editor={get()} />;
}
```

```typescript
// src/components/editor/wikiLinkPlugin.ts
import { $node, $inputRule } from '@milkdown/utils';
import { inputRules } from 'prosemirror-inputrules';
import { Schema } from 'prosemirror-model';

// Custom wiki-link node
export const wikiLinkNode = $node('wiki_link', {
  group: 'inline',
  inline: true,
  attrs: {
    target: { default: '' },
    exists: { default: false },
  },
  parseDOM: [
    {
      tag: 'a[data-wiki-link]',
      getAttrs: dom => ({
        target: (dom as HTMLElement).getAttribute('data-target'),
        exists: (dom as HTMLElement).getAttribute('data-exists') === 'true',
      }),
    },
  ],
  toDOM: node => [
    'a',
    {
      'data-wiki-link': 'true',
      'data-target': node.attrs.target,
      'data-exists': node.attrs.exists,
      class: node.attrs.exists ? 'wiki-link' : 'wiki-link broken',
      href: '#',
    },
    node.attrs.target,
  ],
});

// Input rule for [[ autocomplete
export const wikiLinkInputRule = $inputRule(
  (schema: Schema) => new InputRule(/\[\[([^\]]*?)\]\]$/, (state, match) => {
    const target = match[1];
    const exists = checkNoteExists(target); // Call backend
    
    const node = schema.nodes.wiki_link.create({
      target,
      exists,
    });
    
    return state.tr.replaceSelectionWith(node);
  })
);
```

### Pattern 5: Zustand Store for Note State

**What:** Centralized state management with persistence.

**When to use:** All global UI state.

**Example:**

```typescript
// src/stores/noteStore.ts
import { create } from 'zustand';
import { notesApi } from '../lib/tauri';

interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  updatedAt: number;
}

interface NoteState {
  notes: Note[];
  activeNoteId: string | null;
  activeNote: Note | null;
  isLoading: boolean;
  
  loadNotes: () => Promise<void>;
  createNote: (title: string) => Promise<Note>;
  saveNote: (id: string, content: string) => Promise<void>;
  openNote: (id: string) => Promise<void>;
  searchNotes: (query: string) => Promise<Note[]>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  activeNote: null,
  isLoading: false,

  loadNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await notesApi.list();
      set({ notes, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createNote: async (title: string) => {
    const storagePath = useSettingsStore.getState().storagePath;
    const note = await notesApi.create(title, storagePath);
    set(state => ({ notes: [...state.notes, note] }));
    return note;
  },

  saveNote: async (id: string, content: string) => {
    await notesApi.save(id, content);
    set(state => ({
      notes: state.notes.map(n => 
        n.id === id ? { ...n, content, updatedAt: Date.now() } : n
      ),
      activeNote: state.activeNoteId === id 
        ? { ...state.activeNote!, content, updatedAt: Date.now() }
        : state.activeNote,
    }));
  },

  openNote: async (id: string) => {
    const note = await notesApi.get(id);
    set({ activeNoteId: id, activeNote: note });
  },

  searchNotes: async (query: string) => {
    return await notesApi.search(query);
  },
}));
```

### Pattern 6: Responsive Layout

**What:** Three-column desktop layout, drawer for mobile.

**When to use:** AppLayout component.

**Example:**

```typescript
// src/components/layout/AppLayout.tsx
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MainPanel } from './MainPanel';
import { PreviewPanel } from './PreviewPanel';
import { MobileDrawer } from './MobileDrawer';
import { cn } from '@/lib/utils';

const MOBILE_BREAKPOINT = 768;

export function AppLayout() {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col">
        <header className="h-14 flex items-center px-4 border-b">
          <button onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </button>
          <h1 className="ml-4 font-semibold">TermSuite</h1>
        </header>
        <main className="flex-1 overflow-hidden">
          <MainPanel />
        </main>
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      <aside className={cn(
        "h-full border-r transition-all duration-200",
        sidebarOpen ? "w-60" : "w-12"
      )}>
        <Sidebar collapsed={!sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </aside>
      <main className="flex-1 min-w-0">
        <MainPanel />
      </main>
      <aside className={cn(
        "h-full border-l transition-all duration-200",
        previewOpen ? "w-80" : "w-0"
      )}>
        <PreviewPanel />
      </aside>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Storing full content in React state:** Use backend for large files; only load content on demand.
- **Synchronous file operations:** All Tauri commands should be async; don't block the UI thread.
- **Parsing wiki-links on every render:** Parse once on save, store in database.
- **Ignoring mobile touch targets:** Minimum 44x44px for all interactive elements on mobile.
- **Direct SQLite access from frontend:** All database operations go through Tauri commands.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown parsing (frontend) | Custom parser | Milkdown presets | Edge cases (tables, code blocks, nested lists) |
| Full-text search | Custom inverted index | SQLite FTS5 | Built-in ranking, snippet extraction, Unicode support |
| File watching | Polling loop | notify crate | Cross-platform inotify/FSEvents, efficient |
| Wiki-link regex | String manipulation | Regex crate | Handles edge cases (escaped brackets, nested) |
| State persistence | localStorage | Zustand + Tauri store | Cross-platform, typed, async |
| Dialog/file picker | Custom modal | tauri-plugin-dialog | Native OS dialogs |
| CSS theming | Custom variables | Tailwind + shadcn | Dark mode, responsive utilities |

**Key insight:** SQLite FTS5 is battle-tested and performs well for local knowledge bases up to 100k+ notes. Only consider external search (MeiliSearch, Typesense) for much larger datasets.

## Common Pitfalls

### Pitfall 1: Tauri 2.x Breaking Changes from v1

**What goes wrong:** Code examples from Tauri v1 don't work; `tauri.conf.json` structure changed.

**Why it happens:** Tauri 2.x restructured the API (e.g., `invoke` now from `@tauri-apps/api/core`, not `@tauri-apps/api`).

**How to avoid:** Always use v2 documentation at https://v2.tauri.app/. Check that examples reference `tauri 2.x` not `tauri 1.x`.

**Warning signs:** Import errors for `@tauri-apps/api/tauri`, `tauri.conf.json` missing `productName` field.

### Pitfall 2: Milkdown Real-time Rendering Configuration

**What goes wrong:** Editor shows raw markdown instead of rendered output, or cursor position jumps during typing.

**Why it happens:** Milkdown requires specific plugin order and configuration for real-time rendering.

**How to avoid:** Use the `@milkdown/preset-gfm` with default configuration. Don't mix CommonMark and GFM parsers manually.

**Warning signs:** Cursor resets to start of document, formatting flickers while typing.

### Pitfall 3: SQLite FTS5 Content Sync

**What goes wrong:** Search returns stale results, missing recent note changes.

**Why it happens:** FTS5 virtual table doesn't auto-sync with source table; triggers needed.

**How to avoid:** Use the trigger pattern shown in Pattern 2. Always update FTS when note content changes.

**Warning signs:** New notes don't appear in search, deleted notes still searchable.

### Pitfall 4: Wiki-link Case Sensitivity

**What goes wrong:** `[[My Note]]` doesn't link to `my note.md` on case-sensitive filesystems (Linux, macOS).

**Why it happens:** File systems differ; SQLite LIKE is case-insensitive but file operations aren't.

**How to avoid:** Normalize note titles to lowercase for file names, store display title separately. Or use case-insensitive mode as user setting (D-10).

**Warning signs:** Links work on Windows but break on Linux/macOS.

### Pitfall 5: Mobile Layout Performance

**What goes wrong:** App feels sluggish on mobile, animations stutter.

**Why it happens:** Heavy re-renders, unoptimized list rendering, large bundle size.

**How to avoid:** Use virtualized lists for file tree (if >100 notes). Lazy load editor component. Minimize re-renders with `React.memo` and Zustand selectors.

**Warning signs:** Note list scrolls lag, editor typing delay.

### Pitfall 6: Chinese Wiki-link Parsing

**What goes wrong:** `[[中文笔记]]` not recognized as wiki-link.

**Why it happens:** Regex `\w` doesn't match Chinese characters.

**How to avoid:** Use regex `[\p{L}\p{N}\s_-]+` with Unicode flag, or simply `[^\]]+` for the link content.

**Warning signs:** Chinese links not highlighted, not extracted for backlinks.

## Code Examples

### Tauri Command Registration

```rust
// src-tauri/src/lib.rs
mod commands;
mod db;
mod fs;

use commands::{notes, search, links};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(db::Database::new().expect("Failed to init database"))
        .invoke_handler(tauri::generate_handler![
            notes::create_note,
            notes::save_note,
            notes::delete_note,
            notes::get_note,
            notes::list_notes,
            search::search_notes,
            links::get_backlinks,
            links::get_outlinks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### shadcn/ui Component Usage

```typescript
// src/components/navigation/SearchBar.tsx
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchNotes = useNoteStore(s => s.searchNotes);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    
    const debounce = setTimeout(async () => {
      const r = await searchNotes(query);
      setResults(r);
      setIsOpen(true);
    }, 200);

    return () => clearTimeout(debounce);
  }, [query, searchNotes]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search notes..."
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {isOpen && results.length > 0 && (
        <ScrollArea className="absolute top-full left-0 right-0 mt-1 h-64 bg-popover border rounded-md shadow-lg z-50">
          {results.map(result => (
            <button
              key={result.note_id}
              className="w-full px-3 py-2 text-left hover:bg-accent"
              onClick={() => {
                useNoteStore.getState().openNote(result.note_id);
                setIsOpen(false);
                setQuery('');
              }}
            >
              <div className="font-medium">{result.title}</div>
              <div 
                className="text-sm text-muted-foreground truncate"
                dangerouslySetInnerHTML={{ __html: result.snippet }}
              />
            </button>
          ))}
        </ScrollArea>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri 1.x invoke API | `@tauri-apps/api/core` | Tauri 2.0 (2024) | Modular imports, better tree-shaking |
| Redux for state | Zustand | ~2022 | Simpler API, less boilerplate |
| Toast UI Editor | Milkdown | ~2023 | Better real-time rendering, plugin architecture |
| SQLite FTS3/4 | FTS5 | SQLite 3.9.0 (2015) | Better Unicode, BM25 ranking |
| Electron | Tauri 2.x | Tauri 2.0 stable (2024) | Smaller bundles, system webview |

**Deprecated/outdated:**
- **Tauri 1.x patterns:** Use v2 documentation only
- **NeDB/LowDB:** Use SQLite for reliability at scale
- **Custom Markdown parser:** Use Milkdown or pulldown-cmark

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Milkdown 7.x has stable React integration | Standard Stack | May need alternative editor library |
| A2 | rusqlite FTS5 bundled feature works on all platforms | Standard Stack | May need platform-specific SQLite config |
| A3 | Tauri 2.x file dialog plugin works on Android | Standard Stack | Mobile file picker may need native code |
| A4 | Unicode regex in Rust handles Chinese wiki-links correctly | Pattern 3 | May need specific regex crate features |

**If this table is empty:** All claims in this research were verified or cited - no user confirmation needed.

## Open Questions (RESOLVED)

1. **Storage location selection UI flow** — RESOLVED
   - What we know: User selects on first launch (D-06)
   - What was unclear: Should we show a welcome wizard or just a single dialog?
   - **Decision:** Use `tauri-plugin-dialog`'s `open` with `directory: true` for simplicity in MVP
   - Resolution: Single dialog approach adopted - see PLAN-01, PLAN-06 for implementation

2. **Raw/wiki/outputs structure usage** — RESOLVED
   - What we know: Three directories exist (D-08, KNOW-04)
   - What was unclear: What goes in `raw/` vs `wiki/`?
   - **Decision:** 
     - `raw/` — Source materials imported by user (PDFs, web clips, images)
     - `wiki/` — User-created and AI-edited notes (primary working directory)
     - `outputs/` — AI-generated artifacts (Phase 2+, not used in Phase 1)
   - Resolution: Directory structure defined in PLAN-01, enforced in storage initialization

3. **Mobile drawer animation library** — RESOLVED
   - What we know: Mobile uses drawer pattern (D-04)
   - What was unclear: Should we use a library like `vaul` or build with CSS transforms?
   - **Decision:** Use CSS transforms for MVP simplicity
   - Resolution: PLAN-02 implements CSS transform-based drawer; consider `vaul` in future if gestures needed

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build | ✓ | 25.8.2 | — |
| npm | Package management | ✓ | 11.12.1 | — |
| Rust | Tauri backend | ✓ | 1.94.1 | — |
| Cargo | Rust package manager | ✓ | 1.94.1 | — |
| TypeScript | Type checking | ✓ | 6.0.2 | — |
| Vite | Build tool | ✓ | 8.0.8 | — |

**Missing dependencies with no fallback:**
- None detected

**Missing dependencies with fallback:**
- None needed

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | vitest.config.ts (Wave 0) |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KNOW-01 | Create markdown note | integration | `vitest run tests/notes.test.ts` | Wave 0 |
| KNOW-01 | Edit markdown note | integration | `vitest run tests/notes.test.ts` | Wave 0 |
| KNOW-01 | Save note to disk | e2e | `vitest run tests/e2e/storage.test.ts` | Wave 0 |
| KNOW-02 | Create wiki-link | unit | `vitest run tests/wiki-links.test.ts` | Wave 0 |
| KNOW-02 | Show backlinks | integration | `vitest run tests/backlinks.test.ts` | Wave 0 |
| KNOW-03 | Full-text search | integration | `vitest run tests/search.test.ts` | Wave 0 |
| KNOW-04 | Directory structure created | e2e | `vitest run tests/e2e/storage.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` - test configuration
- [ ] `tests/setup.ts` - testing library setup
- [ ] `tests/notes.test.ts` - covers KNOW-01
- [ ] `tests/wiki-links.test.ts` - covers KNOW-02
- [ ] `tests/search.test.ts` - covers KNOW-03
- [ ] `tests/e2e/storage.test.ts` - covers KNOW-04
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/coverage-v8`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user local app |
| V3 Session Management | no | No network sessions |
| V4 Access Control | no | Single-user local app |
| V5 Input Validation | yes | Zod schemas for Tauri command params |
| V6 Cryptography | no | No encryption required for MVP |

### Known Threat Patterns for Tauri + SQLite

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in file operations | Tampering | Validate paths are within storage root |
| SQL injection in search | Tampering | Use parameterized queries (rusqlite default) |
| XSS in markdown content | Tampering | Sanitize HTML in Milkdown output |
| Malicious note content | Tampering | Don't execute embedded scripts |
| Arbitrary code via shell commands | Elevation of Privilege | No shell commands in Phase 1 |

**Security considerations:**
- All file operations must validate paths are within user-selected storage directory
- Search queries use parameterized FTS5 queries
- Markdown content rendered through Milkdown's safe HTML output
- No network access in Phase 1 (no API calls, no remote content)

## Sources

### Primary (HIGH confidence)

- crates.io API - Tauri 2.10.3, rusqlite 0.39.0, pulldown-cmark 0.13.3 versions verified
- npm registry - All frontend package versions verified via `npm view`

### Secondary (MEDIUM confidence)

- [ASSUMED] Tauri 2.x documentation patterns from training knowledge

### Tertiary (LOW confidence)

- None - all critical findings verified from registries

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified from npm/crates.io
- Architecture: HIGH - Based on established Tauri patterns
- Pitfalls: MEDIUM - Based on training knowledge and common issues

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days - stable ecosystem)
