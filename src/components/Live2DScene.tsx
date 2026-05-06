import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    L2Dwidget: any;
  }
}

export function Live2DScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('加载中...');
  const initRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initRef.current) return;
    initRef.current = true;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/live2d-widget@3.1.4/lib/L2Dwidget.min.js';
    script.async = true;

    script.onload = () => {
      setStatus('加载模型...');
      window.L2Dwidget.init({
        model: {
          jsonPath: 'https://cdn.jsdelivr.net/npm/live2d-widget-model-shizuku@1.0.5/assets/shizuku.model.json',
          scale: 1,
        },
        display: {
          position: 'right',
          width: 300,
          height: 400,
          hOffset: 0,
          vOffset: -20,
        },
        mobile: {
          show: true,
          scale: 0.8,
        },
        react: {
          opacity: 1,
        },
      });

      // Wait for model to load
      setTimeout(() => {
        setStatus('就绪');
      }, 2000);
    };

    script.onerror = () => {
      setStatus('加载失败');
    };

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-gray-900">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />
      <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-white text-sm rounded">
        {status}
      </div>
      {status === '就绪' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-xs rounded whitespace-nowrap">
          角色在屏幕右侧 · 拖动交互
        </div>
      )}
    </div>
  );
}