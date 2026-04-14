---
phase: 03-terminal-core
plan: 03
subsystem: frontend
tags: [image, sixel, iterm2, terminal]

requires:
  - phase: PLAN-02
    provides: Terminal component
provides:
  - Inline image display in terminal
  - iTerm2 image protocol support
affects: []

tech-stack:
  added: []
  patterns: [Custom image rendering, OSC sequence parsing]

key-files:
  created:
    - natsu/src/components/terminal/TerminalImage.tsx
  modified:
    - natsu/src/components/terminal/TerminalView.tsx
---

# Phase 3 Plan 03: Terminal Image Support

**Inline image display using iTerm2 image protocol**

## Goal

支持在终端中内联显示图片，实现 iTerm2 图片协议。

## Tasks

### Task 1: Understand iTerm2 Image Protocol

iTerm2 protocol uses OSC escape sequences:

```
ESC ] 1337 ; File = [arguments] : base64_data BEL
```

Arguments include:
- `name` - filename
- `size` - file size in bytes
- `width` - display width (N, Npx, N%)
- `height` - display height
- `inline=1` - display inline

### Task 2: Create Image Handler

Create `natsu/src/components/terminal/TerminalImage.tsx`:

```typescript
import { useState, useEffect } from 'react';

interface TerminalImageProps {
  base64Data: string;
  mimeType: string;
  width?: string;
  height?: string;
  alt?: string;
}

export function TerminalImage({ base64Data, mimeType, width, height, alt }: TerminalImageProps) {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [base64Data, mimeType]);

  return (
    <img
      src={imageUrl}
      alt={alt || 'Terminal image'}
      style={{
        maxWidth: width || '100%',
        maxHeight: height || '300px',
        objectFit: 'contain',
      }}
    />
  );
}
```

### Task 3: Implement OSC Parser

Add to `natsu/src/lib/terminal.ts`:

```typescript
// Parse iTerm2 image protocol: ESC ] 1337 ; File = ... BEL
export function parseIterm2Image(sequence: string): {
  data: string;
  mimeType: string;
  width?: string;
  height?: string;
} | null {
  if (!sequence.startsWith('1337;File=')) return null;

  const parts = sequence.slice(10).split(':');
  if (parts.length !== 2) return null;

  const [args, data] = parts;
  const params: Record<string, string> = {};

  args.split(';').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) params[key] = value;
  });

  return {
    data,
    mimeType: params.type || 'image/png',
    width: params.width,
    height: params.height,
  };
}
```

### Task 4: Custom Terminal Handler

Modify TerminalView to handle images:

```typescript
// In TerminalView.tsx
const handleOsc = useCallback((data: string) => {
  const image = parseIterm2Image(data);
  if (image) {
    // Render image inline
    // This requires a custom approach since xterm.js doesn't
    // directly support inline images like iTerm2

    // Option 1: Use xterm-addon-image (if available)
    // Option 2: Create overlay div with image
    // Option 3: Insert as custom element
  }
}, []);
```

### Task 5: Alternative - Base64 Image Command

Create a simpler approach with explicit image command:

```rust
// In terminal/commands.rs
#[tauri::command]
pub async fn display_image_in_terminal(
    id: String,
    base64_data: String,
    mime_type: String,
) -> Result<(), String> {
    // This emits an event that the terminal can render
    // as an overlay or inline element
}
```

## Verification

1. Can display PNG image inline
2. Can display JPEG image inline
3. Image scaling works correctly
4. Does not break terminal text output

## Notes

- Full iTerm2 protocol support is complex
- Consider starting with explicit `display_image` command
- Sixel support can be added later if needed

## Risks

- xterm.js doesn't natively support inline images
- May need custom rendering overlay
- Performance with large images

---

*Phase: 03-terminal-core*
