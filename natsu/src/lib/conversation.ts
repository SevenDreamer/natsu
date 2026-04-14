import { invoke } from '@tauri-apps/api/core';

// Types matching Rust models
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: number;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface ConversationWithMessages {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  messages: Message[];
}

// API wrapper functions
export const conversationApi = {
  create: async (title: string): Promise<Conversation> => {
    return invoke('create_conversation', { title });
  },

  list: async (): Promise<Conversation[]> => {
    return invoke('list_conversations');
  },

  get: async (id: string): Promise<ConversationWithMessages> => {
    return invoke('get_conversation', { id });
  },

  addMessage: async (
    conversationId: string,
    role: MessageRole,
    content: string
  ): Promise<Message> => {
    return invoke('add_message', { conversationId, role, content });
  },

  delete: async (id: string): Promise<void> => {
    return invoke('delete_conversation', { id });
  },

  rename: async (id: string, title: string): Promise<Conversation> => {
    return invoke('rename_conversation', { id, title });
  },
};
