# Phase 6: Automation Core - Research

**Gathered:** 2026-04-14
**Phase:** 6 - Automation Core
**Requirements:** AUTO-01, AUTO-02, AUTO-03, AUTO-04

---

## Domain Analysis

### Phase Boundary

Phase 6 实现自动化基础功能，包括：
- 命令历史记录 (AUTO-01)
- 脚本库管理 (AUTO-02)
- 文件监控和操作 (AUTO-03)
- API 调用功能 (AUTO-04)

**Out of Scope:**
- 定时任务调度 (Phase 7)
- Android 系统控制 (Phase 7)
- AI 工具调用扩展 (已在 Phase 5 完成)

---

## Existing Architecture

### Key Integration Points

| Component | Location | Relevance |
|-----------|----------|-----------|
| Terminal Commands | `natsu/src-tauri/src/commands/terminal.rs` | 命令历史直接关联 |
| Execute Command Tool | `natsu/src-tauri/src/ai/tools/execute_command.rs` | 已有命令执行框架，可复用 |
| PTY Manager | `natsu/src-tauri/src/terminal/` | 终端会话管理 |
| Database Schema | `natsu/src-tauri/src/db/schema.rs` | 需要扩展新表 |
| Frontend Layout | `natsu/src/components/layout/` | 新增自动化面板 |
| Scheduler | `natsu/src-tauri/src/scheduler/mod.rs` | 已有基础调度框架 |

### Current Tech Stack

- **Backend:** Rust + Tauri 2.x
- **Database:** SQLite (rusqlite)
- **Frontend:** React + TypeScript + Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** Zustand
- **Async Runtime:** tokio
- **HTTP Client:** reqwest (已安装)

---

## Implementation Research

### AUTO-01: Command History

**方案：扩展现有 terminal 模块**

```rust
// 新增数据库表
CREATE TABLE IF NOT EXISTS command_history (
    id TEXT PRIMARY KEY,
    command TEXT NOT NULL,
    working_directory TEXT,
    exit_code INTEGER,
    duration_ms INTEGER,
    executed_at INTEGER NOT NULL,
    session_id TEXT  -- 关联终端会话
);

CREATE INDEX IF NOT EXISTS idx_command_history_time ON command_history(executed_at DESC);
```

**实现要点：**
1. 在 `terminal.rs` 中添加历史记录逻辑
2. 每次 PTY 命令执行后记录
3. 提供查询、删除、清空 API
4. 前端展示历史列表，支持搜索过滤

**参考实现：** iTerm2 的 Shell Integration

### AUTO-02: Script Library

**方案：文件系统 + SQLite 元数据**

```rust
// 脚本元数据表
CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    script_path TEXT NOT NULL,
    interpreter TEXT,  -- bash, python, node, etc.
    tags TEXT,         -- JSON array
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

**实现要点：**
1. 脚本存储在 `scripts/` 目录下
2. SQLite 存储元数据和标签
3. 支持 run/schedule/export/import
4. 复用 `ExecuteCommandTool` 的安全检查机制
5. 支持参数化脚本 (变量替换)

**安全考虑：**
- 复用 Phase 5 的命令安全分类
- 危险脚本需要确认才能运行
- 支持脚本签名验证 (可选)

### AUTO-03: File Monitoring

**方案：notify crate + 事件系统**

```toml
# Cargo.toml 添加
notify = "6"
```

```rust
// 文件监控配置表
CREATE TABLE IF NOT EXISTS file_watchers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    recursive INTEGER DEFAULT 1,
    event_types TEXT,  -- JSON: ["create", "modify", "delete"]
    enabled INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);

// 文件事件日志
CREATE TABLE IF NOT EXISTS file_events (
    id TEXT PRIMARY KEY,
    watcher_id TEXT,
    event_type TEXT NOT NULL,
    path TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (watcher_id) REFERENCES file_watchers(id)
);
```

**实现要点：**
1. 使用 `notify` crate 监控文件系统
2. 通过 Tauri events 通知前端
3. 支持触发脚本执行（文件变更时运行脚本）
4. 文件操作：复制、移动、删除、重命名

**文件操作 API：**
- `file_copy(src, dest)`
- `file_move(src, dest)`
- `file_delete(path)`
- `file_rename(old, new)`
- `file_read(path)` → 已有 `tauri-plugin-fs`

### AUTO-04: API Calls

**方案：reqwest + 请求配置存储**

```rust
// API 请求配置表
CREATE TABLE IF NOT EXISTS api_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    method TEXT NOT NULL,  -- GET, POST, PUT, DELETE
    url TEXT NOT NULL,
    headers TEXT,          -- JSON object
    body_template TEXT,    -- 支持变量替换
    auth_type TEXT,        -- none, basic, bearer, api_key
    auth_config TEXT,      -- JSON
    created_at INTEGER NOT NULL
);

