import { useRef } from 'react';
import ControlPanel from './components/ControlPanel';
import PosterCanvas from './components/PosterCanvas';
import { usePosterStore } from './store/posterStore';
import { useFontRenderer } from './hooks/useFontRenderer';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { text, fontStyle, fontSize, scale, offsetX, offsetY } = usePosterStore();

  const { exportPNG } = useFontRenderer(canvasRef, {
    text,
    fontStyle,
    fontSize,
    scale,
    offsetX,
    offsetY,
  });

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">✦ 像素字体海报生成器</h1>
        <div className="app-subtitle">
          <span className="status-dot" />
          Dynamic Pixel Font Poster Generator
        </div>
      </header>

      <div className="content-container">
        <ControlPanel exportPNG={exportPNG} />
        <PosterCanvas canvasRef={canvasRef} />
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }
        
        html, body, #root {
          margin: 0;
          padding: 0;
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
        }
        
        .app-container {
          min-height: 100vh;
          background: #1a1a2e;
          display: flex;
          flex-direction: column;
          padding: 24px;
          box-sizing: border-box;
          gap: 20px;
        }
        
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        
        .app-title {
          margin: 0;
          color: #ffffff;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: 1px;
        }
        
        .app-subtitle {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
        }
        
        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e94560;
        }
        
        .content-container {
          flex: 1;
          display: flex;
          gap: 20px;
          min-height: 0;
          flex-direction: row;
        }
        
        @media (max-width: 768px) {
          .content-container {
            flex-direction: column !important;
          }
          
          .app-container {
            padding: 16px;
          }
          
          .app-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 0;
          height: 0;
          background: transparent;
          border: none;
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 0;
          height: 0;
          background: transparent;
          border: none;
        }
        
        select option:checked {
          background: #e94560 !important;
        }
      `}</style>
    </div>
  );
}

export default App;
