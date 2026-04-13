import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Settings, PanelLeftClose, PanelLeft } from 'lucide-react';
import { FileTree } from '@/components/navigation/FileTree';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 gap-4 w-12 border-r bg-background">
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col w-60 border-r bg-background">
      <div className="h-12 flex items-center justify-between px-4 border-b">
        <h1 className="font-semibold">TermSuite</h1>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <FileTree />
      </div>

      <Separator />
      <div className="p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
