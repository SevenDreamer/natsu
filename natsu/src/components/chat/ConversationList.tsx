import { useEffect, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConversationList() {
  const {
    conversations,
    currentConversationId,
    isLoadingConversations,
    loadConversations,
    createConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
  } = useChatStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleNewChat = async () => {
    await createConversation();
  };

  const handleSelect = async (id: string) => {
    if (id !== currentConversationId) {
      await selectConversation(id);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      // Second click - confirm delete
      await deleteConversation(id);
      setDeletingId(null);
    } else {
      // First click - mark for deletion
      setDeletingId(id);
      // Reset after 3 seconds if not confirmed
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveEdit = async (id: string) => {
    if (editTitle.trim()) {
      await renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="h-full flex flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="p-3 border-b">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoadingConversations ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  'group rounded-md p-2 cursor-pointer transition-colors',
                  currentConversationId === conversation.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => handleSelect(conversation.id)}
              >
                {editingId === conversation.id ? (
                  // Edit mode
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit(conversation.id);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleSaveEdit(conversation.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  // Normal mode
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {conversation.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(conversation.updated_at)}
                      </div>
                    </div>
                    {/* Action buttons - shown on hover */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(conversation.id, conversation.title);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          'h-6 w-6',
                          deletingId === conversation.id && 'text-destructive hover:text-destructive'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
