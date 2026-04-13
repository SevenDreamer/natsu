import { useState, useEffect, useRef } from 'react';
import { linksApi } from '@/lib/tauri';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WikiLinkInputProps {
  onSelect: (noteId: string, title: string) => void;
  caseInsensitive?: boolean;
}

export function WikiLinkInput({ onSelect, caseInsensitive = false }: WikiLinkInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<[string, string][]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const r = await linksApi.searchByTitle(query, caseInsensitive);
        setResults(r);
        setIsOpen(r.length > 0);
      } catch (error) {
        console.error(error);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, caseInsensitive]);

  const handleSelect = (noteId: string, title: string) => {
    onSelect(noteId, title);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search notes to link..."
        className="w-full"
      />
      {isOpen && results.length > 0 && (
        <ScrollArea className="absolute top-full left-0 right-0 mt-1 max-h-48 bg-popover border rounded-md shadow-lg z-50">
          {results.map(([id, title]) => (
            <button
              key={id}
              className="w-full px-3 py-2 text-left hover:bg-accent text-sm truncate"
              onClick={() => handleSelect(id, title)}
            >
              {title}
            </button>
          ))}
        </ScrollArea>
      )}
    </div>
  );
}
