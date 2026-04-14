import { create } from 'zustand';
import { conversationApi, Conversation, Message as DbMessage, MessageRole } from '@/lib/conversation';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming: boolean;
}

interface ChatState {
  // Conversation state
  currentConversationId: string | null;
  conversations: Conversation[];
  messages: Message[];
  isGenerating: boolean;
  currentStreamingId: string | null;
  isLoadingConversations: boolean;

  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp' | 'isStreaming'>) => string;
  appendToMessage: (id: string, content: string) => void;
  setMessageContent: (id: string, content: string) => void;
  setStreaming: (id: string, isStreaming: boolean) => void;
  setGenerating: (isGenerating: boolean) => void;
  clearMessages: () => void;
  removeMessage: (id: string) => void;

  // Conversation management
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;

  // Context for AI
  getContextMessages: (limit?: number) => { role: string; content: string }[];

  // Persistence
  saveMessageToDb: (role: MessageRole, content: string) => Promise<DbMessage | null>;
}

let messageIdCounter = 0;

export const useChatStore = create<ChatState>((set, get) => ({
  currentConversationId: null,
  conversations: [],
  messages: [],
  isGenerating: false,
  currentStreamingId: null,
  isLoadingConversations: false,

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

  loadConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const conversations = await conversationApi.list();
      set({ conversations, isLoadingConversations: false });
    } catch (error) {
      console.error('Failed to load conversations:', error);
      set({ isLoadingConversations: false });
    }
  },

  createConversation: async (title?: string) => {
    const conversationTitle = title || `Chat ${new Date().toLocaleDateString()}`;
    const conversation = await conversationApi.create(conversationTitle);
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
      messages: [],
    }));
    return conversation;
  },

  selectConversation: async (id: string) => {
    try {
      const conversation = await conversationApi.get(id);
      // Convert DB messages to store messages
      const messages: Message[] = conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at * 1000, // Convert to milliseconds
        isStreaming: false,
      }));
      set({
        currentConversationId: id,
        messages,
        currentStreamingId: null,
        isGenerating: false,
      });
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  },

  deleteConversation: async (id: string) => {
    await conversationApi.delete(id);
    set((state) => {
      const newConversations = state.conversations.filter((c) => c.id !== id);
      // If we deleted the current conversation, clear messages
      const isCurrent = state.currentConversationId === id;
      return {
        conversations: newConversations,
        currentConversationId: isCurrent ? null : state.currentConversationId,
        messages: isCurrent ? [] : state.messages,
      };
    });
  },

  renameConversation: async (id: string, title: string) => {
    const updated = await conversationApi.rename(id, title);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? updated : c
      ),
    }));
  },

  getContextMessages: (limit = 10) => {
    const { messages } = get();
    const recentMessages = messages.slice(-limit);
    return recentMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  },

  saveMessageToDb: async (role: MessageRole, content: string) => {
    const { currentConversationId } = get();
    if (!currentConversationId) {
      return null;
    }
    try {
      const dbMessage = await conversationApi.addMessage(
        currentConversationId,
        role,
        content
      );
      // Update conversation list to reflect new updated_at
      get().loadConversations();
      return dbMessage;
    } catch (error) {
      console.error('Failed to save message:', error);
      return null;
    }
  },
}));
