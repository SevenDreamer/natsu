---
wave: 2
depends_on: [PLAN-02-related-notes]
files_modified:
  - termsuite/src-tauri/src/lib.rs
  - termsuite/src-tauri/src/commands/mod.rs
  - termsuite/package.json
  - termsuite/src/components/layout/Sidebar.tsx
  - termsuite/src/stores/settingsStore.ts
files_created:
  - termsuite/src-tauri/src/commands/graph.rs
  - termsuite/src/components/graph/GraphView.tsx
  - termsuite/src/components/graph/GraphToolbar.tsx
  - termsuite/src/components/graph/GraphFilterDropdown.tsx
  - termsuite/src/stores/graphStore.ts
  - termsuite/src/lib/tauri-graph.ts
requirements: [KNOW-06]
autonomous: true
---

# PLAN-03: Knowledge Graph Visualization

**Objective:** Implement knowledge graph visualization with Cytoscape.js per D-04 to D-07 and UI-SPEC Feature 1.

---

## Task 1: Install Frontend Dependencies

<objective>
Add Cytoscape.js and React wrapper dependencies.
</objective>

<read_first>
- termsuite/package.json (existing dependencies)
</read_first>

<action>
Run the following command in the termsuite directory:
```bash
npm install cytoscape @cytoscape/react
```

Add to `termsuite/package.json` dependencies:
```json
"cytoscape": "^3.30",
"@cytoscape/react": "^1.0"
```
</action>

<acceptance_criteria>
- `grep "cytoscape\|@cytoscape/react" termsuite/package.json` returns 2 lines
- `npm ls cytoscape --prefix termsuite` exits with code 0
</acceptance_criteria>

---

## Task 2: Create Graph Data Types

<objective>
Define TypeScript types for graph data structures.
</objective>

<read_first>
- termsuite/src/stores/noteStore.ts (existing type patterns)
</read_first>

<action>
Create `termsuite/src/lib/tauri-graph.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';

export interface GraphNode {
  id: string;
  label: string;
  type: 'raw' | 'wiki' | 'outputs';
  connectionCount: number;
  directory: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'direct' | 'suggested';
  score: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    isolatedNodes: number;
  };
}

export interface GraphFilter {
  nodeType?: 'all' | 'raw' | 'wiki' | 'outputs';
  minConnections?: number;
  directory?: string;
  searchQuery?: string;
}

export const graphApi = {
  async getGraphData(filter?: GraphFilter): Promise<GraphData> {
    return invoke('get_graph_data', { filter });
  },

  async getNoteConnections(noteId: string): Promise<{ in: number; out: number }> {
    return invoke('get_note_connections', { noteId });
  },
};
```
</action>

<acceptance_criteria>
- `grep "interface GraphNode\|interface GraphEdge\|interface GraphData" termsuite/src/lib/tauri-graph.ts` returns 3 lines
- `grep "export const graphApi" termsuite/src/lib/tauri-graph.ts` returns 1 line
</acceptance_criteria>

---

## Task 3: Create Backend Graph Command

<objective>
Create Rust Tauri command to provide graph data for frontend visualization.
</objective>

<read_first>
- termsuite/src-tauri/src/commands/links.rs (existing backlinks query patterns)
- termsuite/src-tauri/src/commands/relations.rs (relationship types)
</read_first>

<action>
Create `termsuite/src-tauri/src/commands/graph.rs`:

