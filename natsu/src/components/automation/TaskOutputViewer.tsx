/**
 * Task Output Viewer Component
 *
 * Real-time output display for task execution.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Loader2, Copy, Trash2 } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { cn } from '@/lib/utils';

interface TaskOutputViewerProps {
  taskId: string;
  executionId: string;
  status?: 'pending' | 'running' | 'success' | 'failed';
  onComplete?: () => void;
}

export function TaskOutputViewer({ taskId, executionId, status = 'running', onComplete }: TaskOutputViewerProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to task output events
    const unlistenOutput = listen<string>(`task-output-${taskId}`, (event) => {
      setOutput((prev) => [...prev, event.payload]);
    });

    // Subscribe to task completion events
    const unlistenComplete = listen<{ exit_code: number; duration_ms?: number; error_message?: string }>(
      `task-complete-${taskId}`,
      (event) => {
        if (event.payload.exit_code === 0) {
          setCurrentStatus('success');
        } else {
          setCurrentStatus('failed');
          if (event.payload.error_message) {
            setError(event.payload.error_message);
          }
        }
        setDuration(event.payload.duration_ms);
        onComplete?.();
      }
    );

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, [taskId, onComplete]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output.join('\n'));
  };

  const handleClear = () => {
    setOutput([]);
    setError(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Status Header */}
      <div className="p-3 border-b flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentStatus === 'running' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-blue-500">执行中</span>
            </>
          )}
          {currentStatus === 'success' && (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-500">
                完成 {duration && `(${duration}ms)`}
              </span>
            </>
          )}
          {currentStatus === 'failed' && (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-500">
                失败 {duration && `(${duration}ms)`}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleCopy} title="复制输出">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear} title="清空输出">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Output Area */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {output.length === 0 && currentStatus === 'running' && (
            <div className="text-center text-muted-foreground">等待输出...</div>
          )}
          {output.length === 0 && currentStatus !== 'running' && (
            <div className="text-center text-muted-foreground">无输出</div>
          )}
          {output.length > 0 && (
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {output.join('\n')}
            </pre>
          )}
          {error && (
            <pre className="text-xs font-mono text-red-500 mt-2 whitespace-pre-wrap break-all">
              {error}
            </pre>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}