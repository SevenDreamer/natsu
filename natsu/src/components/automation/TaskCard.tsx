/**
 * Task Card Component
 *
 * Displays a single scheduled task with quick actions.
 */

import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Play, Clock, Calendar, Zap } from 'lucide-react';
import { useAutomationStore, ScheduledTask } from '@/stores/automationStore';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: ScheduledTask;
  selected?: boolean;
  onClick: () => void;
}

export function TaskCard({ task, selected, onClick }: TaskCardProps) {
  const { toggleScheduledTask, runTaskNow, runningTaskIds } = useAutomationStore();
  const isRunning = runningTaskIds.includes(task.id);

  const getScheduleTypeBadge = () => {
    const badges = {
      simple: { label: '间隔', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
      cron: { label: 'Cron', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
      once: { label: '一次', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
    };
    return badges[task.scheduleType as keyof typeof badges] || badges.simple;
  };

  const getScheduleDescription = () => {
    try {
      const config = JSON.parse(task.scheduleConfig);
      if (task.scheduleType === 'simple') {
        const mins = Math.floor(config.interval_secs / 60);
        if (mins < 60) return `每 ${mins} 分钟`;
        if (mins < 1440) return `每 ${Math.floor(mins / 60)} 小时`;
        return `每 ${Math.floor(mins / 1440)} 天`;
      }
      if (task.scheduleType === 'cron') {
        return config.expression || 'Cron 表达式';
      }
      if (task.scheduleType === 'once') {
        return new Date(config.execute_at * 1000).toLocaleString('zh-CN');
      }
    } catch {
      return '未知';
    }
    return '未知';
  };

  const formatNextRun = (timestamp?: number) => {
    if (!timestamp) return '未安排';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    if (diffMs < 0) return '已过期';
    if (diffMs < 60000) return '即将执行';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)} 分钟后`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)} 小时后`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const badge = getScheduleTypeBadge();

  return (
    <div
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-colors',
        selected ? 'bg-accent border-accent' : 'hover:bg-accent/50'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-medium truncate', !task.enabled && 'text-muted-foreground')}>
              {task.name}
            </span>
            <span className={cn('px-1.5 py-0.5 rounded text-xs', badge.color)}>
              {badge.label}
            </span>
          </div>
          {task.description && (
            <div className="text-sm text-muted-foreground truncate mt-0.5">
              {task.description}
            </div>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getScheduleDescription()}
            </span>
            {task.nextRunAt && task.enabled && (
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {formatNextRun(task.nextRunAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={task.enabled}
            onCheckedChange={(checked) => {
              toggleScheduledTask(task.id, checked);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              runTaskNow(task.id);
            }}
            disabled={isRunning}
          >
            <Play className={cn('h-4 w-4', isRunning && 'animate-pulse')} />
          </Button>
        </div>
      </div>
    </div>
  );
}