```rust
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub connection_count: i32,
    pub directory: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(rename = "type")]
    pub edge_type: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphStats {
    pub total_nodes: usize,
    pub total_edges: usize,
    pub isolated_nodes: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub stats: GraphStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphFilter {
    pub node_type: Option<String>,
    pub min_connections: Option<i32>,
    pub directory: Option<String>,
    pub search_query: Option<String>,
}

/// Determine note type from path
fn get_note_type(path: &str) -> String {
    if path.contains("/raw/") {
        "raw".to_string()
    } else if path.contains("/wiki/") {
        "wiki".to_string()
    } else if path.contains("/outputs/") {
        "outputs".to_string()
    } else {
        "wiki".to_string() // Default
    }
}

/// Extract directory from path
fn get_directory(path: &str) -> String {
    std::path::Path::new(path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}

/// Get graph data for visualization
#[tauri::command]
pub async fn get_graph_data(
    filter: Option<GraphFilter>,
    db: State<'_, Mutex<Connection>>,
) -> Result<GraphData, String> {
    let conn = db.lock().unwrap();

    // Build node query with optional filters
    let mut node_query = String::from(
        "SELECT n.id, n.title, n.path,
            (SELECT COUNT(*) FROM backlinks b WHERE b.source_note_id = n.id OR b.target_note_id = n.id) as conn_count
         FROM notes n"
    );

    let mut conditions = Vec::new();
    
    if let Some(ref f) = filter {
        if let Some(ref node_type) = f.node_type {
            if node_type != "all" {
                match node_type.as_str() {
                    "raw" => conditions.push("n.path LIKE '%/raw/%'"),
                    "wiki" => conditions.push("n.path LIKE '%/wiki/%'"),
                    "outputs" => conditions.push("n.path LIKE '%/outputs/%'"),
                    _ => {}
                }
            }
        }
        if let Some(min_conn) = f.min_connections {
            if min_conn > 0 {
                conditions.push(&format!("conn_count >= {}", min_conn));
            }
        }
        if let Some(ref dir) = f.directory {
            conditions.push(&format!("n.path LIKE '%{}%'", dir));
        }
        if let Some(ref query) = f.search_query {
            if !query.is_empty() {
                conditions.push(&format!("n.title LIKE '%{}%'", query));
            }
        }
    }

    if !conditions.is_empty() {
        node_query.push_str(" WHERE ");
        node_query.push_str(&conditions.join(" AND "));
    }

    let mut stmt = conn.prepare(&node_query).map_err(|e| e.to_string())?;

    let nodes: Vec<GraphNode> = stmt.query_map([], |row| {
        let path: String = row.get(2)?;
        Ok(GraphNode {
            id: row.get(0)?,
            label: row.get(1)?,
            node_type: get_note_type(&path),
            connection_count: row.get(3)?,
            directory: get_directory(&path),
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    // Get edges from backlinks
    let mut edge_stmt = conn.prepare(
        "SELECT source_note_id, target_note_id, link_text
         FROM backlinks
         WHERE target_note_id IS NOT NULL AND is_broken = 0"
    ).map_err(|e| e.to_string())?;

    let edges: Vec<GraphEdge> = edge_stmt.query_map([], |row| {
        let source: String = row.get(0)?;
        let target: String = row.get(1)?;
        Ok(GraphEdge {
            id: format!("{}-{}", source, target),
            source,
            target,
            edge_type: "direct".to_string(),
            score: 1.0,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    // Calculate stats
    let connected_nodes: std::collections::HashSet<&str> = edges.iter()
        .flat_map(|e| vec![e.source.as_str(), e.target.as_str()])
        .collect();
    
    let isolated_count = nodes.iter()
        .filter(|n| !connected_nodes.contains(n.id.as_str()))
        .count();

    Ok(GraphData {
        nodes,
        edges,
        stats: GraphStats {
            total_nodes: nodes.len(),
            total_edges: edges.len(),
            isolated_nodes: isolated_count,
        },
    })
}

/// Get connection counts for a specific note
#[tauri::command]
pub async fn get_note_connections(
    note_id: String,
    db: State<'_, Mutex<Connection>>,
) -> Result<ConnectionsCount, String> {
    let conn = db.lock().unwrap();

    let incoming: i32 = conn.query_row(
        "SELECT COUNT(*) FROM backlinks WHERE target_note_id = ?1 AND is_broken = 0",
        rusqlite::params![&note_id],
        |row| row.get(0)
    ).unwrap_or(0);

    let outgoing: i32 = conn.query_row(
        "SELECT COUNT(*) FROM backlinks WHERE source_note_id = ?1 AND is_broken = 0",
        rusqlite::params![&note_id],
        |row| row.get(0)
    ).unwrap_or(0);

    Ok(ConnectionsCount { incoming, outgoing })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionsCount {
    pub incoming: i32,
    pub outgoing: i32,
}
```
</action>

