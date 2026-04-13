# Features Research: TermSuite

**Research Date:** 2026-04-13
**Domain:** Knowledge terminal app with AI integration
**Confidence:** High

## Executive Summary

TermSuite 整合了四大功能域：知识库、终端、AI 对话、自动化控制。以下是功能分类和优先级。

---

## TABLE STAKES (Must Have)

### Knowledge Base

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Markdown Storage** | 本地存储笔记为 .md 文件 | Low |
| **Wiki-style Links** | `[[note-name]]` 双向链接语法 | Medium |
| **Full-text Search** | 搜索所有笔记内容 | Medium |
| **Folder Structure** | raw/wiki/outputs 三层架构 | Low |
| **Markdown Rendering** | 正确显示 Markdown 格式 | Low |

### Terminal

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Command Execution** | 执行 shell 命令 | Medium |
| **Output Display** | 显示命令输出 | Low |
| **Basic Themes** | 至少支持亮/暗主题 | Low |
| **Copy/Paste** | 复制粘贴命令和输出 | Low |

### AI Chat

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Chat Interface** | 基本的聊天 UI | Low |
| **Model Selection** | 选择不同的 AI 模型 | Medium |
| **Streaming Response** | 流式显示 AI 回复 | Medium |
| **Chat History** | 保存对话历史 | Low |

### Automation

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Command History** | 保存执行过的命令 | Low |
| **File Browser** | 浏览本地文件 | Medium |

---

## DIFFERENTIATORS (Competitive Advantage)

### Knowledge Base

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **AI Auto-linking** | AI 自动发现并创建链接关系 | High | ⭐⭐⭐ |
| **Knowledge Graph** | 可视化笔记关系网络 | High | ⭐⭐⭐ |
| **AI Maintenance** | AI 自动整理、更新 wiki | High | ⭐⭐⭐ |
| **Vector Search** | 语义搜索，找相关内容 | High | ⭐⭐ |
| **Bi-directional Links** | 双向链接，看到反向引用 | Medium | ⭐⭐⭐ |
| **Plugin System** | 扩展功能 | High | ⭐⭐ |

### Terminal

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **Multi-tab** | 多个终端标签页 | Medium | ⭐⭐ |
| **Split Panes** | 分屏显示多个终端 | High | ⭐⭐ |
| **Image Support** | 终端内显示图片（Sixel/iTerm2） | High | ⭐⭐ |
| **Rich Themes** | 自定义颜色、字体 | Medium | ⭐ |
| **Output to Wiki** | 一键将输出保存到知识库 | Medium | ⭐⭐⭐ |

### AI Chat

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **Multi-model** | Claude、GPT、DeepSeek 等 | Medium | ⭐⭐ |
| **Code Understanding** | 理解代码、解释逻辑 | High | ⭐⭐⭐ |
| **Context Memory** | 记住历史对话上下文 | Medium | ⭐⭐ |
| **Tool Calling** | 执行命令、操作文件 | High | ⭐⭐⭐ |
| **Knowledge Query** | 从知识库检索信息回答 | High | ⭐⭐⭐ |
| **Chat to Wiki** | 将对话保存到知识库 | Medium | ⭐⭐⭐ |

### Automation

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **Script Library** | 保存常用脚本 | Medium | ⭐⭐ |
| **Scheduled Tasks** | 定时执行任务 | High | ⭐⭐ |
| **Android Control** | 蓝牙、Wi-Fi 等系统控制 | High | ⭐⭐⭐ |
| **API Workflows** | 调用外部 API | Medium | ⭐⭐ |

### Integration

| Feature | Description | Complexity | Value |
|---------|-------------|------------|-------|
| **Terminal → Wiki** | 终端内容存入知识库 | Medium | ⭐⭐⭐ |
| **AI → Terminal** | AI 执行终端命令 | High | ⭐⭐⭐ |
| **AI → Wiki** | AI 维护知识库 | High | ⭐⭐⭐ |
| **Wiki → AI Context** | AI 查询知识库辅助回答 | High | ⭐⭐⭐ |

---

## ANTI-FEATURES (Deliberately NOT Building)

| Feature | Reason |
|---------|--------|
| **Real-time Collaboration** | 个人工具，暂不需要多人协作 |
| **Cloud Sync (MVP)** | 本地优先，云同步后续考虑 |
| **Complex Permissions** | 单用户场景不需要 |
| **Mobile Complex Terminal** | Android 端先做基础功能 |
| **Social Features** | 个人知识管理，不需要社交 |
| **Notion-like Database Views** | 增加复杂度，Markdown 足够 |
| **AI Training/Fine-tuning** | 使用现有模型 API 即可 |

---

## Feature Dependencies

```
知识库基础 (Markdown、存储)
    ↓
双向链接
    ↓
知识图谱 ←── AI 自动关联
    ↓
AI 对话集成
    ↓
工具调用 ←── 知识库查询
    ↓
终端集成
    ↓
自动化控制
```

---

## Complexity Assessment

| Domain | MVP Scope | Full Scope | Notes |
|--------|-----------|------------|-------|
| Knowledge Base | Medium | High | 核心功能，需要重点投入 |
| Terminal | Medium | High | xterm.js 成熟，集成成本可控 |
| AI Chat | Medium | High | API 调用简单，工具调用复杂 |
| Automation | Low | Medium | 基础功能简单，高级功能需要设计 |
| Integration | Medium | High | 这是核心差异化，需要仔细设计 |

---
*Research synthesized from: Obsidian, LLM-Wiki, WezTerm, Termux, Claude Code patterns*