---
phase: 04-ai-integration
plan: 04
subsystem: frontend
tags: [code, explanation, context]

requires:
  - phase: PLAN-01
    provides: Chat UI component
  - phase: PLAN-03
    provides: Context management
provides:
  - Code selection and explanation feature
  - Code context injection for AI
affects: []

tech-stack:
  added: []
  patterns: [Code context extraction, Editor integration]

key-files:
  created:
    - natsu/src/lib/codeContext.ts
  modified:
    - natsu/src/components/editor/MarkdownEditor.tsx
    - natsu/src/components/chat/ChatView.tsx
---

# Phase 4 Plan 04: Code Understanding

**Code selection and AI explanation feature**

## Goal

实现代码选中后让 AI 解释的功能，支持从编辑器获取代码上下文。

## Tasks

### Task 1: Create Code Context Module

Create `natsu/src/lib/codeContext.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';

export interface CodeContext {
  code: string;
  language: string;
  filename?: string;
  lineStart?: number;
  lineEnd?: number;
}

// Global state for selected code
let selectedCode: CodeContext | null = null;

export const codeContext = {
  setSelectedCode: (context: CodeContext | null) => {
    selectedCode = context;
  },

  getSelectedCode: (): CodeContext | null => {
    return selectedCode;
  },

  clearSelectedCode: () => {
    selectedCode = null;
  },

  // Detect language from file extension
  detectLanguage: (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'rs': 'rust',
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'go': 'go',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'md': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'sh': 'bash',
      'bash': 'bash',
      'sql': 'sql',
      'html': 'html',
      'css': 'css',
    };
    return languageMap[ext] || 'plaintext';
  },

  // Format code for AI context
  formatForAI: (context: CodeContext): string => {
    let prompt = `Please explain the following ${context.language} code`;
    if (context.filename) {
      prompt += ` from ${context.filename}`;
    }
    if (context.lineStart && context.lineEnd) {
      prompt += ` (lines ${context.lineStart}-${context.lineEnd})`;
    }
    prompt += `:\n\n\`\`\`${context.language}\n${context.code}\n\`\`\``;
    return prompt;
  },
};
```

### Task 2: Add Context Menu to Editor

Update `natsu/src/components/editor/MarkdownEditor.tsx`:

```typescript
import { codeContext } from '@/lib/codeContext';

// In the editor component, add a context menu handler
const handleContextMenu = (event: React.MouseEvent) => {
  event.preventDefault();

  // Get selected text from editor
  const selection = editor.state.selection;
  if (selection.empty) return;

  const selectedText = editor.state.doc.textBetween(selection.from, selection.to);

  // Create context menu
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button id="explain-code">Explain with AI</button>
  `;

  // Position and show menu
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;
  document.body.appendChild(menu);

  menu.querySelector('#explain-code')?.addEventListener('click', () => {
    const context: CodeContext = {
      code: selectedText,
      language: codeContext.detectLanguage(currentFile?.name || ''),
      filename: currentFile?.name,
    };
    codeContext.setSelectedCode(context);
    document.body.removeChild(menu);

    // Open chat panel
    useUIStore.getState().setChatOpen(true);
  });
};
```

### Task 3: Update ChatView for Code Context

Update `natsu/src/components/chat/ChatView.tsx`:

```typescript
import { codeContext } from '@/lib/codeContext';

export function ChatView() {
  const [pendingCodeContext, setPendingCodeContext] = useState<CodeContext | null>(null);

  useEffect(() => {
    // Check for pending code context on mount
    const ctx = codeContext.getSelectedCode();
    if (ctx) {
      setPendingCodeContext(ctx);
      codeContext.clearSelectedCode();
    }
  }, []);

  const handleExplainCode = () => {
    if (pendingCodeContext) {
      const prompt = codeContext.formatForAI(pendingCodeContext);
      handleSend(prompt);
      setPendingCodeContext(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Pending code context banner */}
      {pendingCodeContext && (
        <div className="p-2 bg-muted border-b flex items-center justify-between">
          <span className="text-sm">
            Code selected: {pendingCodeContext.filename || 'untitled'}
          </span>
          <Button size="sm" onClick={handleExplainCode}>
            Explain
          </Button>
        </div>
      )}
      {/* ... rest of chat UI */}
    </div>
  );
}
```

### Task 4: Add Code Detection in Messages

When displaying messages with code blocks, detect the language and apply syntax highlighting (already done in PLAN-01 with react-syntax-highlighter).

### Task 5: Add Keyboard Shortcut

Add `Ctrl+Shift+E` shortcut to explain selected code:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      const ctx = codeContext.getSelectedCode();
      if (ctx) {
        const prompt = codeContext.formatForAI(ctx);
        // Open chat and send prompt
        useUIStore.getState().setChatOpen(true);
        handleSend(prompt);
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

## Verification

1. Can select code in editor
2. Right-click shows "Explain with AI" option
3. Selecting option opens chat with code context
4. AI response includes code explanation
5. Keyboard shortcut works

---

*Phase: 04-ai-integration*
