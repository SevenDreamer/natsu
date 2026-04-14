---
phase: 03-terminal-core
plan: 02
subsystem: frontend
tags: [xterm, react, terminal, theme]

requires:
  - phase: PLAN-01
    provides: PTY commands and events
provides:
  - xterm.js terminal component
  - Theme-aware terminal styling
  - Terminal input/output handling
affects: [PLAN-03, PLAN-04]

tech-stack:
  added: [xterm, @xterm/addon-fit, @xterm/addon-web-links]
  patterns: [React refs, Event listeners]

key-files:
  created:
    - natsu/src/components/terminal/TerminalView.tsx
    - natsu/src/components/terminal/TerminalToolbar.tsx
    - natsu/src/stores/terminalStore.ts
    - natsu/src/lib/terminal.ts
  modified:
    - natsu/package.json
---

# Phase 3 Plan 02: xterm.js Terminal Frontend

**xterm.js terminal component with React integration and theme support**

## Goal

创建 xterm.js 终端组件，连接 PTY 后端，支持主题切换。

## Tasks

### Task 1: Install Dependencies

```bash
cd natsu && pnpm add xterm @xterm/addon-fit @xterm/addon-web-links
```

### Task 2: Create Terminal API Module

Create `natsu/src/lib/terminal.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface TerminalOutputEvent {
  id: string;
  data: number[];
}

export const terminalApi = {
  spawn: async (id: string, cols: number, rows: number): Promise<void> =>
    invoke('spawn_terminal', { id, cols, rows }),

  write: async (id: string, data: number[]): Promise<void> =>
    invoke('write_to_pty', { id, data }),

  resize: async (id: string, cols: number, rows: number): Promise<void> =>
    invoke('resize_pty', { id, cols, rows }),

  kill: async (id: string): Promise<void> =>
    invoke('kill_terminal', { id }),

  onOutput: (callback: (event: TerminalOutputEvent) => void) =>
    listen<TerminalOutputEvent>('terminal-output', (e) => callback(e.payload)),
};
```

### Task 3: Create Terminal Store

Create `natsu/src/stores/terminalStore.ts`:

```typescript
import { create } from 'zustand';

interface TerminalSession {
  id: string;
  cols: number;
  rows: number;
}

interface TerminalState {
  sessions: TerminalSession[];
  activeSession: string | null;
  createSession: () => string;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  sessions: [],
  activeSession: null,
  createSession: () => {
    const id = crypto.randomUUID();
    set((s) => ({
      sessions: [...s.sessions, { id, cols: 80, rows: 24 }],
      activeSession: id,
    }));
    return id;
  },
  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((s) => s.id !== id),
      activeSession: s.activeSession === id ? null : s.activeSession,
    })),
  setActiveSession: (id) => set({ activeSession: id }),
}));
```

### Task 4: Create Terminal Component

Create `natsu/src/components/terminal/TerminalView.tsx`:

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { terminalApi } from '@/lib/terminal';
import { useThemeStore } from '@/stores/themeStore';
import 'xterm/css/xterm.css';

interface TerminalViewProps {
  sessionId: string;
}

export function TerminalView({ sessionId }: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const xterm = new Terminal({
      fontFamily: 'JetBrains Mono, Menlo, monospace',
      fontSize: 14,
      theme: theme === 'dark' ? darkTheme : lightTheme,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Spawn PTY
    const { cols, rows } = xterm;
    terminalApi.spawn(sessionId, cols, rows);

    // Listen for PTY output
    const unlisten = terminalApi.onOutput((event) => {
      if (event.id === sessionId) {
        xterm.write(new Uint8Array(event.data));
      }
    });

    // Handle user input
    xterm.onData((data) => {
      const encoder = new TextEncoder();
      terminalApi.write(sessionId, Array.from(encoder.encode(data)));
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      terminalApi.resize(sessionId, xterm.cols, xterm.rows);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      unlisten.then((fn) => fn());
      terminalApi.kill(sessionId);
      xterm.dispose();
    };
  }, [sessionId]);

  // Theme change
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = theme === 'dark' ? darkTheme : lightTheme;
    }
  }, [theme]);

  return (
    <div
      ref={terminalRef}
      className="h-full w-full bg-terminal"
    />
  );
}

const darkTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  // ... more colors
};

const lightTheme = {
  background: '#ffffff',
  foreground: '#1e1e1e',
  cursor: '#1e1e1e',
  // ... more colors
};
```

### Task 5: Create Terminal Toolbar

Create `natsu/src/components/terminal/TerminalToolbar.tsx`:

```typescript
import { Button } from '@/components/ui/button';
import { Plus, X, Copy, Trash2 } from 'lucide-react';

interface TerminalToolbarProps {
  onNewSession: () => void;
  onCloseSession: () => void;
  onClear: () => void;
}

export function TerminalToolbar({ onNewSession, onCloseSession, onClear }: TerminalToolbarProps) {
  return (
    <div className="h-10 flex items-center justify-between px-2 border-b bg-muted/50">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onNewSession} title="New Terminal">
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onClear} title="Clear">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onCloseSession} title="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

## Verification

1. Terminal renders correctly
2. Can type and see output
3. Theme switching works
4. Resize works
5. Terminal persists until closed

---

*Phase: 03-terminal-core*
