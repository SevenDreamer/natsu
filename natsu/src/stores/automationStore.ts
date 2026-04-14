/**
 * Automation Store
 *
 * Manages state for automation features:
 * - Command History
 * - Script Library (Phase 6, Plan 02)
 * - File Monitoring (Phase 6, Plan 03)
 * - API Calls (Phase 6, Plan 04)
 */

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Types
// ============================================================================

export interface CommandHistoryEntry {
  id: string;
  command: string;
  working_directory?: string;
  exit_code?: number;
  duration_ms?: number;
  executed_at: number;
  session_id?: string;
}

export interface CommandHistoryQuery {
  search?: string;
  limit?: number;
  offset?: number;
  session_id?: string;
}

export interface RecordCommandInput {
  command: string;
  working_directory?: string;
  exit_code?: number;
  duration_ms?: number;
  session_id?: string;
}

// API Types
export interface ApiConfig {
  id: string;
  name: string;
  method: string;
  url: string;
  headers?: string;
  body_template?: string;
  auth_type: string;
  auth_config?: string;
  timeout_secs: number;
  created_at: number;
  updated_at: number;
}

export interface ApiHistoryEntry {
  id: string;
  config_id?: string;
  url: string;
  method: string;
  request_headers?: string;
  request_body?: string;
  response_status?: number;
  response_headers?: string;
  response_body?: string;
  duration_ms?: number;
  error?: string;
  executed_at: number;
}

export interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  duration_ms: number;
}

export interface ExecuteApiInput {
  config_id?: string;
  url?: string;
  method?: string;
  headers?: string;
  body?: string;
  auth_config?: string;
  timeout_secs?: number;
  variables?: string;
}

export interface NewApiConfig {
  name: string;
  method: string;
  url: string;
  headers?: string;
  body_template?: string;
  auth_type?: string;
  auth_config?: string;
  timeout_secs?: number;
}

// Script Types
export interface ScriptParameter {
  name: string;
  description?: string;
  default_value?: string;
  required: boolean;
}

export interface Script {
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

export interface ScriptSafetyInfo {
  level: 'safe' | 'caution' | 'dangerous';
  warnings: string[];
}

export interface ScriptExecutionResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
}

export interface CreateScriptInput {
  name: string;
  description?: string;
  content: string;
  interpreter?: string;
  tags?: string[];
  parameters?: ScriptParameter[];
}

export interface UpdateScriptInput {
  name?: string;
  description?: string;
  content?: string;
  tags?: string[];
  parameters?: ScriptParameter[];
}

export interface ScriptExecutionInput {
  script_id: string;
  parameters?: Record<string, string>;
  timeout?: number;
}

// File Watcher Types
export interface FileWatcher {
  id: string;
  name: string;
  path: string;
  recursive: boolean;
  event_types: string[];
  enabled: boolean;
  trigger_script_id?: string;
  created_at: number;
}

export interface FileEvent {
  id: string;
  watcher_id: string;
  event_type: string;
  path: string;
  details?: string;
  timestamp: number;
}

export interface CreateFileWatcherInput {
  name: string;
  path: string;
  recursive?: boolean;
  event_types?: string[];
  trigger_script_id?: string;
}

export interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  modified?: number;
}

// ============================================================================
// Scheduled Task Types
// ============================================================================

export interface SimpleInterval {
  interval_secs: number;
  start_time?: number;
}

export interface CronSchedule {
  expression: string;
  timezone: string;
}

export interface OnceTime {
  execute_at: number;
}

export interface ScriptTaskConfig {
  script_id: string;
  parameters: Record<string, string>;
  timeout_secs: number;
}

export interface CommandTaskConfig {
  command: string;
  working_directory?: string;
  timeout_secs: number;
}

export interface ApiTaskConfig {
  config_id?: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timeout_secs: number;
}

export interface RetryConfig {
  max_retries: number;
  retry_interval_secs: number;
  backoff_multiplier?: number;
}

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  scheduleType: 'simple' | 'cron' | 'once';
  scheduleConfig: string; // JSON string
  taskType: 'script' | 'command' | 'api';
  taskConfig: string; // JSON string
  retryConfig?: string; // JSON string
  enabled: boolean;
  lastRunAt?: number;
  nextRunAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  scheduledTime: number;
  startedAt?: number;
  completedAt?: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  errorMessage?: string;
  durationMs?: number;
  retryCount: number;
}

export interface CreateScheduledTaskInput {
  name: string;
  description?: string;
  scheduleType: string;
  scheduleConfig: string;
  taskType: string;
  taskConfig: string;
  retryConfig?: string;
  enabled?: boolean;
}

export interface UpdateScheduledTaskInput {
  name?: string;
  description?: string;
  scheduleType?: string;
  scheduleConfig?: string;
  taskType?: string;
  taskConfig?: string;
  retryConfig?: string;
  enabled?: boolean;
}

