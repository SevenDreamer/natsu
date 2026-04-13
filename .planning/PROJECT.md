# TermSuite

## What This Is

一个 AI 驱动的个人知识终端，整合了 LLM-Wiki 风格知识库、现代终端、AI 对话和自动化控制功能。使用 Rust + Tauri 构建，支持桌面端、Android 和 Web 平台。

核心理念：LLM 维护知识库，你只阅读和提问——知识是持久化、可积累的。

## Core Value

**AI 自动关联的知识库**——存进去，AI 帮你整理、关联、检索。所有内容（笔记、代码、终端输出、AI对话）都被智能组织，无需手动分类。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] LLM-Wiki 风格知识库（AI 增量维护、持久化 wiki）
- [ ] 双向链接（笔记之间自动关联）
- [ ] 知识图谱可视化（展示内容关系网络）
- [ ] 本地存储（数据本地、隐私可控）
- [ ] 插件生态（可扩展功能）
- [ ] 现代终端（多标签、分屏、主题、图片支持）
- [ ] AI 对话（多模型支持、代码理解、上下文记忆）
- [ ] 工具调用（执行终端命令、操作文件）
- [ ] 自动化控制（命令执行、文件操作、API调用、Android系统控制）
- [ ] 紧密整合（终端内容存入知识库、AI查询知识库辅助操作）

### Out of Scope

- 实时协作功能 — 个人工具，暂不需要多人协作
- 云同步服务 — 先做本地优先，云同步后续考虑
- 移动端复杂终端 — Android 端先做基础功能，桌面端优先

## Context

### 灵感来源

- **LLM-Wiki (Karpathy)**: AI 增量构建和维护持久化 wiki，三层架构（Raw → Wiki → Human）
- **Obsidian**: 双向链接、知识图谱、本地存储、插件生态
- **Blinko**: 简洁现代的界面设计参考
- **WezTerm**: 现代终端特性（多标签、分屏、图片支持）
- **Termux**: Android 终端功能参考
- **Claude Code**: AI 理解代码、上下文记忆、工具调用
- **OpenClaw**: 自动化控制参考

### 技术背景

- Rust + Tauri 技术栈
- 目标平台：桌面（Windows/macOS/Linux）、Android、Web
- 开发者愿意学习新技术

### 使用场景

- 开发者日常工作（编程、脚本、系统管理）
- 知识工作者研究记录（笔记、文档、知识管理）
- 个人工具，边做边用，迭代改进

## Constraints

- **技术栈**: Rust + Tauri — 已确定，愿意学习
- **开发节奏**: 边用边做，迭代改进
- **MVP目标**: 功能完整的第一版
- **界面风格**: 简洁现代、Markdown为主、GitHub风格简约

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LLM-Wiki 作为知识库核心 | Karpathy 的模式让 AI 承担维护成本，知识可积累 | — Pending |
| Rust + Tauri 技术栈 | 跨平台、性能好、愿意学习新技术 | — Pending |
| 紧密整合模式 | 终端内容可存入知识库，AI 可查询知识库辅助操作 | — Pending |
| 本地优先存储 | 隐私可控，符合 Obsidian 设计理念 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after initialization*