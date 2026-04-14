/**
 * API Calls Component
 *
 * Manage and execute HTTP API requests.
 */

import { useEffect, useState } from 'react';
import { useAutomationStore, ApiConfig, ExecuteApiInput } from '@/stores/automationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Play,
  Trash2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-600',
  POST: 'text-blue-600',
  PUT: 'text-orange-600',
  DELETE: 'text-red-600',
  PATCH: 'text-purple-600',
};

interface QuickRequest {
  method: string;
  url: string;
  body?: string;
}

export function ApiCalls() {
  const {
    apiConfigs,
    apiHistory,
    apiLoading,
    apiError,
    fetchApiConfigs,
    deleteApiConfig,
    executeApi,
    fetchApiHistory,
  } = useAutomationStore();

  const [quickRequest, setQuickRequest] = useState<QuickRequest>({
    method: 'GET',
    url: '',
    body: '',
  });
  const [response, setResponse] = useState<{
    status: number;
    body: string;
    duration_ms: number;
  } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  useEffect(() => {
    fetchApiConfigs();
    fetchApiHistory();
  }, [fetchApiConfigs, fetchApiHistory]);

  const handleExecute = async () => {
    if (!quickRequest.url) return;

    setExecuting(true);
    setResponse(null);

    try {
      const input: ExecuteApiInput = {
        method: quickRequest.method,
        url: quickRequest.url,
        body: quickRequest.body || undefined,
      };
      const result = await executeApi(input);
      setResponse({
        status: result.status,
        body: result.body,
        duration_ms: result.duration_ms,
      });
    } catch (error) {
      console.error('Failed to execute request:', error);
    } finally {
      setExecuting(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (confirm('确定要删除这个 API 配置吗？')) {
      await deleteApiConfig(id);
    }
  };

  const formatJson = (str: string): string => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Quick Request */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">快速请求</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <select
              value={quickRequest.method}
              onChange={(e) =>
                setQuickRequest((q) => ({ ...q, method: e.target.value }))
              }
              className="px-3 py-2 border rounded-md bg-background"
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <Input
              placeholder="https://api.example.com"
              value={quickRequest.url}
              onChange={(e) =>
                setQuickRequest((q) => ({ ...q, url: e.target.value }))
              }
              className="flex-1"
            />
            <Button onClick={handleExecute} disabled={executing || !quickRequest.url}>
              {executing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {(quickRequest.method === 'POST' ||
            quickRequest.method === 'PUT' ||
            quickRequest.method === 'PATCH') && (
            <textarea
              placeholder='{"key": "value"}'
              value={quickRequest.body}
              onChange={(e) =>
                setQuickRequest((q) => ({ ...q, body: e.target.value }))
              }
              className="w-full h-24 p-2 text-sm font-mono border rounded-md bg-background resize-none"
            />
          )}
        </CardContent>
      </Card>

      {/* Response */}
      {response && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">响应</CardTitle>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={
                    response.status >= 200 && response.status < 300
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {response.status}
                </span>
                <span className="text-muted-foreground">
                  {response.duration_ms}ms
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap">
              {formatJson(response.body)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Saved Configs */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">已保存配置</CardTitle>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          {apiLoading ? (
            <div className="flex items-center justify-center h-20">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : apiConfigs.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              暂无保存的 API 配置
            </div>
          ) : (
            <div className="divide-y">
              {apiConfigs.map((config) => (
                <div
                  key={config.id}
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono ${
                          METHOD_COLORS[config.method] || ''
                        }`}
                      >
                        {config.method}
                      </span>
                      <span className="font-medium">{config.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={async () => {
                          setQuickRequest({
                            method: config.method,
                            url: config.url,
                            body: config.body_template || '',
                          });
                        }}
                        title="加载"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeleteConfig(config.id)}
                        title="删除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {config.url}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card className="flex-shrink-0 max-h-48">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">请求历史</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {apiHistory.length === 0 ? (
            <div className="p-3 text-center text-muted-foreground text-xs">
              暂无历史记录
            </div>
          ) : (
            <div className="divide-y max-h-32 overflow-auto">
              {apiHistory.slice(0, 5).map((entry) => (
                <div key={entry.id} className="p-2">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() =>
                      setExpandedHistory(
                        expandedHistory === entry.id ? null : entry.id
                      )
                    }
                  >
                    {expandedHistory === entry.id ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <span
                      className={`text-xs font-mono ${
                        METHOD_COLORS[entry.method] || ''
                      }`}
                    >
                      {entry.method}
                    </span>
                    <span className="text-xs truncate flex-1">{entry.url}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.response_status ? (
                        entry.response_status >= 200 &&
                        entry.response_status < 300 ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                    </span>
                  </div>
                  {expandedHistory === entry.id && entry.response_body && (
                    <pre className="text-xs font-mono bg-muted p-1 rounded mt-1 overflow-auto max-h-20 whitespace-pre-wrap">
                      {formatJson(entry.response_body)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
