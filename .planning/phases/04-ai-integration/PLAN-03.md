---
phase: 04-ai-integration
plan: 03
subsystem: frontend
tags: [context, conversation, history]

requires:
  - phase: PLAN-01
    provides: Chat UI component
  - phase: PLAN-02
    provides: Conversation storage
provides:
  - Conversation list sidebar
  - Context management for multi-turn conversations
  - Conversation switching
affects: []

tech-stack:
  added: []
  patterns: [Context injection, History pagination]

key-files:
  created:
    - natsu/src/components/chat/ConversationList.tsx
    - natsu/src/lib/conversation.ts
  modified:
    - natsu/src/stores/chatStore.ts
    - natsu/src/components/chat/ChatView.tsx
---

# Phase 4 Plan 03: Context Management

**Multi-turn conversation context and conversation list UI**

## Goal

实现对话上下文管理和对话列表界面，支持多轮对话和对话切换。

## Tasks

### Task 1: Create Conversation API Module

Create `natsu/src/lib/conversation.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';

export interface Conversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: number;
}

export interface ConversationWithMessages {
  conversation: Conversation;
  messages: Message[];
}

export const conversationApi = {
  create: async (title?: string): Promise<Conversation> =>
    invoke('create_conversation', { title }),

  list: async (): Promise<Conversation[]> =>
    invoke('list_conversations'),

  get: async (id: string): Promise<ConversationWithMessages> =>
    invoke('get_conversation', { id }),

  addMessage: async (conversationId: string, role: string, content: string): Promise<Message> =>
    invoke('add_message', { request: { conversation_id: conversationId, role, content } }),

  delete: async (id: string): Promise<void> =>
    invoke('delete_conversation', { id }),

  rename: async (id: string, title: string): Promise<void> =>
    invoke('rename_conversation', { id, title }),
};
```

### Task 2: Update Chat Store for Context

Update `natsu/src/stores/chatStore.ts`:

```typescript
import { create } from 'zustand';
import { conversationApi, Conversation, Message } from '@/lib/conversation';

interface ChatState {
  // Current conversation
  currentConversationId: string | null;
  messages: Message[];
  currentStreamingId: string | null;
  isGenerating: boolean;

  // Conversation list
  conversations: Conversation[];
  isLoadingConversations: boolean;

  // Context settings
  contextWindow: number; // Max messages to include in context

  // Actions
  loadConversations: () => Promise<void>;
  createConversation: () => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  sendMessage: (content: string) => Promise<void>;
  appendToMessage: (id: string, content: string) => void;
  setStreaming: (id: string | null) => void;
  setGenerating: (generating: boolean) => void;

  // Context helpers
  getContextMessages: () => Message[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentConversationId: null,
  messages: [],
  currentStreamingId: null,
  isGenerating: false,
  conversations: [],
  isLoadingConversations: false,
  contextWindow: 10,

  loadConversations: async () => {
    set({ isLoadingConversations: true });
    const conversations = await conversationApi.list();
    set({ conversations, isLoadingConversations: false });
  },

  createConversation: async () => {
    const conv = await conversationApi.create();
    set((state) => ({
      conversations: [conv, ...state.conversations],
      currentConversationId: conv.id,
      messages: [],
    }));
    return conv.id;
  },

  selectConversation: async (id) => {
    const { conversation, messages } = await conversationApi.get(id);
    set({
      currentConversationId: id,
      messages,
    });
  },

  deleteConversation: async (id) => {
    await conversationApi.delete(id);
    set((state) => {
      const conversations = state.conversations.filter((c) => c.id !== id);
      const currentConversationId =
        state.currentConversationId === id
          ? (conversations[0]?.id || null)
          : state.currentConversationId;
      return { conversations, currentConversationId };
    });
    if (get().currentConversationId) {
      await get().selectConversation(get().currentConversationId!);
    } else {
      set({ messages: [] });
    }
  },

  sendMessage: async (content) => {
    const { currentConversationId, contextWindow } = get();

    // Ensure we have a conversation
    let convId = currentConversationId;
    if (!convId) {
      convId = await get().createConversation();
    }

    // Save user message
    const userMsg = await conversationApi.addMessage(convId, 'user', content);

    // Get context for AI
    const contextMessages = get().getContextMessages();

    set((state) => ({
      messages: [...state.messages, userMsg],
    }));

    // ... rest of streaming logic
  },

  getContextMessages: () => {
    const { messages, contextWindow } = get();
    // Return last N messages for context
    return messages.slice(-contextWindow);
  },

  // ... other actions
}));
```

### Task 3: Create Conversation List Component

Create `natsu/src/components/chat/ConversationList.tsx`:

```typescript
import { useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';

export function ConversationList() {
  const {
    conversations,
    currentConversationId,
    loadConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    isLoadingConversations,
  } = useChatStore();

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b">
        <Button onClick={createConversation} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="p-4 text-center text-muted-foreground">Loading...</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted ${
                currentConversationId === conv.id ? 'bg-muted' : ''
              }`}
              onClick={() => selectConversation(conv.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="truncate text-sm">{conv.title}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

### Task 4: Update ChatView for Context

Update `natsu/src/components/chat/ChatView.tsx` to:

- Load current conversation on mount
- Pass context messages to AI
- Save messages after generation

### Task 5: Integrate in Main Layout

Add ChatView and ConversationList to the main application layout.

## Verification

1. Can create new conversation
2. Can switch between conversations
3. Context is preserved between messages
4. Conversation list shows all conversations
5. Can delete conversation

---

*Phase: 04-ai-integration*
