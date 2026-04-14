/**
 * Terminal API module for PTY backend communication
 *
 * Provides functions to invoke Tauri commands and listen to PTY events.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// Terminal session configuration
export interface SpawnTerminalConfig {
  shell?: string;
  args?: string[];
  working_directory?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

// Terminal session info returned from spawn
export interface TerminalInfo {
  id: string;
  cols: number;
  rows: number;
}

// Terminal API commands
export const terminalApi = {
  /**
   * Spawn a new terminal session
   */
  spawn: async (config?: SpawnTerminalConfig): Promise<TerminalInfo> => {
    return invoke('spawn_terminal', { config });
  },

  /**
   * Write data to a terminal session
   */
  write: async (id: string, data: Uint8Array): Promise<void> => {
    return invoke('write_to_pty', { id, data: Array.from(data) });
  },

  /**
   * Resize a terminal session
   */
  resize: async (id: string, cols: number, rows: number): Promise<void> => {
    return invoke('resize_pty', { id, cols, rows });
  },

  /**
   * Kill a terminal session
   */
  kill: async (id: string): Promise<void> => {
    return invoke('kill_terminal', { id });
  },

  /**
   * Get terminal content as string
   */
  getContent: async (id: string): Promise<string> => {
    return invoke('get_terminal_content', { id });
  },

  /**
   * List all active terminal sessions
   */
  list: async (): Promise<string[]> => {
    return invoke('list_terminals');
  },
};

// Event types for PTY events
export interface PtyOutputEvent {
  sessionId: string;
}

export interface PtyTitleEvent {
  sessionId: string;
  title: string;
}

export interface PtyExitEvent {
  sessionId: string;
  exitCode: number | null;
}

export interface PtyBellEvent {
  sessionId: string;
}

// Terminal event listeners
export const terminalEvents = {
  /**
   * Listen for PTY output events (terminal content changed)
   */
  onOutput: (
    sessionId: string,
    callback: () => void
  ): Promise<UnlistenFn> => {
    return listen(`pty-output-${sessionId}`, callback);
  },

  /**
   * Listen for PTY title change events
   */
  onTitle: (
    sessionId: string,
    callback: (event: { payload: string }) => void
  ): Promise<UnlistenFn> => {
    return listen<string>(`pty-title-${sessionId}`, callback);
  },

  /**
   * Listen for PTY exit events
   */
  onExit: (
    sessionId: string,
    callback: (event: { payload: number | null }) => void
  ): Promise<UnlistenFn> => {
    return listen<number | null>(`pty-exit-${sessionId}`, callback);
  },

  /**
   * Listen for PTY bell events
   */
  onBell: (
    sessionId: string,
    callback: () => void
  ): Promise<UnlistenFn> => {
    return listen(`pty-bell-${sessionId}`, callback);
  },
};
