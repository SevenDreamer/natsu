<!-- GSD:project-start source:PROJECT.md -->
## Project

**纳兹 Natsu**

一个 AI 驱动的个人知识终端，整合了 LLM-Wiki 风格知识库、现代终端、AI 对话和自动化控制功能。使用 Rust + Tauri 构建，支持桌面端、Android 和 Web 平台。

核心理念：LLM 维护知识库，你只阅读和提问——知识是持久化、可积累的。

**Core Value:** **AI 自动关联的知识库**——存进去，AI 帮你整理、关联、检索。所有内容（笔记、代码、终端输出、AI对话）都被智能组织，无需手动分类。

### Constraints

- **技术栈**: Rust + Tauri — 已确定，愿意学习
- **开发节奏**: 边用边做，迭代改进
- **MVP目标**: 功能完整的第一版
- **界面风格**: 简洁现代、Markdown为主、GitHub风格简约
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Executive Summary
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
