# Pitfalls Research: TermSuite

**Research Date:** 2026-04-13
**Domain:** Rust + Tauri cross-platform knowledge terminal app
**Confidence:** Medium-High

## Executive Summary

开发 TermSuite 时需要注意以下关键风险和常见错误。

---

## Category 1: Terminal Emulation

### Pitfall 1.1: Escape Sequence Handling

**问题**: 终端 ANSI escape sequences 处理不完整，导致输出显示异常

**Warning Signs**:
- 彩色输出显示为乱码
- 光标位置不正确
- 特殊字符显示错误

**Prevention**:
- 使用成熟的 xterm.js，不要自己解析 escape sequences
- 测试各种 CLI 工具的输出（git、ls、cargo 等）
- 处理 UTF-8 边界情况

**Phase to Address**: Phase 3 (Terminal Core)

---

### Pitfall 1.2: PTY Process Management

**问题**: PTY 进程管理不当，导致进程泄漏或僵尸进程

**Warning Signs**:
- 关闭标签后进程仍在运行
- 内存占用持续增长
- 系统资源耗尽

**Prevention**:
- 使用 tokio::process 正确管理进程生命周期
- 实现进程清理机制
- 测试异常关闭场景

**Phase to Address**: Phase 3 (Terminal Core)

---

### Pitfall 1.3: Cross-platform PTY Differences

**问题**: 不同平台的 PTY 实现不同，Windows vs Unix 行为不一致

**Warning Signs**:
- 同一命令在不同平台输出不同
- Windows 下终端行为异常

**Prevention**:
- 使用 portproxy 或 conpty (Windows)
- 分平台测试
- 统一抽象层

**Phase to Address**: Phase 3 (Terminal Core)

---

## Category 2: Knowledge Base

### Pitfall 2.1: Ingest Quality (LLM-Wiki Specific)

**问题**: AI 处理文档时偷懒，一次看一点就生成很多 wiki 页面，信息密度低

**Warning Signs**:
- wiki 页面像目录，没有实质内容
- 概念提取不完整
- 摘要质量差

**Prevention**:
- 一份一份处理，不要批量
- 长文档分段处理
- 设置质量检查点

**Phase to Address**: Phase 5 (Knowledge Advanced)

---

### Pitfall 2.2: Link Consistency

**问题**: 双向链接维护不一致，出现孤立链接或循环引用

**Warning Signs**:
- `[[link]]` 指向不存在的笔记
- 反向引用不准确
- 链接图显示孤立节点

**Prevention**:
- 链接创建时验证目标存在
- 定期 lint 检查孤立链接
- 删除笔记时更新所有引用

**Phase to Address**: Phase 5 (Knowledge Advanced)

---

### Pitfall 2.3: Context Rot (AI 维护时)

**问题**: AI 处理多篇文章后输出质量下降

**Warning Signs**:
- 回答越来越短
- 概念提取遗漏
- 索引更新不完整

**Prevention**:
- 使用 GSD 框架的 Wave 模式
- 每篇文章独立处理窗口
- 定期清空上下文

**Phase to Address**: Phase 5 (Knowledge Advanced)

---

### Pitfall 2.4: Scale Performance

**问题**: 知识库规模增长后，搜索和加载性能下降

**Warning Signs**:
- 搜索响应时间超过 1s
- 知识图谱加载缓慢
- 首次启动慢

**Prevention**:
- SQLite FTS5 索引优化
- 图谱懒加载
- 分页加载笔记列表

**Phase to Address**: Phase 5 (Knowledge Advanced)

---

## Category 3: AI Integration

### Pitfall 3.1: Token Limit Handling

**问题**: 知识库内容超过 token limit，AI 无法处理

**Warning Signs**:
- AI 回答时遗漏信息
- 上下文截断
- 错误提示 token limit exceeded

**Prevention**:
- 智能选择相关笔记（而非全部）
- 使用向量搜索找最相关内容
- 实现上下文压缩策略

**Phase to Address**: Phase 6 (Tool Calling)

---

