# Phase 1: Foundation - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

搭建 Tauri 项目骨架，实现知识库基础功能：
- Tauri 2.x 项目初始化（Rust 后端 + React 前端）
- 基础 UI 框架（响应式三栏布局）
- Markdown 存储和编辑
- 双向链接解析 `[[note-name]]`
- 全文搜索（SQLite FTS5）
- raw/wiki/outputs 目录结构

**不包含：** AI 对话功能、终端功能、自动化功能（属于后续阶段）

</domain>

<decisions>
## Implementation Decisions

### Frontend Framework
- **D-01:** 使用 React 作为前端框架（用户明确选择）
- **D-02:** 使用 TypeScript 进行类型安全开发

### UI Layout
- **D-03:** 桌面端/Web端采用三栏布局：
  - 左侧：菜单栏（导航、设置等）
  - 中间：AI 聊天界面（主交互区）
  - 右侧：预览区/文件列表
- **D-04:** 移动端采用聊天工具风格：
  - 主界面：AI 聊天
  - 侧边抽屉：文件列表、设置等其他功能
- **D-05:** 布局响应式设计，根据屏幕宽度自动切换布局模式

### Storage
- **D-06:** 知识库存储位置由用户首次启动时自选
- **D-07:** 用户可随时更改存储位置（设置中提供选项）
- **D-08:** raw/wiki/outputs 目录结构在用户选择的知识库根目录下创建

### Wiki-link Behavior
- **D-09:** 链接解析默认大小写敏感
- **D-10:** 提供"大小写不敏感"选项（用户可在设置中切换）
- **D-11:** 支持中文链接（如 `[[我的笔记]]`）
- **D-12:** 链接到不存在的笔记时，显示为断链，不自动创建
- **D-13:** 输入 `[[` 时显示现有笔记建议列表，支持模糊匹配

### Editor
- **D-14:** 采用实时渲染编辑器（类似 Typora，编辑即预览）
- **D-15:** Markdown 渲染样式采用 GitHub 风格简约风格

### Claude's Discretion
- 具体的 React 组件库选择（如 shadcn/ui, Ant Design 等）
- 状态管理方案（如 Zustand, Redux Toolkit 等）
- 具体的 Markdown 编辑器库选择
- 样式方案（CSS Modules, Tailwind, styled-components 等）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Level
- `.planning/PROJECT.md` — 项目愿景、核心理念、约束条件
- `.planning/REQUIREMENTS.md` — 需求定义，Phase 1 覆盖 KNOW-01~04
- `.planning/ROADMAP.md` — 路线图，Phase 1 定义和成功标准

### Technical Stack
- `CLAUDE.md` — 技术栈决策（Rust + Tauri, xterm.js, SQLite 等）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 无（新项目，从零开始）

### Established Patterns
- 无（新项目，Phase 1 将建立初始模式）

### Integration Points
- Tauri 前后端通信：使用 Tauri 的 `invoke` API 进行 Rust 后端调用
- 知识库文件操作：通过 Rust 后端进行文件系统操作
- SQLite 操作：通过 Rust 后端使用 rusqlite 或 sqlx 进行数据库操作

</code_context>

<specifics>
## Specific Ideas

- 布局灵感：类似 Obsidian 的知识库管理方式，但以 AI 聊天为主要交互入口
- 编辑器灵感：类似 Typora 的实时渲染体验
- 整体风格：简洁现代、GitHub 风格简约

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---
*Phase: 01-foundation*
*Context gathered: 2026-04-13*