<acceptance_criteria>
- `grep "pub struct GraphNode\|pub struct GraphEdge\|pub struct GraphData" termsuite/src-tauri/src/commands/graph.rs` returns 3 lines
- `grep "#\[tauri::command\]" termsuite/src-tauri/src/commands/graph.rs` returns 2 lines
- `grep "get_graph_data\|get_note_connections" termsuite/src-tauri/src/commands/graph.rs` returns 4+ lines
</acceptance_criteria>

---

## Task 4: Register Graph Commands

<objective>
Register graph module and commands in the backend.
</objective>

<read_first>
- termsuite/src-tauri/src/lib.rs (existing registration)
- termsuite/src-tauri/src/commands/mod.rs (existing modules)
</read_first>

<action>
1. Add to `termsuite/src-tauri/src/commands/mod.rs`:
```rust
pub mod graph;
```

2. Add to `termsuite/src-tauri/src/lib.rs` imports:
```rust
use commands::graph;
```

3. Add to `termsuite/src-tauri/src/lib.rs` invoke_handler:
```rust
// Graph commands
graph::get_graph_data,
graph::get_note_connections,
```
</action>

<acceptance_criteria>
- `grep "pub mod graph;" termsuite/src-tauri/src/commands/mod.rs` returns 1 line
- `grep "use commands::graph" termsuite/src-tauri/src/lib.rs` returns 1 line
- `grep "graph::get_graph_data" termsuite/src-tauri/src/lib.rs` returns 1 line
- `cargo check --manifest-path termsuite/src-tauri/Cargo.toml` exits with code 0
</acceptance_criteria>

---

## Task 5: Create Graph Store

<objective>
Create Zustand store for graph state management.
</objective>

<read_first>
- termsuite/src/stores/noteStore.ts (existing store patterns)
</read_first>

<action>
Create `termsuite/src/stores/graphStore.ts`:

```typescript
import { create } from 'zustand';
import { GraphData, GraphNode, GraphFilter, graphApi } from '@/lib/tauri-graph';

interface GraphState {
  graphData: GraphData | null;
  selectedNodeId: string | null;
  filter: GraphFilter;
  isLoading: boolean;
  error: string | null;
  layout: 'force' | 'grid' | 'circle';
  zoom: number;

  // Actions
  fetchGraphData: (filter?: GraphFilter) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  setFilter: (filter: Partial<GraphFilter>) => void;
  resetFilter: () => void;
  setLayout: (layout: 'force' | 'grid' | 'circle') => void;
  setZoom: (zoom: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultFilter: GraphFilter = {
  nodeType: 'all',
  minConnections: 0,
  directory: undefined,
  searchQuery: undefined,
};

export const useGraphStore = create<GraphState>((set, get) => ({
  graphData: null,
  selectedNodeId: null,
  filter: defaultFilter,
  isLoading: false,
  error: null,
  layout: 'force',
  zoom: 1,

  fetchGraphData: async (filter?: GraphFilter) => {
    set({ isLoading: true, error: null });
    try {
      const data = await graphApi.getGraphData(filter ?? get().filter);
      set({ graphData: data, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setFilter: (newFilter) => {
    const current = get().filter;
    const updated = { ...current, ...newFilter };
    set({ filter: updated });
    get().fetchGraphData(updated);
  },

  resetFilter: () => {
    set({ filter: defaultFilter });
    get().fetchGraphData(defaultFilter);
  },

  setLayout: (layout) => set({ layout }),
  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(2, zoom)) }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
```
</action>

