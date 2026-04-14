/**
 * Task Editor Component
 *
 * Dialog for creating and editing scheduled tasks.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SchedulePicker } from './SchedulePicker';
import { useAutomationStore, ScheduledTask, CreateScheduledTaskInput } from '@/stores/automationStore';

interface TaskEditorProps {
  task?: ScheduledTask;
  onSave: () => void;
  onCancel: () => void;
}

export function TaskEditor({ task, onSave, onCancel }: TaskEditorProps) {
  const { createScheduledTask, updateScheduledTask, scripts } = useAutomationStore();
  const [name, setName] = useState(task?.name || '');
  const [description, setDescription] = useState(task?.description || '');
  const [taskType, setTaskType] = useState<'script' | 'command' | 'api'>(
    (task?.taskType as 'script' | 'command' | 'api') || 'command'
  );
  const [scheduleType, setScheduleType] = useState<'simple' | 'cron' | 'once'>(
    (task?.scheduleType as 'simple' | 'cron' | 'once') || 'simple'
  );
  const [scheduleConfig, setScheduleConfig] = useState<string>(
    task?.scheduleConfig || '{"interval_secs":3600}'
  );
  const [command, setCommand] = useState('');
  const [scriptId, setScriptId] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiMethod, setApiMethod] = useState('GET');
  const [retryEnabled, setRetryEnabled] = useState(false);
  const [maxRetries, setMaxRetries] = useState(3);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task?.taskConfig) {
      try {
        const config = JSON.parse(task.taskConfig);
        if (task.taskType === 'command') {
          setCommand(config.command || '');
        } else if (task.taskType === 'script') {
          setScriptId(config.script_id || '');
        } else if (task.taskType === 'api') {
          setApiUrl(config.url || '');
          setApiMethod(config.method || 'GET');
        }
      } catch {}
    }
    if (task?.retryConfig) {
      try {
        const retry = JSON.parse(task.retryConfig);
        setRetryEnabled(retry.max_retries > 0);
        setMaxRetries(retry.max_retries || 3);
      } catch {}
    }
  }, [task]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('请输入任务名称');
      return;
    }

    let taskConfig = '{}';
    if (taskType === 'command') {
      taskConfig = JSON.stringify({
        command,
        timeout_secs: 60,
      });
    } else if (taskType === 'script') {
      taskConfig = JSON.stringify({
        script_id: scriptId,
        parameters: {},
        timeout_secs: 60,
      });
    } else if (taskType === 'api') {
      taskConfig = JSON.stringify({
        url: apiUrl,
        method: apiMethod,
        timeout_secs: 30,
      });
    }

    const retryConfig = retryEnabled
      ? JSON.stringify({
          max_retries: maxRetries,
          retry_interval_secs: 60,
          backoff_multiplier: 2.0,
        })
      : undefined;

    const input: CreateScheduledTaskInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      scheduleType,
      scheduleConfig,
      taskType,
      taskConfig,
      retryConfig,
      enabled: true,
    };

    setLoading(true);
    try {
      if (task) {
        await updateScheduledTask(task.id, input);
      } else {
        await createScheduledTask(input);
      }
      onSave();
    } catch (error) {
      alert(`保存失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? '编辑任务' : '新建任务'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name">任务名称 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 每日备份"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="任务描述（可选）"
              rows={2}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label>调度配置</Label>
            <SchedulePicker
              type={scheduleType}
              config={scheduleConfig}
              onTypeChange={setScheduleType}
              onConfigChange={setScheduleConfig}
            />
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <Label htmlFor="taskType">任务类型</Label>
            <Select value={taskType} onValueChange={(v) => setTaskType(v as typeof taskType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="command">执行命令</SelectItem>
                <SelectItem value="script">运行脚本</SelectItem>
                <SelectItem value="api">API 请求</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Task Type Specific Config */}
          {taskType === 'command' && (
            <div className="space-y-2">
              <Label htmlFor="command">命令</Label>
              <Textarea
                id="command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="例如: backup.sh"
                rows={2}
              />
            </div>
          )}

          {taskType === 'script' && (
            <div className="space-y-2">
              <Label htmlFor="script">选择脚本</Label>
              <Select value={scriptId} onValueChange={setScriptId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择一个脚本" />
                </SelectTrigger>
                <SelectContent>
                  {scripts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {taskType === 'api' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="method">请求方法</Label>
                <Select value={apiMethod} onValueChange={setApiMethod}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiUrl">URL</Label>
                <Input
                  id="apiUrl"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                />
              </div>
            </>
          )}

          {/* Retry Config */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>失败重试</Label>
              <Switch checked={retryEnabled} onCheckedChange={setRetryEnabled} />
            </div>
            {retryEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">重试次数</span>
                <Input
                  type="number"
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                  className="w-20"
                  min={0}
                  max={10}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
