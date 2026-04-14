import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Settings, PanelLeftClose, PanelLeft, Network, MessageSquare, Zap } from 'lucide-react';
import { useState } from 'react';
import { FileTree } from '@/components/navigation/FileTree';
import { GraphView } from '@/components/graph/GraphView';
import { useUIStore } from '@/stores/uiStore';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [showGraph, setShowGraph] = useState(false);
  const toggleChat = useUIStore((s) => s.toggleChat);
  const toggleAutomation = useUIStore((s) => s.toggleAutomation);
  const chatOpen = useUIStore((s) => s.chatOpen);
  const automationOpen = useUIStore((s) => s.automationOpen);

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
    <>
      <div className="h-full flex flex-col w-60 border-r bg-background">
        <div className="h-12 flex items-center justify-between px-4 border-b">
          <h1 className="font-semibold">纳兹 Natsu</h1>
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
        <div className="p-2 space-y-1">
          <Button
            variant={chatOpen ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={toggleChat}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            AI Chat
          </Button>
          <Button
            variant={automationOpen ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start"
            onClick={toggleAutomation}
          >
            <Zap className="mr-2 h-4 w-4" />
            自动化
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setShowGraph(true)}
          >
            <Network className="mr-2 h-4 w-4" />
            Knowledge Graph
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {showGraph && <GraphView onClose={() => setShowGraph(false)} />}
    </>
  );
}
