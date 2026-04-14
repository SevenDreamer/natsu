/**
 * Schedule Picker Component
 *
 * Allows selecting schedule type and configuring schedule parameters.
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CronBuilder } from './CronBuilder';

interface SchedulePickerProps {
  type: 'simple' | 'cron' | 'once';
  config: string;
  onTypeChange: (type: 'simple' | 'cron' | 'once') => void;
  onConfigChange: (config: string) => void;
}

export function SchedulePicker({ type, config, onTypeChange, onConfigChange }: SchedulePickerProps) {
  const [intervalValue, setIntervalValue] = useState(60);
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');
  const [cronExpression, setCronExpression] = useState('0 * * * *');
  const [onceDateTime, setOnceDateTime] = useState('');

  useEffect(() => {
    try {
      const parsed = JSON.parse(config);
      if (type === 'simple' && parsed.interval_secs) {
        const secs = parsed.interval_secs;
        if (secs % 86400 === 0) {
          setIntervalValue(secs / 86400);
          setIntervalUnit('days');
        } else if (secs % 3600 === 0) {
          setIntervalValue(secs / 3600);
          setIntervalUnit('hours');
        } else {
          setIntervalValue(Math.floor(secs / 60));
          setIntervalUnit('minutes');
        }
      } else if (type === 'cron' && parsed.expression) {
        setCronExpression(parsed.expression);
      } else if (type === 'once' && parsed.execute_at) {
        setOnceDateTime(new Date(parsed.execute_at * 1000).toISOString().slice(0, 16));
      }
    } catch {}
  }, [config, type]);

  const updateSimpleConfig = (value: number, unit: string) => {
    let secs = value;
    if (unit === 'minutes') secs = value * 60;
    else if (unit === 'hours') secs = value * 3600;
    else if (unit === 'days') secs = value * 86400;
    onConfigChange(JSON.stringify({ interval_secs: secs }));
  };

  const updateCronConfig = (expression: string) => {
    setCronExpression(expression);
    onConfigChange(JSON.stringify({ expression, timezone: 'local' }));
  };

  const updateOnceConfig = (dateTime: string) => {
    setOnceDateTime(dateTime);
    const timestamp = Math.floor(new Date(dateTime).getTime() / 1000);
    onConfigChange(JSON.stringify({ execute_at: timestamp }));
  };

  return (
    <Tabs value={type} onValueChange={(v) => onTypeChange(v as typeof type)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="simple">简单间隔</TabsTrigger>
        <TabsTrigger value="cron">Cron 表达式</TabsTrigger>
        <TabsTrigger value="once">一次性执行</TabsTrigger>
      </TabsList>

      <TabsContent value="simple" className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">每</span>
          <Input
            type="number"
            value={intervalValue}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 1;
              setIntervalValue(v);
              updateSimpleConfig(v, intervalUnit);
            }}
            className="w-24"
            min={1}
          />
          <Select
            value={intervalUnit}
            onValueChange={(v) => {
              setIntervalUnit(v as typeof intervalUnit);
              updateSimpleConfig(intervalValue, v);
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes">分钟</SelectItem>
              <SelectItem value="hours">小时</SelectItem>
              <SelectItem value="days">天</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm">执行一次</span>
        </div>
      </TabsContent>

      <TabsContent value="cron" className="pt-4">
        <CronBuilder
          value={cronExpression}
          onChange={updateCronConfig}
        />
      </TabsContent>

      <TabsContent value="once" className="space-y-3 pt-4">
        <div className="space-y-2">
          <Label>执行时间</Label>
          <Input
            type="datetime-local"
            value={onceDateTime}
            onChange={(e) => updateOnceConfig(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">时区: 系统本地时间</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
