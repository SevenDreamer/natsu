---
phase: 02
slug: knowledge-advanced
status: approved
created: 2026-04-14
reviewed_at: 2026-04-14
---

# Phase 02 — UI Design Contract: Knowledge Advanced

> Visual and interaction contract for Phase 2 features. Extends Phase 1 UI-SPEC.md with knowledge graph, related notes, wiki diff, and AI settings UI.

---

## Design System (Inherited from Phase 1)

| Property | Value |
|----------|-------|
| Tool | shadcn (from Phase 1) |
| Component library | Radix UI (via shadcn) |
| Icon library | Lucide React |
| Font | Inter (GitHub-style sans-serif) |
| Code Font | JetBrains Mono |

**Reference:** `.planning/phases/01-foundation/01-UI-SPEC.md` for full design tokens.

---

## Spacing Scale (Inherited)

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing |
| md | 16px | Default element spacing |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps between panels |
| 2xl | 48px | Major section breaks |

**Exceptions for Phase 2:**
- Graph canvas: Full viewport (100vh - toolbar height)
- Graph node minimum touch target: 32px
- Related notes panel width: 280px (collapsible)

---

## Typography (Inherited)

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 (regular) | 1.5 |
| Label | 14px | 400 (regular) | 1.4 |
| Heading | 20px | 600 (semibold) | 1.3 |
| Display | 28px | 600 (semibold) | 1.2 |

**Code Font:** JetBrains Mono, Menlo, Monaco, "Courier New", monospace

---

## Color (GitHub Palette, Inherited)

### Light Theme

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #FFFFFF | Main background |
| Secondary (30%) | #F6F8FA | Sidebar, cards, panels |
| Accent (10%) | #0969DA | Primary actions, links |
| Destructive | #CF222E | Delete, errors |
| Success | #1A7F37 | Accept, confirm |
| Warning | #9A6700 | Caution states |

### Dark Theme

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #0D1117 | Main background |
| Secondary (30%) | #161B22 | Sidebar, cards, panels |
| Accent (10%) | #58A6FF | Primary actions, links |
| Destructive | #F85149 | Delete, errors |
| Success | #3FB950 | Accept, confirm |
| Warning | #D29922 | Caution states |

### Graph-Specific Colors

| Node Type | Light Theme | Dark Theme |
|-----------|-------------|------------|
| Default note | #0969DA | #58A6FF |
| Selected note | #1A7F37 | #3FB950 |
| Broken link | #CF222E | #F85149 |
| Raw content | #9A6700 | #D29922 |
| Wiki content | #0969DA | #58A6FF |
| Output content | #6E7681 | #8B949E |

| Edge Type | Light Theme | Dark Theme |
|-----------|-------------|------------|
| Direct link | #30363D | #8B949E |
| Suggested relation | #D0D7DE | #30363D |
| Hover highlight | #0969DA | #58A6FF |

---

## Feature 1: Knowledge Graph View (Cytoscape.js)

From CONTEXT.md D-04 to D-07, RESEARCH.md Section 1.

### Layout Contract

**Full-screen modal overlay:**

```
+----------------------------------------------------------+
|  [<] Back  |  Knowledge Graph          [Filter] [Search] |
+----------------------------------------------------------+
|                                                          |
|                                                          |
|               Graph Canvas (force-directed)              |
|                                                          |
|                                                          |
|                                                          |
+----------------------------------------------------------+
|  Zoom: [-] 100% [+]  |  Layout: [Force] [Grid]  |  [Full]|
+----------------------------------------------------------+
```

**Dimensions:**
- Toolbar height: 48px
- Footer height: 40px
- Canvas: calc(100vh - 88px)
- Node size: 24-48px (degree-based scaling)

### Node Styling

| Property | Value |
|----------|-------|
| Shape | Ellipse (rounded) |
| Base size | 24px diameter |
| Max size | 48px (for high-degree nodes) |
| Border width | 2px |
| Selected border | 3px, accent color |
| Label position | Below node |
| Label font | 12px Inter |

