import { useEffect, useRef, useCallback, useState } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { ChatMessage } from './ChatMessage';
import { MessageInput } from './MessageInput';
import { useChatStore } from '@/stores/chatStore';
import { useAIStore } from '@/stores/aiStore';
import {
  getSelectedCode,
  clearSelectedCode,
  formatForAI,
  CodeContext,
} from '@/lib/codeContext';
import { Bot, MessageSquare, Code, X } from 'lucide-react';

export function ChatView() {
  const {
    messages,
    isGenerating,
    currentStreamingId,
    currentConversationId,
    addMessage,
    appendToMessage,
    setStreaming,
    setGenerating,
    getContextMessages,
    saveMessageToDb,
    createConversation,
  } = useChatStore();

  const defaultProvider = useAIStore((s) => s.defaultProvider);
  const scrollRef = useRef<HTMLDivElement>(null);
  const unlistenRef = useRef<UnlistenFn[]>([]);

  // Code context state
  const [pendingCodeContext, setPendingCodeContext] = useState<CodeContext | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Check for pending code context on mount
  useEffect(() => {
    const codeContext = getSelectedCode();
    if (codeContext) {
      setPendingCodeContext(codeContext);
      // Clear the global state so it doesn't persist
      clearSelectedCode();
    }
  }, []);

  // Set up event listeners for streaming responses
  useEffect(() => {
    const setupListeners = async () => {
      const unlistenChunk = await listen<string>('ai-chunk', (event) => {
        if (currentStreamingId) {
          appendToMessage(currentStreamingId, event.payload);
        }
      });

      const unlistenComplete = await listen<void>('ai-complete', async () => {
        const streamingId = currentStreamingId;
        if (streamingId) {
          setStreaming(streamingId, false);
          // Find the message content and save to DB
          const state = useChatStore.getState();
          const msg = state.messages.find(m => m.id === streamingId);
          if (msg && state.currentConversationId) {
            await state.saveMessageToDb('assistant', msg.content);
          }
        }
        setGenerating(false);
      });

      const unlistenError = await listen<string>('ai-error', async (event) => {
        console.error('AI Error:', event.payload);
        if (currentStreamingId) {
          setStreaming(currentStreamingId, false);
          appendToMessage(
            currentStreamingId,
            `\n\n**Error:** ${event.payload}`
          );
        }
        setGenerating(false);
      });

      unlistenRef.current = [unlistenChunk, unlistenComplete, unlistenError];
    };

    setupListeners();

    return () => {
      unlistenRef.current.forEach((unlisten) => unlisten());
    };
  }, [currentStreamingId, appendToMessage, setStreaming, setGenerating]);

  const handleSend = useCallback(
    async (content: string) => {
      // Create a new conversation if none exists
      let conversationId = currentConversationId;
      if (!conversationId) {
        const newConversation = await createConversation();
        conversationId = newConversation.id;
      }

      // Add user message
      addMessage({ role: 'user', content });

      // Save user message to DB
      await saveMessageToDb('user', content);

      // Add empty assistant message for streaming
      const assistantId = addMessage({
        role: 'assistant',
        content: '',
      });

      setStreaming(assistantId, true);
      setGenerating(true);

      try {
        // Build context from recent messages
        const contextMessages = getContextMessages(10);
        const context =
          contextMessages.length > 0
            ? JSON.stringify(contextMessages)
            : undefined;

        await invoke('ai_stream_completion', {
          prompt: content,
          provider: defaultProvider,
          context,
        });
      } catch (error) {
        console.error('Failed to start completion:', error);
        setStreaming(assistantId, false);
        setGenerating(false);
        appendToMessage(assistantId, `**Error:** ${String(error)}`);
      }
    },
    [
      addMessage,
      appendToMessage,
      setStreaming,
      setGenerating,
      getContextMessages,
      saveMessageToDb,
      createConversation,
      currentConversationId,
      defaultProvider,
    ]
  );

  const handleStop = useCallback(() => {
    // For now, just set generating to false
    // In the future, we could add actual stream cancellation
    setGenerating(false);
    if (currentStreamingId) {
      setStreaming(currentStreamingId, false);
    }
  }, [currentStreamingId, setGenerating, setStreaming]);

  // Handle explaining selected code
  const handleExplainCode = useCallback(async () => {
    if (!pendingCodeContext) return;

    const prompt = formatForAI(pendingCodeContext);
    setPendingCodeContext(null);
    await handleSend(prompt);
  }, [pendingCodeContext, handleSend]);

  // Handle dismissing the code context banner
  const handleDismissCodeContext = useCallback(() => {
    setPendingCodeContext(null);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <Bot className="h-5 w-5" />
        <h2 className="font-semibold">AI Chat</h2>
        <span className="text-xs text-muted-foreground">
          ({defaultProvider})
        </span>
      </div>

      {/* Code Context Banner */}
      {pendingCodeContext && (
        <div className="px-4 py-3 border-b bg-primary/5">
          <div className="flex items-start gap-3">
            <Code className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Code Selected</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {pendingCodeContext.filename
                  ? `${pendingCodeContext.filename} (lines ${pendingCodeContext.lineStart}-${pendingCodeContext.lineEnd})`
                  : `Lines ${pendingCodeContext.lineStart}-${pendingCodeContext.lineEnd}`}
              </p>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto max-h-24">
                <code className="text-muted-foreground">
                  {pendingCodeContext.code.length > 200
                    ? pendingCodeContext.code.slice(0, 200) + '...'
                    : pendingCodeContext.code}
                </code>
              </pre>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleExplainCode}
                  disabled={isGenerating}
                  className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  Explain
                </button>
                <button
                  onClick={handleDismissCodeContext}
                  className="px-3 py-1 text-xs border rounded hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissCodeContext}
              className="p-1 hover:bg-accent rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-auto" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center max-w-sm">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm mt-1">
                Ask questions, get help with notes, or explore your knowledge base
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                role={message.role}
                content={message.content}
                isStreaming={message.isStreaming}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onStop={handleStop}
        isGenerating={isGenerating}
        placeholder="Ask anything..."
      />
    </div>
  );
}
