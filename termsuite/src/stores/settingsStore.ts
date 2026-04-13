import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  storagePath: string | null;
  caseInsensitiveLinks: boolean;
  theme: 'light' | 'dark' | 'system';
  isInitialized: boolean;
  defaultAIProvider: string;
  setStoragePath: (path: string) => void;
  toggleCaseInsensitive: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setInitialized: (initialized: boolean) => void;
  setDefaultAIProvider: (provider: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      storagePath: null,
      caseInsensitiveLinks: false,
      theme: 'system',
      isInitialized: false,
      defaultAIProvider: 'Claude',

      setStoragePath: (path: string) => set({ storagePath: path, isInitialized: true }),
      toggleCaseInsensitive: () => set((state) => ({ caseInsensitiveLinks: !state.caseInsensitiveLinks })),
      setTheme: (theme) => set({ theme }),
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      setDefaultAIProvider: (provider) => set({ defaultAIProvider: provider }),
    }),
    {
      name: 'termsuite-settings',
      partialize: (state) => ({
        caseInsensitiveLinks: state.caseInsensitiveLinks,
        theme: state.theme,
        defaultAIProvider: state.defaultAIProvider,
      }),
    }
  )
);
