import { useEffect, useState } from 'react';
import { linksApi, Backlink } from '@/lib/tauri';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface BacklinksListProps {
  noteId: string | null;
  onNavigate: (noteId: string) => void;
}

export function BacklinksList({ noteId, onNavigate }: BacklinksListProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!noteId) {
      setBacklinks([]);
      return;
    }

    setIsLoading(true);
    linksApi.getBacklinks(noteId)
      .then(setBacklinks)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [noteId]);

  if (!noteId || backlinks.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {isLoading ? 'Loading...' : 'No backlinks'}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 font-medium text-sm">
        Backlinks ({backlinks.length})
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        {backlinks.map((bl, index) => (
          <button
            key={`${bl.source_note_id}-${index}`}
            className="w-full px-4 py-2 text-left hover:bg-accent text-sm"
            onClick={() => onNavigate(bl.source_note_id)}
          >
            <div className="font-medium truncate">{bl.source_title || 'Untitled'}</div>
            <div className="text-xs text-muted-foreground">
              links via [[{bl.link_text}]]
            </div>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}
