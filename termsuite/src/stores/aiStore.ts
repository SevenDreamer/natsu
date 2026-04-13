import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface ProviderConfig {
  providerType: 'Claude' | 'OpenAI' | 'DeepSeek' | 'Ollama';
  isConfigured: boolean;
  model?: string;
}

interface AIState {
  defaultProvider: string;
  providers: ProviderConfig[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProviders: () => Promise<void>;
  setDefaultProvider: (provider: string) => void;
  storeApiKey: (provider: string, apiKey: string) => Promise<void>;
  deleteApiKey: (provider: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      defaultProvider: 'Claude',
      providers: [],
      isLoading: false,
      error: null,

      fetchProviders: async () => {
        set({ isLoading: true });
        try {
          const providers = await invoke<ProviderConfig[]>('list_providers');
          set({ providers, isLoading: false });
        } catch (err) {
          set({ error: String(err), isLoading: false });
        }
      },

      setDefaultProvider: (provider) => {
        set({ defaultProvider: provider });
      },

      storeApiKey: async (provider, apiKey) => {
        set({ isLoading: true });
        try {
          await invoke('store_api_key', { provider, apiKey });
          await get().fetchProviders();
        } catch (err) {
          set({ error: String(err), isLoading: false });
          throw err;
        }
      },

      deleteApiKey: async (provider) => {
        try {
          await invoke('delete_api_key', { provider });
          await get().fetchProviders();
        } catch (err) {
          set({ error: String(err) });
          throw err;
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'termsuite-ai-settings',
      partialize: (state) => ({
        defaultProvider: state.defaultProvider,
      }),
    }
  )
);
