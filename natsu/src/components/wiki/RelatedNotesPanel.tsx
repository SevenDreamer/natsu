import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface RelatedNote {
  note_id: string;
  title: string;
  relationship_type: 'direct_link' | 'co_citation' | 'co_reference' | 'proximity';
  score: number;
}

interface RelatedNotesPanelProps {
  noteId: string | null;
  onNavigate: (noteId: string) => void;
}

const relationshipLabels: Record<string, string> = {
  direct_link: 'Direct Link',
  co_citation: 'Co-citation',
  co_reference: 'Co-reference',
  proximity: 'Same Directory',
};

export function RelatedNotesPanel({ noteId, onNavigate }: RelatedNotesPanelProps) {
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!noteId) {
      setRelatedNotes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    invoke<RelatedNote[]>('get_related_notes', { noteId })
      .then(setRelatedNotes)
      .catch((err) => setError(String(err)))
      .finally(() => setIsLoading(false));
  }, [noteId]);

  if (!noteId) return null;

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground">Loading related notes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Error: {error}
      </div>
    );
  }

  if (relatedNotes.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No related notes found
      </div>
    );
  }

  return (
    <div className="p-4">
      <h4 className="font-medium text-sm mb-3">Related Notes</h4>
      <div className="space-y-2">
        {relatedNotes.map((note) => (
          <button
            key={note.note_id}
            className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
            onClick={() => onNavigate(note.note_id)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium truncate">
                [[{note.title}]]
              </span>
              <span className="text-xs text-muted-foreground">
                {note.score.toFixed(2)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground italic">
              {relationshipLabels[note.relationship_type]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
