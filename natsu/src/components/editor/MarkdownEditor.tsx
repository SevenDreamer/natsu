import { useEffect, useRef, useCallback, useState } from 'react';
import { linksApi } from '@/lib/tauri';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { useNoteStore } from '@/stores/noteStore';
import {
  setSelectedCode,
  clearSelectedCode,
  detectLanguage
} from '@/lib/codeContext';

interface MarkdownEditorProps {
  content: string;
  noteId: string | null;
  onChange: (content: string) => void;
  onWikiLinkClick: (noteId: string) => void;
}

export function MarkdownEditor({ content, noteId, onChange, onWikiLinkClick }: MarkdownEditorProps) {
  const caseInsensitive = useSettingsStore((s) => s.caseInsensitiveLinks);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setChatOpen = useUIStore((s) => s.setChatOpen);
  const activeNote = useNoteStore((s) => s.activeNote);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });

  // Selected text state
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    onChange(newContent);

    // Debounce link extraction
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (noteId) {
        try {
          await linksApi.update(noteId, newContent, caseInsensitive);
        } catch (error) {
          console.error('Failed to update links:', error);
        }
      }
    }, 500);
  }, [noteId, onChange, caseInsensitive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle text selection
  const handleSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content.substring(start, end);

    setSelectedText(text);
    setSelectionStart(start);
    setSelectionEnd(end);
  }, [content]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content.substring(start, end);

    // Only show context menu if there's text selected
    if (text.trim().length > 0) {
      setSelectedText(text);
      setSelectionStart(start);
      setSelectionEnd(end);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        visible: true,
      });
    }
  }, [content]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.visible]);

  // Calculate line numbers from position
  const getLineNumbers = useCallback((text: string, position: number, endPosition: number) => {
    const lines = text.split('\n');
    let currentPos = 0;
    let startLine = 1;
    let endLine = 1;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (currentPos + lineLength > position && startLine === 1) {
        startLine = i + 1;
      }
      if (currentPos + lineLength > endPosition) {
        endLine = i + 1;
        break;
      }
      currentPos += lineLength;
    }

    return { startLine, endLine };
  }, []);

  // Handle "Explain with AI" action
  const handleExplainWithAI = useCallback(() => {
    if (!selectedText.trim()) return;

    const { startLine, endLine } = getLineNumbers(content, selectionStart, selectionEnd);
    const filename = activeNote?.title || null;
    const language = detectLanguage(filename);

    setSelectedCode({
      code: selectedText,
      language,
      filename,
      lineStart: startLine,
      lineEnd: endLine,
    });

    // Open chat panel
    setChatOpen(true);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [selectedText, content, selectionStart, selectionEnd, activeNote, getLineNumbers, setChatOpen]);

  // Handle keyboard shortcut for "Explain with AI"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+E (or Cmd+Shift+E on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleExplainWithAI();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleExplainWithAI]);

  return (
    <div className="h-full flex flex-col relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onSelect={handleSelect}
        onContextMenu={handleContextMenu}
        className="flex-1 w-full p-4 resize-none border-none focus:outline-none bg-transparent font-mono text-sm"
        placeholder="Start writing your note...&#10;&#10;Use [[Note Name]] to create wiki-links"
      />

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-popover border rounded-md shadow-md py-1 min-w-[160px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleExplainWithAI}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Explain with AI
          </button>
          <div className="px-3 py-1 text-xs text-muted-foreground">
            Shortcut: Ctrl+Shift+E
          </div>
        </div>
      )}
    </div>
  );
}
