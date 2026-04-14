---
plan: "06-02"
phase: 6
name: "Script Library"
status: complete
completed_at: "2026-04-14"
requirements: ["AUTO-02"]
key_files:
  created:
    - "natsu/src-tauri/src/commands/script.rs"
    - "natsu/src-tauri/src/models/script.rs"
    - "natsu/src/components/automation/ScriptLibrary.tsx"
    - "natsu/src/components/automation/ScriptEditor.tsx"
  modified:
    - "natsu/src-tauri/src/db/schema.rs"
    - "natsu/src-tauri/src/commands/mod.rs"
    - "natsu/src-tauri/src/lib.rs"
    - "natsu/src-tauri/src/models/mod.rs"
    - "natsu/src/components/automation/AutomationPanel.tsx"
    - "natsu/src/stores/automationStore.ts"
tasks_completed: 6
commits:
  - "04368a1 - feat(06-02): implement script library backend"
  - "45ca6ed - feat(06-02): implement script library frontend"
---

# Summary: Script Library

**Plan:** 06-02
**Phase:** 6 - Automation Core
**Requirement:** AUTO-02 - 用户可以从脚本库保存和运行脚本

## What Was Built

### Backend (Rust/Tauri)
- **scripts 表**: SQLite 表存储脚本元数据
- **Script 模型**: 脚本结构（名称、描述、路径、解释器、标签、参数）
- **ScriptParameter**: 参数定义（名称、描述、默认值、是否必填）
- **8 个 Tauri 命令**:
  - `list_scripts`: 列出所有脚本
  - `get_script`: 获取单个脚本
  - `get_script_content`: 获取脚本内容
  - `create_script`: 创建新脚本
  - `update_script`: 更新脚本
  - `delete_script`: 删除脚本
  - `get_script_safety`: 获取安全分析
  - `execute_script`: 执行脚本

### 脚本安全分析
检测危险模式：
- 递归删除 (rm -rf)
- Fork bomb
- 直接磁盘操作
- 远程脚本执行 (curl | bash)

### 参数替换
- `{{param_name}}` 格式
- 执行时自动替换参数值

### 多解释器支持
- bash/sh (默认)
- python
- node
- ruby
- perl

### Frontend (React/TypeScript)
- **ScriptLibrary 组件**: 脚本库面板
  - 脚本列表（带搜索、标签筛选）
  - 执行按钮（带安全确认）
  - 执行结果显示
  - 新建/编辑/删除操作
- **ScriptEditor 组件**: 脚本编辑器
  - 名称、描述输入
  - 解释器选择
  - 标签管理
  - 参数定义
  - 代码编辑器

## Success Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | 用户可以创建新脚本 | ✅ create_script |
| 2 | 用户可以编辑已有脚本 | ✅ update_script |
| 3 | 用户可以保存脚本到脚本库 | ✅ SQLite 存储 |
| 4 | 用户可以运行脚本（带安全确认） | ✅ execute_script + safety check |
| 5 | 用户可以为脚本添加标签分类 | ✅ tags 字段 |
| 6 | 用户可以使用参数化脚本 | ✅ parameters + {{param}} |

## Deviations

无偏离，按计划实现。

---

*Completed: 2026-04-14*
