---
phase: 04-ai-integration
plan: 01
subsystem: frontend
tags: [chat, ui, react, streaming]

requires: []
provides:
  - Chat conversation UI component
  - Message display with Markdown rendering
  - Streaming response display
affects: [PLAN-02, PLAN-03]

tech-stack:
  added: [react-markdown, remark-gfm]
  patterns: [Message list, Streaming state]

key-files:
  created:
    - natsu/src/components/chat/ChatView.tsx
    - natsu/src/components/chat/MessageList.tsx
    - natsu/src/components/chat/MessageInput.tsx
    - natsu/src/components/chat/ChatMessage.tsx
    - natsu/src/stores/chatStore.ts
  modified:
    - natsu/package.json
---

# Phase 4 Plan 01: Chat UI Component

**Chat interface with streaming message display**

## Goal

创建聊天界面组件，支持消息列表显示、流式响应、Markdown 渲染。

## Tasks

### Task 1: Install Dependencies

```bash
cd natsu && npm install react-markdown remark-gfm react-syntax-highlighter
```

### Task 2: Create Chat Store

Create `natsu/src/stores/chatStore.ts`:

```typescript
import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatState {
  messages: Message[];
  currentStreamingId: string | null;
  isGenerating: boolean;

  addMessage: (message: Message) => void;
  appendToMessage: (id: string, content: string) => void;
  setStreaming: (id: string | null) => void;
  setGenerating: (generating: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  currentStreamingId: null,
  isGenerating: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  appendToMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + content } : m
      ),
    })),

  setStreaming: (id) => set({ currentStreamingId: id }),
  setGenerating: (generating) => set({ isGenerating: generating }),
  clearMessages: () => set({ messages: [] }),
}));
```

### Task 3: Create Message Component

Create `natsu/src/components/chat/ChatMessage.tsx`:

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-lg p-3 ${
        role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
      }`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter language={match[1]} PreTag="div" {...props}>
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>{children}</code>
              );
            }
          }}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && <span className="animate-pulse">▋</span>}
      </div>
    </div>
  );
}
```

### Task 4: Create Message Input

Create `natsu/src/components/chat/MessageInput.tsx`:

```typescript
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Square } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
}

export function MessageInput({ onSend, onStop, isGenerating }: MessageInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isGenerating) {
        onSend(input.trim());
        setInput('');
      }
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
        className="flex-1 resize-none rounded-lg border p-3 focus:outline-none focus:ring-2"
        rows={1}
      />
      {isGenerating ? (
        <Button onClick={onStop} variant="destructive" size="icon">
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={() => input.trim() && onSend(input.trim())} disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

### Task 5: Create Chat View

Create `natsu/src/components/chat/ChatView.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useChatStore } from '@/stores/chatStore';
import { useAIStore } from '@/stores/aiStore';
import { ChatMessage } from './ChatMessage';
import { MessageInput } from './MessageInput';

export function ChatView() {
  const { messages, addMessage, appendToMessage, setStreaming, setGenerating, isGenerating } = useChatStore();
  const defaultProvider = useAIStore((s) => s.defaultProvider);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unlistenChunk = listen<string>('ai-chunk', (event) => {
      const streamingId = useChatStore.getState().currentStreamingId;
      if (streamingId) {
        appendToMessage(streamingId, event.payload);
      }
    });

    const unlistenComplete = listen('ai-complete', () => {
      setStreaming(null);
      setGenerating(false);
    });

    const unlistenError = listen<string>('ai-error', (event) => {
      console.error('AI error:', event.payload);
      setStreaming(null);
      setGenerating(false);
    });

    return () => {
      unlistenChunk.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);

  const handleSend = async (content: string) => {
    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content,
      timestamp: new Date(),
    };
    addMessage(userMessage);

    const assistantId = crypto.randomUUID();
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    });

    setStreaming(assistantId);
    setGenerating(true);

    await invoke('ai_stream_completion', {
      prompt: content,
      provider: defaultProvider,
      context: null,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSend={handleSend} isGenerating={isGenerating} />
    </div>
  );
}
```

## Verification

1. Chat interface renders correctly
2. User messages display on the right
3. AI messages display on the left
4. Streaming responses append in real-time
5. Markdown renders properly with code highlighting

---

*Phase: 04-ai-integration*
