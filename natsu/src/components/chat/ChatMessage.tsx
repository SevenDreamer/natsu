import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { User, Bot, Loader2 } from 'lucide-react';

interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  isDark?: boolean;
}

const CodeBlock = memo(function CodeBlock({
  inline,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  if (!inline && match) {
    return (
      <div className="relative group my-4">
        <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded z-10">
          {language}
        </div>
        <pre
          className={cn(
            'bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-sm',
            className
          )}
          {...props}
        >
          <code>{children}</code>
        </pre>
      </div>
    );
  }

  return (
    <code
      className={cn(
        'bg-muted px-1.5 py-0.5 rounded text-sm font-mono',
        className
      )}
      {...props}
    >
      {children}
    </code>
  );
});

function ChatMessageComponent({
  role,
  content,
  isStreaming,
  isDark = true,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'bg-primary/5' : 'bg-background',
        isSystem && 'bg-muted/50'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : isSystem ? null : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="text-sm font-medium mb-1 text-muted-foreground">
          {isUser ? 'You' : isSystem ? 'System' : 'Assistant'}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: CodeBlock as React.ComponentType<
                React.HTMLAttributes<HTMLElement> & { inline?: boolean }
              >,
              pre: ({ children }) => (
                <pre className="bg-muted rounded-lg p-0 overflow-x-auto">
                  {children}
                </pre>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageComponent);
