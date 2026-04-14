/**
 * TerminalPanel Component
 *
 * Combines TerminalToolbar and TerminalView for a complete terminal experience.
 * Handles session creation and management.
 * Supports collapsible behavior for integration into main layout.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { TerminalView } from './TerminalView';
import { TerminalToolbar } from './TerminalToolbar';
import { useTerminalStore, selectSessions, selectActiveSession } from '@/stores/terminalStore';
import { useUIStore } from '@/stores/uiStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GripHorizontal } from 'lucide-react';

interface TerminalPanelProps {
  className?: string;
}

export function TerminalPanel({ className }: TerminalPanelProps) {
  const sessions = useTerminalStore(selectSessions);
  const activeSession = useTerminalStore(selectActiveSession);
  const createSession = useTerminalStore((s) => s.createSession);
  const isLoading = useTerminalStore((s) => s.isLoading);

  const terminalOpen = useUIStore((s) => s.terminalOpen);
  const terminalHeight = useUIStore((s) => s.terminalHeight);
  const setTerminalHeight = useUIStore((s) => s.setTerminalHeight);

  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Create initial session if none exist
  useEffect(() => {
    if (sessions.length === 0 && !isLoading && terminalOpen) {
      createSession();
    }
  }, [sessions.length, isLoading, createSession, terminalOpen]);

  // Handle session exit
  const handleExit = (exitCode: number | null) => {
    console.log(`Terminal exited with code: ${exitCode}`);
  };

  // Handle resize dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      const containerRect = panelRef.current.parentElement?.getBoundingClientRect();
      if (!containerRect) return;

      // Calculate new height from bottom
      const newHeight = containerRect.bottom - e.clientY;
      const clampedHeight = Math.min(Math.max(newHeight, 100), 600);

      setTerminalHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setTerminalHeight]);

  // Don't render if collapsed
  if (!terminalOpen) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={`flex flex-col border-t border-border bg-background ${className || ''}`}
      style={{ height: terminalHeight }}
    >
      {/* Resize handle */}
      <div
        className="flex items-center justify-center h-2 cursor-ns-resize hover:bg-muted/50 transition-colors"
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Terminal content */}
      <div className="flex-1 min-h-0 border border-border rounded-md overflow-hidden m-1">
        <TerminalToolbar />
        <ScrollArea className="flex-1 h-[calc(100%-36px)]">
          {activeSession ? (
            <TerminalView
              key={activeSession.id}
              sessionId={activeSession.id}
              onExit={handleExit}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {isLoading ? 'Starting terminal...' : 'No terminal session'}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
