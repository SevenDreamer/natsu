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

// ============================================================================
// Store State
// ============================================================================

interface AutomationState {
  // Command History
  commandHistory: CommandHistoryEntry[];
  historyLoading: boolean;
  historyError: string | null;
  historySearchQuery: string;

  // Actions - Command History
  fetchCommandHistory: (search?: string) => Promise<void>;
  recordCommand: (input: RecordCommandInput) => Promise<CommandHistoryEntry>;
  deleteHistoryEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  rerunCommand: (id: string) => Promise<string>;
  setHistorySearchQuery: (query: string) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useAutomationStore = create<AutomationState>((set, get) => ({
  // Initial state
  commandHistory: [],
  historyLoading: false,
  historyError: null,
  historySearchQuery: '',

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
}));
