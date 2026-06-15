import React, { useRef, useState } from 'react';
import { useAppStore, LayoutStyle, FilterType, FrameType } from './stores/appStore';
import TextInputPanel from './components/TextInputPanel';
import CollageCanvas from './components/CollageCanvas';

const layoutOptions: { key: LayoutStyle; label: string }[] = [
  { key: 'balanced', label: '平铺均衡' },
  { key: 'focus', label: '重心聚焦' },
  { key: 'diagonal', label: '对角线节奏' },
  { key: 'radial', label: '环绕放射' },
  { key: 'stacked', label: '紧凑堆叠' },
  { key: 'scattered', label: '散点留白' },
];

const filterOptions: { key: FilterType; label: string }[] = [
  { key: 'none', label: '原图' },
  { key: 'vintage', label: '复古暖黄' },
  { key: 'cool', label: '冷灰漂白' },
  { key: 'soft', label: '柔光暖粉' },
];

const frameOptions: { key: FrameType; label: string }[] = [
  { key: 'none', label: '无框' },
  { key: 'white', label: '白细框' },
  { key: 'doubleBlack', label: '双线黑框' },
  { key: 'felt', label: '毛毡纹理' },
  { key: 'goldEmboss', label: '金色浮雕' },
  { key: 'matteWood', label: '哑光木纹' },
];