// ============================================================================
// Store State
// ============================================================================

interface AutomationState {
  // Command History
  commandHistory: CommandHistoryEntry[];
  historyLoading: boolean;
  historyError: string | null;
  historySearchQuery: string;

  // API Configs
  apiConfigs: ApiConfig[];
  apiHistory: ApiHistoryEntry[];
  apiLoading: boolean;
  apiError: string | null;

  // Scripts
  scripts: Script[];
  scriptsLoading: boolean;
  scriptsError: string | null;

  // File Watchers
  fileWatchers: FileWatcher[];
  fileEvents: FileEvent[];
  fileWatchersLoading: boolean;
  fileWatchersError: string | null;

  // Scheduled Tasks
  scheduledTasks: ScheduledTask[];
  taskExecutions: TaskExecution[];
  tasksLoading: boolean;
  tasksError: string | null;
  selectedTaskId: string | null;
  runningTaskIds: string[];

  // Actions - Command History
  fetchCommandHistory: (search?: string) => Promise<void>;
  recordCommand: (input: RecordCommandInput) => Promise<CommandHistoryEntry>;
  deleteHistoryEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  rerunCommand: (id: string) => Promise<string>;
  setHistorySearchQuery: (query: string) => void;

  // Actions - API
  fetchApiConfigs: () => Promise<void>;
  createApiConfig: (config: NewApiConfig) => Promise<ApiConfig>;
  deleteApiConfig: (id: string) => Promise<void>;
  executeApi: (input: ExecuteApiInput) => Promise<ApiResponse>;
  fetchApiHistory: (configId?: string) => Promise<void>;

  // Actions - Scripts
  fetchScripts: () => Promise<void>;
  createScript: (input: CreateScriptInput) => Promise<Script>;
  updateScript: (id: string, input: UpdateScriptInput) => Promise<Script>;
  deleteScript: (id: string) => Promise<void>;
  getScriptContent: (id: string) => Promise<string>;
  getScriptSafety: (id: string) => Promise<ScriptSafetyInfo>;
  executeScript: (input: ScriptExecutionInput) => Promise<ScriptExecutionResult>;

  // Actions - File Watchers
  fetchFileWatchers: () => Promise<void>;
  createFileWatcher: (input: CreateFileWatcherInput) => Promise<FileWatcher>;
  updateFileWatcher: (id: string, enabled: boolean) => Promise<void>;
  deleteFileWatcher: (id: string) => Promise<void>;
  fetchFileEvents: (watcherId?: string) => Promise<void>;
  clearFileEvents: (watcherId?: string) => Promise<void>;

  // Actions - File Operations
  fileCopy: (src: string, dest: string) => Promise<void>;
  fileMove: (src: string, dest: string) => Promise<void>;
  fileDelete: (path: string) => Promise<void>;
  fileRename: (old: string, new_: string) => Promise<void>;
  fileExists: (path: string) => Promise<boolean>;
  fileListDir: (path: string) => Promise<FileInfo[]>;