<acceptance_criteria>
- `grep "interface GraphState" termsuite/src/stores/graphStore.ts` returns 1 line
- `grep "fetchGraphData\|selectNode\|setFilter" termsuite/src/stores/graphStore.ts` returns 6+ lines
- `grep "useGraphStore = create" termsuite/src/stores/graphStore.ts` returns 1 line
</acceptance_criteria>

---

## Task 6: Create Graph View Component

<objective>
Create the main Cytoscape graph visualization component per UI-SPEC Feature 1.
</objective>

<read_first>
- .planning/phases/02-knowledge-advanced/02-UI-SPEC.md (Graph View specifications)
- .planning/phases/02-knowledge-advanced/02-RESEARCH.md (Cytoscape configuration)
</read_first>

<action>
Create `termsuite/src/components/graph/GraphView.tsx`:

```typescript
import { useEffect, useRef, useCallback } from 'react';
import cytoscape, { Core, NodeSingular } from 'cytoscape';
import { useGraphStore } from '@/stores/graphStore';
import { useNoteStore } from '@/stores/noteStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { notesApi } from '@/lib/tauri';

interface GraphViewProps {
  onClose: () => void;
}

export function GraphView({ onClose }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const theme = useSettingsStore((s) => s.theme);
  const { graphData, selectedNodeId, layout, fetchGraphData, selectNode } = useGraphStore();
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const storagePath = useSettingsStore((s) => s.storagePath);

  // Theme-aware colors (from UI-SPEC)
  const colors = theme === 'dark'
    ? {
        node: '#58A6FF',
        selected: '#3FB950',
        broken: '#F85149',
        raw: '#D29922',
        wiki: '#58A6FF',
        outputs: '#8B949E',
        edge: '#8B949E',
        hover: '#58A6FF',
      }
    : {
        node: '#0969DA',
        selected: '#1A7F37',
        broken: '#CF222E',
        raw: '#9A6700',
        wiki: '#0969DA',
        outputs: '#6E7681',
        edge: '#30363D',
        hover: '#0969DA',
      };

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || !graphData) return;

    // Build Cytoscape elements
    const elements = {
      nodes: graphData.nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          connectionCount: node.connectionCount,
        },
      })),
      edges: graphData.edges.map((edge) => ({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
        },
      })),
    };

    // Node size based on degree (UI-SPEC: 24-48px)
    const getNodeSize = (node: NodeSingular) => {
      const degree = node.degree();
      return Math.min(48, 24 + degree * 4);
    };

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': colors.node,
            'label': 'data(label)',
            'width': getNodeSize,
            'height': getNodeSize,
            'font-size': '12px',
            'color': theme === 'dark' ? '#E6EDF3' : '#24292F',
            'text-valign': 'bottom',
            'text-margin-y': '8px',
            'border-width': 2,
            'border-color': theme === 'dark' ? '#30363D' : '#D0D7DE',
          },
        },
        {
          selector: 'node[type="raw"]',
          style: { 'background-color': colors.raw },
        },
        {
          selector: 'node[type="outputs"]',
          style: { 'background-color': colors.outputs },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': colors.selected,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': colors.edge,
            'curve-style': 'bezier',
            'opacity': 0.6,
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            'width': 2,
            'line-color': colors.hover,
            'opacity': 1,
          },
        },
      ],
      layout: {
        name: layout === 'force' ? 'fcose' : layout,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50,
        // fcose-specific settings from RESEARCH.md
        ...(layout === 'force' && {
          quality: 'proof',
          idealEdgeLength: 100,
          nodeRepulsion: 4500,
          numIter: 1000,
        }),
      } as cytoscape.LayoutOptions,
    });

    cyRef.current = cy;

    // Click handler: navigate to note
    cy.on('tap', 'node', async (evt) => {
      const noteId = evt.target.id();
      selectNode(noteId);
      
      if (storagePath) {
        try {
          const note = await notesApi.get(noteId, storagePath);
          setActiveNote(note);
          onClose();
        } catch (err) {
          console.error('Failed to load note:', err);
        }
      }
    });

    // Hover handler: highlight connected edges
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      node.connectedEdges().addClass('highlighted');
    });

    cy.on('mouseout', 'node', (evt) => {
      evt.target.connectedEdges().removeClass('highlighted');
    });

    // Fit to view
    cy.fit(undefined, 50);

    return () => {
      cy.destroy();
    };
  }, [graphData, layout, theme]);

  // Fetch data on mount
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Handle search highlighting
  const handleSearch = useCallback((query: string) => {
    if (!cyRef.current) return;
    
    if (!query) {
      cyRef.current.elements().removeClass('highlighted');
      cyRef.current.elements().style('opacity', 1);
      return;
    }

    const matchingNodes = cyRef.current.nodes()
      .filter((n) => n.data('label').toLowerCase().includes(query.toLowerCase()));

    cyRef.current.elements().style('opacity', 0.3);
    matchingNodes.style('opacity', 1);
    matchingNodes.addClass('highlighted');
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
```
</action>

