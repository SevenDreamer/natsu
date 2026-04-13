import { Note } from '@/lib/tauri';
import { cn } from '@/lib/utils';

interface NoteListItemProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
}

export function NoteListItem({ note, isActive, onClick }: NoteListItemProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-2 text-left hover:bg-accent transition-colors',
        isActive && 'bg-accent'
      )}
    >
      <div className="font-medium text-sm truncate">{note.title}</div>
      <div className="text-xs text-muted-foreground">
        {formatDate(note.updated_at)}
      </div>
    </button>
  );
}
