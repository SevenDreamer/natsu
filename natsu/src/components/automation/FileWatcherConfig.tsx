/**
 * File Watcher Configuration Component
 *
 * Form for creating and editing file watchers.
 */

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, X, FolderOpen } from 'lucide-react';

interface FileWatcher {
  id: string;
  name: string;
  path: string;
  recursive: boolean;
  event_types: string[];
  enabled: boolean;
  trigger_script_id?: string;
  created_at: number;
}

interface Script {
  id: string;
  name: string;
}

interface FileWatcherConfigProps {
  watcher: FileWatcher | null;
  scripts: Script[];
  onSave: () => void;
  onCancel: () => void;
}

const EVENT_TYPES = [
  { value: 'any', label: '任何变更' },
  { value: 'create', label: '创建' },
  { value: 'modify', label: '修改' },
  { value: 'delete', label: '删除' },
];

export function FileWatcherConfig({
  watcher,
  scripts,
  onSave,
  onCancel,
}: FileWatcherConfigProps) {
  const [name, setName] = useState(watcher?.name || '');
  const [path, setPath] = useState(watcher?.path || '');
  const [recursive, setRecursive] = useState(watcher?.recursive ?? true);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    watcher?.event_types || ['any']
  );
  const [triggerScriptId, setTriggerScriptId] = useState<string>(
    watcher?.trigger_script_id || ''
  );
  const [saving, setSaving] = useState(false);

  const handleBrowse = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择监控目录',
    });

    if (selected && typeof selected === 'string') {
      setPath(selected);
    }
  };

  const handleEventToggle = (eventType: string) => {
    if (eventType === 'any') {
      setSelectedEvents(['any']);
    } else {
      let newEvents = selectedEvents.filter((e) => e !== 'any');
      if (selectedEvents.includes(eventType)) {
        newEvents = newEvents.filter((e) => e !== eventType);
      } else {
        newEvents = [...newEvents, eventType];
      }
      setSelectedEvents(newEvents.length > 0 ? newEvents : ['any']);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('请输入监控器名称');
      return;
    }
    if (!path.trim()) {
      alert('请选择监控路径');
      return;
    }

    setSaving(true);
    try {
      if (watcher) {
        // Update existing watcher - for now just recreate
        await invoke('delete_file_watcher', { id: watcher.id });
      }

      await invoke('create_file_watcher', {
        input: {
          name,
          path,
          recursive,
          event_types: selectedEvents,
          trigger_script_id: triggerScriptId || null,
        },
      });

      onSave();
    } catch (error) {
      console.error('Failed to save watcher:', error);
      alert(`保存失败: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">
            {watcher ? '编辑文件监控' : '新建文件监控'}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              取消
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="监控器名称"
            />
          </div>

          {/* Path */}
          <div className="space-y-2">
            <label className="text-sm font-medium">监控路径</label>
            <div className="flex items-center gap-2">
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/directory"
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={handleBrowse}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Recursive */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recursive}
                onChange={(e) => setRecursive(e.target.checked)}
                className="rounded"
              />
              递归监控子目录
            </label>
          </div>

          {/* Event Types */}
          <div className="space-y-2">
            <label className="text-sm font-medium">事件类型</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((et) => (
                <button
                  key={et.value}
                  onClick={() => handleEventToggle(et.value)}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    selectedEvents.includes(et.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Script */}
          <div className="space-y-2">
            <label className="text-sm font-medium">触发脚本 (可选)</label>
            <select
              value={triggerScriptId}
              onChange={(e) => setTriggerScriptId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="">无</option>
              {scripts.map((script) => (
                <option key={script.id} value={script.id}>
                  {script.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              当检测到文件变更时，自动执行选中的脚本
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
