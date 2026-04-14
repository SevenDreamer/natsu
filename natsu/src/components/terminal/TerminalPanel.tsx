/**
 * TerminalPanel Component
 *
 * Combines TerminalToolbar and TerminalView for a complete terminal experience.
 * Handles session creation and management.
 */

import { useEffect } from 'react';
import { TerminalView } from './TerminalView';
import { TerminalToolbar } from './TerminalToolbar';
import { useTerminalStore, selectSessions, selectActiveSession } from '@/stores/terminalStore';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TerminalPanel() {
  const sessions = useTerminalStore(selectSessions);
  const activeSession = useTerminalStore(selectActiveSession);
  const createSession = useTerminalStore((s) => s.createSession);
  const isLoading = useTerminalStore((s) => s.isLoading);

  // Create initial session if none exist
  useEffect(() => {
    if (sessions.length === 0 && !isLoading) {
      createSession();
    }
  }, [sessions.length, isLoading, createSession]);

  // Handle session exit
  const handleExit = (exitCode: number | null) => {
    console.log(`Terminal exited with code: ${exitCode}`);
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-md overflow-hidden">
      <TerminalToolbar />
      <ScrollArea className="flex-1">
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
  );
}
