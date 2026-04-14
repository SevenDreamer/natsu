---
phase: 05-ai-knowledge
plan: 04
subsystem: frontend
tags: [ui, confirmation, tool, dialog]

requires:
  - phase: PLAN-01
    provides: Tool calling framework
provides:
  - Tool confirmation dialog
  - Tool execution status display
  - Tool result visualization
affects: []

tech-stack:
  added: []
  patterns: [Modal dialogs, Event handling]

key-files:
  created:
    - natsu/src/components/chat/ToolConfirmationDialog.tsx
    - natsu/src/components/chat/ToolExecutionStatus.tsx
  modified:
    - natsu/src/stores/chatStore.ts
    - natsu/src/components/chat/ChatView.tsx
---

# Phase 5 Plan 04: Tool Confirmation UI

**User interface for tool execution confirmation**

## Goal

创建工具确认对话框和执行状态显示，让用户能够批准或拒绝危险操作。

## Tasks

### Task 1: Update Chat Store for Tools

Update `natsu/src/stores/chatStore.ts`:

```typescript
interface ToolConfirmation {
  toolUseId: string;
  toolName: string;
  input: Record<string, unknown>;
  safetyLevel: 'safe' | 'caution' | 'dangerous';
  message: string;
}

interface ToolExecution {
  toolUseId: string;
  toolName: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: string;
  error?: string;
}

interface ChatState {
  // ... existing state

  // Tool state
  pendingConfirmation: ToolConfirmation | null;
  toolExecutions: Map<string, ToolExecution>;

  // Tool actions
  setPendingConfirmation: (confirmation: ToolConfirmation | null) => void;
  confirmTool: (toolUseId: string, approved: boolean) => Promise<void>;
  updateToolExecution: (toolUseId: string, update: Partial<ToolExecution>) => void;
}
```

### Task 2: Create Confirmation Dialog

Create `natsu/src/components/chat/ToolConfirmationDialog.tsx`:

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface ToolConfirmationDialogProps {
  confirmation: ToolConfirmation;
  onApprove: () => void;
  onDeny: () => void;
}

export function ToolConfirmationDialog({
  confirmation,
  onApprove,
  onDeny,
}: ToolConfirmationDialogProps) {
  const { toolName, input, safetyLevel, message } = confirmation;

  const icon = {
    safe: <CheckCircle className="h-6 w-6 text-green-500" />,
    caution: <AlertCircle className="h-6 w-6 text-yellow-500" />,
    dangerous: <AlertTriangle className="h-6 w-6 text-red-500" />,
  }[safetyLevel];

  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            Tool Execution Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Tool</p>
            <p className="font-mono font-medium">{toolName}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Parameters</p>
            <pre className="mt-1 p-2 bg-muted rounded text-sm overflow-x-auto">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>

          {safetyLevel !== 'safe' && (
            <div className={`p-3 rounded ${
              safetyLevel === 'dangerous' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-yellow-100 dark:bg-yellow-900/20'
            }`}>
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDeny}>
            Cancel
          </Button>
          <Button
            variant={safetyLevel === 'dangerous' ? 'destructive' : 'default'}
            onClick={onApprove}
          >
            Execute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Task 3: Create Execution Status Component

Create `natsu/src/components/chat/ToolExecutionStatus.tsx`:

```typescript
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ToolExecutionStatusProps {
  execution: ToolExecution;
}

export function ToolExecutionStatus({ execution }: ToolExecutionStatusProps) {
  const { toolName, status, result, error } = execution;

  return (
    <div className="my-2 p-3 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 mb-2">
        {status === 'running' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
        {status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
        <span className="font-medium text-sm">Tool: {toolName}</span>
      </div>

      {status === 'running' && (
        <p className="text-sm text-muted-foreground">Executing...</p>
      )}

      {result && (
        <pre className="text-sm bg-background p-2 rounded overflow-x-auto max-h-48">
          {result}
        </pre>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
```

### Task 4: Integrate in ChatView

Update `natsu/src/components/chat/ChatView.tsx`:

```typescript
import { listen } from '@tauri-apps/api/event';
import { ToolConfirmationDialog } from './ToolConfirmationDialog';
import { ToolExecutionStatus } from './ToolExecutionStatus';

export function ChatView() {
  const { pendingConfirmation, toolExecutions, confirmTool } = useChatStore();

  useEffect(() => {
    // Listen for tool confirmation requests
    const unlisten = listen<ToolConfirmation>('tool-confirmation-required', (event) => {
      useChatStore.getState().setPendingConfirmation(event.payload);
    });

    // Listen for tool execution updates
    const unlistenStatus = listen<ToolExecution>('tool-execution-update', (event) => {
      useChatStore.getState().updateToolExecution(
        event.payload.toolUseId,
        event.payload
      );
    });

    return () => {
      unlisten.then(fn => fn());
      unlistenStatus.then(fn => fn());
    };
  }, []);

  const handleConfirm = async (approved: boolean) => {
    if (pendingConfirmation) {
      await confirmTool(pendingConfirmation.toolUseId, approved);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages with tool execution status */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatMessage {...msg} />
            {/* Show tool executions for this message */}
            {msg.toolExecutions?.map((exec) => (
              <ToolExecutionStatus key={exec.toolUseId} execution={exec} />
            ))}
          </div>
        ))}
      </div>

      <MessageInput ... />

      {/* Confirmation dialog */}
      {pendingConfirmation && (
        <ToolConfirmationDialog
          confirmation={pendingConfirmation}
          onApprove={() => handleConfirm(true)}
          onDeny={() => handleConfirm(false)}
        />
      )}
    </div>
  );
}
```

### Task 5: Add Tauri Command for Confirmation

Update `natsu/src-tauri/src/commands/ai.rs`:

```rust
#[tauri::command]
pub async fn confirm_tool_execution(
    tool_use_id: String,
    approved: bool,
    app: AppHandle,
) -> Result<(), String> {
    // Signal the waiting tool executor to proceed or cancel
    app.emit("tool-confirmation-response", ToolConfirmationResponse {
        tool_use_id,
        approved,
    }).map_err(|e| e.to_string())
}
```

## Verification

1. Confirmation dialog appears for dangerous tools
2. User can approve or deny
3. Tool execution status shows progress
4. Results display correctly
5. Errors are shown clearly

---

*Phase: 05-ai-knowledge*
