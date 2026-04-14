# Phase 3: Terminal Core - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

实现终端核心功能并与知识库整合：
- PTY 进程管理和命令执行
- xterm.js 终端模拟器集成
- 主题切换（亮/暗）
- 图片内联显示（Sixel/iTerm2）
- 终端输出保存到知识库

**不包含：** AI 对话功能、多标签终端、分屏、自动化脚本（属于后续阶段）

</domain>

<decisions>
## Implementation Decisions

### PTY 后端 (TERM-01)

- **D-01:** 使用 `alacritty_terminal` crate 作为 PTY 后端
  - 跨平台支持（Windows/macOS/Linux）
  - Rust 原生实现，与 Tauri 完美集成
  - 性能优秀，维护活跃

- **D-02:** PTY 管理通过 Tauri command 暴露给前端
  - `spawn_terminal` - 启动 shell 进程
  - `write_to_pty` - 发送输入
  - `resize_pty` - 调整终端大小
  - PTY 输出通过 Tauri event 推送到前端

- **D-03:** 使用 Tauri Sidecar 作为备选方案
  - 捆绑系统 shell 或自定义 shell
  - 适用于需要特殊环境的场景

### 终端前端 (TERM-01, TERM-02)

- **D-04:** 使用 xterm.js 5.x 作为终端模拟器
  - React 集成通过 useRef + useEffect
  - 必要插件：xterm-addon-fit, xterm-addon-web-links

- **D-05:** 主题切换复用 Phase 1 的主题系统
  - xterm.js 主题与全局主题同步
  - 深色主题：暗背景 + 亮文字
  - 浅色主题：亮背景 + 暗文字

### 图片支持 (TERM-03)

- **D-06:** 优先支持 iTerm2 图片协议
  - 比 Sixel 更简单，广泛支持
  - 使用 base64 编码传输图片数据
  - 前端使用 xterm-addon-image 或自定义渲染

- **D-07:** Sixel 支持作为可选功能
  - 需要 sixel 解析库
  - 复杂度较高，MVP 阶段可暂缓

### 知识库整合 (TERM-04)

- **D-08:** 终端输出保存为 Markdown 格式
  - 包含时间戳、命令、输出
  - 使用代码块格式化
  - 自动创建 backlink 到执行会话

- **D-09:** 提供快速保存按钮
  - 「保存输出」按钮在终端工具栏
  - 可选择保存范围（全部/选中/最近 N 行）
  - 保存到 raw/ 目录，触发 AI 处理流程

### Android 平台

- **D-10:** Android 终端功能降级处理
  - 方案 A：Termux 集成（需要 Termux 已安装）
  - 方案 B：WebView 模拟终端（功能受限）
  - 方案 C：Phase 8 再实现 Android 终端

### Claude's Discretion

- alacritty_terminal 的具体 API 使用方式
- PTY 输出的 Event 传输格式
- 图片协议的具体实现细节
- 终端 UI 组件的具体布局和样式
- Android 终端的最终方案选择

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Level
- `.planning/PROJECT.md` — 项目愿景、核心理念、约束条件
- `.planning/research/STACK.md` — 技术栈决策

### Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — 基础 UI 模式
- `.planning/phases/02-knowledge-advanced/02-CONTEXT.md` — AI Provider 和知识库集成

### External Docs
- xterm.js 文档: https://xtermjs.org/docs/
- alacritty_terminal crate: https://crates.io/crates/alacritty_terminal
- iTerm2 图片协议: https://iterm2.com/documentation-images.html

</canonical_refs>

<specifics>
## Specific Ideas

- 终端组件应可折叠/展开，不影响主布局
- 支持复制粘贴快捷键（Ctrl+Shift+C/V）
- 命令历史记录（上下箭头）
- 清屏功能
- 字体大小可调

</specifics>

<deferred>
## Deferred Ideas

- 多标签终端 (TERM-05) — Phase v2
- 分屏视图 (TERM-06) — Phase v2
- 自定义主题配色 (TERM-07) — Phase v2
- Sixel 完整支持 — 可选后续增强

</deferred>

---

*Phase: 03-terminal-core*
*Context gathered: 2026-04-14*
