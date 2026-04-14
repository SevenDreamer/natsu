/**
 * System Control Component
 *
 * Android system control panel for Bluetooth, Wi-Fi, brightness, and volume.
 * Shows disabled state on desktop.
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bluetooth, Wifi, Sun, Volume2, AlertCircle } from 'lucide-react';

interface PlatformInfo {
  os: string;
  is_android: boolean;
  is_desktop: boolean;
  arch: string;
}

interface AndroidFeatureAvailability {
  bluetooth: boolean;
  wifi: boolean;
  brightness: boolean;
  volume: boolean;
}

export function SystemControl() {
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [features, setFeatures] = useState<AndroidFeatureAvailability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatformInfo();
  }, []);

  const loadPlatformInfo = async () => {
    try {
      const [platformInfo, featureAvailability] = await Promise.all([
        invoke<PlatformInfo>('get_platform'),
        invoke<AndroidFeatureAvailability>('get_android_feature_availability'),
      ]);
      setPlatform(platformInfo);
      setFeatures(featureAvailability);
    } catch (error) {
      console.error('Failed to load platform info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!features || !platform) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">无法获取平台信息</p>
      </div>
    );
  }

  // Desktop: show disabled message
  if (platform.is_desktop) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Android 专属功能</h2>
        <p className="text-muted-foreground text-center max-w-md">
          系统控制功能仅在 Android 设备上可用。
          当前平台: {platform.os} ({platform.arch})
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          请在 Android 设备上使用此功能。
        </p>
      </div>
    );
  }

  // Android: show controls (placeholder for now)
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">系统控制</h2>

      <div className="grid gap-4">
        {/* Bluetooth Control */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bluetooth className="h-4 w-4" />
              蓝牙
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">启用蓝牙</span>
              <Switch disabled={!features.bluetooth} />
            </div>
          </CardContent>
        </Card>

        {/* Wi-Fi Control */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Wi-Fi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">启用 Wi-Fi</span>
              <Switch disabled={!features.wifi} />
            </div>
          </CardContent>
        </Card>

        {/* Brightness Control */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sun className="h-4 w-4" />
              亮度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Slider
                defaultValue={[50]}
                max={255}
                step={1}
                disabled={!features.brightness}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>暗</span>
                <span>亮</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Volume Control */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              音量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Slider
                defaultValue={[50]}
                max={100}
                step={1}
                disabled={!features.volume}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>静音</span>
                <span>最大</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        功能开发中 - JNI 桥接实现待完成
      </p>
    </div>
  );
}
