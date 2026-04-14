/**
 * TerminalView Component
 *
 * xterm.js terminal component that connects to PTY backend.
 * Supports theme switching synced with global theme.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

import { terminalApi, terminalEvents } from '@/lib/terminal';
import { useTerminalStore } from '@/stores/terminalStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { UnlistenFn } from '@tauri-apps/api/event';

interface TerminalViewProps {
  sessionId: string;
  onExit?: (exitCode: number | null) => void;
}

// Terminal themes
const themes = {
  dark: {
    background: '#0c0c0c',
    foreground: '#cccccc',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selectionBackground: 'rgba(255, 255, 255, 0.3)',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff',
  },
  light: {
    background: '#ffffff',
    foreground: '#333333',
    cursor: '#333333',
    cursorAccent: '#ffffff',
    selectionBackground: 'rgba(0, 0, 0, 0.3)',
    black: '#000000',
    red: '#cd3131',
    green: '#00bc00',
    yellow: '#949800',
    blue: '#0451a5',
    magenta: '#bc05bc',
    cyan: '#0598bc',
    white: '#555555',
    brightBlack: '#666666',
    brightRed: '#cd3131',
    brightGreen: '#00bc00',
    brightYellow: '#b5ba00',
    brightBlue: '#0451a5',
    brightMagenta: '#bc05bc',
    brightCyan: '#0598bc',
    brightWhite: '#a5a5a5',
  },
};

export function TerminalView({ sessionId, onExit }: TerminalViewProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const unlistenersRef = useRef<UnlistenFn[]>([]);

  const [isReady, setIsReady] = useState(false);
  const theme = useSettingsStore((s) => s.theme);

  const updateSessionSize = useTerminalStore((s) => s.updateSessionSize);

  // Determine effective theme
  const getEffectiveTheme = useCallback(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }, [theme]);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const effectiveTheme = getEffectiveTheme();

    // Create terminal instance
    const terminal = new Terminal({
      theme: themes[effectiveTheme],
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      allowTransparency: true,
    });

    // Create addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    // Load addons
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal in DOM
    terminal.open(terminalRef.current);

    // Fit to container
    setTimeout(() => {
      fitAddon.fit();
      const dims = { cols: terminal.cols, rows: terminal.rows };
      terminalApi.resize(sessionId, dims.cols, dims.rows);
      updateSessionSize(sessionId, dims.cols, dims.rows);
    }, 100);

    // Store refs
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle user input
    terminal.onData((data) => {
      const encoder = new TextEncoder();
      terminalApi.write(sessionId, encoder.encode(data));
    });

    // Handle resize
    terminal.onResize(({ cols, rows }) => {
      terminalApi.resize(sessionId, cols, rows);
      updateSessionSize(sessionId, cols, rows);
    });

    // Setup event listeners
    const setupListeners = async () => {
      // Output event - when terminal content changes
      const unlistenOutput = await terminalEvents.onOutput(sessionId, async () => {
        try {
          const content = await terminalApi.getContent(sessionId);
          // Clear and write new content
          terminal.clear();
          terminal.write(content);
        } catch (error) {
          console.error('Failed to get terminal content:', error);
        }
      });

      // Title event
      const unlistenTitle = await terminalEvents.onTitle(sessionId, (event) => {
        document.title = event.payload;
      });

      // Exit event
      const unlistenExit = await terminalEvents.onExit(sessionId, (event) => {
        onExit?.(event.payload);
      });

      // Bell event (optional visual feedback)
      const unlistenBell = await terminalEvents.onBell(sessionId, () => {
        // Could add visual bell indicator here
        console.log('Terminal bell');
      });

      unlistenersRef.current = [unlistenOutput, unlistenTitle, unlistenExit, unlistenBell];
    };

    setupListeners();
    setIsReady(true);

    // Cleanup
    return () => {
      unlistenersRef.current.forEach((unlisten) => unlisten());
      unlistenersRef.current = [];
      terminal.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      setIsReady(false);
    };
  }, [sessionId, onExit, updateSessionSize, getEffectiveTheme]);

  // Update theme when it changes
  useEffect(() => {
    if (!xtermRef.current) return;

    const effectiveTheme = getEffectiveTheme();
    xtermRef.current.options.theme = themes[effectiveTheme];
  }, [theme, getEffectiveTheme]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const terminal = xtermRef.current;
        terminalApi.resize(sessionId, terminal.cols, terminal.rows);
        updateSessionSize(sessionId, terminal.cols, terminal.rows);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sessionId, updateSessionSize]);

  // Resize observer for container size changes
  useEffect(() => {
    if (!terminalRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const terminal = xtermRef.current;
        terminalApi.resize(sessionId, terminal.cols, terminal.rows);
        updateSessionSize(sessionId, terminal.cols, terminal.rows);
      }
    });

    resizeObserver.observe(terminalRef.current);
    return () => resizeObserver.disconnect();
  }, [sessionId, updateSessionSize]);

  return (
    <div
      ref={terminalRef}
      className="h-full w-full bg-background"
      style={{ padding: '8px' }}
    />
  );
}
