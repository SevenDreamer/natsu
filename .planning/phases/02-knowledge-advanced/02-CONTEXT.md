# Phase 2: Knowledge Advanced - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

实现知识库高级功能：
- AI 自动发现笔记关系（基于链接分析）
- 知识图谱可视化（Cytoscape.js）
- AI 从 raw/ 提取概念，增量维护 wiki/
- AI Provider 抽象层集成

**不包含：** AI 对话功能、终端功能、自动化功能（属于后续阶段）

</domain>

<decisions>
## Implementation Decisions

### AI 关系发现 (KNOW-05)

- **D-01:** 以链接分析为主发现笔记关系
- **D-02:** 采用「即时计算 + 实时 backlinks」模式（类似 Obsidian）
- **D-03:** 计算相关笔记时考虑四个因素：
  - 直接链接关系（已实现）
  - 共同引用（A 和 B 都链接到 C）
  - 共同被引用（C 同时链接到 A 和 B）
  - 同目录邻近

### 知识图谱可视化 (KNOW-06)

- **D-04:** 使用 Cytoscape.js 作为图谱可视化库（性能优先）
- **D-05:** 默认采用力导向布局
- **D-06:** 图谱视图为独立全屏视图（不嵌入现有布局）
- **D-07:** 支持的交互功能：
  - 点击节点打开对应笔记
  - 按标签/目录筛选显示
  - 搜索时高亮匹配节点

### AI Wiki 维护 (KNOW-07)

- **D-08:** 采用定时批量处理方式
- **D-09:** 混合处理策略：每小时增量处理 + 每天一次全量处理
- **D-10:** AI 更新 wiki/ 采用版本对比确认模式（Git diff 风格）
- **D-11:** 内容组织方式：
  - 追加到现有页面
  - 创建新页面
  - 更新现有页面内容
  - 追加到页面特定区块

### AI Provider 集成

- **D-12:** 支持多个 AI 服务：
  - Claude (Anthropic)
  - GPT (OpenAI)
  - DeepSeek
  - 本地模型 (Ollama)
  - 第三方自定义供应商（如阿里云、腾讯云）
- **D-13:** 默认服务由用户在设置中配置
- **D-14:** 采用 Rust 后端 Provider trait 抽象设计
- **D-15:** API Key 本地加密存储，切换设备需要二次解密

### Claude's Discretion

- Cytoscape.js 的具体配置和样式细节
- 定时任务的具体实现方式（Tauri 插件 vs 自定义调度）
- Provider trait 的具体接口设计
- 版本对比确认的 UI 具体形式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Level
- `.planning/PROJECT.md` — 项目愿景、核心理念、约束条件
- `.planning/REQUIREMENTS.md` — 需求定义，Phase 2 覆盖 KNOW-05~07
- `.planning/ROADMAP.md` — 路线图，Phase 2 定义和成功标准
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 决策，架构基础
- `.planning/phases/01-foundation/01-UI-SPEC.md` — UI 设计规范，组件库约定

### Technical Stack
- `CLAUDE.md` — 技术栈决策（Rust + Tauri, SQLite 等）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `termsuite/src-tauri/src/commands/links.rs` — Wiki-link 解析和 backlinks 追踪，可直接扩展关系计算
- `termsuite/src-tauri/src/db/schema.rs` — 已有 `backlinks` 表结构
- `termsuite/src/stores/noteStore.ts` — Zustand 状态管理模式
- `termsuite/src/components/layout/` — 布局组件，可添加全屏图谱视图入口

### Established Patterns
- Tauri 命令模式：`#[tauri::command]` async 函数
- React + Zustand 状态管理
- shadcn/ui 组件库 + Tailwind CSS
- GitHub 风格 light/dark 主题

### Integration Points
- 图谱视图：工具栏按钮 + 全屏 Modal 或独立路由
- AI Provider：Rust 后端新增 `commands/ai.rs` 模块
- 定时任务：Tauri 插件或自定义调度器
- 关系计算：扩展现有 `links.rs` 模块

</code_context>

<specifics>
## Specific Ideas

- 关系发现参考 Obsidian 的「即时计算」模式
- 图谱布局参考 Obsidian 的力导向效果
- Wiki 维护采用 Git diff 风格的版本对比确认

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---
*Phase: 02-knowledge-advanced*
*Context gathered: 2026-04-14*