### Pitfall 3.2: Streaming Reliability

**问题**: 流式响应中断或错误处理不当

**Warning Signs**:
- 响应中途停止
- 错误时无提示
- UI 卡住

**Prevention**:
- 实现重试机制
- 超时处理
- UI 显示加载状态

**Phase to Address**: Phase 4 (AI Integration)

---

### Pitfall 3.3: Tool Calling Safety

**问题**: AI 执行危险命令（如 rm -rf）无防护

**Warning Signs**:
- AI 执行未授权命令
- 文件意外删除
- 系统配置被修改

**Prevention**:
- 命令白名单机制
- 危险命令需确认
- 沙箱执行环境

**Phase to Address**: Phase 6 (Tool Calling)

---

## Category 4: Cross-Platform

### Pitfall 4.1: Android Terminal Limitations

**问题**: Android 平台终端功能受限（权限、安全模型）

**Warning Signs**:
- 命令执行失败
- 权限被拒绝
- 某些功能不可用

**Prevention**:
- 研究 Termux 实现方案
- 明确 Android 功能边界
- 合理降级而非失败

**Phase to Address**: Phase 7 (Automation)

---

### Pitfall 4.2: Web Platform Constraints

**问题**: Web 版浏览器安全模型限制太多

**Warning Signs**:
- 无法访问本地文件
- 无法执行命令
- 功能严重受限

**Prevention**:
- Web 版定位为"查看器"
- 核心功能留给桌面/Android
- 或考虑后端 API 架构

**Phase to Address**: Phase 9 (Cross-Platform Polish)

---

### Pitfall 4.3: Tauri Mobile Beta Stability

**问题**: Tauri 2.x 移动端支持仍在演进中

**Warning Signs**:
- 编译失败
- API 变化
- 文档不完整

**Prevention**:
- 关注 Tauri 更新
- 预留适配时间
- 测试最新版本

**Phase to Address**: Phase 7 (Automation)

---

## Category 5: UI/UX

### Pitfall 5.1: Tool Overload Trap

**问题**: 参考用户知识库中的警告：装了 47 个插件的 Obsidian 又是一个 Notion 陷阱

**Warning Signs**:
- 用户花时间配置而非使用
- 功能太多难以学习
- 核心功能被淹没

**Prevention**:
- MVP 只做核心功能
- 插件可选而非默认
- 简洁界面优先

**Phase to Address**: All phases (Design philosophy)

---

### Pitfall 5.2: Integration Complexity

**问题**: 四大功能域（知识库、终端、AI、自动化）整合太复杂

**Warning Signs**:
- UI 混乱
- 功能互相干扰
- 用户不知道怎么用

**Prevention**:
- 清晰的界面分区
- 一致的操作模式
- 渐进式功能展示

**Phase to Address**: Phase 1 (Foundation) - 设计阶段

---

## Summary Table

| Pitfall | Category | Severity | Phase to Address |
|---------|----------|----------|------------------|
| Escape Sequence Handling | Terminal | Medium | Phase 3 |
| PTY Process Management | Terminal | High | Phase 3 |
| Cross-platform PTY | Terminal | Medium | Phase 3 |
| Ingest Quality | Knowledge | High | Phase 5 |
| Link Consistency | Knowledge | Medium | Phase 5 |
| Context Rot | Knowledge | High | Phase 5 |
| Scale Performance | Knowledge | Medium | Phase 5 |
| Token Limit Handling | AI | High | Phase 6 |
| Streaming Reliability | AI | Medium | Phase 4 |
| Tool Calling Safety | AI | Critical | Phase 6 |
| Android Terminal | Cross-platform | High | Phase 7 |
| Web Constraints | Cross-platform | Medium | Phase 9 |
| Tauri Mobile Beta | Cross-platform | Medium | Phase 7 |
| Tool Overload | UX | High | All phases |
| Integration Complexity | UX | High | Phase 1 |

---
*Research synthesized from: User knowledge base (上下文腐烂, 知识编译), LLM-Wiki tutorial pitfalls section, Terminal emulation best practices*