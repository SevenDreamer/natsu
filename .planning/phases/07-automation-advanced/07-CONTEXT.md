# Phase 7: Automation Advanced - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

实现定时任务调度和 Android 系统控制功能：
- 定时任务调度器 (AUTO-05)
- 任务执行日志
- Android 蓝牙/Wi-Fi/亮度/音量控制 (AUTO-06)

**不包含：** 其他 Android 系统控制（飞行模式、移动数据等）— 留待后续版本

</domain>

<decisions>
## Implementation Decisions

### 定时任务调度模式 (AUTO-05)

- **D-01:** 混合调度模式
  - 支持简单间隔（每 N 分钟/小时执行）
  - 支持 cron 表达式（每天 9:00 执行等复杂调度）
  - UI 提供两种模式切换

- **D-02:** 任务可关联多种资源
  - 脚本（复用 Phase 6 Script Library）
  - 命令（直接执行 shell 命令）
  - API 调用（复用 Phase 6 API Calls）
  - 每种资源类型的安全检查分别处理

- **D-03:** 失败重试策略由用户配置
  - 每个任务可设置：是否重试、重试次数、重试间隔
  - 默认：不重试，仅记录失败日志
  - 间隔可设置递增策略（首次 1 分钟，后续翻倍等）

### Android 系统控制 (AUTO-06)

- **D-04:** MVP 控制范围 — 核心 4 项
  - 蓝牙：开启/关闭、查看已连接设备、设备名称
  - Wi-Fi：开启/关闭、查看连接状态、SSID
  - 屏幕亮度：调节亮度等级
  - 媒体音量：调节音量等级（考虑静音/勿扰模式）

- **D-05:** 平台检测使用自定义 Rust 代码
  - 使用 `cfg(target_os = "android")` 编译时检测
  - 或运行时检测 `std::env::consts::OS`
  - 提供 `is_android()` 工具函数供前端调用

- **D-06:** 桌面端处理方式
  - 显示 Android 控制相关 UI
  - 点击时弹出提示："请在 Android 设备上使用此功能"
  - 控制项在桌面端显示为禁用状态

### UI 设计

- **D-07:** 定时任务 UI 集成
  - 在 AutomationPanel 新增"定时任务"Tab
  - 与现有的命令历史、脚本库、文件监控、API 调用同级

- **D-08:** 任务执行状态展示 — 实时监控
  - 显示正在执行的任务列表
  - 实时输出流（类似终端体验）
  - 每次执行结果、耗时统计

- **D-09:** Android 控制面板位置
  - 在 AutomationPanel 新增"系统控制"Tab
  - 仅在 Android 平台启用，桌面端显示但禁用

### 通知机制

- **D-10:** 任务完成/失败通知
  - 应用内通知：所有任务完成时显示 toast/banner
  - 系统通知：任务执行失败时发送系统通知
  - 使用 Tauri 通知 API

### Claude's Discretion

- cron 表达式解析库选择
- Android 权限声明方式
- 实时输出的技术实现（WebSocket vs SSE vs Tauri Events）
- 具体的重试间隔递增算法

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Level
- `.planning/PROJECT.md` — 项目愿景、核心理念、约束条件
- `.planning/REQUIREMENTS.md` — AUTO-05, AUTO-06 需求详情

### Phase Context
- `.planning/phases/06-automation-core/06-RESEARCH.md` — 自动化基础架构、数据库设计参考
- `.planning/phases/05-ai-knowledge/05-CONTEXT.md` — 工具调用安全框架

### Existing Implementation
- `natsu/src-tauri/src/scheduler/mod.rs` — 现有调度框架（可扩展）
- `natsu/src/stores/automationStore.ts` — 自动化状态管理
- `natsu/src/components/automation/AutomationPanel.tsx` — 自动化面板
- `natsu/src/components/automation/ScriptLibrary.tsx` — 脚本库组件
- `natsu/src/components/automation/ApiCalls.tsx` — API 调用组件

### External Docs
- Tauri Android: https://v2.tauri.app/reference/android/
- Tauri Notifications: https://v2.tauri.app/plugin/notifications/
- cron crate: https://docs.rs/cron/latest/cron/

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scheduler/mod.rs`: tokio::interval 调度框架 — 可扩展为通用任务调度器
- `automationStore`: Zustand 状态管理 — 可添加 scheduledTasks 和 androidControl 状态
- `AutomationPanel`: Tab 面板结构 — 可添加"定时任务"和"系统控制"Tab
- Script/API 安全检查机制 — 可复用于定时任务执行

### Established Patterns
- 数据库表设计：使用 SQLite + 索引优化
- 前后端通信：Tauri invoke + Events
- 状态管理：Zustand store 模式
- 安全确认：复用 Phase 5 的 ConfirmationDialog

### Integration Points
- 定时任务可触发脚本执行 → Script Library
- 定时任务可触发 API 调用 → API Calls
- Android 控制需要 Tauri Android 插件

</code_context>

<specifics>
## Specific Ideas

- 任务执行历史图表（成功率趋势）
- 任务分组管理（按项目/标签）
- 快捷创建定时任务（从脚本库一键创建）
- Android 快捷设置磁贴（Quick Settings Tile）

</specifics>

<deferred>
## Deferred Ideas

- 飞行模式、移动数据、勿扰模式控制 — 后续版本
- 定位服务控制 — 后续版本
- 电池优化设置 — 后续版本
- 自动旋转控制 — 后续版本
- Android 快捷设置磁贴 — 后续版本

</deferred>

---

*Phase: 07-automation-advanced*
*Context gathered: 2026-04-14*
