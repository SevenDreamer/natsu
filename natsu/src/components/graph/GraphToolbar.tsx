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
import { GraphFilterDropdown } from './GraphFilterDropdown';

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
        Back
      </Button>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 w-48"
          placeholder="Search nodes..."
          onChange={(e) => setFilter({ search_query: e.target.value || undefined })}
        />
      </div>

      {/* Filter dropdown */}
      <GraphFilterDropdown />

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
