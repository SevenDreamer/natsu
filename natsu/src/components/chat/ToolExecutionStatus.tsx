import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ToolExecution } from '@/stores/chatStore';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react';

interface ToolExecutionStatusProps {
  execution: ToolExecution;
  compact?: boolean;
}

const StatusIcon = memo(function StatusIcon({
  status,
}: {
  status: ToolExecution['status'];
}) {
  const config = {
    pending: { icon: Clock, className: 'text-muted-foreground' },
    running: { icon: Loader2, className: 'text-primary animate-spin' },
    success: { icon: CheckCircle2, className: 'text-green-500' },
    error: { icon: XCircle, className: 'text-destructive' },
  };

  const { icon: Icon, className } = config[status];

  return <Icon className={cn('h-4 w-4', className)} />;
});

function ToolExecutionStatusComponent({
  execution,
  compact = false,
}: ToolExecutionStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toolUseId, toolName, status, result, error } = execution;

  const hasResult = result || error;

  const truncateResult = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-xs">
        <StatusIcon status={status} />
        <span className="font-mono">{toolName}</span>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-3 bg-muted/30">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <StatusIcon status={status} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-medium truncate">{toolName}</p>
          <p className="text-xs text-muted-foreground">
            {status === 'pending' && 'Waiting for confirmation...'}
            {status === 'running' && 'Executing...'}
            {status === 'success' && 'Completed successfully'}
            {status === 'error' && 'Failed'}
          </p>
        </div>
        {hasResult && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Result section */}
      {hasResult && isExpanded && (
        <div className="mt-3 pt-3 border-t">
          {error && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-destructive">Error</p>
              <pre className="bg-destructive/10 text-destructive p-2 rounded-md text-xs font-mono overflow-x-auto">
                <code>{error}</code>
              </pre>
            </div>
          )}
          {result && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Result</p>
              <pre className="bg-muted p-2 rounded-md text-xs font-mono overflow-x-auto max-h-48">
                <code>
                  {isExpanded ? result : truncateResult(result)}
                </code>
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Collapsed result preview */}
      {hasResult && !isExpanded && (
        <div className="mt-2 text-xs text-muted-foreground truncate">
          {error ? `Error: ${truncateResult(error, 100)}` : truncateResult(result || '', 100)}
        </div>
      )}
    </div>
  );
}

export const ToolExecutionStatus = memo(ToolExecutionStatusComponent);

// List component for multiple tool executions
interface ToolExecutionListProps {
  executions: ToolExecution[];
  maxVisible?: number;
}

export function ToolExecutionList({ executions, maxVisible = 3 }: ToolExecutionListProps) {
  const [showAll, setShowAll] = useState(false);

  const visibleExecutions = showAll ? executions : executions.slice(0, maxVisible);
  const hiddenCount = executions.length - visibleExecutions.length;

  if (executions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleExecutions.map((execution) => (
        <ToolExecutionStatus
          key={execution.toolUseId}
          execution={execution}
          compact={executions.length > 5}
        />
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:underline"
        >
          Show {hiddenCount} more tool executions
        </button>
      )}
    </div>
  );
}