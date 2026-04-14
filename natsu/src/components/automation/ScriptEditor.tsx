/**
 * Script Editor Component
 *
 * Editor for creating and editing scripts with parameter definitions.
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Save, X } from 'lucide-react';

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

interface ScriptEditorProps {
  script: Script | null;
  isNew: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const INTERPRETERS = ['bash', 'sh', 'python', 'node', 'ruby', 'perl'];

export function ScriptEditor({ script, isNew, onSave, onCancel }: ScriptEditorProps) {
  const [name, setName] = useState(script?.name || '');
  const [description, setDescription] = useState(script?.description || '');
  const [content, setContent] = useState('');
  const [interpreter, setInterpreter] = useState(script?.interpreter || 'bash');
  const [tags, setTags] = useState<string[]>(script?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [parameters, setParameters] = useState<ScriptParameter[]>(script?.parameters || []);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew && script) {
      loadScriptContent();
    } else {
      setLoading(false);
    }
  }, [script, isNew]);

  const loadScriptContent = async () => {
    if (!script) return;
    try {
      const result = await invoke<string>('get_script_content', { id: script.id });
      setContent(result);
    } catch (error) {
      console.error('Failed to load script content:', error);
      setContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAddParameter = () => {
    setParameters([
      ...parameters,
      { name: '', description: '', default_value: '', required: false },
    ]);
  };

  const handleUpdateParameter = (index: number, field: keyof ScriptParameter, value: string | boolean) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  const handleRemoveParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('请输入脚本名称');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await invoke('create_script', {
          input: {
            name,
            description: description || null,
            content,
            interpreter,
            tags: tags.length > 0 ? tags : null,
            parameters: parameters.length > 0 ? parameters : null,
          },
        });
      } else if (script) {
        await invoke('update_script', {
          id: script.id,
          input: {
            name,
            description: description || null,
            content,
            tags: tags.length > 0 ? tags : null,
            parameters: parameters.length > 0 ? parameters : null,
          },
        });
      }
      onSave();
    } catch (error) {
      console.error('Failed to save script:', error);
      alert(`保存失败: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{isNew ? '新建脚本' : '编辑脚本'}</h2>
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

      {/* Editor */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="脚本名称"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">描述</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选描述"
            />
          </div>

          {/* Interpreter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">解释器</label>
            <select
              value={interpreter}
              onChange={(e) => setInterpreter(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background"
              disabled={!isNew}
            >
              {INTERPRETERS.map((interp) => (
                <option key={interp} value={interp}>
                  {interp}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">标签</label>
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="添加标签"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button variant="outline" size="icon" onClick={handleAddTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Parameters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">参数定义</label>
              <Button variant="outline" size="sm" onClick={handleAddParameter}>
                <Plus className="h-4 w-4 mr-1" />
                添加参数
              </Button>
            </div>
            {parameters.length > 0 && (
              <div className="space-y-2">
                {parameters.map((param, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">参数 {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveParameter(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={param.name}
                        onChange={(e) =>
                          handleUpdateParameter(index, 'name', e.target.value)
                        }
                        placeholder="参数名称"
                      />
                      <Input
                        value={param.description || ''}
                        onChange={(e) =>
                          handleUpdateParameter(index, 'description', e.target.value)
                        }
                        placeholder="描述"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={param.default_value || ''}
                        onChange={(e) =>
                          handleUpdateParameter(index, 'default_value', e.target.value)
                        }
                        placeholder="默认值"
                        className="flex-1"
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) =>
                            handleUpdateParameter(index, 'required', e.target.checked)
                          }
                          className="rounded"
                        />
                        必填
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              在脚本中使用 {'{{参数名}}'} 格式引用参数
            </p>
          </div>

          {/* Script Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium">脚本内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="#!/bin/bash&#10;echo 'Hello, World!'"
              className="w-full h-64 px-3 py-2 rounded-md border bg-background font-mono text-sm resize-none"
              spellCheck={false}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
