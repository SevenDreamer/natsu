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
}));
