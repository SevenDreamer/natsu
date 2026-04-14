import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming: boolean;
}

interface ChatState {
  messages: Message[];
  isGenerating: boolean;
  currentStreamingId: string | null;

  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp' | 'isStreaming'>) => string;
  appendToMessage: (id: string, content: string) => void;
  setMessageContent: (id: string, content: string) => void;
  setStreaming: (id: string, isStreaming: boolean) => void;
  setGenerating: (isGenerating: boolean) => void;
  clearMessages: () => void;
  removeMessage: (id: string) => void;
}

let messageIdCounter = 0;

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isGenerating: false,
  currentStreamingId: null,

  addMessage: (message) => {
    const id = `msg-${Date.now()}-${++messageIdCounter}`;
    const newMessage: Message = {
      ...message,
      id,
      timestamp: Date.now(),
      isStreaming: false,
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
    return id;
  },

  appendToMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + content } : msg
      ),
    }));
  },

  setMessageContent: (id, content) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg
      ),
    }));
  },

  setStreaming: (id, isStreaming) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, isStreaming } : msg
      ),
      currentStreamingId: isStreaming ? id : null,
    }));
  },

  setGenerating: (isGenerating) => {
    set({ isGenerating });
  },

  clearMessages: () => {
    set({ messages: [], currentStreamingId: null });
  },

  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    }));
  },
}));
