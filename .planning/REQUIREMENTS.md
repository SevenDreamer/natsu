# Requirements: TermSuite

**Defined:** 2026-04-13
**Core Value:** AI 自动关联的知识库——存进去，AI 帮你整理、关联、检索

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Knowledge Base - Core

- [ ] **KNOW-01**: User can create and edit markdown notes stored locally as .md files
- [ ] **KNOW-02**: User can create bi-directional wiki links using `[[note-name]]` syntax
- [ ] **KNOW-03**: User can search all notes using full-text search
- [ ] **KNOW-04**: System maintains raw/wiki/outputs three-layer directory structure

### Knowledge Base - Advanced

- [ ] **KNOW-05**: AI automatically discovers and creates relationships between notes
- [ ] **KNOW-06**: User can visualize note relationships in knowledge graph view
- [ ] **KNOW-07**: AI incrementally maintains wiki by extracting concepts from raw sources

### Terminal - Core

- [ ] **TERM-01**: User can execute shell commands in terminal
- [ ] **TERM-02**: User can switch between light and dark themes
- [ ] **TERM-03**: Terminal displays images inline (Sixel/iTerm2 protocol)

### Terminal - Integration

- [ ] **TERM-04**: User can save terminal output to knowledge base with one click

### AI Chat - Core

- [ ] **AI-01**: User can chat with AI through conversation interface
- [ ] **AI-02**: User can select from multiple AI models (Claude, GPT, DeepSeek, etc.)
- [ ] **AI-03**: AI responses display with streaming (real-time)
- [ ] **AI-04**: System saves conversation history

### AI Chat - Advanced

- [ ] **AI-05**: AI can understand and explain code
- [ ] **AI-06**: AI maintains context from previous messages in conversation
- [ ] **AI-07**: AI can execute terminal commands via tool calling
- [ ] **AI-08**: AI can query knowledge base to answer questions

### Automation

- [ ] **AUTO-01**: System saves command execution history
- [ ] **AUTO-02**: User can save and run scripts from script library
- [ ] **AUTO-03**: User can monitor and operate files
- [ ] **AUTO-04**: User can make API calls from the application
- [ ] **AUTO-05**: User can schedule tasks for timed execution
- [ ] **AUTO-06**: User can control Android system settings (Bluetooth, Wi-Fi, etc.)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Knowledge Base

- **KNOW-08**: Semantic search using vector embeddings
- **KNOW-09**: Plugin system for extending functionality
- **KNOW-10**: Cloud sync for knowledge base

### Terminal

- **TERM-05**: Multi-tab terminal interface
- **TERM-06**: Split pane view within terminal
- **TERM-07**: Custom themes and color schemes

### AI Chat

- **AI-09**: AI can perform file operations via tool calling
- **AI-10**: AI can automatically save conversations to knowledge base
- **AI-11**: Local model support (Ollama integration)

### Platform

- **PLAT-01**: Web version with limited functionality
- **PLAT-02**: iOS support

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time collaboration | Personal tool, no multi-user collaboration needed |
| Cloud sync (MVP) | Local-first, cloud sync considered for v2 |
| Complex permissions | Single-user scenario |
| Notion-like database views | Adds complexity, Markdown sufficient |
| AI training/fine-tuning | Using existing model APIs is sufficient |
| Social features | Personal knowledge management, no social needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| KNOW-01 | Phase 1 | Pending |
| KNOW-02 | Phase 1 | Pending |
| KNOW-03 | Phase 1 | Pending |
| KNOW-04 | Phase 1 | Pending |
| KNOW-05 | Phase 2 | Pending |
| KNOW-06 | Phase 2 | Pending |
| KNOW-07 | Phase 2 | Pending |
| TERM-01 | Phase 3 | Pending |
| TERM-02 | Phase 3 | Pending |
| TERM-03 | Phase 3 | Pending |
| TERM-04 | Phase 3 | Pending |
| AI-01 | Phase 4 | Pending |
| AI-02 | Phase 4 | Pending |
| AI-03 | Phase 4 | Pending |
| AI-04 | Phase 4 | Pending |
| AI-05 | Phase 4 | Pending |
| AI-06 | Phase 4 | Pending |
| AI-07 | Phase 5 | Pending |
| AI-08 | Phase 5 | Pending |
| AUTO-01 | Phase 6 | Pending |
| AUTO-02 | Phase 6 | Pending |
| AUTO-03 | Phase 6 | Pending |
| AUTO-04 | Phase 6 | Pending |
| AUTO-05 | Phase 7 | Pending |
| AUTO-06 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after initial definition*