**Node size calculation:**
```typescript
const nodeSize = Math.min(48, 24 + (nodeDegree * 4));
```

### Edge Styling

| Property | Value |
|----------|-------|
| Line style | Bezier (curved) |
| Width | 1-3px (based on relationship score) |
| Color | Default: #30363D (light) / #8B949E (dark) |
| Hover color | Accent color |
| Arrow | None (undirected for now) |

### Toolbar Components

| Control | Icon | Behavior |
|---------|------|----------|
| Back button | `ArrowLeft` | Close graph, return to note |
| Filter | `Filter` | Open filter dropdown |
| Search | `Search` | Focus search input |
| Zoom out | `Minus` | Decrease zoom 10% |
| Zoom in | `Plus` | Increase zoom 10% |
| Layout toggle | `LayoutGrid` | Switch layout algorithm |
| Fullscreen | `Maximize2` | Toggle fullscreen mode |

### Interaction Contract

| Interaction | Behavior |
|-------------|----------|
| Click node | Navigate to corresponding note (close graph) |
| Hover node | Show tooltip with note title + connection count |
| Hover edge | Highlight connected nodes |
| Click canvas | Deselect all |
| Drag node | Move node (temporary, resets on layout) |
| Drag canvas | Pan view |
| Scroll/Pinch | Zoom in/out |
| Double-click | Fit graph to view |

### Search Highlighting

| State | Visual |
|-------|--------|
| Matching node | Accent border (3px), pulsing animation |
| Non-matching | Faded (opacity 0.3) |
| All visible | No filter applied |

### Filter Options

| Filter | Options |
|--------|---------|
| Node type | All, Raw, Wiki, Outputs |
| Connection threshold | All, 3+ connections, 5+ connections |
| Directory | All, or specific directory |

---

## Feature 2: Related Notes Panel

From CONTEXT.md D-01 to D-03, RESEARCH.md Section 4.

### Layout Contract

**Side panel (integrated into Preview Panel):**

```
+----------------------------------+
|  Related Notes              [x] |
+----------------------------------+
|                                  |
|  [[target-note]]                 |
|  Score: 0.85                     |
|  ------------------------         |
|                                  |
|  [[similar-concept]]             |
|  Score: 0.72                     |
|  ------------------------         |
|                                  |
|  [[same-folder-item]]            |
|  Score: 0.65                     |
|  ------------------------         |
|                                  |
+----------------------------------+
```

**Dimensions:**
- Panel width: 280px (inherited from Preview Panel)
- Item height: 64px (variable with metadata)
- Score bar height: 4px
- Item padding: 12px

### Relationship Score Visualization

**Score bar (horizontal progress bar):**

```
+----------------------------------+
|  [[note-title]]                  |
|  +------------------------+      |
|  |████████████░░░░░░░░░░░░| 0.72 |
|  +------------------------+      |
+----------------------------------+
```

