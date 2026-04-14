/**
 * Command History Component
 *
 * Displays terminal command history with search, filter, and re-execution.
 */

import { useEffect, useState } from 'react';
import { useAutomationStore } from '@/stores/automationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  Play,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface CommandHistoryProps {
  onRerun?: (command: string) => void;
}

export function CommandHistory({ onRerun }: CommandHistoryProps) {
  const {
    commandHistory,
    historyLoading,
    historyError,
    historySearchQuery,
    fetchCommandHistory,
    deleteHistoryEntry,
    clearHistory,
    rerunCommand,
    setHistorySearchQuery,
  } = useAutomationStore();

  const [localSearch, setLocalSearch] = useState(historySearchQuery);

  useEffect(() => {
    fetchCommandHistory();
  }, [fetchCommandHistory]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== historySearchQuery) {
        setHistorySearchQuery(localSearch);
        fetchCommandHistory(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, historySearchQuery, setHistorySearchQuery, fetchCommandHistory]);

  const handleRerun = async (id: string, command: string) => {
    try {
      await rerunCommand(id);
      onRerun?.(command);
    } catch (error) {
      console.error('Failed to rerun command:', error);
    }
  };

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHistoryEntry(id);
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有命令历史吗？')) {
      try {
        await clearHistory();
      } catch (error) {
        console.error('Failed to clear history:', error);
      }
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">命令历史</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={commandHistory.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            清空
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索命令..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        {historyLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : historyError ? (
          <div className="p-4 text-center text-destructive">{historyError}</div>
        ) : commandHistory.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {localSearch ? '没有找到匹配的命令' : '暂无命令历史'}
          </div>
        ) : (
          <div className="divide-y">
            {commandHistory.map((entry) => (
              <div
                key={entry.id}
                className="p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono break-all">
                      {entry.command}
                    </code>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(entry.executed_at * 1000, {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                      {entry.exit_code !== undefined && (
                        <span className="flex items-center gap-1">
                          {entry.exit_code === 0 ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          退出码: {entry.exit_code}
                        </span>
                      )}
                      {entry.duration_ms !== undefined && (
                        <span>{formatDuration(entry.duration_ms)}</span>
                      )}
                    </div>
                    {entry.working_directory && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        📁 {entry.working_directory}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRerun(entry.id, entry.command)}
                      title="重新执行"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(entry.command)}
                      title="复制"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(entry.id)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