<acceptance_criteria>
- `grep "export function GraphView" termsuite/src/components/graph/GraphView.tsx` returns 1 line
- `grep "cytoscape\|useGraphStore\|containerRef" termsuite/src/components/graph/GraphView.tsx` returns 6+ lines
- `grep "tap.*node\|mouseover.*node" termsuite/src/components/graph/GraphView.tsx` returns 2+ lines
</acceptance_criteria>

---

## Task 7: Create Graph Toolbar

<objective>
Create toolbar component with filter, search, zoom, and layout controls per UI-SPEC.
</objective>

<read_first>
- .planning/phases/02-knowledge-advanced/02-UI-SPEC.md (Toolbar specifications)
</read_first>

<action>
Create `termsuite/src/components/graph/GraphToolbar.tsx`:

```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Search,
  Minus,
  Plus,
  LayoutGrid,
  Maximize2,
  Filter,
} from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';

interface GraphToolbarProps {
  onClose: () => void;
  onFit: () => void;
}

export function GraphToolbar({ onClose, onFit }: GraphToolbarProps) {
  const { zoom, layout, setZoom, setLayout, setFilter } = useGraphStore();

  const handleZoomIn = () => setZoom(zoom + 0.1);
  const handleZoomOut = () => setZoom(zoom - 0.1);
  const handleLayoutToggle = () => {
    setLayout(layout === 'force' ? 'grid' : 'force');
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-background border-b flex items-center px-4 gap-4 z-10">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onClose}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回笔记
      </Button>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 w-48"
          placeholder="搜索节点..."
          onChange={(e) => setFilter({ searchQuery: e.target.value })}
        />
      </div>

      {/* Filter button */}
      <Button variant="outline" size="icon">
        <Filter className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border" />

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handleZoomOut}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon" onClick={handleZoomIn}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Layout toggle */}
      <Button variant="outline" size="icon" onClick={handleLayoutToggle}>
        <LayoutGrid className="h-4 w-4" />
      </Button>

      {/* Fullscreen/fit */}
      <Button variant="outline" size="icon" onClick={onFit}>
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
```
</action>

<acceptance_criteria>
- `grep "export function GraphToolbar" termsuite/src/components/graph/GraphToolbar.tsx` returns 1 line
- `grep "返回笔记\|搜索节点" termsuite/src/components/graph/GraphToolbar.tsx` returns 2 lines
- `grep "ArrowLeft\|Search\|Filter\|Minus\|Plus" termsuite/src/components/graph/GraphToolbar.tsx` returns 5+ lines
</acceptance_criteria>

---

## Task 8: Create Filter Dropdown

