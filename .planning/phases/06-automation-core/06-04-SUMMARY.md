---
plan: "06-04"
phase: 6
name: "API Calls"
status: complete
completed_at: "2026-04-14"
requirements: ["AUTO-04"]
key_files:
  created:
    - "natsu/src-tauri/src/commands/api.rs"
    - "natsu/src-tauri/src/models/api.rs"
    - "natsu/src/components/automation/ApiCalls.tsx"
  modified:
    - "natsu/src-tauri/src/db/schema.rs"
    - "natsu/src-tauri/src/lib.rs"
    - "natsu/src-tauri/src/commands/mod.rs"
    - "natsu/src-tauri/Cargo.toml"
    - "natsu/src/components/automation/AutomationPanel.tsx"
    - "natsu/src/stores/automationStore.ts"
tasks_completed: 6
---

# Summary: API Calls

**Plan:** 06-04
**Phase:** 6 - Automation Core
**Requirement:** AUTO-04 - 用户可以从应用程序进行 HTTP API 调用

## What Was Built

### Backend (Rust/Tauri)
- **api_configs 表**: 存储 API 配置
- **api_history 表**: 存储请求历史
- **ApiConfig 模型**: API 配置结构（名称、方法、URL、认证等）
- **ApiHistoryEntry 模型**: 请求历史结构
- **10 个 Tauri 命令**:
  - `list_api_configs`: 列出所有配置
  - `get_api_config`: 获取单个配置
  - `create_api_config`: 创建新配置
  - `update_api_config`: 更新配置
  - `delete_api_config`: 删除配置
  - `execute_api_request`: 执行 HTTP 请求
  - `get_api_history`: 获取历史
  - `delete_api_history`: 删除历史条目
  - `clear_api_history`: 清空历史

### 模板变量
- `{{timestamp}}` - 当前时间戳
- `{{date}}` - 当前日期
- `{{datetime}}` - 当前日期时间
- `{{uuid}}` - UUID v4
- `{{random}}` - 随机数

### 认证支持
- None (无认证)
- Basic Auth (用户名/密码)
- Bearer Token
- API Key (header/query)

### Frontend (React/TypeScript)
- **ApiCalls 组件**: API 调用面板
  - 快速请求表单
  - 方法选择 (GET/POST/PUT/DELETE/PATCH)
  - URL 输入
  - 请求体编辑
  - 响应显示（状态码、时长、响应体）
  - 已保存配置列表
  - 请求历史（可展开）

## Success Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | 用户可以创建 API 请求配置 | ✅ create_api_config |
| 2 | 用户可以执行 HTTP 请求 | ✅ execute_api_request |
| 3 | 用户可以查看响应 | ✅ 响应面板 |
| 4 | 用户可以配置认证 | ✅ Basic/Bearer/API Key |
| 5 | 用户可以使用模板变量 | ✅ replace_variables |
| 6 | 用户可以查看请求历史 | ✅ get_api_history |

## Technical Notes

- 使用 reqwest 执行 HTTP 请求
- 响应自动保存到 SQLite 历史表
- 前端自动格式化 JSON 响应

---

*Completed: 2026-04-14*
