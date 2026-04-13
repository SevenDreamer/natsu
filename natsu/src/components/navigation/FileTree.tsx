import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, FileText } from 'lucide-react';
import { NoteListItem } from './NoteListItem';
import { SearchBar } from './SearchBar';
import { useNoteStore } from '@/stores/noteStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { notesApi } from '@/lib/tauri';
import { useEffect as useEffect2 } from 'react';

export function FileTree() {
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const notes = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setNotes = useNoteStore((s) => s.setNotes);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const storagePath = useSettingsStore((s) => s.storagePath);

  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      try {
        const loadedNotes = await notesApi.list();
        setNotes(loadedNotes);
      } catch (error) {
        console.error('Failed to load notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (storagePath) {
      loadNotes();
    }
  }, [storagePath, setNotes]);

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !storagePath) return;

    try {
      const note = await notesApi.create(newNoteTitle.trim(), storagePath);
      setNotes([note, ...notes]);
      setNewNoteTitle('');
      setIsCreating(false);
      const fullNote = await notesApi.get(note.id, storagePath);
      setActiveNote(fullNote);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateNote();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewNoteTitle('');
    }
  };

  const handleOpenNote = async (noteId: string) => {
    if (!storagePath) return;
    try {
      const note = await notesApi.get(noteId, storagePath);
      setActiveNote(note);
    } catch (error) {
      console.error('Failed to open note:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <SearchBar />
      </div>

      <Separator />

      <div className="p-2">
        {isCreating ? (
          <Input
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newNoteTitle.trim()) {
                setIsCreating(false);
              }
            }}
            placeholder="Note title..."
            className="h-8"
            autoFocus
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Note
          </Button>
        )}
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="py-1">
          {isLoading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Loading...
            </div>
          ) : notes.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No notes yet. Create your first note!
            </div>
          ) : (
            notes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                isActive={note.id === activeNoteId}
                onClick={() => handleOpenNote(note.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
