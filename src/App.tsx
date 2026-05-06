import { useState } from 'react';
import { Live2DScene } from './components/Live2DScene';
import { PixelEyes } from './components/PixelEyes';

type Mode = 'live2d' | 'pixel';

function App() {
  const [mode, setMode] = useState<Mode>('pixel');

  return (
    <div className="w-screen h-screen relative">
      {/* Content */}
      {mode === 'live2d' ? <Live2DScene /> : <PixelEyes />}

      {/* Toggle Button */}
      <button
        onClick={() => setMode(mode === 'live2d' ? 'pixel' : 'live2d')}
        className="absolute top-4 right-4 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm text-sm z-50 transition-colors"
      >
        {mode === 'live2d' ? '切换像素眼' : '切换 Live2D'}
      </button>
    </div>
  );
}

export default App;
