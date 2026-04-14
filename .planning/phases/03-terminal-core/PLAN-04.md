---
phase: 03-terminal-core
plan: 04
subsystem: integration
tags: [knowledge-base, save-output, markdown]

requires:
  - phase: PLAN-02
    provides: Terminal component
provides:
  - Save terminal output to knowledge base
  - Terminal panel integration in main layout
affects: []

tech-stack:
  added: []
  patterns: [Markdown generation, Knowledge base API reuse]

key-files:
  created:
    - natsu/src/components/terminal/TerminalPanel.tsx
  modified:
    - natsu/src/components/terminal/TerminalToolbar.tsx
    - natsu/src/components/layout/MainPanel.tsx
---

# Phase 3 Plan 04: Knowledge Base Integration

**Terminal output saving and layout integration**

## Goal

实现终端输出保存到知识库，并将终端面板集成到主布局。

## Tasks

### Task 1: Create Terminal Panel Component

Create `natsu/src/components/terminal/TerminalPanel.tsx`:

```typescript
import { useState } from 'react';
import { TerminalView } from './TerminalView';
import { TerminalToolbar } from './TerminalToolbar';
import { useTerminalStore } from '@/stores/terminalStore';
import { Button } from '@/components/ui/button';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';

interface TerminalPanelProps {
  collapsed?: boolean;
  onToggle: () => void;
}

export function TerminalPanel({ collapsed, onToggle }: TerminalPanelProps) {
  const { sessions, activeSession, createSession, removeSession } = useTerminalStore();
  const [buffer, setBuffer] = useState<string>('');

  const handleSaveOutput = async () => {
    // Save terminal buffer to knowledge base
    const content = `# Terminal Output

**Timestamp:** ${new Date().toISOString()}
**Session:** ${activeSession}

\`\`\`
${buffer}
\`\`\`
`;
    await notesApi.create('terminal-output', content, storagePath);
  };

  if (collapsed) {
    return (
      <div className="h-10 flex items-center justify-between px-4 border-t bg-muted/50">
        <span className="text-sm text-muted-foreground">Terminal</span>
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-64 flex flex-col border-t">
      <div className="h-10 flex items-center justify-between px-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Terminal</span>
          <Button variant="ghost" size="sm" onClick={handleSaveOutput}>
            <Save className="h-4 w-4 mr-1" />
            Save Output
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 relative">
        {activeSession ? (
          <TerminalView sessionId={activeSession} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Button variant="outline" onClick={createSession}>
              Start Terminal
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Task 2: Capture Terminal Output

Modify `natsu/src/lib/terminal.ts`:

```typescript
export class TerminalBuffer {
  private lines: string[] = [];
  private maxLines: number = 1000;

  append(data: string) {
    this.lines.push(data);
    if (this.lines.length > this.maxLines) {
      this.lines.shift();
    }
  }

  getBuffer(): string {
    return this.lines.join('\n');
  }

  getSelection(): string {
    // Return selected text from terminal
  }

  getLastNLines(n: number): string {
    return this.lines.slice(-n).join('\n');
  }

  clear() {
    this.lines = [];
  }
}
```

### Task 3: Add Save Output Command

Add to `natsu/src/components/terminal/TerminalToolbar.tsx`:

```typescript
// Add Save button functionality
const handleSaveOutput = async () => {
  const buffer = terminalBufferRef.current?.getBuffer() || '';

  // Create note in knowledge base
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const title = `Terminal Output ${timestamp}`;

  await notesApi.create(title, formatAsMarkdown(buffer), storagePath);
};
```

### Task 4: Integrate into Main Layout

Modify `natsu/src/components/layout/MainPanel.tsx`:

```typescript
import { TerminalPanel } from '@/components/terminal/TerminalPanel';

export function MainPanel() {
  const [terminalOpen, setTerminalOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Editor or main content */}
      <div className="flex-1 overflow-hidden">
        {/* ... existing content */}
      </div>

      {/* Terminal panel at bottom */}
      <TerminalPanel
        collapsed={!terminalOpen}
        onToggle={() => setTerminalOpen(!terminalOpen)}
      />
    </div>
  );
}
```

### Task 5: Add Keyboard Shortcut

```typescript
// Add to AppLayout or global keyboard handler
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+` to toggle terminal
    if (e.ctrlKey && e.key === '`') {
      e.preventDefault();
      setTerminalOpen((open) => !open);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

## Verification

1. Terminal panel appears at bottom of main view
2. Save Output button creates note in knowledge base
3. Saved note contains timestamp and command output
4. Keyboard shortcut toggles terminal
5. Terminal can be collapsed/expanded

## Output Format

Saved terminal output as Markdown:

```markdown
# Terminal Output - 2026-04-14T12:30:00Z

**Session:** abc123

## Commands

```bash
$ ls -la
total 48
drwxr-xr-x  12 user user 4096 Apr 14 12:30 .
...

$ pwd
/home/user/projects/natsu
```
```

---

*Phase: 03-terminal-core*
