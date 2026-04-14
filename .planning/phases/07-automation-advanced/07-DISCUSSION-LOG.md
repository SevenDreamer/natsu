# Phase 7: Automation Advanced - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 07-automation-advanced
**Areas discussed:** 调度模式, 任务关联, 失败处理, Android 控制, UI 设计, 平台适配, 通知方式

---

## 定时任务调度模式

| Option | Description | Selected |
|--------|-------------|----------|
| 简单间隔 | 每 N 分钟/小时执行，UI 简洁 | |
| cron 表达式 | 灵活强大，支持复杂调度 | |
| 混合模式 | 两者兼顾，覆盖大多数场景 | ✓ |

**User's choice:** 混合模式
**Notes:** 支持简单间隔和 cron 表达式，UI 提供两种模式切换

---

## 任务关联资源

| Option | Description | Selected |
|--------|-------------|----------|
| 仅关联脚本 | 复用脚本库功能，安全检查统一处理 | |
| 关联脚本或命令 | 可选择脚本或直接输入命令 | |
| 关联多种资源 | 可关联脚本、命令、API 调用 | ✓ |

**User's choice:** 关联多种资源
**Notes:** 最灵活，脚本、命令、API 调用都可定时执行

---

## 失败处理

| Option | Description | Selected |
|--------|-------------|----------|
| 仅记录 | 记录失败日志，不自动重试 | |
| 自动重试 | 失败后自动重试 N 次 | |
| 用户配置 | 每个任务可单独配置重试策略 | ✓ |

**User's choice:** 用户配置
**Notes:** 每个任务可设置是否重试、重试次数、重试间隔

---

## Android 控制范围

| Option | Description | Selected |
|--------|-------------|----------|
| 核心 4 项 | 蓝牙、Wi-Fi、屏幕亮度、媒体音量 | ✓ |
| 核心 + 常用项 | 核心项 + 飞行模式、移动数据、勿扰模式 | |
| 完整权限 | 所有可控制项 | |

**User's choice:** 核心 4 项
**Notes:** 用户希望赋予全部权限，但 MVP 先实现核心功能

---

## UI 集成

| Option | Description | Selected |
|--------|-------------|----------|
| 新增 Tab | 在 AutomationPanel 添加定时任务 Tab | ✓ |
| 独立面板 | 定时任务有单独的入口和面板 | |
| 整合到脚本库 | 在脚本详情中添加定时设置 | |

**User's choice:** 新增 Tab
**Notes:** 在现有 AutomationPanel 中添加，保持界面统一

---

## 任务状态展示

| Option | Description | Selected |
|--------|-------------|----------|
| 基础列表 | 任务列表、下次执行时间、上次状态 | |
| 详细日志 | 增加执行日志、每次执行结果、耗时统计 | |
| 实时监控 | 实时显示正在执行的任务、输出流 | ✓ |

**User's choice:** 实时监控
**Notes:** 类似终端体验，显示正在执行的任务和实时输出

---

## 桌面端处理

| Option | Description | Selected |
|--------|-------------|----------|
| 显示但禁用 | 显示控制项但禁用，提示"仅 Android 可用" | |
| 完全隐藏 | 桌面端完全隐藏 Android 控制相关 UI | |
| 显示+提示 | 显示但点击时弹出提示 | ✓ |

**User's choice:** 显示+提示
**Notes:** 点击时弹出"请在 Android 设备上使用此功能"

---

## 平台检测

| Option | Description | Selected |
|--------|-------------|----------|
| Tauri API | Tauri 内置平台检测 API | |
| 自定义 Rust 代码 | 使用 cfg(target_os) 或运行时检测 | ✓ |

**User's choice:** 自定义 Rust 代码
**Notes:** 使用 cfg(target_os = "android") 或 std::env::consts::OS

---

## 任务通知

| Option | Description | Selected |
|--------|-------------|----------|
| 系统通知 | 任务完成后发送系统通知 | |
| 应用内通知 | 在应用内显示 toast/banner | |
| 两者结合 | 应用内通知 + 失败时系统通知 | ✓ |

**User's choice:** 两者结合
**Notes:** 所有任务完成时应用内通知，失败时额外发送系统通知

---

## Android 控制 UI 位置

| Option | Description | Selected |
|--------|-------------|----------|
| 新增 Tab | 在 AutomationPanel 添加"系统控制" Tab | ✓ |
| 独立面板 | Android 控制有单独的入口和面板 | |

**User's choice:** 新增 Tab
**Notes:** 与定时任务同级，统一在 AutomationPanel 中

---

## Claude's Discretion

- cron 表达式解析库选择
- Android 权限声明方式
- 实时输出的技术实现（WebSocket vs SSE vs Tauri Events）
- 具体的重试间隔递增算法

---

## Deferred Ideas

- 飞行模式、移动数据、勿扰模式控制 — 后续版本
- 定位服务控制 — 后续版本
- 电池优化设置 — 后续版本
- 自动旋转控制 — 后续版本
- Android 快捷设置磁贴 — 后续版本
- 任务执行历史图表（成功率趋势）
- 任务分组管理（按项目/标签）
- 快捷创建定时任务（从脚本库一键创建）

---

*Discussion completed: 2026-04-14*
