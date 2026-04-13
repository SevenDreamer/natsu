---
status: testing
phase: 02-knowledge-advanced
source:
  - PLAN-01-SUMMARY.md
  - PLAN-02-SUMMARY.md
  - PLAN-03-SUMMARY.md
  - PLAN-04-SUMMARY.md
  - PLAN-05-SUMMARY.md
started: 2026-04-14T12:00:00Z
updated: 2026-04-14T14:30:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  在桌面环境或 Android 设备上运行应用。应用正常启动，主窗口打开，侧边栏显示知识图谱按钮。
  (需要 GitHub CI/CD 构建后测试)
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: 在桌面环境或 Android 设备上运行应用。应用正常启动，主窗口打开，侧边栏显示知识图谱按钮。(需要 GitHub CI/CD 构建后测试)
result: blocked
blocked_by: release-build
reason: "Termux 无法运行 Tauri 桌面应用，需要 GitHub CI/CD 构建 Android APK"

### 2. Knowledge Graph Button
expected: Sidebar has a Knowledge Graph button. Clicking it opens a full-screen graph modal/overlay.
result: [pending]

### 3. Knowledge Graph Visualization
expected: Graph displays notes as nodes with edges showing links between them. Nodes are theme-aware (colors match light/dark theme). Graph supports zoom via scroll wheel and pan via drag. Double-clicking a node navigates to that note.
result: [pending]

### 4. Graph Toolbar Controls
expected: Graph toolbar shows search input, zoom controls (+/- buttons), and layout toggle button. Search highlights matching nodes. Zoom buttons zoom in/out. Layout toggle changes graph arrangement.
result: [pending]

### 5. Graph Filter Dropdown
expected: Filter dropdown allows filtering by node type (note, wiki, raw) and connection threshold (minimum connections). Filtering updates graph display in real-time.
result: [pending]

### 6. Related Notes Panel
expected: When viewing a note in the preview panel, a "Related Notes" section appears showing notes with relationship scores. Each related note shows the relationship type (Direct Link, Co-Citation, Co-Reference, Proximity) and score.
result: [pending]

### 7. AI Provider Settings UI
expected: Settings page has AI Provider section. Shows cards for each provider (Claude, OpenAI, DeepSeek, Ollama). Each card has API key input field and save button. Selecting a provider sets it as default.
result: [pending]

### 8. API Key Storage
expected: Enter an API key for a provider and save. Restart the application. The API key is still present (retrieved from OS keyring).
result: [pending]

### 9. Backend Tests Pass
expected: Run `cargo test` in natsu/src-tauri directory. All tests pass (7 total: 4 scoring tests + 3 graph tests).
result: pass

## Summary

total: 9
passed: 1
issues: 0
pending: 7
skipped: 0
blocked: 1

## Gaps

[none yet]
