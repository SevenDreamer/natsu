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
import { Sparkles, Bot, Brain, Server, Eye, EyeOff, X } from 'lucide-react';
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
    if (!confirm('Delete this API key?')) return;

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
    return isConfigured ? 'Connected' : 'Not Connected';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Provider Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default provider selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Default Provider</label>
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
                      placeholder="Enter API key"
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
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={!apiKey || saving}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    API Key: {provider.isConfigured ? '••••••••••••' : 'Not configured'}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingProvider(provider.providerType)}
                    >
                      {provider.isConfigured ? 'Edit' : 'Add'}
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
          Keys are stored using system encryption. You'll need to re-enter them on a new device.
        </p>
      </CardContent>
    </Card>
  );
}
