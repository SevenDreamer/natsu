import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Loader2 } from 'lucide-react';
import { useNoteStore } from '@/stores/noteStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { searchApi, SearchResult } from '@/lib/tauri';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const storagePath = useSettingsStore((s) => s.storagePath);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const r = await searchApi.search(query);
        setResults(r);
        setIsOpen(r.length > 0);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = async (noteId: string) => {
    if (!storagePath) return;
    try {
      const { notesApi } = await import('@/lib/tauri');
      const note = await notesApi.get(noteId, storagePath);
      setActiveNote(note);
      setQuery('');
      setResults([]);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to open note:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search notes..."
          className="pl-10 pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {query && !isSearching && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ScrollArea className="absolute top-full left-0 right-0 mt-1 max-h-64 bg-popover border rounded-md shadow-lg z-50">
          {results.map((result) => (
            <button
              key={result.note_id}
              className="w-full px-3 py-2 text-left hover:bg-accent"
              onClick={() => handleSelectResult(result.note_id)}
            >
              <div className="font-medium text-sm">{result.title}</div>
              <div
                className="text-xs text-muted-foreground line-clamp-2"
                dangerouslySetInnerHTML={{ __html: result.snippet }}
              />
            </button>
          ))}
        </ScrollArea>
      )}
    </div>
  );
}