const App: React.FC = () => {
  const {
    layoutStyle,
    setLayoutStyle,
    filter,
    setFilter,
    frame,
    setFrame,
    images,
    canvasWidth,
    canvasHeight,
  } = useAppStore();

  const [exportHovered, setExportHovered] = useState(false);
  const canvasRefForExport = useRef<HTMLCanvasElement | null>(null);

  const handleExport = async () => {
    const exportCanvas = document.createElement('canvas');
    const scale = 2;
    const exportWidth = 1920;
    const exportHeight = 1440;

    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    const scaleX = exportWidth / canvasWidth;
    const scaleY = exportHeight / canvasHeight;

    const sortedImages = [...images].sort((a, b) => a.zIndex - b.zIndex);

    for (const img of sortedImages) {
      const imgElement = new Image();
      imgElement.crossOrigin = 'anonymous';

      try {
        await new Promise<void>((resolve, reject) => {
          imgElement.onload = () => resolve();
          imgElement.onerror = reject;
          imgElement.src = img.url;
        });

        ctx.save();

        const scaledWidth = img.width * img.scale * scaleX;
        const scaledHeight = img.height * img.scale * scaleY;
        const x = img.x * scaleX;
        const y = img.y * scaleY;
        const centerX = x + scaledWidth / 2;
        const centerY = y + scaledHeight / 2;

        ctx.translate(centerX, centerY);
        ctx.rotate((img.rotation * Math.PI) / 180);

        ctx.drawImage(
          imgElement,
          -scaledWidth / 2,
          -scaledHeight / 2,
          scaledWidth,
          scaledHeight
        );

        ctx.restore();
      } catch (e) {
        console.error('Failed to load image for export:', img.url, e);
      }
    }

    if (filter !== 'none') {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';

      switch (filter) {
        case 'vintage':
          const g1 = ctx.createRadialGradient(
            exportWidth / 2, exportHeight / 2, 0,
            exportWidth / 2, exportHeight / 2, Math.max(exportWidth, exportHeight) / 2
          );
          g1.addColorStop(0, 'rgba(255, 230, 180, 0.15)');
          g1.addColorStop(1, 'rgba(180, 140, 80, 0.25)');
          ctx.fillStyle = g1;
          ctx.fillRect(0, 0, exportWidth, exportHeight);
          break;
        case 'cool':
          const g2 = ctx.createRadialGradient(
            exportWidth / 2, exportHeight / 2, 0,
            exportWidth / 2, exportHeight / 2, Math.max(exportWidth, exportHeight) / 2
          );
          g2.addColorStop(0, 'rgba(200, 220, 240, 0.12)');
          g2.addColorStop(1, 'rgba(120, 140, 180, 0.2)');
          ctx.fillStyle = g2;
          ctx.fillRect(0, 0, exportWidth, exportHeight);
          break;
        case 'soft':
          const g3 = ctx.createRadialGradient(
            exportWidth / 2, exportHeight / 2, 0,
            exportWidth / 2, exportHeight / 2, Math.max(exportWidth, exportHeight) / 2
          );
          g3.addColorStop(0, 'rgba(255, 220, 230, 0.18)');
          g3.addColorStop(1, 'rgba(230, 180, 200, 0.15)');
          ctx.fillStyle = g3;
          ctx.fillRect(0, 0, exportWidth, exportHeight);
          break;
      }
      ctx.restore();
    }

    if (frame !== 'none') {
      ctx.save();
      switch (frame) {
        case 'white':
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 20 * scale;
          ctx.strokeRect(10 * scale, 10 * scale, exportWidth - 20 * scale, exportHeight - 20 * scale);
          break;
        case 'doubleBlack':
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 12 * scale;
          ctx.strokeRect(6 * scale, 6 * scale, exportWidth - 12 * scale, exportHeight - 12 * scale);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4 * scale;
          ctx.strokeRect(24 * scale, 24 * scale, exportWidth - 48 * scale, exportHeight - 48 * scale);
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 24 * scale;
          ctx.strokeRect(36 * scale, 36 * scale, exportWidth - 72 * scale, exportHeight - 72 * scale);
          break;
        case 'felt':
          const fg = ctx.createLinearGradient(0, 0, exportWidth, exportHeight);
          fg.addColorStop(0, '#3d5c3a');
          fg.addColorStop(0.5, '#4a6b47');
          fg.addColorStop(1, '#355232');
          ctx.strokeStyle = fg;
          ctx.lineWidth = 40 * scale;
          ctx.strokeRect(20 * scale, 20 * scale, exportWidth - 40 * scale, exportHeight - 40 * scale);
          break;
        case 'goldEmboss':
          const gg = ctx.createLinearGradient(0, 0, exportWidth, 0);
          gg.addColorStop(0, '#b8860b');
          gg.addColorStop(0.3, '#ffd700');
          gg.addColorStop(0.5, '#fff8dc');
          gg.addColorStop(0.7, '#ffd700');
          gg.addColorStop(1, '#b8860b');
          ctx.strokeStyle = gg;
          ctx.lineWidth = 32 * scale;
          ctx.strokeRect(16 * scale, 16 * scale, exportWidth - 32 * scale, exportHeight - 32 * scale);
          break;
        case 'matteWood':
          const wg = ctx.createLinearGradient(0, 0, 0, exportHeight);
          wg.addColorStop(0, '#8B6914');
          wg.addColorStop(0.25, '#A07C2A');
          wg.addColorStop(0.5, '#8B6914');
          wg.addColorStop(0.75, '#6B4F0E');
          wg.addColorStop(1, '#8B6914');
          ctx.strokeStyle = wg;
          ctx.lineWidth = 48 * scale;
          ctx.strokeRect(24 * scale, 24 * scale, exportWidth - 48 * scale, exportHeight - 48 * scale);
          break;
      }
      ctx.restore();
    }

    const link = document.createElement('a');
    link.download = `poetic-collage-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-content">
          <div className="logo">
            <span className="logo-icon">✦</span>
            <span className="logo-text">诗意拼贴馆</span>
          </div>
          <div className="nav-right">
            <span className="nav-subtitle">让文字化作画境</span>
          </div>
        </div>
        <div className="nav-divider" />
      </nav>

      <main className="main-content">
        <aside className="left-panel">
          <TextInputPanel />

          <div className="control-section">
            <h3 className="section-title">布局风格</h3>
            <div className="option-grid">
              {layoutOptions.map((option) => (
                <button
                  key={option.key}
                  className={`option-btn ${layoutStyle === option.key ? 'active' : ''}`}
                  onClick={() => setLayoutStyle(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-section">
            <h3 className="section-title">滤镜效果</h3>
            <div className="option-row">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  className={`option-pill ${filter === option.key ? 'active' : ''}`}
                  onClick={() => setFilter(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-section">
            <h3 className="section-title">相框样式</h3>
            <div className="option-grid">
              {frameOptions.map((option) => (
                <button
                  key={option.key}
                  className={`option-btn ${frame === option.key ? 'active' : ''}`}
                  onClick={() => setFrame(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="right-panel">
          <CollageCanvas />

          <div
            className={`export-btn-wrapper ${exportHovered ? 'expanded' : ''}`}
            onMouseEnter={() => setExportHovered(true)}
            onMouseLeave={() => setExportHovered(false)}
          >
            <button
              className="export-btn"
              onClick={handleExport}
              disabled={images.length === 0}
            >
              <span className="export-icon">↓</span>
              <span className={`export-text ${exportHovered ? 'visible' : ''}`}>
                保存PNG
              </span>
            </button>
          </div>
        </section>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .app {
          min-height: 100vh;
          min-width: 768px;
          background: #f5ede1;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
            'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          color: #3a5a7a;
        }

        .navbar {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 56px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          background: rgba(245, 237, 225, 0.75);
        }

        .nav-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          padding: 0 24px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 18px;
          color: #3a5a7a;
        }

        .logo-icon {
          color: #d4a574;
          font-size: 20px;
        }

        .nav-subtitle {
          font-size: 13px;
          color: #8a7a6a;
          font-style: italic;
        }

        .nav-divider {
          height: 1px;
          background: linear-gradient(
            to right,
            transparent,
            rgba(212, 165, 116, 0.3),
            transparent
          );
        }

        .main-content {
          display: flex;
          gap: 20px;
          padding: 20px;
          height: calc(100vh - 56px);
        }

        .left-panel {
          flex: 1;
          min-width: 0;
          background: #f9f9f9;
          border-radius: 12px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .right-panel {
          flex: 2;
          min-width: 0;
          position: relative;
          background: #f9f9f9;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .control-section {
          padding: 0 24px 20px;
        }

        .section-title {
          margin: 0 0 12px 0;
          font-size: 15px;
          font-weight: 600;
          color: #3a5a7a;
        }

        .option-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .option-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .option-btn {
          padding: 8px 12px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 8px;
          font-size: 13px;
          color: #5a7a9a;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .option-btn:hover {
          border-color: #d4a574;
          color: #d4a574;
        }

        .option-btn.active {
          border-color: #d4a574;
          background: #d4a574;
          color: white;
        }

        .option-pill {
          padding: 6px 14px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 20px;
          font-size: 13px;
          color: #5a7a9a;
          cursor: pointer;
          transition: all 0.4s ease;
        }

        .option-pill:hover {
          border-color: #d4a574;
        }

        .option-pill.active {
          border-color: #d4a574;
          background: rgba(212, 165, 116, 0.15);
          color: #d4a574;
        }

        .export-btn-wrapper {
          position: absolute;
          bottom: 30px;
          right: 30px;
          z-index: 10;
        }

        .export-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          background: #d4a574;
          color: white;
          font-size: 18px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(212, 165, 116, 0.4);
          transition: all 0.3s ease;
          overflow: hidden;
          padding: 0;
        }

        .export-btn:hover:not(:disabled) {
          width: 120px;
          border-radius: 22px;
          box-shadow: 0 6px 20px rgba(212, 165, 116, 0.5);
          transform: translateY(-2px);
        }

        .export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .export-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          height: 44px;
        }

        .export-text {
          font-size: 14px;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
          padding-right: 16px;
          font-weight: 500;
        }

        .export-text.visible {
          opacity: 1;
        }

        @media (max-width: 1200px) {
          .left-panel {
            flex: 0 0 380px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
