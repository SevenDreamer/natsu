import { useEffect, useRef } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { useGraphStore } from '@/stores/graphStore';
import { useNoteStore } from '@/stores/noteStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { notesApi } from '@/lib/tauri';
import { GraphToolbar } from './GraphToolbar';

interface GraphViewProps {
  onClose: () => void;
}

export function GraphView({ onClose }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const theme = useSettingsStore((s) => s.theme);
  const { graphData, layout, fetchGraphData, selectNode } = useGraphStore();
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const storagePath = useSettingsStore((s) => s.storagePath);

  // Theme-aware colors
  const colors = theme === 'dark'
    ? {
        node: '#58A6FF',
        selected: '#3FB950',
        raw: '#D29922',
        wiki: '#58A6FF',
        outputs: '#8B949E',
        edge: '#8B949E',
        hover: '#58A6FF',
      }
    : {
        node: '#0969DA',
        selected: '#1A7F37',
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
          connectionCount: node.connection_count,
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

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': colors.node,
            'label': 'data(label)',
            'width': 24,
            'height': 24,
            'font-size': 12,
            'color': theme === 'dark' ? '#E6EDF3' : '#24292F',
            'text-valign': 'bottom',
            'text-margin-y': 8,
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
        name: layout === 'force' ? 'random' : layout,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50,
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
      evt.target.connectedEdges().addClass('highlighted');
    });

    cy.on('mouseout', 'node', (evt) => {
      evt.target.connectedEdges().removeClass('highlighted');
    });

    // Fit to view
    cy.fit(undefined, 50);

    return () => {
      cy.destroy();
    };
  }, [graphData, layout, theme, storagePath, selectNode, setActiveNote, onClose, colors]);

  // Fetch data on mount
  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <GraphToolbar onClose={onClose} onFit={handleFit} />
      <div ref={containerRef} className="w-full h-full pt-12" />
    </div>
  );
}
