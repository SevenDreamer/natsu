/**
 * File Watchers Component
 *
 * Displays and manages file system watchers for automation.
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  FolderOpen,
  Clock,
  FileText,
  Edit,
  Eye,
} from 'lucide-react';
import { FileWatcherConfig } from './FileWatcherConfig';

interface FileEvent {
  id: string;
  watcher_id: string;
  event_type: string;
  path: string;
  details?: string;
  timestamp: number;
}

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

export function FileWatchers() {
  const [watchers, setWatchers] = useState<FileWatcher[]>([]);
  const [events, setEvents] = useState<FileEvent[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [editingWatcher, setEditingWatcher] = useState<FileWatcher | null>(null);
  const [selectedWatcherId, setSelectedWatcherId] = useState<string | null>(null);

  useEffect(() => {
    fetchWatchers();
    fetchScripts();
    fetchEvents();

    // Listen for file events
    const unlisten = listen<FileEvent>('file-event', (event) => {
      setEvents((prev) => [event.payload, ...prev].slice(0, 100));
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const fetchWatchers = async () => {
    setLoading(true);
    try {
      const result = await invoke<FileWatcher[]>('list_file_watchers');
      setWatchers(result);
    } catch (error) {
      console.error('Failed to fetch watchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScripts = async () => {
    try {
      const result = await invoke<Script[]>('get_scripts_for_trigger');
      setScripts(result);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    }
  };

  const fetchEvents = async (watcherId?: string) => {
    try {
      const result = await invoke<FileEvent[]>('get_file_events', {
        watcherId,
        limit: 50,
      });
      setEvents(result);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const handleToggle = async (watcher: FileWatcher) => {
    try {
      await invoke('update_file_watcher', {
        id: watcher.id,
        enabled: !watcher.enabled,
      });
      setWatchers(
        watchers.map((w) =>
          w.id === watcher.id ? { ...w, enabled: !w.enabled } : w
        )
      );
    } catch (error) {
      console.error('Failed to toggle watcher:', error);
      alert(`操作失败: ${error}`);
    }
  };

  const handleDelete = async (watcher: FileWatcher) => {
    if (!confirm(`确定要删除监控器 "${watcher.name}" 吗？`)) return;

    try {
      await invoke('delete_file_watcher', { id: watcher.id });
      setWatchers(watchers.filter((w) => w.id !== watcher.id));
      if (selectedWatcherId === watcher.id) {
        setSelectedWatcherId(null);
      }
    } catch (error) {
      console.error('Failed to delete watcher:', error);
      alert(`删除失败: ${error}`);
    }
  };

  const handleConfigSave = async () => {
    setShowConfig(false);
    setEditingWatcher(null);
    await fetchWatchers();
  };

  const filteredWatchers = watchers.filter(
    (watcher) =>
      watcher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      watcher.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = selectedWatcherId
    ? events.filter((e) => e.watcher_id === selectedWatcherId)
    : events;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'create':
        return <Plus className="h-3 w-3 text-green-500" />;
      case 'modify':
        return <Edit className="h-3 w-3 text-blue-500" />;
      case 'delete':
        return <Trash2 className="h-3 w-3 text-red-500" />;
      default:
        return <FileText className="h-3 w-3 text-gray-500" />;
    }
  };

  const getScriptName = (id?: string) => {
    if (!id) return null;
    const script = scripts.find((s) => s.id === id);
    return script?.name || id;
  };

  if (showConfig) {
    return (
      <FileWatcherConfig
        watcher={editingWatcher}
        scripts={scripts}
        onSave={handleConfigSave}
        onCancel={() => {
          setShowConfig(false);
          setEditingWatcher(null);
        }}
      />
    );
  }

  return (
    <div className="h-full flex">
      {/* Watcher List */}
      <div className="flex-1 flex flex-col border-r">
        {/* Header */}
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索监控器..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={() => setShowConfig(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              新建
            </Button>
          </div>
        </div>

        {/* Watcher List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : filteredWatchers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '没有找到匹配的监控器' : '还没有监控器，点击"新建"创建一个'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWatchers.map((watcher) => (
                  <div
                    key={watcher.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedWatcherId === watcher.id
                        ? 'bg-accent border-accent'
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => {
                      setSelectedWatcherId(
                        selectedWatcherId === watcher.id ? null : watcher.id
                      );
                      fetchEvents(watcher.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{watcher.name}</span>
                          {watcher.enabled ? (
                            <ToggleRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate ml-6">
                          {watcher.path}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground ml-6">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(watcher.created_at)}
                          </span>
                          {watcher.recursive && (
                            <span className="px-1.5 py-0.5 rounded bg-secondary">
                              递归
                            </span>
                          )}
                          {watcher.event_types.map((type) => (
                            <span
                              key={type}
                              className="px-1.5 py-0.5 rounded bg-secondary"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                        {watcher.trigger_script_id && (
                          <div className="text-xs text-muted-foreground mt-1 ml-6">
                            触发脚本: {getScriptName(watcher.trigger_script_id)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(watcher);
                          }}
                        >
                          {watcher.enabled ? (
                            <ToggleRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(watcher);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Events Panel */}
      <div className="w-80 flex flex-col flex-shrink-0">
        <div className="p-3 border-b font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          事件日志
          {selectedWatcherId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedWatcherId(null);
                fetchEvents();
              }}
            >
              显示全部
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                暂无事件
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-2 rounded border text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.event_type)}
                      <span className="font-medium">{event.event_type}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-1">
                      {event.path}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
