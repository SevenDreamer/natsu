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
    { value: 'all', label: 'All' },
    { value: 'raw', label: 'Raw' },
    { value: 'wiki', label: 'Wiki' },
    { value: 'outputs', label: 'Outputs' },
  ];

  const connectionThresholds = [
    { value: 0, label: 'All' },
    { value: 3, label: '3+ connections' },
    { value: 5, label: '5+ connections' },
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
            <label className="text-sm font-medium mb-2 block">Node Type</label>
            <div className="flex flex-wrap gap-2">
              {nodeTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={filter.node_type === type.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter({ node_type: type.value as any })}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Connection threshold filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Connections</label>
            <div className="flex gap-2">
              {connectionThresholds.map((thresh) => (
                <Button
                  key={thresh.value}
                  variant={filter.min_connections === thresh.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter({ min_connections: thresh.value })}
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
            Reset Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
