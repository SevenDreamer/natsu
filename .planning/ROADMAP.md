# Roadmap: TermSuite

**Created:** 2026-04-13
**Project:** Rust + Tauri 跨平台 AI 知识终端
**Phases:** 8
**Requirements:** 25

---

## Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation | 项目骨架和基础 UI | KNOW-01~04 | 3 |
| 2 | Knowledge Advanced | 知识库高级功能 | KNOW-05~07 | 3 |
| 3 | Terminal Core | 终端核心功能 | TERM-01~04 | 4 |
| 4 | AI Integration | AI 对话基础和进阶 | AI-01~06 | 4 |
| 5 | AI Knowledge Integration | AI 与知识库整合 | AI-07~08 | 3 |
| 6 | Automation Core | 自动化基础功能 | AUTO-01~04 | 4 |
| 7 | Automation Advanced | 自动化高级功能 | AUTO-05~06 | 3 |
| 8 | Polish & Release | 完善和发布准备 | - | 4 |

---

## Phase 1: Foundation

**Goal:** 搭建 Tauri 项目骨架，实现知识库基础功能

**Requirements:** KNOW-01, KNOW-02, KNOW-03, KNOW-04

**Scope:**
- Tauri 2.x 项目初始化
- 基础 UI 框架（侧边栏、编辑区、预览区）
- Markdown 存储和编辑
- 双向链接解析 `[[note-name]]`
- 全文搜索（SQLite FTS5）
- raw/wiki/outputs 目录结构

**Success Criteria:**
1. User can create, edit, and save markdown notes
2. User can link notes using `[[wiki-link]]` syntax and see backlinks
3. User can search notes and find relevant content

**UI hint:** yes - 需要基础界面设计

---

## Phase 2: Knowledge Advanced

**Goal:** 实现知识库高级功能：AI 自动关联、知识图谱、AI 维护 wiki

**Requirements:** KNOW-05, KNOW-06, KNOW-07

**Scope:**
- AI 自动发现笔记关系（基于内容相似度、链接分析）
- 知识图谱可视化（D3.js/Cytoscape.js）
- AI 从 raw/ 提取概念，更新 wiki/
- 链接一致性检查

**Success Criteria:**
1. User can see AI-suggested related notes
2. User can view knowledge graph showing note relationships
3. User can add content to raw/ and AI automatically updates wiki pages

**UI hint:** yes - 知识图谱需要可视化

---

## Phase 3: Terminal Core

**Goal:** 实现终端核心功能并与知识库整合

**Requirements:** TERM-01, TERM-02, TERM-03, TERM-04

**Scope:**
- PTY 进程管理（tokio::process）
- xterm.js 集成
- 命令执行和输出显示
- 亮/暗主题切换
- 图片支持（Sixel/iTerm2 协议）
- 输出保存到知识库

**Success Criteria:**
1. User can execute shell commands and see output
2. User can switch between light and dark themes
3. User can see images inline in terminal
4. User can save terminal output to knowledge base with one click

**UI hint:** yes - 终端界面需要设计

---

## Phase 4: AI Integration

**Goal:** 集成 AI 对话功能，支持多模型、流式响应

**Requirements:** AI-01, AI-02, AI-03, AI-04, AI-05, AI-06

**Scope:**
- AI Provider 抽象层（Claude, GPT, DeepSeek, 本地模型）
- 聊天界面
- 流式响应
- 对话历史存储
- 代码理解和解释
- 上下文记忆

**Success Criteria:**
1. User can chat with AI and see streaming responses
2. User can switch between AI models
3. User can ask AI to explain code and get meaningful explanations
4. User can continue conversations with context from previous messages

**UI hint:** yes - 聊天界面需要设计

---

## Phase 5: AI Knowledge Integration

**Goal:** AI 工具调用和知识库查询整合

**Requirements:** AI-07, AI-08

**Scope:**
- AI 工具调用框架
- AI 执行终端命令（带安全确认）
- AI 查询知识库回答问题
- 上下文构建（选择相关笔记）

**Success Criteria:**
1. User can ask AI to execute terminal commands with confirmation
2. User can ask questions and AI retrieves relevant knowledge base content
3. Dangerous commands require explicit user approval

**UI hint:** yes - 工具调用确认界面

---

## Phase 6: Automation Core

**Goal:** 实现自动化基础功能

**Requirements:** AUTO-01, AUTO-02, AUTO-03, AUTO-04

**Scope:**
- 命令历史记录
- 脚本库管理
- 文件监控和操作
- API 调用功能

**Success Criteria:**
1. User can view and re-run previous commands
2. User can save and run scripts from script library
3. User can monitor file changes and perform file operations
4. User can make HTTP API calls from the application

**UI hint:** yes - 自动化面板需要设计

---

## Phase 7: Automation Advanced

**Goal:** 实现定时任务和 Android 系统控制

**Requirements:** AUTO-05, AUTO-06

**Scope:**
- 定时任务调度器
- 任务执行日志
- Android 蓝牙控制
- Android Wi-Fi 控制
- 其他 Android 系统设置控制

**Success Criteria:**
1. User can schedule scripts for timed execution
2. User can view task execution logs
3. User can control Bluetooth and Wi-Fi on Android devices

**UI hint:** yes - 定时任务管理界面

---

## Phase 8: Polish & Release

**Goal:** 完善细节、测试、打包发布

**Requirements:** (Cross-cutting, all features)

**Scope:**
- 性能优化
- 错误处理完善
- 用户文档
- 打包发布（桌面端）
- Android APK 构建
- 安装和更新机制

**Success Criteria:**
1. Application runs without critical bugs
2. User documentation is complete and accurate
3. Desktop installers work on Windows/macOS/Linux
4. Android APK installs and runs correctly

**UI hint:** no - 主要是后台工作

---

## Dependency Graph

```
Phase 1 (Foundation)
    ↓
Phase 2 (Knowledge Advanced)
    ↓
Phase 3 (Terminal Core) ←─┐
    ↓                      │
Phase 4 (AI Integration)  │
    ↓                      │
Phase 5 (AI Knowledge) ───┘
    ↓
Phase 6 (Automation Core)
    ↓
Phase 7 (Automation Advanced)
    ↓
Phase 8 (Polish & Release)
```

---

## Risk Mitigation

| Risk | Phase | Mitigation |
|------|-------|------------|
| 终端 PTY 跨平台问题 | Phase 3 | 使用成熟的 PTY 库，分平台测试 |
| AI Token 限制 | Phase 5 | 智能选择相关笔记，上下文压缩 |
| 工具调用安全 | Phase 5 | 命令白名单，危险命令确认 |
| Android 终端受限 | Phase 7 | 合理降级，明确功能边界 |

---
*Roadmap created: 2026-04-13*