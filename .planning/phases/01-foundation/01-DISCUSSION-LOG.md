# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 01-foundation
**Areas discussed:** Frontend Framework, UI Layout, Storage Location, Wiki-link Behavior, Editor

---

## Frontend Framework

| Option | Description | Selected |
|--------|-------------|----------|
| SvelteKit | Tauri 官方推荐，更轻量，编译后体积更小，学习曲线较平缓 | |
| React | 生态更大，社区资源更多，但打包体积会稍大 | ✓ |

**User's choice:** React
**Notes:** 用户明确选择 React，可能因熟悉度或生态考虑

---

## UI Layout

| Option | Description | Selected |
|--------|-------------|----------|
| 三栏布局 | 经典布局：左侧文件列表、中间编辑器、右侧预览区。稳定、熟悉 | |
| 上下分栏布局 | 类似 Notion/Obsidian，编辑器在上，预览可隐藏或悬浮。更简洁 | |
| 单栏切换布局 | 只有一个编辑区，预览通过点击切换。最简洁，但操作较多 | |

**User's choice:** 自定义响应式布局
**Notes:** 
- 移动端：聊天工具风格，侧边抽屉放其他内容
- 桌面端/Web端：三栏布局（左侧菜单、中间 AI 聊天、右侧预览/文件列表）
- 这符合核心理念：用户主要和 AI 对话，AI 帮你维护知识库

---

## Storage Location

| Option | Description | Selected |
|--------|-------------|----------|
| 用户自选目录 | 用户首次启动时选择目录，之后可改。更灵活 | ✓ |
| 应用默认目录 | 存在 App Data 目录（如 ~/.termsuite/）。简单，用户不用操心 | |
| 支持多个知识库 | 像 Obsidian 一样，每个目录都可以是独立的知识库。支持多知识库 | |

**User's choice:** 用户自选目录
**Notes:** 首次启动时选择，之后可在设置中修改

---

## Wiki-link: Case Sensitivity

| Option | Description | Selected |
|--------|-------------|----------|
| 大小写敏感 | 链接大小写必须匹配。严格，避免歧义 | ✓ (默认) |
| 大小写不敏感 | [[Note]] 和 [[note]] 指向同一文件。更宽松，用户体验更好 | (可设置) |

**User's choice:** 默认大小写敏感，可作为设置项
**Notes:** 支持中文链接

---

## Wiki-link: Auto-create

| Option | Description | Selected |
|--------|-------------|----------|
| 自动创建 | [[新笔记]] 会创建空笔记文件。类似 Obsidian | |
| 不自动创建 | [[不存在的笔记]] 显示为断链，需用户手动创建。更谨慎 | ✓ |

**User's choice:** 不自动创建
**Notes:** 断链显示为特殊样式，用户可手动创建

---

## Wiki-link: Suggestions

| Option | Description | Selected |
|--------|-------------|----------|
| 显示建议列表 | 输入 `[[` 后显示现有笔记列表，支持模糊匹配。更便捷 | ✓ |
| 不显示建议 | 用户完全手动输入。简单实现 | |

**User's choice:** 显示建议列表
**Notes:** 支持模糊匹配

---

## Editor

| Option | Description | Selected |
|--------|-------------|----------|
| 分栏实时预览 | 左边编辑 Markdown，右边实时预览。经典方式 | |
| 编辑/预览切换 | 单一编辑区，用快捷键或按钮切换预览。更简洁 | |
| 实时渲染编辑器 | 类似 Typora，编辑即预览，所见即所得。更现代 | ✓ |

**User's choice:** 实时渲染编辑器
**Notes:** 类似 Typora 的体验

---

## Claude's Discretion

- React 组件库选择
- 状态管理方案
- Markdown 编辑器库
- 样式方案

---

*Discussion completed: 2026-04-13*
