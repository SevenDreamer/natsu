/**
 * TerminalToolbar Component
 *
 * Toolbar with buttons for terminal management:
 * - New terminal button
 * - Clear button
 * - Close button
 * - Save Output button
 */

import { useState } from 'react';
import { Plus, Trash2, X, Terminal, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTerminalStore, selectSessions, selectActiveSession } from '@/stores/terminalStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { terminalApi, getTerminalBuffer } from '@/lib/terminal';
import { notesApi } from '@/lib/tauri';

export function TerminalToolbar() {
  const sessions = useTerminalStore(selectSessions);
  const activeSession = useTerminalStore(selectActiveSession);
  const createSession = useTerminalStore((s) => s.createSession);
  const removeSession = useTerminalStore((s) => s.removeSession);
  const setActiveSession = useTerminalStore((s) => s.setActiveSession);
  const isLoading = useTerminalStore((s) => s.isLoading);
  const storagePath = useSettingsStore((s) => s.storagePath);
  const terminalOpen = useUIStore((s) => s.terminalOpen);
  const toggleTerminal = useUIStore((s) => s.toggleTerminal);

  const [isSaving, setIsSaving] = useState(false);

  const handleNewTerminal = async () => {
    await createSession();
  };

  const handleClear = async () => {
    if (!activeSession) return;
    // Clear the terminal by writing the clear escape sequence
    const encoder = new TextEncoder();
    await terminalApi.write(activeSession.id, encoder.encode('\x1b[2J\x1b[H'));
    // Also clear the buffer
    const buffer = getTerminalBuffer(activeSession.id);
    buffer.clear();
  };

  const handleClose = async () => {
    if (!activeSession) return;
    await removeSession(activeSession.id);
  };

  const handleSaveOutput = async () => {
    if (!activeSession || !storagePath) return;

    setIsSaving(true);
    try {
      // Get the terminal buffer
      const buffer = getTerminalBuffer(activeSession.id);

      // Create a title based on timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const title = `Terminal Output ${timestamp}`;

      // Format as markdown
      const content = buffer.toMarkdown(title);

      // Create a note in the outputs directory
      const note = await notesApi.create(title, storagePath);

      // Save the content
      await notesApi.save(note.id, content, storagePath);

      // Clear the buffer after saving
      buffer.clear();

      console.log('Terminal output saved to:', note.path);
    } catch (error) {
      console.error('Failed to save terminal output:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-muted/30">
      <div className="flex items-center gap-1 mr-2">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Terminal</span>
        {sessions.length > 0 && (
          <span className="ml-1 text-xs text-muted-foreground">
            ({sessions.length})
          </span>
        )}
      </div>

      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {sessions.map((session) => (
          <Button
            key={session.id}
            variant={session.id === activeSession?.id ? 'secondary' : 'ghost'}
            size="sm"
            className="px-2 h-7 text-xs shrink-0"
            onClick={() => setActiveSession(session.id)}
          >
            {session.title}
            <span className="ml-1 opacity-50">
              #{session.id.slice(0, 4)}
            </span>
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSaveOutput}
          disabled={!activeSession || !storagePath || isSaving}
          title="Save Output to Knowledge Base"
        >
          <Save className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewTerminal}
          disabled={isLoading}
          title="New Terminal"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={!activeSession}
          title="Clear Terminal"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          disabled={!activeSession}
          title="Close Terminal"
        >
          <X className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTerminal}
          title={terminalOpen ? 'Collapse Terminal' : 'Expand Terminal'}
        >
          {terminalOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
