import { create } from 'zustand';
import { GraphData, GraphFilter, graphApi } from '@/lib/tauri';

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
  node_type: 'all',
  min_connections: 0,
  directory: undefined,
  search_query: undefined,
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