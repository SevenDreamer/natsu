/**
 * Terminal store for managing PTY sessions
 *
 * Provides state management for terminal sessions using Zustand.
 */

import { create } from 'zustand';
import { terminalApi, type SpawnTerminalConfig, type TerminalInfo } from '@/lib/terminal';

// Terminal session state
export interface TerminalSession {
  id: string;
  title: string;
  isActive: boolean;
  cols: number;
  rows: number;
}

interface TerminalState {
  // Session management
  sessions: Map<string, TerminalSession>;
  activeSessionId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createSession: (config?: SpawnTerminalConfig) => Promise<TerminalInfo | null>;
  removeSession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
  updateSessionTitle: (id: string, title: string) => void;
  updateSessionSize: (id: string, cols: number, rows: number) => void;
  clearError: () => void;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: new Map(),
  activeSessionId: null,
  isLoading: false,
  error: null,

  createSession: async (config?: SpawnTerminalConfig) => {
    set({ isLoading: true, error: null });
    try {
      const info = await terminalApi.spawn(config);

      const session: TerminalSession = {
        id: info.id,
        title: 'Terminal',
        isActive: true,
        cols: info.cols,
        rows: info.rows,
      };

      set((state) => {
        const newSessions = new Map(state.sessions);
        newSessions.set(info.id, session);
        return {
          sessions: newSessions,
          activeSessionId: info.id,
          isLoading: false,
        };
      });

      return info;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create terminal',
        isLoading: false,
      });
      return null;
    }
  },

  removeSession: async (id: string) => {
    try {
      await terminalApi.kill(id);

      set((state) => {
        const newSessions = new Map(state.sessions);
        newSessions.delete(id);

        // If the removed session was active, switch to another
        let newActiveId = state.activeSessionId;
        if (state.activeSessionId === id) {
          const remaining = Array.from(newSessions.keys());
          newActiveId = remaining.length > 0 ? remaining[0] : null;
        }

        return {
          sessions: newSessions,
          activeSessionId: newActiveId,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove terminal',
      });
    }
  },

  setActiveSession: (id: string | null) => {
    set((state) => {
      const newSessions = new Map(state.sessions);

      // Update isActive flag
      newSessions.forEach((session, sessionId) => {
        session.isActive = sessionId === id;
      });

      return {
        sessions: newSessions,
        activeSessionId: id,
      };
    });
  },

  updateSessionTitle: (id: string, title: string) => {
    set((state) => {
      const newSessions = new Map(state.sessions);
      const session = newSessions.get(id);
      if (session) {
        newSessions.set(id, { ...session, title });
      }
      return { sessions: newSessions };
    });
  },

  updateSessionSize: (id: string, cols: number, rows: number) => {
    set((state) => {
      const newSessions = new Map(state.sessions);
      const session = newSessions.get(id);
      if (session) {
        newSessions.set(id, { ...session, cols, rows });
      }
      return { sessions: newSessions };
    });
  },

  clearError: () => set({ error: null }),
}));

// Selectors
export const selectSessions = (state: TerminalState) => Array.from(state.sessions.values());
export const selectActiveSession = (state: TerminalState) =>
  state.activeSessionId ? state.sessions.get(state.activeSessionId) : null;
export const selectSessionById = (id: string) => (state: TerminalState) =>
  state.sessions.get(id);
