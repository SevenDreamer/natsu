/**
 * Scheduled Tasks Component
 *
 * Displays and manages scheduled tasks.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { TaskEditor } from './TaskEditor';
import { TaskExecutionHistory } from './TaskExecutionHistory';
import { useAutomationStore } from '@/stores/automationStore';

export function ScheduledTasks() {
  const {
    scheduledTasks,
    tasksLoading,
    tasksError,
    selectedTaskId,
    fetchScheduledTasks,
    setSelectedTaskId,
  } = useAutomationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchScheduledTasks();
  }, [fetchScheduledTasks]);

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleEditorSave = async () => {
    setIsEditing(false);
    setIsCreating(false);
    await fetchScheduledTasks();
  };

  const handleEditorCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
  };

  const filteredTasks = scheduledTasks.filter(
    (task) =>
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTask = scheduledTasks.find((t) => t.id === selectedTaskId);

  if (isEditing) {
    return (
      <TaskEditor
        task={isCreating ? undefined : selectedTask}
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
              placeholder="搜索定时任务..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新建任务
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {tasksLoading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : tasksError ? (
              <div className="text-center py-8 text-red-500">{tasksError}</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? '没有找到匹配的任务' : '还没有定时任务，点击"新建任务"创建一个'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={selectedTaskId === task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Task Detail Panel */}
        {selectedTask && (
          <div className="w-80 border-l flex flex-col flex-shrink-0">
            <div className="p-3 border-b font-medium flex items-center justify-between">
              <span>执行历史</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTaskId(null)}
              >
                关闭
              </Button>
            </div>
            <TaskExecutionHistory taskId={selectedTask.id} />
          </div>
        )}
      </div>
    </div>
  );
}