| Score Range | Bar Color |
|-------------|-----------|
| 0.8 - 1.0 | Success (#1A7F37) |
| 0.5 - 0.79 | Accent (#0969DA) |
| 0.0 - 0.49 | Muted (#6E7681) |

### Item Styling

| Element | Style |
|---------|-------|
| Note title | `[[wiki-link]]` style, accent color |
| Score bar | 4px height, rounded corners |
| Score text | 12px monospace, secondary color |
| Relationship type | 11px label, italic |

### Relationship Type Labels

| Type | Display Label | Calculation Basis |
|------|---------------|-------------------|
| Direct link | "Direct link" | Explicit `[[link]]` |
| Co-citation | "Shared references" | Both link to same note |
| Co-reference | "Both referenced by" | Both referenced by same note |
| Proximity | "In same folder" | Same directory |

---

## Feature 3: Wiki Diff Viewer

From CONTEXT.md D-10, RESEARCH.md Section 5.

### Layout Contract

**Modal dialog (confirmation flow):**

```
+----------------------------------------------------------+
|  AI Suggests Changes to: [[concept-name]]                |
+----------------------------------------------------------+
|                                    |                     |
|  Original                   |  AI Suggestion             |
|  -------------------------   |  ------------------------  |
|  Line 1 unchanged            |  Line 1 unchanged          |
| -Line 2 removed              |                             |
|                               | +Line 2 new content         |
|  Line 3 unchanged            |  Line 3 unchanged          |
|                               | +Line 4 new addition        |
|                                    |                     |
+----------------------------------------------------------+
|                                                          |
|  [Reject]          [Edit & Accept]          [Accept]    |
|                                                          |
+----------------------------------------------------------+
```

**Dimensions:**
- Dialog width: min(90vw, 800px)
- Dialog max height: 70vh
- Column gap: 16px
- Line padding: 8px vertical

### Diff Color Coding

| Change Type | Light Theme | Dark Theme |
|-------------|-------------|------------|
| Addition | bg: #DAE8E0, text: #1A7F37 | bg: #1E3A2F, text: #3FB950 |
| Deletion | bg: #FFEBE9, text: #CF222E | bg: #3D1F20, text: #F85149 |
| Unchanged | bg: transparent, text: inherit | bg: transparent, text: inherit |

### Diff Line Styling

| Element | Style |
|---------|-------|
| Line number | 12px monospace, secondary color, right-aligned |
| Added line prefix | `+` character, green |
| Deleted line prefix | `-` character, red |
| Code font | JetBrains Mono, 13px |

### Action Buttons

| Button | Variant | Icon | Behavior |
|--------|---------|------|----------|
| Reject | `outline` | `XCircle` | Close dialog, discard changes |
| Edit & Accept | `secondary` | `Edit3` | Open in editor for manual edit |
| Accept | `default` | `Check` | Apply changes, close dialog |

### Dialog Header

| Element | Style |
|---------|-------|
| Title | Heading (20px, semibold) |
| Note name | Wiki-link style, accent color |
| Change count badge | Pill badge, accent bg |

---

## Feature 4: AI Provider Settings

From CONTEXT.md D-12 to D-15.

### Layout Contract

**Settings page section:**

```
+------------------------------------------+
|  AI Provider Settings                    |
+------------------------------------------+
|                                          |
|  Default Provider                        |
|  [Claude (default)            v]         |
|                                          |
|  --------------------------------------  |
|                                          |
|  Claude (Anthropic)                      |
|  API Key: [••••••••••••] [Edit]          |
|  Status: Connected                       |
|                                          |
|  OpenAI                                  |
|  API Key: [Not configured] [Add]         |
|  Status: Not connected                   |
|                                          |
|  DeepSeek                                |
|  API Key: [••••••••••••] [Edit]          |
|  Status: Connected                        |
|                                          |
|  Ollama (Local)                          |
|  Base URL: [http://localhost:11434]      |
|  Status: Connected                        |
|                                          |
+------------------------------------------+
```

### Provider Card Styling

| Element | Style |
|---------|-------|
| Provider name | Label (14px, semibold) |
| API Key field | Password input with toggle |
| Status indicator | Dot + text, 12px |
| Edit/Add button | Ghost button, icon-only |

### Status Indicators

| Status | Dot Color | Text |
|--------|-----------|------|
| Connected | Success (#1A7F37) | "Connected" |
| Not connected | Muted (#6E7681) | "Not connected" |
| Error | Destructive (#CF222E) | "Connection failed" |

### Provider Selection Dropdown

| Provider | Icon | Description |
|----------|------|-------------|
| Claude | `Sparkles` | Anthropic Claude |
| OpenAI | `Bot` | GPT models |
| DeepSeek | `Brain` | DeepSeek AI |
| Ollama | `Server` | Local models |

### API Key Input Security

| Requirement | Implementation |
|-------------|----------------|
| Masking | Password field with `•` characters |
| Toggle visibility | Eye icon toggle |
| Storage | Keyring (OS-level encryption) |
| Display | Never show full key after save |

---

## Component Inventory

### New Components for Phase 2

| Component | Purpose | shadcn Base |
|-----------|---------|-------------|
| `GraphView` | Full-screen knowledge graph | Custom (Cytoscape) |
| `GraphToolbar` | Graph controls bar | Custom + shadcn Button |
| `GraphFilterDropdown` | Filter controls | shadcn Popover, Select |
| `RelatedNotesPanel` | Related notes sidebar | Custom container |
| `RelatedNoteItem` | Individual related note | Custom + shadcn elements |
| `RelationshipScoreBar` | Progress bar for score | shadcn Progress |
| `WikiDiffDialog` | Diff confirmation modal | shadcn Dialog |
| `DiffViewer` | Side-by-side diff | Custom (react-diff-viewer) |
| `ProviderSettingsSection` | AI settings panel | shadcn Card |
| `ProviderCard` | Individual provider config | shadcn Card |
| `APIKeyInput` | Secure key input | shadcn Input (password) |
| `StatusIndicator` | Connection status dot | Custom |

### Modified Components (from Phase 1)

| Component | Modification |
|-----------|-------------|
| `Sidebar` | Add "Knowledge Graph" button |
| `PreviewPanel` | Add Related Notes section |
| `SettingsPage` | Add AI Provider Settings section |

---

## Copywriting Contract (Chinese UI)

| Element | Copy |
|---------|------|
| **Graph View** ||
| Graph title | "知识图谱" |
| Back button | "返回笔记" |
| Filter button | "筛选" |
| Search placeholder | "搜索节点..." |
| Zoom control | "缩放" |
| Layout toggle | "布局" |
| Fullscreen | "全屏" |
| Node tooltip | "{title} ({count} 个连接)" |
| Filter: Node type | "节点类型" |
| Filter: All | "全部" |
| Filter: Raw | "原始内容" |
| Filter: Wiki | "Wiki 内容" |
| Filter: Outputs | "输出" |
| Filter: Connections | "连接数阈值" |
| **Related Notes** ||
| Panel title | "相关笔记" |
| Empty state | "暂无相关笔记" |
| Loading state | "正在分析..." |
| Score label | "相关度" |
| Type: Direct | "直接链接" |
| Type: Co-citation | "共同引用" |
| Type: Co-reference | "共同被引用" |
| Type: Proximity | "同目录" |
| **Wiki Diff** ||
| Dialog title | "AI 建议修改：" |
| Original column | "原文" |
| Suggested column | "AI 建议" |
| Reject button | "拒绝" |
| Edit button | "编辑后接受" |
| Accept button | "接受" |
| Change count | "{n} 处修改" |
| Addition prefix | "+" |
| Deletion prefix | "-" |
| **AI Settings** ||
| Section title | "AI 服务设置" |
| Default provider | "默认服务" |
| API key label | "API 密钥" |
| Status connected | "已连接" |
| Status not connected | "未连接" |
| Status error | "连接失败" |
| Edit button | "编辑" |
| Add button | "添加" |
| Save button | "保存" |
| Cancel button | "取消" |
| Security note | "密钥使用系统加密存储，切换设备需重新输入" |

---

## Interaction Contract Summary

### Graph View Entry Points

| Entry | Trigger | Behavior |
|-------|---------|----------|
| Sidebar button | Click | Open full-screen graph modal |
| Note menu | Click | Open graph centered on that note |
| Keyboard shortcut | `Cmd/Ctrl + G` | Open graph (global) |

### Related Notes Panel

| Interaction | Behavior |
|-------------|----------|
| Panel toggle | Collapsible within Preview Panel |
| Click note item | Navigate to that note |
| Hover note item | Show relationship details tooltip |
| Refresh button | Re-run relationship analysis |

### Wiki Diff Dialog

| Interaction | Behavior |
|-------------|----------|
| Dialog open | Modal overlay, backdrop click disabled |
| Scroll | Virtualized scroll for large diffs |
| Keyboard `Esc` | Same as Reject |
| Keyboard `Enter` | Same as Accept |
| Tab navigation | Cycle through buttons |

---

## Responsive Adaptations

### Graph View (Mobile)

| Breakpoint | Adaptation |
|------------|------------|
| < 768px | Toolbar becomes bottom bar, touch gestures for zoom/pan |
| < 480px | Filter/Search as separate screens |

### Related Notes Panel (Mobile)

| Breakpoint | Adaptation |
|------------|------------|
| < 768px | Collapses to accordion in note options |
| < 480px | Full-width bottom sheet on tap |

### Wiki Diff Dialog (Mobile)

| Breakpoint | Adaptation |
|------------|------------|
| < 768px | Stack view (original on top, suggestion below) |
| < 480px | No side-by-side, scroll vertically through changes |

---

## Registry Safety

| Registry | Components Needed | Safety Gate |
|----------|-------------------|-------------|
| shadcn official | Dialog, Button, Input, Select, Popover, Progress, Tooltip, ScrollArea, Card | not required |
| npm: cytoscape | Graph core | widely used, MIT license |
| npm: @cytoscape/react | React wrapper | official, MIT license |
| npm: react-diff-viewer-continued | Diff viewer | maintained fork, MIT license |

**All dependencies are permissive (MIT) and widely used.**

---

## Accessibility Requirements (Inherited + Phase 2)

### Graph View
- Keyboard navigation: Arrow keys to move between nodes
- Screen reader: Announce "Graph with {n} nodes, {m} connections"
- Focus management: Focus on graph canvas on open, return focus on close
- Reduced motion: Disable node animations

### Related Notes Panel
- Score bars: ARIA `aria-valuenow` for score
- Keyboard: Arrow keys to navigate items

### Wiki Diff Dialog
- Change announcements: "Added {n} lines, removed {n} lines"
- Keyboard: Full keyboard navigation
- Focus trap: Standard modal focus trap

### AI Settings
- Password reveal: ARIA expanded state
- Error states: Aria-live announcements
- Status indicators: ARIA status role

---

## Animation Guidelines

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Graph node entrance | Fade + scale in | 300ms | ease-out |
| Graph edge draw | Path animation | 500ms | linear |
| Score bar fill | Width transition | 200ms | ease-out |
| Dialog entrance | Fade + scale | 150ms | ease-out |
| Panel collapse | Height transition | 200ms | ease-in-out |
| Status change | Color transition | 150ms | linear |

**Reduced motion:** All animations respect `prefers-reduced-motion: reduce`.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — Chinese UI, consistent tone
- [x] Dimension 2 Visuals: PASS — Clear component hierarchy
- [x] Dimension 3 Color: PASS — GitHub palette, graph-specific colors defined
- [x] Dimension 4 Typography: PASS — Inherited from Phase 1
- [x] Dimension 5 Spacing: PASS — 4px multiples, responsive exceptions noted
- [x] Dimension 6 Registry Safety: PASS — All MIT, widely used

**Approval:** approved 2026-04-14

---

## Pre-Populated From

| Source | Decisions Used |
|--------|----------------|
| CONTEXT.md | D-01 to D-15 (relationship analysis, graph visualization, AI provider, wiki maintenance) |
| RESEARCH.md | Cytoscape configuration, diff viewer, provider abstraction |
| REQUIREMENTS.md | KNOW-05~07 scope |
| ROADMAP.md | Phase 2 scope and success criteria |
| Phase 1 UI-SPEC.md | Design system inheritance |

---

## Open Questions

1. **Graph Layout Algorithm:** Default `fcose` is recommended. Confirm, or prefer `cose` (older) or `dagre` (hierarchical)?

2. **Related Notes Ranking:** Score formula in RESEARCH.md uses weighted factors. Confirm the weights:
   - Direct link: 0.5
   - Co-citation: 0.15 (max 0.2)
   - Co-reference: 0.15 (max 0.2)
   - Same directory: 0.1

3. **Diff Viewer Complexity:** For simple additions, inline diff might be cleaner than side-by-side. Prefer unified view for small changes (< 10 lines)?

---

*Generated: 2026-04-14*
*Phase: 02-knowledge-advanced*
