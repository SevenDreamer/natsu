import { create } from 'zustand';

export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  created_at: number;
  updated_at: number;
}

interface NoteState {
  notes: Note[];
  activeNoteId: string | null;
  activeNote: Note | null;
  isLoading: boolean;
  error: string | null;
  setNotes: (notes: Note[]) => void;
  setActiveNote: (note: Note | null) => void;
  setActiveNoteId: (id: string | null) => void;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  activeNoteId: null,
  activeNote: null,
  isLoading: false,
  error: null,

  setNotes: (notes) => set({ notes }),
  setActiveNote: (note) => set({ activeNote: note, activeNoteId: note?.id ?? null }),
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    activeNote: state.activeNoteId === id ? { ...state.activeNote!, ...updates } : state.activeNote,
  })),
  removeNote: (id) => set((state) => ({
    notes: state.notes.filter((n) => n.id !== id),
    activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
    activeNote: state.activeNoteId === id ? null : state.activeNote,
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