<objective>
Create filter dropdown component per UI-SPEC Filter Options.
</objective>

<read_first>
- .planning/phases/02-knowledge-advanced/02-UI-SPEC.md (Filter Options)
</read_first>

<action>
Create `termsuite/src/components/graph/GraphFilterDropdown.tsx`:

```typescript
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';

export function GraphFilterDropdown() {
  const [open, setOpen] = useState(false);
  const { filter, setFilter, resetFilter } = useGraphStore();

  const nodeTypes = [
    { value: 'all', label: '全部' },
    { value: 'raw', label: '原始内容' },
    { value: 'wiki', label: 'Wiki 内容' },
    { value: 'outputs', label: '输出' },
  ];

  const connectionThresholds = [
    { value: 0, label: '全部' },
    { value: 3, label: '3+ 连接' },
    { value: 5, label: '5+ 连接' },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          {/* Node type filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">节点类型</label>
            <div className="flex flex-wrap gap-2">
              {nodeTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={filter.nodeType === type.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter({ nodeType: type.value as any })}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Connection threshold filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">连接数阈值</label>
            <div className="flex gap-2">
              {connectionThresholds.map((thresh) => (
                <Button
                  key={thresh.value}
                  variant={filter.minConnections === thresh.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter({ minConnections: thresh.value })}
                >
                  {thresh.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Reset button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              resetFilter();
              setOpen(false);
            }}
          >
            重置筛选
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```
</action>

<acceptance_criteria>
- `grep "export function GraphFilterDropdown" termsuite/src/components/graph/GraphFilterDropdown.tsx` returns 1 line
- `grep "节点类型\|连接数阈值\|重置筛选" termsuite/src/components/graph/GraphFilterDropdown.tsx` returns 3 lines
- `grep "all\|raw\|wiki\|outputs" termsuite/src/components/graph/GraphFilterDropdown.tsx` returns 4+ lines
</acceptance_criteria>

---

## Task 9: Add Graph Entry to Sidebar

<objective>
Add Knowledge Graph button to Sidebar navigation per UI-SPEC entry points.
</objective>

<read_first>
- termsuite/src/components/layout/Sidebar.tsx (existing structure)
</read_first>

<action>
Modify `termsuite/src/components/layout/Sidebar.tsx`:

1. Add import for Graph icon and state:
```typescript
import { Settings, PanelLeftClose, PanelLeft, Network } from 'lucide-react';
import { useState } from 'react';
```

2. Add GraphView import:
```typescript
import { GraphView } from '@/components/graph/GraphView';
```

3. Add state for graph modal:
```typescript
const [showGraph, setShowGraph] = useState(false);
```

4. Add graph button before Settings button:
```tsx
<Button
  variant="ghost"
  size="sm"
  className="w-full justify-start"
  onClick={() => setShowGraph(true)}
>
  <Network className="mr-2 h-4 w-4" />
  知识图谱
</Button>
```

5. Add GraphView modal at end of return:
```tsx
{showGraph && <GraphView onClose={() => setShowGraph(false)} />}
```
</action>

<acceptance_criteria>
- `grep "Network\|知识图谱" termsuite/src/components/layout/Sidebar.tsx` returns 2+ lines
- `grep "GraphView\|showGraph" termsuite/src/components/layout/Sidebar.tsx` returns 4+ lines
</acceptance_criteria>

---

## Validation

After completing all tasks:

1. **Build Check:**
   ```bash
   npm run build --prefix termsuite
   cargo build --manifest-path termsuite/src-tauri/Cargo.toml
   ```

2. **Component Structure:**
   ```bash
   ls termsuite/src/components/graph/
   # Should list: GraphView.tsx, GraphToolbar.tsx, GraphFilterDropdown.tsx
   ```

3. **Store Check:**
   ```bash
   ls termsuite/src/stores/graphStore.ts
   ```

---

*Plan created: 2026-04-14*
*Phase: 02-knowledge-advanced*
