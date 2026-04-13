import { Separator } from '@/components/ui/separator';
import { BacklinksList } from '@/components/editor/BacklinksList';
import { RelatedNotesPanel } from '@/components/wiki/RelatedNotesPanel';
import { useNoteStore } from '@/stores/noteStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { notesApi } from '@/lib/tauri';

interface PreviewPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function PreviewPanel({ collapsed }: PreviewPanelProps) {
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const storagePath = useSettingsStore((s) => s.storagePath);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);

  const handleNavigate = (noteId: string) => {
    if (storagePath) {
      notesApi.get(noteId, storagePath)
        .then(setActiveNote)
        .catch(console.error);
    }
  };

  if (collapsed) {
    return null;
  }

  return (
    <div className="h-full flex flex-col w-80 border-l bg-background">
      <div className="h-12 flex items-center px-4 border-b">
        <h3 className="font-medium text-sm">Info</h3>
      </div>
      <Separator />
      <div className="flex-1 overflow-auto">
        <BacklinksList noteId={activeNoteId} onNavigate={handleNavigate} />
        <Separator />
        <RelatedNotesPanel noteId={activeNoteId} onNavigate={handleNavigate} />
      </div>
    </div>
  );
}
