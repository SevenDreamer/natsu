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
}));
