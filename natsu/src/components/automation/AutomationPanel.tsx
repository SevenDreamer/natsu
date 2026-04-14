/**
 * Automation Panel
 *
 * Main panel for automation features with tab navigation.
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommandHistory } from './CommandHistory';
import { ApiCalls } from './ApiCalls';
import { ScriptLibrary } from './ScriptLibrary';
import { History, Eye, Code, Webhook } from 'lucide-react';

interface AutomationPanelProps {
  onRerunCommand?: (command: string) => void;
}

export function AutomationPanel({ onRerunCommand }: AutomationPanelProps) {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
        <TabsTrigger value="history" className="flex items-center gap-1">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">历史</span>
        </TabsTrigger>
        <TabsTrigger value="scripts" className="flex items-center gap-1">
          <Code className="h-4 w-4" />
          <span className="hidden sm:inline">脚本</span>
        </TabsTrigger>
        <TabsTrigger value="files" className="flex items-center gap-1">
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">文件</span>
        </TabsTrigger>
        <TabsTrigger value="api" className="flex items-center gap-1">
          <Webhook className="h-4 w-4" />
          <span className="hidden sm:inline">API</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="history" className="flex-1 mt-0">
        <CommandHistory onRerun={onRerunCommand} />
      </TabsContent>

      <TabsContent value="scripts" className="flex-1 mt-0 overflow-hidden">
        <ScriptLibrary />
      </TabsContent>

      <TabsContent value="files" className="flex-1 mt-0">
        <div className="h-full flex items-center justify-center text-muted-foreground">
          文件监控功能即将推出 (Phase 6, Plan 03)
        </div>
      </TabsContent>

      <TabsContent value="api" className="flex-1 mt-0 overflow-auto">
        <ApiCalls />
      </TabsContent>
    </Tabs>
  );
}