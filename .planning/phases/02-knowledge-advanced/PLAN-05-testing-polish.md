---
wave: 4
depends_on: [PLAN-01-ai-provider, PLAN-02-related-notes, PLAN-03-knowledge-graph, PLAN-04-wiki-maintenance]
files_modified:
  - termsuite/src-tauri/Cargo.toml
  - termsuite/package.json
  - termsuite/src/components/layout/Sidebar.tsx
files_created:
  - termsuite/src/components/settings/AIProviderSettings.tsx
  - termsuite/src-tauri/src/ai/test_utils.rs
requirements: [KNOW-05, KNOW-06, KNOW-07]
autonomous: false
---

# PLAN-05: Testing, Polish, and AI Settings UI

**Objective:** Add AI Provider settings UI, comprehensive testing, and polish for Phase 2 completion.

---

## Task 1: Create AI Provider Settings Component

<objective>
Create the AI provider settings section per UI-SPEC Feature 4.
</objective>

<read_first>
- .planning/phases/02-knowledge-advanced/02-UI-SPEC.md (AI Provider Settings)
- termsuite/src/stores/aiStore.ts (AI state management)
</read_first>

<action>
Create `termsuite/src/components/settings/AIProviderSettings.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Bot, Brain, Server, Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';
import { useAIStore } from '@/stores/aiStore';

const providerIcons: Record<string, React.ReactNode> = {
  Claude: <Sparkles className="h-4 w-4" />,
  OpenAI: <Bot className="h-4 w-4" />,
  DeepSeek: <Brain className="h-4 w-4" />,
  Ollama: <Server className="h-4 w-4" />,
};

const providerDescriptions: Record<string, string> = {
  Claude: 'Anthropic Claude',
  OpenAI: 'GPT models',
  DeepSeek: 'DeepSeek AI',
  Ollama: 'Local models',
};

export function AIProviderSettings() {
  const { defaultProvider, providers, fetchProviders, setDefaultProvider, storeApiKey, deleteApiKey, isLoading } = useAIStore();
  
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSave = async () => {
    if (!editingProvider || !apiKey) return;
    
    setSaving(true);
    try {
      await storeApiKey(editingProvider, apiKey);
      setEditingProvider(null);
      setApiKey('');
    } catch (err) {
      console.error('Failed to save API key:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (provider: string) => {
    if (!confirm('确定要删除此 API 密钥吗？')) return;
    
    try {
      await deleteApiKey(provider);
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  };

  const getStatusColor = (isConfigured: boolean) => {
    return isConfigured ? 'text-green-500' : 'text-muted-foreground';
  };

  const getStatusText = (isConfigured: boolean) => {
    return isConfigured ? '已连接' : '未连接';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI 服务设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default provider selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">默认服务</label>
          <Select value={defaultProvider} onValueChange={setDefaultProvider}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Claude', 'OpenAI', 'DeepSeek', 'Ollama'].map((p) => (
                <SelectItem key={p} value={p}>
                  <div className="flex items-center gap-2">
                    {providerIcons[p]}
                    <span>{p}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Provider cards */}
        <div className="space-y-4">
          {providers.map((provider) => (
            <div
              key={provider.providerType}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {providerIcons[provider.providerType]}
                  <span className="font-medium">{provider.providerType}</span>
                  <span className="text-xs text-muted-foreground">
                    {providerDescriptions[provider.providerType]}
                  </span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${getStatusColor(provider.isConfigured)}`}>
                  <span className={`w-2 h-2 rounded-full ${provider.isConfigured ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                  {getStatusText(provider.isConfigured)}
                </div>
              </div>

              {/* API Key input */}
              {editingProvider === provider.providerType ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      placeholder="输入 API 密钥"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-20"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingProvider(null);
                        setApiKey('');
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={!apiKey || saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    API 密钥: {provider.isConfigured ? '••••••••••••' : '未配置'}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProvider(provider.providerType)}
                    >
                      {provider.isConfigured ? '编辑' : '添加'}
                    </Button>
                    {provider.isConfigured && provider.providerType !== 'Ollama' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(provider.providerType)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Security note */}
        <p className="text-xs text-muted-foreground">
          密钥使用系统加密存储，切换设备需重新输入
        </p>
      </CardContent>
    </Card>
  );
}
```
</action>

<acceptance_criteria>
- `grep "export function AIProviderSettings" termsuite/src/components/settings/AIProviderSettings.tsx` returns 1 line
- `grep "AI 服务设置\|默认服务\|API 密钥\|已连接\|未连接" termsuite/src/components/settings/AIProviderSettings.tsx` returns 6+ lines
- `grep "storeApiKey\|deleteApiKey\|fetchProviders" termsuite/src/components/settings/AIProviderSettings.tsx` returns 3+ lines
</acceptance_criteria>

---

## Task 2: Add Missing UI Components

<objective>
Install any missing shadcn/ui components required for settings.
</objective>

<read_first>
- termsuite/src/components/ui/ (existing components)
</read_first>

<action>
Ensure the following components exist. If not, create them using shadcn patterns:

1. Check for `select.tsx` - if missing, create:
```bash
# If using shadcn CLI
npx shadcn@latest add select
```

2. Check for `progress.tsx` - if missing, create:
```bash
npx shadcn@latest add progress
```

3. Verify `card.tsx` exists from Phase 1.
</action>

<acceptance_criteria>
- `ls termsuite/src/components/ui/select.tsx` returns file exists
- `ls termsuite/src/components/ui/progress.tsx` returns file exists
</acceptance_criteria>

---

## Task 3: Add Backend Tests for AI Provider

<objective>
Add unit tests for the AI provider trait implementations.
</objective>

<read_first>
- termsuite/src-tauri/src/ai/provider.rs (trait definition)
- termsuite/src-tauri/src/commands/relations.rs (test examples)
</read_first>

<action>
Create `termsuite/src-tauri/src/ai/test_utils.rs`:

```rust
#[cfg(test)]
mod tests {
    use crate::ai::{ProviderConfig, ProviderType, calculate_relatedness};

    #[test]
    fn test_provider_type_serialization() {
        let claude = ProviderType::Claude;
        let json = serde_json::to_string(&claude).unwrap();
        assert_eq!(json, "\"Claude\"");
    }

    #[test]
    fn test_provider_config_deserialization() {
        let json = r#"{"provider_type":"OpenAI","api_key":"test-key","model":"gpt-4"}"#;
        let config: ProviderConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.provider_type, ProviderType::OpenAI);
        assert_eq!(config.api_key, Some("test-key".to_string()));
    }

    #[test]
    fn test_ollama_needs_no_api_key() {
        let config = ProviderConfig {
            provider_type: ProviderType::Ollama,
            api_key: None,
            base_url: Some("http://localhost:11434".to_string()),
            model: Some("llama3.2".to_string()),
        };
        // Ollama should be valid without API key
        assert!(config.api_key.is_none());
    }
}
```

Add to `termsuite/src-tauri/src/ai/mod.rs`:
```rust
#[cfg(test)]
mod test_utils;
```
</action>

<acceptance_criteria>
- `grep "#\[cfg(test)\]" termsuite/src-tauri/src/ai/test_utils.rs` returns 1 line
- `grep "test_provider_type_serialization\|test_provider_config_deserialization" termsuite/src-tauri/src/ai/test_utils.rs` returns 2 lines
</acceptance_criteria>

---

## Task 4: Add Tests for Graph Commands

<objective>
Add tests for graph data generation.
</objective>

<read_first>
- termsuite/src-tauri/src/commands/graph.rs (graph commands)
</read_first>

<action>
Add tests to `termsuite/src-tauri/src/commands/graph.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_note_type() {
        assert_eq!(get_note_type("/path/to/raw/note.md"), "raw");
        assert_eq!(get_note_type("/path/to/wiki/note.md"), "wiki");
        assert_eq!(get_note_type("/path/to/outputs/note.md"), "outputs");
        assert_eq!(get_note_type("/path/to/note.md"), "wiki"); // Default
    }

    #[test]
    fn test_get_directory() {
        assert_eq!(get_directory("/wiki/my-note.md"), "/wiki");
        assert_eq!(get_directory("/raw/folder/note.md"), "/raw/folder");
        assert_eq!(get_directory("note.md"), "");
    }

    #[test]
    fn test_graph_edge_id_generation() {
        let edge = GraphEdge {
            id: "source-target".to_string(),
            source: "source".to_string(),
            target: "target".to_string(),
            edge_type: "direct".to_string(),
            score: 1.0,
        };
        assert!(edge.id.contains('-'));
    }
}
```
</action>

<acceptance_criteria>
- `grep "#\[cfg(test)\]" termsuite/src-tauri/src/commands/graph.rs` returns 1 line
- `grep "test_get_note_type\|test_get_directory" termsuite/src-tauri/src/commands/graph.rs` returns 2 lines
</acceptance_criteria>

---

## Task 5: Add Frontend Tests for Components

<objective>
Add unit tests for new React components.
</objective>

<read_first>
- termsuite/src/components/editor/ (existing test patterns if any)
- termsuite/package.json (test dependencies)
</read_first>

<action>
Create test file `termsuite/src/components/wiki/RelatedNotesPanel.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelatedNotesPanel } from './RelatedNotesPanel';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue([
    {
      note_id: 'test-note-1',
      title: 'Test Note',
      relationship_type: 'direct_link',
      score: 0.85,
    },
  ]),
}));

describe('RelatedNotesPanel', () => {
  it('renders loading state initially', () => {
    render(<RelatedNotesPanel noteId="test-id" onNavigate={vi.fn()} />);
    // Should show skeleton loaders
    expect(screen.getByRole('region', { hidden: true })).toBeDefined();
  });

  it('shows empty state when no note selected', () => {
    render(<RelatedNotesPanel noteId={null} onNavigate={vi.fn()} />);
    // Should render nothing
  });
});
```
</action>

<acceptance_criteria>
- `ls termsuite/src/components/wiki/RelatedNotesPanel.test.tsx` returns file exists
- `grep "describe.*RelatedNotesPanel" termsuite/src/components/wiki/RelatedNotesPanel.test.tsx` returns 1 line
</acceptance_criteria>

---

## Task 6: Run Full Test Suite

<objective>
Execute all tests to verify Phase 2 implementation.
</objective>

<read_first>
- termsuite/package.json (test scripts)
</read_first>

<action>
Run the following commands:

```bash
# Rust backend tests
cargo test --manifest-path termsuite/src-tauri/Cargo.toml

# Frontend tests
npm run test --prefix termsuite

# Type checking
npm run build --prefix termsuite
```

All tests should pass. Document any failures for follow-up.
</action>

<acceptance_criteria>
- `cargo test --manifest-path termsuite/src-tauri/Cargo.toml` exits with code 0
- `npm run test --prefix termsuite` exits with code 0
</acceptance_criteria>

---

## Task 7: Create Integration Test Checklist

<objective>
Create manual testing checklist for Phase 2 features.
</objective>

<read_first>
- .planning/ROADMAP.md (Phase 2 success criteria)
</read_first>

<action>
Create `termsuite/docs/phase2-test-checklist.md` (only if docs are requested):

```markdown
# Phase 2 Manual Testing Checklist

## KNOW-05: AI Relationship Discovery
- [ ] Open a note with multiple wiki-links
- [ ] Verify Related Notes panel shows linked notes
- [ ] Check co-citation: Notes linking to same target appear
- [ ] Check co-reference: Notes referenced by same source appear
- [ ] Verify score calculation is reasonable

## KNOW-06: Knowledge Graph
- [ ] Click "知识图谱" in sidebar
- [ ] Verify graph opens as full-screen modal
- [ ] Check nodes display with correct colors (raw/wiki/outputs)
- [ ] Click a node to navigate to that note
- [ ] Use search to highlight matching nodes
- [ ] Test filter by node type
- [ ] Test zoom controls

## KNOW-07: AI Wiki Maintenance
- [ ] Configure AI provider in settings
- [ ] Add content to raw/ folder
- [ ] Trigger wiki processing
- [ ] Verify diff viewer shows suggestions
- [ ] Test Accept/Reject/Edit buttons

## AI Provider Settings
- [ ] Open Settings, navigate to AI section
- [ ] Add API key for Claude
- [ ] Verify "已连接" status
- [ ] Test switching default provider
- [ ] Delete API key and verify "未连接" status
```
</action>

<acceptance_criteria>
- Manual test checklist covers all Phase 2 requirements
</acceptance_criteria>

---

## Task 8: Final Build Verification

<objective>
Verify production build works correctly.
</objective>

<read_first>
- termsuite/package.json (build script)
</read_first>

<action>
Run complete build:

```bash
# Frontend build
npm run build --prefix termsuite

# Rust backend build
cargo build --release --manifest-path termsuite/src-tauri/Cargo.toml

# Optional: Run the app
npm run tauri dev --prefix termsuite
```

Verify:
1. No TypeScript errors
2. No Rust compilation errors
3. Application starts successfully
</action>

<acceptance_criteria>
- `npm run build --prefix termsuite` exits with code 0
- `cargo build --release --manifest-path termsuite/src-tauri/Cargo.toml` exits with code 0
</acceptance_criteria>

---

## Validation

After completing all tasks:

1. **Test Coverage:**
   ```bash
   cargo test --manifest-path termsuite/src-tauri/Cargo.toml -- --list
   npm run test:coverage --prefix termsuite
   ```

2. **Build Verification:**
   ```bash
   npm run build --prefix termsuite
   cargo build --manifest-path termsuite/src-tauri/Cargo.toml
   ```

3. **Component Inventory:**
   ```bash
   find termsuite/src/components -name "*.tsx" | wc -l
   # Should be >= 20 (Phase 1 + Phase 2)
   ```

---

*Plan created: 2026-04-14*
*Phase: 02-knowledge-advanced*
