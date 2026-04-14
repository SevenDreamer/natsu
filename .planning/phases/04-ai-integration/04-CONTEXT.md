# Phase 4: AI Integration - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

实现 AI 对话功能并与现有基础架构整合：
- 聊天界面组件
- 对话历史存储
- 流式响应显示
- 多轮对话上下文
- 代码理解和解释

**不包含：** 工具调用（AI 执行命令、查询知识库）— 属于 Phase 5

</domain>

<decisions>
## Implementation Decisions

### 聊天界面 (AI-01)

- **D-01:** 使用消息列表组件渲染对话
  - 用户消息和 AI 消息区分显示
  - 支持 Markdown 渲染（代码高亮）
  - 流式响应实时更新

- **D-02:** 输入框支持多行文本
  - 快捷键发送（Enter 发送，Shift+Enter 换行）
  - 支持代码块粘贴

### 流式响应 (AI-03)

- **D-03:** 复用 Phase 2 的 Tauri events
  - `ai-chunk` - 接收响应片段
  - `ai-complete` - 响应完成
  - `ai-error` - 错误处理

- **D-04:** 流式文本实时追加到消息内容
  - 使用状态管理追踪当前流式响应
  - 完成后保存到历史

### 对话历史 (AI-04)

- **D-05:** 使用 SQLite 存储对话历史
  - conversations 表：id, title, created_at, updated_at
  - messages 表：id, conversation_id, role, content, created_at

- **D-06:** 侧边栏显示对话列表
  - 最新对话在前
  - 支持搜索历史对话
  - 支持删除对话

### 上下文记忆 (AI-06)

- **D-07:** 发送消息时包含最近 N 条历史消息
  - 默认 N = 10（可配置）
  - 超出 token 限制时自动截断旧消息

- **D-08:** 每个对话独立维护上下文
  - 切换对话时加载对应历史

### 代码理解 (AI-05)

- **D-09:** 支持「解释代码」功能
  - 从编辑器选中代码
  - 右键菜单「让 AI 解释」
  - 自动注入代码上下文

- **D-10:** 代码块自动检测语言
  - 使用代码高亮显示

### Claude's Discretion

- 消息组件的具体布局和样式
- 流式响应的光标动画
- 对话历史的分页加载策略
- Token 计数和限制逻辑

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Level
- `.planning/PROJECT.md` — 项目愿景、核心理念、约束条件
- `.planning/research/STACK.md` — 技术栈决策

### Phase Context
- `.planning/phases/02-knowledge-advanced/02-CONTEXT.md` — AI Provider 基础架构

### Existing Implementation
- `natsu/src-tauri/src/ai/provider.rs` — Provider 抽象
- `natsu/src-tauri/src/commands/ai.rs` — Tauri commands
- `natsu/src/stores/aiStore.ts` — 前端状态

### External Docs
- Anthropic API: https://docs.anthropic.com/
- OpenAI API: https://platform.openai.com/docs/

</canonical_refs>

<specifics>
## Specific Ideas

- 对话支持重命名
- AI 消息支持复制
- 支持重新生成响应
- 停止生成按钮

</specifics>

<deferred>
## Deferred Ideas

- AI 工具调用 (AI-07, AI-08) — Phase 5
- 多模型对比响应 — v2
- 对话导出 — v2

</deferred>

---

*Phase: 04-ai-integration*
*Context gathered: 2026-04-14*
