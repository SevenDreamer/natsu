# Research Summary: TermSuite

**Research Date:** 2026-04-13
**Project:** Rust + Tauri 跨平台 AI 知识终端

---

## Executive Summary

TermSuite 是一个 AI 驱动的个人知识终端，整合四大功能域：**LLM-Wiki 知识库**、**现代终端**、**AI 对话**、**自动化控制**。本项目采用 Rust + Tauri 技术栈，目标平台覆盖桌面（Windows/macOS/Linux）、Android 和 Web。

---

## Key Findings

### Stack Recommendations

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Desktop Framework | **Tauri 2.x** | 轻量打包（~30MB），使用系统 webview |
| Backend | **Rust 1.75+** | 性能、内存安全、与 Tauri 原生集成 |
| Frontend | **SvelteKit / React** | 轻量高效，Tauri 推荐 |
| Terminal | **xterm.js + tokio::process** | 成熟的终端模拟 + 异步 PTY |
| Storage | **SQLite + File System** | 本地优先，SQLite 索引 + 文件存储 |
| AI | **多模型 Provider 抽象** | 支持 Claude/GPT/DeepSeek/本地模型 |

### Table Stakes Features

**必须有的功能**:
- Markdown 存储和渲染
- Wiki 风格双向链接
- 全文搜索
- 命令执行和输出显示
- AI 聊天界面
- 多模型支持

### Key Differentiators

**竞争优势**:
- AI 自动关联知识（核心差异化）
- 知识图谱可视化
- 终端内容 → 知识库
- AI 查询知识库辅助操作
- AI 维护 wiki（LLM-Wiki 模式）

### Critical Pitfalls

| 风险 | 严重性 | 预防措施 |
|------|--------|----------|
| 工具调用安全 | Critical | 命令白名单 + 确认机制 |
| AI Context Rot | High | 每篇文章独立处理窗口 |
| 知识库 Ingest 质量 | High | 一份一份处理，分段处理长文档 |
| Token 限制 | High | 智能选择相关笔记 + 向量搜索 |
| 工具过载陷阱 | High | MVP 只做核心功能，插件可选 |

---

## Architecture Overview

```
Frontend (WebView)
├── Knowledge Views
├── Terminal Views
├── AI Chat Views
└── Control Panel
        ↓ Tauri IPC
Rust Backend
├── Knowledge Engine (存储、链接、图谱、搜索)
├── Terminal Engine (PTY、会话、主题)
├── AI Engine (多模型、对话、工具调用)
├── Automation Engine (脚本、定时、Android控制)
        ↓
Storage Layer (SQLite + Files + Vector DB)
```

---

## Build Order

1. **Foundation** - Tauri 骨架 + 基础 UI
2. **Knowledge Core** - 存储、Markdown、CRUD
3. **Terminal Core** - PTY、xterm.js、命令执行
4. **AI Integration** - 多模型、流式、聊天 UI
5. **Knowledge Advanced** - 链接、图谱、AI 自动关联
6. **Tool Calling** - 命令执行、文件操作、知识查询
7. **Automation** - 脚本库、定时任务、Android 控制
8. **Plugin System** - 插件 API 和加载器
9. **Cross-Platform** - Android 完善、Web 版本

---

## Key Design Principles

1. **本地优先** - 数据存储在本地，隐私可控
2. **极简工具** - 不追求复杂，够用就好
3. **AI 维护** - 知识库由 AI 维护，用户只阅读和提问
4. **紧密整合** - 四大功能域互相协作，而非独立存在
5. **安全第一** - 工具调用有防护，危险命令需确认

---

## Next Steps

研究阶段完成。下一步：
1. 定义详细需求（REQUIREMENTS.md）
2. 创建执行路线图（ROADMAP.md）
3. 开始 Phase 1 规划

---

## Research Files

| File | Content |
|------|---------|
| [STACK.md](STACK.md) | 技术栈选择和版本推荐 |
| [FEATURES.md](FEATURES.md) | 功能分类（Table Stakes/Differentiators/Anti-features） |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 组件架构和数据流 |
| [PITFALLS.md](PITFALLS.md) | 常见错误和预防措施 |

---
*Research synthesized: 2026-04-13*