import { MarkdownEditor } from '@/components/editor/MarkdownEditor';
import { useNoteStore } from '@/stores/noteStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { notesApi } from '@/lib/tauri';
import { useEffect, useRef } from 'react';

export function MainPanel() {
  const activeNote = useNoteStore((s) => s.activeNote);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const updateNote = useNoteStore((s) => s.updateNote);
  const storagePath = useSettingsStore((s) => s.storagePath);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentChange = (content: string) => {
    if (!activeNoteId) return;

    updateNote(activeNoteId, { content });

    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (storagePath && activeNoteId) {
        try {
          await notesApi.save(activeNoteId, content, storagePath);
        } catch (error) {
          console.error('Failed to save note:', error);
        }
      }
    }, 1000);
  };

  const handleWikiLinkClick = (noteId: string) => {
    if (storagePath) {
      notesApi.get(noteId, storagePath)
        .then(setActiveNote)
        .catch(console.error);
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!activeNote) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">Select or create a note</p>
          <p className="text-sm">Use the sidebar to navigate your knowledge base</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 flex items-center px-4 border-b">
        <h2 className="font-semibold truncate">{activeNote.title}</h2>
      </div>
      <div className="flex-1 min-h-0">
        <MarkdownEditor
          content={activeNote.content}
          noteId={activeNoteId}
          onChange={handleContentChange}
          onWikiLinkClick={handleWikiLinkClick}
        />
      </div>
    </div>
  );
}
