# Architecture Research: TermSuite

**Research Date:** 2026-04-13
**Domain:** Rust + Tauri cross-platform knowledge terminal app
**Confidence:** Medium-High

## Executive Summary

TermSuite 采用分层架构，核心是 LLM-Wiki 三层模式（raw → wiki → human），在此基础上集成终端、AI 对话和自动化控制模块。

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (WebView)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │  Knowledge  │ │  Terminal   │ │   AI Chat   │ │ Control│ │
│  │    Views    │ │    Views    │ │    Views    │ │ Panel  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
│                           ↓ Commands                         │
├─────────────────────────────────────────────────────────────┤
│                    Tauri IPC Bridge                          │
├─────────────────────────────────────────────────────────────┤
│                      Rust Backend                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │  Knowledge  │ │  Terminal   │ │   AI        │ │Automation│ │
│  │   Engine    │ │   Engine    │ │   Engine    │ │ Engine  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
│         ↓              ↓              ↓              ↓      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Storage Layer                        ││
│  │  SQLite (index) + File System (raw/wiki) + Vector DB   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Knowledge Engine

**职责**: 管理知识库的存储、索引、链接、搜索

```
┌────────────────────────────────────────┐
│           Knowledge Engine              │
├────────────────────────────────────────┤
│  Markdown Parser (pulldown-cmark)       │
│  Link Resolver (双向链接解析)            │
│  Graph Builder (知识图谱构建)            │
│  Search Index (SQLite FTS5)             │
│  Embedding Manager (向量化)              │
└────────────────────────────────────────┘
         ↓                    ↓
    SQLite Index        File System
    (元数据、FTS)        (raw/wiki/outputs)
```

**关键数据结构**:
- `Note`: id, title, content, path, created_at, updated_at
- `Link`: source_id, target_id, type (forward/backlink)
- `Tag`: note_id, tag_name

### 2. Terminal Engine

**职责**: 管理 PTY、终端渲染、命令执行

```
┌────────────────────────────────────────┐
│           Terminal Engine               │
├────────────────────────────────────────┤
│  PTY Manager (tokio::process)           │
│  Session Manager (多标签、分屏)           │
│  Theme Manager                          │
│  Output Buffer                          │
│  Command History                        │
└────────────────────────────────────────┘
         ↓
    xterm.js (Frontend)
```

**关键数据结构**:
- `Session`: id, pty_process, buffer, theme
- `Tab`: id, sessions (for split panes)
- `Command`: id, session_id, command, output, timestamp

### 3. AI Engine

**职责**: 管理 AI 模型连接、对话、工具调用

```
┌────────────────────────────────────────┐
│             AI Engine                   │
├────────────────────────────────────────┤
│  Provider Abstraction                   │
│    ├── Claude Provider                  │
│    ├── OpenAI Provider                  │
│    ├── DeepSeek Provider                │
│    └── Local Provider (Ollama)          │
│  Conversation Manager                   │
│  Tool Executor (命令、文件操作)           │
│  Context Builder (知识库上下文注入)       │
└────────────────────────────────────────┘
```

**关键数据结构**:
- `Conversation`: id, messages, model, provider
- `Message`: role, content, timestamp, tool_calls
- `Tool`: name, description, handler

### 4. Automation Engine

**职责**: 管理自动化任务、脚本、Android 控制

```
┌────────────────────────────────────────┐
│         Automation Engine               │
├────────────────────────────────────────┤
│  Script Runner                          │
│  Task Scheduler                         │
│  File Watcher                           │
│  API Client                             │
│  Android Controller (mobile only)       │
└────────────────────────────────────────┘
```

---

## Data Flow

### 1. Knowledge Flow (LLM-Wiki Pattern)

```
User adds file to raw/
        ↓
AI Engine reads file
        ↓
AI Engine extracts concepts, entities
        ↓
Knowledge Engine creates/updates wiki pages
        ↓
Knowledge Engine updates links, graph
        ↓
User queries → AI reads wiki → answers
```

### 2. Terminal → Knowledge Integration

```
User runs command in terminal
        ↓
Output captured
        ↓
User clicks "Save to Wiki"
        ↓
Output saved as new note in wiki/
        ↓
AI can now reference this in future answers
```

### 3. AI Tool Calling Flow

```
User asks AI to execute command
        ↓
AI returns tool_call
        ↓
AI Engine invokes Terminal Engine
        ↓
Command executes, output returned
        ↓
AI continues conversation with output
```

---

## Cross-Platform Abstraction

```
┌─────────────────────────────────────────┐
│            Platform Trait               │
├─────────────────────────────────────────┤
│  fn get_storage_path() -> PathBuf       │
│  fn execute_command() -> Result         │
│  fn get_system_info() -> SystemInfo     │
│  fn control_bluetooth() -> Result       │
│  fn ...                                 │
└─────────────────────────────────────────┘
         ↑           ↑           ↑
    ┌────┴───┐  ┌────┴───┐  ┌────┴───┐
    │Desktop │  │Android │  │  Web   │
    │Platform│  │Platform│  │Platform│
    └────────┘  └────────┘  └────────┘
```

**Desktop**: 完整功能，直接访问文件系统
**Android**: 通过 Tauri Mobile + JNI 调用 Android APIs
**Web**: 功能受限，需要后端 API 支持

---

## Suggested Build Order

```
Phase 1: Foundation
├── Tauri project setup
├── Basic UI shell
└── IPC bridge

Phase 2: Knowledge Core
├── File system storage (raw/wiki structure)
├── Markdown parsing
├── SQLite index setup
└── Basic note CRUD

Phase 3: Terminal Core
├── PTY integration
├── xterm.js setup
├── Command execution
└── Basic themes

Phase 4: AI Integration
├── Provider abstraction
├── Chat UI
├── Streaming responses
└── Multi-model support

Phase 5: Knowledge Advanced
├── Wiki-link parsing
├── Bi-directional links
├── Knowledge graph
└── AI auto-linking

Phase 6: Tool Calling
├── Terminal command execution
├── File operations
└── Knowledge queries

Phase 7: Automation
├── Script library
├── Scheduled tasks
└── Android control (mobile)

Phase 8: Plugin System
├── Plugin API design
├── Plugin loader
└── Sample plugins

Phase 9: Cross-Platform Polish
├── Android app refinement
├── Web version (optional)
└── Sync (future)
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Local-first storage | SQLite + Files | 简单可靠，支持离线，用户可控 |
| Terminal emulation | xterm.js | 成熟、社区活跃、支持图片 |
| AI provider abstraction | Trait-based | 支持多模型，易于扩展 |
| Link syntax | `[[wiki-link]]` | Obsidian 兼容，用户熟悉 |
| Plugin system | WebAssembly? | 待定，MVP 后再设计 |

---
*Research synthesized from: Tauri patterns, LLM-Wiki architecture, Obsidian architecture, Termux implementation*