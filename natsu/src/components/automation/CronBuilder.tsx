/**
 * Cron Builder Component
 *
 * Visual cron expression builder with presets and validation.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAutomationStore } from '@/stores/automationStore';
import { cn } from '@/lib/utils';

interface CronBuilderProps {
  value: string;
  onChange: (expression: string) => void;
}

const PRESETS = [
  { label: '每小时整点', expression: '0 * * * *' },
  { label: '每天 9:00', expression: '0 9 * * *' },
  { label: '工作日 9:00', expression: '0 9 * * 1-5' },
  { label: '每周一 9:00', expression: '0 9 * * 1' },
  { label: '每天午夜', expression: '0 0 * * *' },
];

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const { validateCronExpression } = useAutomationStore();
  const [expression, setExpression] = useState(value);
  const [preview, setPreview] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setExpression(value);
  }, [value]);

  const validateExpression = async (expr: string) => {
    try {
      const times = await validateCronExpression(expr);
      setPreview(times);
      setError(null);
    } catch (e) {
      setError(String(e));
      setPreview([]);
    }
  };

  useEffect(() => {
    if (expression) {
      validateExpression(expression);
    }
  }, [expression]);

  const handlePresetClick = (expr: string) => {
    setExpression(expr);
    onChange(expr);
  };

  const handleExpressionChange = (expr: string) => {
    setExpression(expr);
    onChange(expr);
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="space-y-2">
        <Label>预设</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.expression}
              variant={expression === preset.expression ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(preset.expression)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Manual Input */}
      <div className="space-y-2">
        <Label htmlFor="cron">Cron 表达式</Label>
        <Input
          id="cron"
          value={expression}
          onChange={(e) => handleExpressionChange(e.target.value)}
          placeholder="0 9 * * 1-5"
          className={cn('font-mono', error && 'border-red-500')}
        />
        <p className="text-xs text-muted-foreground">
          格式: 分 时 日 月 周 (例如: 0 9 * * 1-5 表示工作日 9:00)
        </p>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="space-y-2">
          <Label>下次执行时间</Label>
          <div className="bg-secondary rounded p-2 space-y-1">
            {preview.map((time, i) => (
              <div key={i} className="text-sm font-mono">
                {time}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
