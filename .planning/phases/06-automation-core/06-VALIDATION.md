---
phase: 6
slug: automation-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + cargo test (backend) |
| **Config file** | `natsu/vitest.config.ts`, `natsu/src-tauri/Cargo.toml` |
| **Quick run command** | `npm test -- --run` (frontend) / `cargo test --lib` (backend) |
| **Full suite command** | `npm test` / `cargo test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test --lib` (backend only)
- **After every plan wave:** Run full suite (frontend + backend)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 06-01-01 | 01 | 1 | AUTO-01 | — | N/A | unit | `cargo test command_history` | ⬜ pending |
| 06-01-02 | 01 | 1 | AUTO-01 | — | N/A | unit | `cargo test command_history` | ⬜ pending |
| 06-01-03 | 01 | 1 | AUTO-01 | — | N/A | integration | `cargo test terminal` | ⬜ pending |
| 06-01-04 | 01 | 1 | AUTO-01 | — | N/A | unit | `npm test -- automationStore` | ⬜ pending |
| 06-01-05 | 01 | 1 | AUTO-01 | — | N/A | e2e | manual | ⬜ pending |
| 06-01-06 | 01 | 1 | AUTO-01 | — | N/A | integration | `cargo test` | ⬜ pending |
| 06-02-01 | 02 | 2 | AUTO-02 | T-06-01 | 安全检查集成 | unit | `cargo test script` | ⬜ pending |
| 06-02-02 | 02 | 2 | AUTO-02 | T-06-01 | 危险脚本确认 | unit | `cargo test script` | ⬜ pending |
| 06-02-03 | 02 | 2 | AUTO-02 | T-06-01 | 安全检查集成 | integration | `cargo test script_execution` | ⬜ pending |
| 06-02-04 | 02 | 2 | AUTO-02 | — | N/A | unit | `npm test -- ScriptLibrary` | ⬜ pending |
| 06-02-05 | 02 | 2 | AUTO-02 | T-06-01 | 危险脚本确认 | e2e | manual | ⬜ pending |
| 06-02-06 | 02 | 2 | AUTO-02 | T-06-01 | 安全检查集成 | unit | `cargo test` | ⬜ pending |
| 06-03-01 | 03 | 2 | AUTO-03 | — | N/A | unit | `cargo test file_watcher` | ⬜ pending |
| 06-03-02 | 03 | 2 | AUTO-03 | — | N/A | integration | `cargo test file_watcher` | ⬜ pending |
| 06-03-03 | 03 | 2 | AUTO-03 | — | N/A | unit | `cargo test file_ops` | ⬜ pending |
| 06-03-04 | 03 | 2 | AUTO-03 | — | N/A | unit | `npm test -- FileWatchers` | ⬜ pending |
| 06-03-05 | 03 | 2 | AUTO-03 | — | N/A | integration | `cargo test` | ⬜ pending |
| 06-03-06 | 03 | 2 | AUTO-03 | — | N/A | e2e | manual | ⬜ pending |
| 06-04-01 | 04 | 1 | AUTO-04 | — | N/A | unit | `cargo test api_config` | ⬜ pending |
| 06-04-02 | 04 | 1 | AUTO-04 | — | N/A | unit | `cargo test template` | ⬜ pending |
| 06-04-03 | 04 | 1 | AUTO-04 | — | N/A | integration | `cargo test api_request` | ⬜ pending |
| 06-04-04 | 04 | 1 | AUTO-04 | — | N/A | unit | `npm test -- ApiCalls` | ⬜ pending |
| 06-04-05 | 04 | 1 | AUTO-04 | — | N/A | e2e | manual | ⬜ pending |
| 06-04-06 | 04 | 1 | AUTO-04 | — | N/A | integration | `cargo test` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `natsu/src-tauri/src/models/command_history.rs` — model stubs
- [ ] `natsu/src-tauri/src/models/script.rs` — model stubs
- [ ] `natsu/src-tauri/src/models/api.rs` — model stubs
- [ ] `natsu/src-tauri/src/models/file_watcher.rs` — model stubs
- [ ] Test fixtures for automation commands

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 命令历史 UI 显示 | AUTO-01 | 需要 UI 交互 | 1. 执行终端命令 2. 切换到历史面板 3. 验证记录显示 |
| 危险脚本确认对话框 | AUTO-02 | 需要 UI 交互 | 1. 创建危险脚本 2. 执行 3. 验证确认对话框出现 |
| 文件变更事件通知 | AUTO-03 | 需要实时观察 | 1. 创建文件监控 2. 修改监控文件 3. 验证前端收到通知 |
| API 响应展示 | AUTO-04 | 需要 UI 交互 | 1. 发送 API 请求 2. 验证响应正确展示 |

---

## Security Threat Model

| ID | Threat | Mitigation | Verification |
|----|--------|------------|--------------|
| T-06-01 | 危险脚本执行 | 复用 Phase 5 ExecuteCommandTool 安全检查 | 单元测试 + 手动验证 |
| T-06-02 | 敏感信息泄露 (API 认证) | 密钥存储加密 | 使用 keyring crate |
| T-06-03 | 文件系统越权访问 | 路径验证，限制访问范围 | 单元测试 |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
