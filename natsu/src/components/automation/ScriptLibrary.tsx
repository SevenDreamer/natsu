/**
 * Script Library Component
 *
 * Displays and manages saved scripts in the automation library.
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Search,
  Play,
  Pencil,
  Trash2,
  Tag,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { ScriptEditor } from './ScriptEditor';
import { useAutomationStore } from '@/stores/automationStore';

interface ScriptParameter {
  name: string;
  description?: string;
  default_value?: string;
  required: boolean;
}

interface Script {
  id: string;
  name: string;
  description?: string;
  script_path: string;
  interpreter: string;
  tags: string[];
  parameters: ScriptParameter[];
  created_at: number;
  updated_at: number;
}

interface ScriptSafetyInfo {
  level: 'safe' | 'caution' | 'dangerous';
  warnings: string[];
}

interface ScriptExecutionResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
}

export function ScriptLibrary() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ScriptExecutionResult | null>(null);
  const [safetyInfo, setSafetyInfo] = useState<ScriptSafetyInfo | null>(null);
  const [showSafetyConfirm, setShowSafetyConfirm] = useState(false);

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    setLoading(true);
    try {
      const result = await invoke<Script[]>('list_scripts');
      setScripts(result);
    } catch (error) {
      console.error('Failed to fetch scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedScript(null);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEdit = (script: Script) => {
    setSelectedScript(script);
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleDelete = async (script: Script) => {
    if (!confirm(`确定要删除脚本 "${script.name}" 吗？`)) return;

    try {
      await invoke('delete_script', { id: script.id });
      setScripts(scripts.filter((s) => s.id !== script.id));
      if (selectedScript?.id === script.id) {
        setSelectedScript(null);
      }
    } catch (error) {
      console.error('Failed to delete script:', error);
      alert(`删除失败: ${error}`);
    }
  };

  const handleExecute = async (script: Script) => {
    // Get safety info first
    try {
      const safety = await invoke<ScriptSafetyInfo>('get_script_safety', { id: script.id });
      setSafetyInfo(safety);

      if (safety.level === 'dangerous') {
        setShowSafetyConfirm(true);
        setSelectedScript(script);
        return;
      }

      if (safety.level === 'caution') {
        const confirmed = confirm(
          `此脚本包含以下风险操作:\n${safety.warnings.join('\n')}\n\n确定要执行吗？`
        );
        if (!confirmed) return;
      }

      await executeScript(script);
    } catch (error) {
      console.error('Failed to get safety info:', error);
    }
  };

  const executeScript = async (script: Script, params?: Record<string, string>) => {
    setExecutingId(script.id);
    setExecutionResult(null);

    try {
      const result = await invoke<ScriptExecutionResult>('execute_script', {
        input: {
          script_id: script.id,
          parameters: params || {},
          timeout: 60,
        },
      });
      setExecutionResult(result);
    } catch (error) {
      setExecutionResult({
        exit_code: -1,
        stdout: '',
        stderr: String(error),
        duration_ms: 0,
      });
    } finally {
      setExecutingId(null);
      setShowSafetyConfirm(false);
    }
  };

  const handleEditorSave = async () => {
    setIsEditing(false);
    setIsCreating(false);
    await fetchScripts();
  };

  const handleEditorCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
  };

  const filteredScripts = scripts.filter(
    (script) =>
      script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isEditing) {
    return (
      <ScriptEditor
        script={selectedScript}
        isNew={isCreating}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索脚本..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新建
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Script List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : filteredScripts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '没有找到匹配的脚本' : '还没有脚本，点击"新建"创建一个'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredScripts.map((script) => (
                  <div
                    key={script.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedScript?.id === script.id
                        ? 'bg-accent border-accent'
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedScript(script)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{script.name}</div>
                        {script.description && (
                          <div className="text-sm text-muted-foreground truncate">
                            {script.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(script.updated_at)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-secondary">
                            {script.interpreter}
                          </span>
                        </div>
                        {script.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {script.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-1.5 py-0.5 rounded bg-secondary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecute(script);
                          }}
                          disabled={executingId === script.id}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(script);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(script);
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

        {/* Execution Result Panel */}
        {executionResult && (
          <div className="w-80 border-l flex flex-col flex-shrink-0">
            <div className="p-3 border-b font-medium">执行结果</div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium ${
                      executionResult.exit_code === 0
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    退出码: {executionResult.exit_code}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {executionResult.duration_ms}ms
                  </span>
                </div>

                {executionResult.stdout && (
                  <div>
                    <div className="text-sm font-medium mb-1">标准输出</div>
                    <pre className="text-xs bg-secondary p-2 rounded overflow-auto max-h-40">
                      {executionResult.stdout}
                    </pre>
                  </div>
                )}

                {executionResult.stderr && (
                  <div>
                    <div className="text-sm font-medium mb-1 text-red-500">标准错误</div>
                    <pre className="text-xs bg-red-50 dark:bg-red-950 p-2 rounded overflow-auto max-h-40 text-red-700 dark:text-red-300">
                      {executionResult.stderr}
                    </pre>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExecutionResult(null)}
                  className="w-full"
                >
                  关闭
                </Button>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Safety Confirmation Dialog */}
      {showSafetyConfirm && safetyInfo && selectedScript && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">危险脚本警告</span>
            </div>
            <p className="text-sm mb-4">
              此脚本包含以下危险操作:
            </p>
            <ul className="text-sm space-y-1 mb-4">
              {safetyInfo.warnings.map((warning, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  {warning}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSafetyConfirm(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => executeScript(selectedScript)}
              >
                确认执行
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
