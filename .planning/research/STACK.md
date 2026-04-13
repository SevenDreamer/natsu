# Stack Research: TermSuite

**Research Date:** 2026-04-13
**Domain:** Rust + Tauri cross-platform knowledge terminal app
**Confidence:** Medium-High

## Executive Summary

TermSuite 是一个 AI 驱动的个人知识终端，整合了 LLM-Wiki 知识库、现代终端、AI 对话和自动化控制。推荐的技术栈如下：

## Core Stack

### Application Framework

| Component | Recommendation | Version | Rationale |
|-----------|---------------|---------|-----------|
| **Desktop Framework** | Tauri | 2.x | 轻量打包（~30MB vs Electron ~700MB），使用系统 webview |
| **Backend Language** | Rust | 1.75+ | 性能、内存安全、与 Tauri 原生集成 |
| **Frontend Framework** | SvelteKit / React | Latest | Tauri 官方推荐 Svelte，轻量高效 |

### Terminal Emulation

| Component | Recommendation | Version | Rationale |
|-----------|---------------|---------|-----------|
| **Terminal Core** | xterm.js | 5.x | 成熟的终端模拟器，支持图片、主题、Unicode |
| **PTY Backend** | portproxy / alacritty_terminal | Latest | Rust 实现的 PTY，跨平台支持 |
| **Terminal Multiplexer** | Custom (基于 xterm.js Addons) | — | 多标签、分屏用 xterm.js 插件实现 |

### Knowledge Base

| Component | Recommendation | Version | Rationale |
|-----------|---------------|---------|-----------|
| **Storage** | SQLite + File System | — | 本地优先，SQLite 做索引，文件系统存 raw/wiki |
| **Markdown Parser** | pulldown-cmark | Latest | Rust 原生 Markdown 解析，性能好 |
| **Bi-directional Links** | Custom Implementation | — | 解析 `[[wiki-links]]`，构建引用图 |
| **Graph Visualization** | D3.js / Cytoscape.js | Latest | 知识图谱可视化 |

### AI Integration

| Component | Recommendation | Version | Rationale |
|-----------|---------------|---------|-----------|
| **Multi-model Support** | Custom Provider Abstraction | — | 支持 Claude、GPT、DeepSeek、本地模型 |
| **Streaming** | SSE / WebSocket | — | 流式响应，用户体验好 |
| **Embedding** | text-embedding-3-small / local | — | 知识库语义搜索 |
| **Vector Store** | sqlite-vec / Qdrant (optional) | Latest | 轻量或功能丰富两种选择 |

### Automation

| Component | Recommendation | Version | Rationale |
|-----------|---------------|---------|-----------|
| **Command Execution** | Rust tokio::process | — | 异步命令执行 |
| **File Operations** | Rust std::fs + notify | — | 文件监控和操作 |
| **API Calls** | reqwest | Latest | HTTP 客户端 |
| **Android Control** | Tauri Mobile + Android APIs | — | 蓝牙、设置等系统控制 |

## Cross-Platform Considerations

### Desktop (Windows/macOS/Linux)
- Tauri 2.x 原生支持
- 使用系统 webview（Windows: WebView2, macOS/Linux: WebKit）
- 终端 PTY 需要平台适配

### Android
- Tauri 2.x 移动端支持（beta 稳定）
- 终端功能需要 Termux 集成或自定义实现
- 系统控制通过 Android APIs

### Web
- 需要单独部署前端
- 终端功能受限（浏览器安全模型）
- 知识库需要后端 API 支持

## What NOT to Use

| Avoid | Why |
|-------|-----|
| **Electron** | 打包体积大、内存占用高 |
| **NeDB / LowDB** | 知识库规模增长后性能问题，SQLite 更可靠 |
| **自定义向量数据库** | sqlite-vec 足够，避免过度工程 |
| **复杂的全文搜索引擎** | SQLite FTS5 足够用于 MVP |
| **Electron-based Terminal** | Tauri + xterm.js 更轻量 |

## Build Order Recommendation

1. **Phase 1**: Tauri 项目骨架 + 基础 UI 框架
2. **Phase 2**: 知识库核心（存储、Markdown 解析、链接）
3. **Phase 3**: 终端核心（PTY、xterm.js 集成）
4. **Phase 4**: AI 对话集成
5. **Phase 5**: 自动化控制
6. **Phase 6**: 知识图谱、插件系统
7. **Phase 7**: Android 移动端适配
8. **Phase 8**: Web 版本

---
*Research synthesized from: User knowledge base, Tauri ecosystem, LLM-Wiki patterns*