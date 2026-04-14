/**
 * Terminal API module for PTY backend communication
 *
 * Provides functions to invoke Tauri commands and listen to PTY events.
 * Also exports the ImageAddon for iTerm2/SIXEL image support.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// Re-export ImageAddon for iTerm2/SIXEL image support in terminals
export { ImageAddon, type IImageAddonOptions } from '@xterm/addon-image';

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

/**
 * TerminalBuffer - Captures terminal output for saving to knowledge base
 */
export class TerminalBuffer {
  private buffer: string = '';
  private maxSize: number;
  private sessionId: string;

  constructor(sessionId: string, maxSize: number = 100000) {
    this.sessionId = sessionId;
    this.maxSize = maxSize;
  }

  /**
   * Append data to the buffer
   */
  append(data: string): void {
    this.buffer += data;
    // Trim buffer if it exceeds max size
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize);
    }
  }

  /**
   * Get the entire buffer
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * Get last N lines from buffer
   */
  getLastNLines(n: number): string {
    const lines = this.buffer.split('\n');
    return lines.slice(-n).join('\n');
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = '';
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Format buffer as Markdown for saving to knowledge base
   */
  toMarkdown(title?: string): string {
    const timestamp = new Date().toISOString();
    const displayTitle = title || `Terminal Output - ${timestamp}`;

    return `# ${displayTitle}

**Session:** ${this.sessionId.slice(0, 8)}

**Captured:** ${timestamp}

## Output

\`\`\`
${this.buffer}
\`\`\`
`;
  }
}

// Global buffer store per session
const bufferStore = new Map<string, TerminalBuffer>();

/**
 * Get or create a buffer for a session
 */
export function getTerminalBuffer(sessionId: string): TerminalBuffer {
  if (!bufferStore.has(sessionId)) {
    bufferStore.set(sessionId, new TerminalBuffer(sessionId));
  }
  return bufferStore.get(sessionId)!;
}

/**
 * Remove buffer for a session
 */
export function removeTerminalBuffer(sessionId: string): void {
  bufferStore.delete(sessionId);
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
