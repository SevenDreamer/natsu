import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useChatStore, ToolConfirmation } from '@/stores/chatStore';
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolConfirmationDialogProps {
  confirmation: ToolConfirmation;
  onConfirm: () => void;
  onDeny: () => void;
}

function SafetyLevelBadge({ level }: { level: ToolConfirmation['safetyLevel'] }) {
  const config = {
    safe: {
      icon: ShieldCheck,
      label: 'Safe',
      className: 'bg-green-500/10 text-green-500 border-green-500/20',
    },
    caution: {
      icon: ShieldAlert,
      label: 'Caution',
      className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    },
    dangerous: {
      icon: ShieldX,
      label: 'Dangerous',
      className: 'bg-red-500/10 text-red-500 border-red-500/20',
    },
  };

  const { icon: Icon, label, className } = config[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md border',
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function ToolConfirmationDialog({
  confirmation,
  onConfirm,
  onDeny,
}: ToolConfirmationDialogProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullInput, setShowFullInput] = useState(false);

  const { toolUseId, toolName, input, safetyLevel, message } = confirmation;

  const handleConfirm = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const result = await invoke<{
        tool_use_id: string;
        content: string;
        is_error: boolean;
      }>('confirm_tool_execution', {
        toolUseId,
        toolName,
        input,
      });

      if (result.is_error) {
        setError(result.content);
      } else {
        onConfirm();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  const formatInput = () => {
    const json = JSON.stringify(input, null, 2);
    if (json.length > 300 && !showFullInput) {
      return json.slice(0, 300) + '...';
    }
    return json;
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onDeny()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Tool Execution Request
          </DialogTitle>
          <DialogDescription>
            The AI wants to execute a tool that requires your confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tool name and safety level */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tool</p>
              <p className="font-mono text-sm">{toolName}</p>
            </div>
            <SafetyLevelBadge level={safetyLevel} />
          </div>

          {/* Safety message */}
          <div
            className={cn(
              'p-3 rounded-md border text-sm',
              safetyLevel === 'dangerous' && 'bg-red-500/5 border-red-500/20',
              safetyLevel === 'caution' && 'bg-yellow-500/5 border-yellow-500/20',
              safetyLevel === 'safe' && 'bg-green-500/5 border-green-500/20'
            )}
          >
            <p className="text-muted-foreground">{message}</p>
          </div>

          {/* Input parameters */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-muted-foreground">Parameters</p>
              {JSON.stringify(input).length > 300 && (
                <button
                  onClick={() => setShowFullInput(!showFullInput)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {showFullInput ? (
                    <>
                      Show less <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      Show more <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
            <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto max-h-48">
              <code>{formatInput()}</code>
            </pre>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDeny} disabled={isExecuting}>
            Cancel
          </Button>
          <Button
            variant={safetyLevel === 'dangerous' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              'Execute'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Connected version that reads from store
export function ToolConfirmationDialogContainer() {
  const pendingConfirmation = useChatStore((s) => s.pendingConfirmation);
  const setPendingConfirmation = useChatStore((s) => s.setPendingConfirmation);
  const setToolExecution = useChatStore((s) => s.setToolExecution);

  if (!pendingConfirmation) {
    return null;
  }

  const handleConfirm = () => {
    // Tool execution result is handled by the backend event
    setPendingConfirmation(null);
  };

  const handleDeny = () => {
    setToolExecution(pendingConfirmation.toolUseId, {
      toolName: pendingConfirmation.toolName,
      status: 'error',
      error: 'User denied execution',
    });
    setPendingConfirmation(null);
  };

  return (
    <ToolConfirmationDialog
      confirmation={pendingConfirmation}
      onConfirm={handleConfirm}
      onDeny={handleDeny}
    />
  );
}
