---
phase: 07
slug: automation-advanced
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (Frontend) + Cargo test (Backend) |
| **Config file** | `natsu/vitest.config.ts` + `natsu/src-tauri/Cargo.toml` |
| **Quick run command** | `pnpm test --run` / `cargo test --lib` |
| **Full suite command** | `pnpm test:all` / `cargo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --run && cargo test --lib`
- **After every plan wave:** Run `pnpm test:all && cargo test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | AUTO-05 | T-07-01 | SQL injection prevention in task queries | unit | `cargo test scheduler::tests` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | AUTO-05 | — | Cron expression parsing | unit | `cargo test cron_parser` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | AUTO-05 | — | Task creation flow | integration | `pnpm test ScheduledTasks.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | AUTO-05 | T-07-02 | XSS prevention in task output | unit | `pnpm test TaskOutput.sanitization.test.ts` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 3 | AUTO-06 | — | Platform detection | unit | `cargo test platform::tests` | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 4 | AUTO-06 | T-07-03 | Android permission checks | unit | `cargo test android::permissions` | ❌ W0 | ⬜ pending |
| 07-04-02 | 04 | 4 | AUTO-06 | — | Bluetooth control | integration | `cargo test android::bluetooth --ignored` | ❌ W0 | ⬜ pending |
| 07-04-03 | 04 | 4 | AUTO-06 | — | Wi-Fi control | integration | `cargo test android::wifi --ignored` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `natsu/src-tauri/src/scheduler/tests.rs` — scheduler test module
- [ ] `natsu/src-tauri/src/platform/tests.rs` — platform detection tests
- [ ] `natsu/src/__tests__/ScheduledTasks.test.ts` — scheduled tasks component tests
- [ ] `natsu/src/__tests__/AndroidControl.test.ts` — Android control component tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bluetooth enable/disable | AUTO-06 | Requires Android device/emulator | 1. Build Android APK 2. Install on device 3. Toggle Bluetooth via UI 4. Verify state changes |
| Wi-Fi enable/disable | AUTO-06 | Requires Android device/emulator | 1. Build Android APK 2. Install on device 3. Toggle Wi-Fi via UI 4. Verify state changes |
| Brightness adjustment | AUTO-06 | Requires Android device/emulator | 1. Build Android APK 2. Install on device 3. Adjust brightness slider 4. Verify screen brightness changes |
| Volume adjustment | AUTO-06 | Requires Android device/emulator | 1. Build Android APK 2. Install on device 3. Adjust volume slider 4. Verify media volume changes |
| System notifications | AUTO-05 | Requires notification permission | 1. Create scheduled task 2. Wait for execution failure 3. Verify system notification appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