// API 调用历史
CREATE TABLE IF NOT EXISTS api_history (
    id TEXT PRIMARY KEY,
    config_id TEXT,
    url TEXT NOT NULL,
    method TEXT NOT NULL,
    request_body TEXT,
    response_status INTEGER,
    response_body TEXT,
    duration_ms INTEGER,
    executed_at INTEGER NOT NULL,
    FOREIGN KEY (config_id) REFERENCES api_configs(id)
);
```

**实现要点：**
1. 复用已有的 `reqwest` 依赖
2. 支持模板变量 (如 `{{timestamp}}`, `{{random}}`)
3. 请求/响应历史记录
4. 错误处理和重试机制
5. 支持导入 Postman/Insomnia 集合 (可选)

---

## UI Design Reference

### Automation Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 自动化                                                       │
├─────────────────────────────────────────────────────────────┤
│ [命令历史] [脚本库] [文件监控] [API调用]                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 搜索/过滤                                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  列表区域                                                   │
│  - 每个条目一行                                             │
│  - 悬浮显示详情                                             │
│  - 右键菜单操作                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 详情面板                                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ 新建]  [▶ 运行]  [✎ 编辑]  [🗑 删除]                     │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```
src/components/automation/
├── AutomationPanel.tsx      # 主面板
├── CommandHistory.tsx       # 命令历史标签页
├── ScriptLibrary.tsx        # 脚本库标签页
├── FileWatchers.tsx         # 文件监控标签页
├── ApiCalls.tsx             # API 调用标签页
├── ScriptEditor.tsx         # 脚本编辑对话框
├── ApiConfigEditor.tsx      # API 配置编辑器
└── ConfirmationDialog.tsx   # 危险操作确认（复用 Phase 5）
```

---

## Validation Architecture

### AUTO-01: Command History

| Test | Method | Criteria |
|------|--------|----------|
| 记录命令 | Integration | 执行命令后自动记录 |
| 查询历史 | Unit | 按时间/关键词搜索 |
| 重新执行 | Integration | 从历史运行命令 |
| 清空历史 | Unit | 确认后清空 |

### AUTO-02: Script Library

| Test | Method | Criteria |
|------|--------|----------|
| 创建脚本 | Integration | 保存到文件+数据库 |
| 运行脚本 | Integration | 正确执行，记录输出 |
| 安全检查 | Unit | 危险脚本需确认 |
| 参数化 | Unit | 变量正确替换 |

### AUTO-03: File Monitoring

| Test | Method | Criteria |
|------|--------|----------|
| 监控启动 | Integration | 监控指定目录 |
| 事件通知 | Integration | 文件变更触发事件 |
| 触发脚本 | Integration | 变更触发脚本执行 |
| 文件操作 | Unit | 正确执行操作 |

### AUTO-04: API Calls

| Test | Method | Criteria |
|------|--------|----------|
| 发送请求 | Integration | 正确发送 HTTP 请求 |
| 模板替换 | Unit | 变量正确替换 |
| 历史记录 | Unit | 请求/响应记录完整 |
| 错误处理 | Integration | 超时/错误正确处理 |

---

## Dependencies

### New Rust Crates

```toml
[dependencies]
# File system monitoring
notify = "6"

# JSON path for template variables (optional)
jsonpath-rust = "0.5"
```

### No New Frontend Dependencies

所有需要的 UI 组件已在 Phase 1-5 引入：
- shadcn/ui 组件
- lucide-react 图标
- Zustand 状态管理

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 文件监控性能 | 使用 debouncing，限制监控范围 |
| 脚本执行安全 | 复用 Phase 5 安全分类，沙箱选项 |
| API 调用超时 | 配置超时，支持取消 |
| 历史数据增长 | 定期清理旧记录，分页查询 |

---

## Recommended Plan Order

| Wave | Plans | Dependencies |
|------|-------|--------------|
| 1 | AUTO-01 (Command History) | 无 |
| 1 | AUTO-04 (API Calls) | 无 |
| 2 | AUTO-02 (Script Library) | AUTO-01 (复用命令执行) |
| 2 | AUTO-03 (File Monitoring) | AUTO-02 (触发脚本) |

---

## References

- [notify crate](https://docs.rs/notify/latest/notify/)
- [reqwest documentation](https://docs.rs/reqwest/latest/reqwest/)
- [Tauri Events](https://tauri.app/v2/guides/handle-events/)
- [iTerm2 Shell Integration](https://iterm2.com/documentation-shell-integration.html)

---

*Research completed: 2026-04-14*