  // Actions - Scheduled Tasks
  fetchScheduledTasks: () => Promise<void>;
  createScheduledTask: (input: CreateScheduledTaskInput) => Promise<ScheduledTask>;
  updateScheduledTask: (id: string, input: UpdateScheduledTaskInput) => Promise<ScheduledTask>;
  deleteScheduledTask: (id: string) => Promise<void>;
  toggleScheduledTask: (id: string, enabled: boolean) => Promise<void>;
  runTaskNow: (id: string) => Promise<TaskExecution>;
  fetchTaskExecutions: (taskId: string, limit?: number) => Promise<void>;
  setSelectedTaskId: (id: string | null) => void;
  validateCronExpression: (expression: string) => Promise<string[]>;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useAutomationStore = create<AutomationState>((set, get) => ({
  // Initial state - Command History
  commandHistory: [],
  historyLoading: false,
  historyError: null,
  historySearchQuery: '',

  // Initial state - API
  apiConfigs: [],
  apiHistory: [],
  apiLoading: false,
  apiError: null,

  // Initial state - Scripts
  scripts: [],
  scriptsLoading: false,
  scriptsError: null,

  // Initial state - File Watchers
  fileWatchers: [],
  fileEvents: [],
  fileWatchersLoading: false,
  fileWatchersError: null,

  // Initial state - Scheduled Tasks
  scheduledTasks: [],
  taskExecutions: [],
  tasksLoading: false,
  tasksError: null,
  selectedTaskId: null,
  runningTaskIds: [],

  // Fetch command history
  fetchCommandHistory: async (search?: string) => {
    const query: CommandHistoryQuery = {
      search: search ?? get().historySearchQuery,
      limit: 100,
      offset: 0,
    };

    set({ historyLoading: true, historyError: null });

    try {
      const history = await invoke<CommandHistoryEntry[]>('get_command_history', { query });
      set({ commandHistory: history, historyLoading: false });
    } catch (error) {
      set({ historyError: String(error), historyLoading: false });
    }
  },

  // Record a command execution
  recordCommand: async (input: RecordCommandInput) => {
    const entry = await invoke<CommandHistoryEntry>('record_command', { input });

    // Add to local state
    set((state) => ({
      commandHistory: [entry, ...state.commandHistory].slice(0, 100),
    }));

    return entry;
  },

  // Delete a history entry
  deleteHistoryEntry: async (id: string) => {
    await invoke('delete_command_history_entry', { id });

    set((state) => ({
      commandHistory: state.commandHistory.filter((e) => e.id !== id),
    }));
  },

  // Clear all history
  clearHistory: async () => {
    await invoke('clear_command_history');
    set({ commandHistory: [] });
  },

  // Rerun a command
  rerunCommand: async (id: string) => {
    const newId = await invoke<string>('rerun_command', { id });

    // Refresh history
    get().fetchCommandHistory();

    return newId;
  },

  // Set search query
  setHistorySearchQuery: (query: string) => {
    set({ historySearchQuery: query });
  },

  // ============ API Actions ============

  // Fetch API configs
  fetchApiConfigs: async () => {
    set({ apiLoading: true, apiError: null });
    try {
      const configs = await invoke<ApiConfig[]>('list_api_configs');
      set({ apiConfigs: configs, apiLoading: false });
    } catch (error) {
      set({ apiError: String(error), apiLoading: false });
    }
  },

  // Create API config
  createApiConfig: async (config: NewApiConfig) => {
    const newConfig = await invoke<ApiConfig>('create_api_config', { input: config });
    set((state) => ({
      apiConfigs: [...state.apiConfigs, newConfig],
    }));
    return newConfig;
  },

  // Delete API config
  deleteApiConfig: async (id: string) => {
    await invoke('delete_api_config', { id });
    set((state) => ({
      apiConfigs: state.apiConfigs.filter((c) => c.id !== id),
    }));
  },

  // Execute API request
  executeApi: async (input: ExecuteApiInput) => {
    const response = await invoke<ApiResponse>('execute_api_request', { input });
    // Refresh history after execution
    get().fetchApiHistory(input.config_id);
    return response;
  },

  // Fetch API history
  fetchApiHistory: async (configId?: string) => {
    try {
      const history = await invoke<ApiHistoryEntry[]>('get_api_history', {
        configId,
        limit: 50,
      });
      set({ apiHistory: history });
    } catch (error) {
      console.error('Failed to fetch API history:', error);
    }
  },

  // ============ Script Actions ============

  // Fetch scripts
  fetchScripts: async () => {
    set({ scriptsLoading: true, scriptsError: null });
    try {
      const scripts = await invoke<Script[]>('list_scripts');
      set({ scripts, scriptsLoading: false });
    } catch (error) {
      set({ scriptsError: String(error), scriptsLoading: false });
    }
  },

  // Create script
  createScript: async (input: CreateScriptInput) => {
    const script = await invoke<Script>('create_script', { input });
    set((state) => ({
      scripts: [...state.scripts, script],
    }));
    return script;
  },

  // Update script
  updateScript: async (id: string, input: UpdateScriptInput) => {
    const script = await invoke<Script>('update_script', { id, input });
    set((state) => ({
      scripts: state.scripts.map((s) => (s.id === id ? script : s)),
    }));
    return script;
  },

  // Delete script
  deleteScript: async (id: string) => {
    await invoke('delete_script', { id });
    set((state) => ({
      scripts: state.scripts.filter((s) => s.id !== id),
    }));
  },

  // Get script content
  getScriptContent: async (id: string) => {
    return await invoke<string>('get_script_content', { id });
  },

  // Get script safety
  getScriptSafety: async (id: string) => {
    return await invoke<ScriptSafetyInfo>('get_script_safety', { id });
  },

  // Execute script
  executeScript: async (input: ScriptExecutionInput) => {
    return await invoke<ScriptExecutionResult>('execute_script', { input });
  },

  // ============ File Watcher Actions ============

  // Fetch file watchers
  fetchFileWatchers: async () => {
    set({ fileWatchersLoading: true, fileWatchersError: null });
    try {
      const watchers = await invoke<FileWatcher[]>('list_file_watchers');
      set({ fileWatchers: watchers, fileWatchersLoading: false });
    } catch (error) {
      set({ fileWatchersError: String(error), fileWatchersLoading: false });
    }
  },

  // Create file watcher
  createFileWatcher: async (input: CreateFileWatcherInput) => {
    const watcher = await invoke<FileWatcher>('create_file_watcher', { input });
    set((state) => ({
      fileWatchers: [...state.fileWatchers, watcher],
    }));
    return watcher;
  },

  // Update file watcher (enable/disable)
  updateFileWatcher: async (id: string, enabled: boolean) => {
    await invoke('update_file_watcher', { id, enabled });
    set((state) => ({
      fileWatchers: state.fileWatchers.map((w) =>
        w.id === id ? { ...w, enabled } : w
      ),
    }));
  },

  // Delete file watcher
  deleteFileWatcher: async (id: string) => {
    await invoke('delete_file_watcher', { id });
    set((state) => ({
      fileWatchers: state.fileWatchers.filter((w) => w.id !== id),
    }));
  },

  // Fetch file events
  fetchFileEvents: async (watcherId?: string) => {
    try {
      const events = await invoke<FileEvent[]>('get_file_events', {
        watcherId,
        limit: 50,
      });
      set({ fileEvents: events });
    } catch (error) {
      console.error('Failed to fetch file events:', error);
    }
  },

  // Clear file events
  clearFileEvents: async (watcherId?: string) => {
    await invoke('clear_file_events', { watcherId });
    set((state) => ({
      fileEvents: watcherId
        ? state.fileEvents.filter((e) => e.watcher_id !== watcherId)
        : [],
    }));
  },

  // ============ File Operation Actions ============

  fileCopy: async (src: string, dest: string) => {
    await invoke('file_copy', { src, dest });
  },

  fileMove: async (src: string, dest: string) => {
    await invoke('file_move', { src, dest });
  },

  fileDelete: async (path: string) => {
    await invoke('file_delete', { path });
  },

  fileRename: async (old: string, new_: string) => {
    await invoke('file_rename', { old, new: new_ });
  },

  fileExists: async (path: string) => {
    return await invoke<boolean>('file_exists', { path });
  },

  fileListDir: async (path: string) => {
    return await invoke<FileInfo[]>('file_list_dir', { path });
  },

  // ============ Scheduled Task Actions ============

  // Fetch scheduled tasks
  fetchScheduledTasks: async () => {
    set({ tasksLoading: true, tasksError: null });
    try {
      const tasks = await invoke<ScheduledTask[]>('list_scheduled_tasks');
      set({ scheduledTasks: tasks, tasksLoading: false });
    } catch (error) {
      set({ tasksError: String(error), tasksLoading: false });
    }
  },

  // Create scheduled task
  createScheduledTask: async (input: CreateScheduledTaskInput) => {
    const task = await invoke<ScheduledTask>('create_scheduled_task', { input });
    set((state) => ({
      scheduledTasks: [...state.scheduledTasks, task],
    }));
    return task;
  },

  // Update scheduled task
  updateScheduledTask: async (id: string, input: UpdateScheduledTaskInput) => {
    const task = await invoke<ScheduledTask>('update_scheduled_task', { id, input });
    set((state) => ({
      scheduledTasks: state.scheduledTasks.map((t) => (t.id === id ? task : t)),
    }));
    return task;
  },

  // Delete scheduled task
  deleteScheduledTask: async (id: string) => {
    await invoke('delete_scheduled_task', { id });
    set((state) => ({
      scheduledTasks: state.scheduledTasks.filter((t) => t.id !== id),
    }));
  },

  // Toggle scheduled task enabled state
  toggleScheduledTask: async (id: string, enabled: boolean) => {
    await invoke('toggle_scheduled_task', { id, enabled });
    set((state) => ({
      scheduledTasks: state.scheduledTasks.map((t) =>
        t.id === id ? { ...t, enabled } : t
      ),
    }));
  },

  // Run task immediately
  runTaskNow: async (id: string) => {
    set((state) => ({
      runningTaskIds: [...state.runningTaskIds, id],
    }));
    try {
      const execution = await invoke<TaskExecution>('run_task_now', { id });
      return execution;
    } finally {
      set((state) => ({
        runningTaskIds: state.runningTaskIds.filter((tid) => tid !== id),
      }));
    }
  },

  // Fetch task executions
  fetchTaskExecutions: async (taskId: string, limit?: number) => {
    try {
      const executions = await invoke<TaskExecution[]>('get_task_executions', {
        taskId,
        limit: limit ?? 50,
      });
      set({ taskExecutions: executions });
    } catch (error) {
      console.error('Failed to fetch task executions:', error);
    }
  },

  // Set selected task ID
  setSelectedTaskId: (id: string | null) => {
    set({ selectedTaskId: id });
  },

  // Validate cron expression
  validateCronExpression: async (expression: string) => {
    return await invoke<string[]>('validate_cron_expression_cmd', { expression });
  },
}));
