import { useEffect, useRef, useCallback } from 'react';
import { linksApi } from '@/lib/tauri';
import { useSettingsStore } from '@/stores/settingsStore';

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

  return (
    <div className="h-full flex flex-col">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        className="flex-1 w-full p-4 resize-none border-none focus:outline-none bg-transparent font-mono text-sm"
        placeholder="Start writing your note...&#10;&#10;Use [[Note Name]] to create wiki-links"
      />
    </div>
  );
}
