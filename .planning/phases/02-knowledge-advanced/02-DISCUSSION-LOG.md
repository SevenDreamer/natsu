# Phase 2: Knowledge Advanced - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 02-knowledge-advanced
**Areas discussed:** AI 关系发现, 知识图谱可视化, AI Wiki 维护机制, AI Provider 集成

---

## AI 关系发现

| Option | Description | Selected |
|--------|-------------|----------|
| 内容相似度 | 使用 embeddings 计算语义相似度 | |
| 链接分析为主 | 基于 wiki-links 和 backlinks 分析关系网络 | ✓ |
| 组合方式 | 结合链接分析 + 内容相似度 + 标签提取 | |
| 用户手动触发 | 点击时才分析 | |

**User's choice:** 链接分析为主
**Notes:** 参考 Obsidian 的方式

### 触发时机

| Option | Description | Selected |
|--------|-------------|----------|
| 手动触发 | 用户点击时计算 | |
| 后台批量计算 | 定期后台分析存储 | |
| 实时计算 | 每次保存时更新 | |

**User's choice:** 参考 Obsidian
**Notes:** 采用「即时计算 + 实时 backlinks」

### 关系因素

| Option | Description | Selected |
|--------|-------------|----------|
| 直接链接关系 | A 链接到 B（已实现） | ✓ |
| 共同引用 | A 和 B 同时链接到 C | ✓ |
| 共同被引用 | C 同时链接到 A 和 B | ✓ |
| 同目录邻近 | 同目录下的笔记 | ✓ |

**User's choice:** 全部四个因素

---

## 知识图谱可视化

| Option | Description | Selected |
|--------|-------------|----------|
| D3.js | 成熟稳定，自定义程度高 | |
| React Flow | React 原生，开发效率高 | |
| Cytoscape.js | 专为网络图设计，性能好 | ✓ |
| vis-network | 开箱即用，上手快 | |

**User's choice:** Cytoscape.js（性能优先）

### 布局方式

| Option | Description | Selected |
|--------|-------------|----------|
| 力导向布局 | 节点自然分布，类似 Obsidian | ✓ |
| 层级布局 | 按链接深度分层 | |
| 环形布局 | 中心笔记在圆心 | |

**User's choice:** 力导向布局

### 视图位置

| Option | Description | Selected |
|--------|-------------|----------|
| 独立全屏视图 | 工具栏按钮打开全屏图谱 | ✓ |
| 嵌入预览面板 | 在预览面板中显示 | |
| 主区域切换 | 替换主编辑区域 | |

**User's choice:** 独立全屏视图

### 交互功能

| Option | Description | Selected |
|--------|-------------|----------|
| 点击节点打开笔记 | 点击直接打开笔记 | ✓ |
| 悬停显示预览 | 鼠标悬停显示摘要 | |
| 按标签/目录筛选 | 显示特定范围笔记 | ✓ |
| 搜索高亮 | 搜索时高亮匹配节点 | ✓ |

**User's choice:** 点击打开 + 标签筛选 + 搜索高亮

---

## AI Wiki 维护机制

### 触发方式

| Option | Description | Selected |
|--------|-------------|----------|
| 手动触发 | 选择文件后点击按钮 | |
| 保存后自动触发 | 保存到 raw/ 后自动分析 | |
| 定时批量处理 | 后台定时处理新文件 | ✓ |

**User's choice:** 定时批量处理

### 处理策略

| Option | Description | Selected |
|--------|-------------|----------|
| 每小时 | 及时性较好 | ✓ |
| 每天一次 | 资源消耗低 | ✓ |
| 用户自定义间隔 | 灵活配置 | |

**User's choice:** 每小时增量处理 + 每天一次全量处理

### 更新策略

| Option | Description | Selected |
|--------|-------------|----------|
| AI 生成草案 + 用户审批 | AI 生成用户审核 | |
| AI 直接更新 | 自动更新可回滚 | |
| 版本对比确认 | Git diff 风格查看更改 | ✓ |

**User's choice:** 版本对比确认

### 内容组织

| Option | Description | Selected |
|--------|-------------|----------|
| 追加到现有页面 | 追加到对应 wiki 页面 | ✓ |
| 创建新页面 | 发现新概念时创建 | ✓ |
| 更新现有页面 | 更新内容摘要和链接 | ✓ |
| 追加到页面区块 | 追加到特定区块 | ✓ |

**User's choice:** 全部四种方式

---

## AI Provider 集成

### 支持的服务

| Option | Description | Selected |
|--------|-------------|----------|
| Claude | Anthropic API | ✓ |
| GPT | OpenAI API | ✓ |
| DeepSeek | DeepSeek API | ✓ |
| 本地模型 (Ollama) | 本地运行 | ✓ |
| 第三方自定义供应商 | 阿里云、腾讯云等 | ✓ |

**User's choice:** 全部支持 + 第三方自定义

### 默认服务

| Option | Description | Selected |
|--------|-------------|----------|
| Claude（推荐） | 默认使用 Claude | |
| 本地 Ollama | 默认本地模型 | |
| 用户配置默认 | 设置中配置默认服务 | ✓ |

**User's choice:** 用户配置默认

### Provider 设计

| Option | Description | Selected |
|--------|-------------|----------|
| Rust 后端 Provider 抽象（推荐） | 统一接口，后端实现 | ✓ |
| 前端 Provider 封装 | 前端直接调用 API | |
| 后端代理模式 | 后端代理转发请求 | |

**User's choice:** Rust 后端 Provider 抽象

### API Key 管理

| Option | Description | Selected |
|--------|-------------|----------|
| 本地加密存储（推荐） | 加密存储在本地 | ✓ |
| 本地明文存储 | 方便调试 | |
| 环境变量 | 从系统读取 | |

**User's choice:** 本地加密存储，切换设备需要二次解密

---

## Claude's Discretion

- Cytoscape.js 的具体配置和样式细节
- 定时任务的具体实现方式
- Provider trait 的具体接口设计
- 版本对比确认的 UI 具体形式

## Deferred Ideas

None — discussion stayed within phase scope
