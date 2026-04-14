# Phase 5: AI Knowledge Integration - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

实现 AI 工具调用功能，让 AI 能够：
- 执行终端命令（带用户确认）
- 查询知识库回答问题

**不包含：** 自动化脚本库、定时任务（属于 Phase 6-7）

</domain>

<decisions>
## Implementation Decisions

### 工具调用框架 (AI-07, AI-08)

- **D-01:** 使用 Anthropic/Claude 工具调用 API
  - 定义工具 schema (name, description, input_schema)
  - AI 返回 tool_use 响应时触发执行
  - 执行结果反馈给 AI 继续对话

- **D-02:** 工具分为两类
  - 安全工具：知识库查询（自动执行）
  - 危险工具：终端命令（需用户确认）

### 终端命令工具 (AI-07)

- **D-03:** `execute_command` 工具定义
  ```json
  {
    "name": "execute_command",
    "description": "Execute a shell command in the terminal",
    "input_schema": {
      "type": "object",
      "properties": {
        "command": { "type": "string" },
        "timeout": { "type": "integer", "default": 30000 }
      },
      "required": ["command"]
    }
  }
  ```

- **D-04:** 危险命令需要确认
  - 白名单：安全命令列表（ls, cat, pwd, echo 等）
  - 黑名单：危险命令（rm -rf, sudo, chmod 等）
  - 其他：提示用户确认

### 知识库查询工具 (AI-08)

- **D-05:** `query_knowledge_base` 工具定义
  ```json
  {
    "name": "query_knowledge_base",
    "description": "Search and retrieve content from the knowledge base",
    "input_schema": {
      "type": "object",
      "properties": {
        "query": { "type": "string" },
        "limit": { "type": "integer", "default": 5 }
      },
      "required": ["query"]
    }
  }
  ```

- **D-06:** 查询执行流程
  - 使用全文搜索找到相关笔记
  - 返回笔记标题和内容摘要
  - AI 根据内容回答用户问题

### 安全确认 UI

- **D-07:** 确认对话框设计
  - 显示工具名称和参数
  - 显示命令内容（高亮危险部分）
  - 用户选择：执行、取消、修改命令

- **D-08:** 工具执行状态显示
  - 执行中：显示进度/输出
  - 完成：显示结果摘要
  - 错误：显示错误信息

### Claude's Discretion

- 工具调用与现有 Provider 抽象的整合方式
- 具体的安全命令白名单
- 结果格式化细节

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Level
- `.planning/PROJECT.md` — 项目愿景、核心理念、约束条件
- `.planning/REQUIREMENTS.md` — AI-07, AI-08 需求详情

### Phase Context
- `.planning/phases/02-knowledge-advanced/02-CONTEXT.md` — AI Provider 基础架构
- `.planning/phases/04-ai-integration/04-CONTEXT.md` — 聊天界面和对话管理

### Existing Implementation
- `natsu/src-tauri/src/ai/provider.rs` — Provider 抽象
- `natsu/src-tauri/src/commands/ai.rs` — AI commands
- `natsu/src-tauri/src/commands/terminal.rs` — Terminal commands
- `natsu/src/stores/chatStore.ts` — Chat state

### External Docs
- Anthropic Tool Use: https://docs.anthropic.com/en/docs/build-with-claude/tool-use

</canonical_refs>

<specifics>
## Specific Ideas

- 工具执行历史记录
- 执行结果自动保存到知识库选项
- 批量命令执行
- 工具权限设置（哪些工具自动执行）

</specifics>

<deferred>
## Deferred Ideas

- 文件操作工具（AI-09）— v2
- API 调用工具 — v2
- 自定义工具定义 — v2

</deferred>

---

*Phase: 05-ai-knowledge*
*Context gathered: 2026-04-14*