import { invoke } from '@tauri-apps/api/core';

export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  created_at: number;
  updated_at: number;
}

export interface WikiLink {
  link_text: string;
  target_note_id: string | null;
  is_broken: boolean;
}

export interface Backlink {
  source_note_id: string;
  source_title: string;
  link_text: string;
}

export interface SearchResult {
  note_id: string;
  title: string;
  snippet: string;
  rank: number;
}

export const notesApi = {
  create: (title: string, storagePath: string): Promise<Note> =>
    invoke('create_note', { title, storagePath }),

  get: (id: string, storagePath: string): Promise<Note> =>
    invoke('get_note', { id, storagePath }),

  save: (id: string, content: string, storagePath: string): Promise<void> =>
    invoke('save_note', { id, content, storagePath }),

  list: (): Promise<Note[]> =>
    invoke('list_notes'),

  delete: (id: string, storagePath: string): Promise<void> =>
    invoke('delete_note', { id, storagePath }),
};

export const linksApi = {
  update: (noteId: string, content: string, caseInsensitive: boolean): Promise<WikiLink[]> =>
    invoke('update_note_links', { noteId, content, caseInsensitive }),

  getBacklinks: (noteId: string): Promise<Backlink[]> =>
    invoke('get_backlinks', { noteId }),

  getOutlinks: (noteId: string): Promise<WikiLink[]> =>
    invoke('get_outlinks', { noteId }),

  searchByTitle: (query: string, caseInsensitive: boolean): Promise<[string, string][]> =>
    invoke('search_notes_by_title', { query, caseInsensitive }),
};

export const searchApi = {
  search: (query: string, limit?: number): Promise<SearchResult[]> =>
    invoke('search_notes', { query, limit }),

  searchByTag: (tag: string): Promise<SearchResult[]> =>
    invoke('search_notes_by_tag', { tag }),
};

export const storageApi = {
  selectPath: (): Promise<string | null> =>
    invoke('select_storage_path'),

  init: (path: string): Promise<void> =>
    invoke('init_storage', { path }),

  getPath: (): Promise<string | null> =>
    invoke('get_storage_path'),

  setPath: (path: string): Promise<void> =>
    invoke('set_storage_path', { path }),
};
