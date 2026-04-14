/**
 * Task Execution History Component
 *
 * Displays execution history for a scheduled task.
 */

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAutomationStore, TaskExecution } from '@/stores/automationStore';
import { cn } from '@/lib/utils';

interface TaskExecutionHistoryProps {
  taskId: string;
  limit?: number;
}

export function TaskExecutionHistory({ taskId, limit = 20 }: TaskExecutionHistoryProps) {
  const { taskExecutions, fetchTaskExecutions } = useAutomationStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTaskExecutions(taskId, limit);
  }, [taskId, limit, fetchTaskExecutions]);

  const getStatusBadge = (status: TaskExecution['status']) => {
    const badges = {
      pending: { label: '等待中', color: 'bg-gray-100 text-gray-700', icon: Clock },
      running: { label: '执行中', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
      success: { label: '成功', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      failed: { label: '失败', color: 'bg-red-100 text-red-700', icon: XCircle },
      cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500', icon: XCircle },
    };
    return badges[status] || badges.pending;
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (taskExecutions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无执行记录
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-2">
        {taskExecutions.map((execution) => {
          const badge = getStatusBadge(execution.status);
          const Icon = badge.icon;
          const isExpanded = expandedId === execution.id;

          return (
            <div key={execution.id} className="border rounded-lg">
              <div
                className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : execution.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', execution.status === 'running' && 'animate-spin')} />
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', badge.color)}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDuration(execution.durationMs)}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>计划: {formatTime(execution.scheduledTime)}</span>
                  {execution.startedAt && (
                    <span>开始: {formatTime(execution.startedAt)}</span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  {execution.exitCode !== undefined && (
                    <div className="pt-2">
                      <span className="text-xs text-muted-foreground">退出码: </span>
                      <span className={cn(
                        'text-xs font-mono',
                        execution.exitCode === 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {execution.exitCode}
                      </span>
                    </div>
                  )}

                  {execution.stdout && (
                    <div>
                      <div className="text-xs font-medium mb-1">标准输出</div>
                      <pre className="text-xs bg-secondary p-2 rounded overflow-auto max-h-32 font-mono">
                        {execution.stdout}
                      </pre>
                    </div>
                  )}

                  {execution.stderr && (
                    <div>
                      <div className="text-xs font-medium mb-1 text-red-500">标准错误</div>
                      <pre className="text-xs bg-red-50 dark:bg-red-950 p-2 rounded overflow-auto max-h-32 font-mono text-red-700 dark:text-red-300">
                        {execution.stderr}
                      </pre>
                    </div>
                  )}

                  {execution.errorMessage && (
                    <div>
                      <div className="text-xs font-medium mb-1 text-red-500">错误信息</div>
                      <div className="text-xs text-red-600">{execution.errorMessage}</div>
                    </div>
                  )}

                  {execution.retryCount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      重试次数: {execution.retryCount}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
