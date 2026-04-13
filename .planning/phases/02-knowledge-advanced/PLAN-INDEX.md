# Phase 2: Knowledge Advanced - Plan Index

**Created:** 2026-04-14
**Phase Requirements:** KNOW-05, KNOW-06, KNOW-07
**Total Plans:** 5

---

## Overview

Phase 2 implements advanced knowledge base features:
- **KNOW-05:** AI automatically discovers and creates relationships between notes
- **KNOW-06:** User can visualize note relationships in knowledge graph view
- **KNOW-07:** AI incrementally maintains wiki by extracting concepts from raw sources

---

## Wave Organization

```
Wave 1 (Foundation - Backend)
├── PLAN-01: AI Provider Abstraction Layer
│   └── Rust trait for Claude/OpenAI/DeepSeek/Ollama
│   └── Tauri commands for AI streaming
│   └── Secure API key storage with keyring
│
└── PLAN-02: Related Notes Discovery
    └── Co-citation and co-reference SQL queries
    └── Relationship scoring algorithm
    └── Tauri commands for related notes

    ↓ (Wave 1 must complete)

Wave 2 (Frontend Components)
└── PLAN-03: Knowledge Graph Visualization
    └── Cytoscape.js integration
    └── Graph toolbar and filters
    └── Node click navigation

    ↓ (Wave 2 must complete)

Wave 3 (Integration)
└── PLAN-04: Wiki Maintenance and Related Notes UI
    └── Background scheduler for wiki processing
    └── Related notes panel in preview
    └── Wiki diff viewer for AI suggestions

    ↓ (All Waves must complete)

Wave 4 (Polish & Testing)
└── PLAN-05: Testing, Polish, and AI Settings UI
    └── AI provider settings page
    └── Unit tests for all modules
    └── Integration test verification
```

---

## Plan Summary

| Plan | Wave | Requirements | Files Created | Files Modified | Autonomous |
|------|------|--------------|---------------|----------------|------------|
| PLAN-01 | 1 | KNOW-05, KNOW-07 | 8 | 2 | Yes |
| PLAN-02 | 1 | KNOW-05 | 1 | 2 | Yes |
| PLAN-03 | 2 | KNOW-06 | 5 | 5 | Yes |
| PLAN-04 | 3 | KNOW-05, KNOW-07 | 4 | 5 | Yes |
| PLAN-05 | 4 | KNOW-05, KNOW-06, KNOW-07 | 2 | 3 | No |

---

## Dependency Graph

```
PLAN-01 (AI Provider) ──┐
                        ├──→ PLAN-04 (Wiki Maintenance)
PLAN-02 (Related Notes) ┘         │
        │                         │
        └──────→ PLAN-03 (Graph) ─┘
                        │
                        └──→ PLAN-05 (Testing)
```

**Execution Order:**
1. PLAN-01 and PLAN-02 can run in parallel (Wave 1)
2. PLAN-03 requires PLAN-02 (needs relations data)
3. PLAN-04 requires PLAN-01 (needs AI provider)
4. PLAN-05 requires all previous plans

---

## Files to be Created

### Backend (Rust)
```
termsuite/src-tauri/src/
├── ai/
│   ├── mod.rs
│   ├── provider.rs
│   ├── claude.rs
│   ├── openai.rs
│   ├── deepseek.rs
│   ├── ollama.rs
│   └── test_utils.rs
├── scheduler/
│   └── mod.rs
└── commands/
    ├── relations.rs
    ├── graph.rs
    └── wiki.rs
```

### Frontend (React/TypeScript)
```
termsuite/src/
├── components/
│   ├── graph/
│   │   ├── GraphView.tsx
│   │   ├── GraphToolbar.tsx
│   │   └── GraphFilterDropdown.tsx
│   ├── wiki/
│   │   ├── RelatedNotesPanel.tsx
│   │   └── DiffViewer.tsx
│   └── settings/
│       └── AIProviderSettings.tsx
├── stores/
│   ├── graphStore.ts
│   └── aiStore.ts
└── lib/
    └── tauri-graph.ts
```

---

## Files to be Modified

| File | Changes |
|------|---------|
| `Cargo.toml` | Add async-trait, reqwest, keyring, tokio-stream, futures |
| `package.json` | Add cytoscape, @cytoscape/react, react-diff-viewer-continued |
| `lib.rs` | Register AI, graph, relations, wiki commands; start scheduler |
| `schema.rs` | Add related_notes and note_directories tables |
| `Sidebar.tsx` | Add Knowledge Graph button |
| `PreviewPanel.tsx` | Add Related Notes section |
| `settingsStore.ts` | Add defaultAIProvider |

---

## Key Decisions Implemented

| Decision | Implementation |
|----------|----------------|
| D-01 | Link analysis as primary relationship discovery |
| D-02 | Real-time computation + backlinks (like Obsidian) |
| D-03 | Four factors: direct link, co-citation, co-reference, proximity |
| D-04 | Cytoscape.js for graph visualization |
| D-05 | Force-directed (fcose) as default layout |
| D-06 | Full-screen graph modal (not embedded) |
| D-07 | Click to navigate, filter by type/directory, search highlight |
| D-08 | Scheduled batch processing for wiki maintenance |
| D-09 | Hourly incremental + daily full processing |
| D-10 | Git diff style confirmation for wiki changes |
| D-11 | Append, create, update, or add to section |
| D-12 | Support Claude, OpenAI, DeepSeek, Ollama, custom |
| D-13 | User-configurable default provider |
| D-14 | Rust Provider trait abstraction |
| D-15 | OS-level encrypted key storage via keyring |

---

## Success Criteria

Per ROADMAP.md:

1. **KNOW-05:** User can see AI-suggested related notes
   - Related notes panel shows scored relationships
   - Multiple relationship types (direct, co-citation, co-reference, proximity)

2. **KNOW-06:** User can view knowledge graph showing note relationships
   - Full-screen graph visualization
   - Node click navigates to note
   - Filtering and search work correctly

3. **KNOW-07:** User can add content to raw/ and AI automatically updates wiki
   - Scheduler runs hourly/daily
   - AI generates wiki suggestions
   - Diff viewer allows confirmation

---

## Threat Model Considerations

| Risk | Mitigation |
|------|------------|
| API Keys exposed | keyring crate uses OS-level encryption (D-15) |
| AI content injection | User confirmation required (D-10) |
| Malicious note IDs | Backend validates before navigation |
| Rate limiting | Provider abstraction handles retries |

---

## Next Steps

1. Execute Wave 1 plans (PLAN-01, PLAN-02) in parallel
2. Execute Wave 2 (PLAN-03) after PLAN-02
3. Execute Wave 3 (PLAN-04) after PLAN-01
4. Execute Wave 4 (PLAN-05) for final verification
5. Update STATE.md to mark Phase 2 complete

---

*Index created: 2026-04-14*
*Phase: 02-knowledge-advanced*
