import React, { useState, useEffect, useCallback, useRef } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import { createPixelEngine, type PixelGrid } from './utils/pixelEngine';

interface GalleryItem {
  id: number;
  name: string;
  author: string;
  imageData: string;
}

const generateSampleGallery = (): GalleryItem[] => {
  const samples = [
    { name: '爱心', author: '小明', colors: ['#FF0000', '#FFFFFF'] },
    { name: '星星', author: '小红', colors: ['#FFD700', '#000080'] },
    { name: '彩虹', author: '小刚', colors: ['#FF0000', '#FF6600', '#FFFF00', '#00FF00', '#0066FF', '#8B00FF'] },
    { name: '像素人', author: '画家A', colors: ['#FFE4B5', '#000000', '#4169E1', '#8B4513'] },
    { name: '小猫', author: '喵喵', colors: ['#FFA500', '#FFFFFF', '#000000'] },
    { name: '蘑菇', author: '玩家1', colors: ['#FF0000', '#FFFFFF', '#8B4513'] },
    { name: '太阳', author: '阳光', colors: ['#FFD700', '#FF6347', '#87CEEB'] },
    { name: '花朵', author: '小花', colors: ['#FF69B4', '#228B22', '#FFFF00'] }
  ];

  return samples.map((sample, index) => {
    const engine = createPixelEngine(32);
    const { colors, name, author } = sample;
    
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const colorIndex = (x + y + index) % colors.length;
        if (Math.random() > 0.5) {
          engine.fillPixel(x, y, colors[colorIndex], 1);
        }
      }
    }

    const cx = 16, cy = 16;
    const radius = 10;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const x = cx + dx;
          const y = cy + dy;
          if (x >= 0 && x < 32 && y >= 0 && y < 32) {
            engine.fillPixel(x, y, colors[0], 1);
          }
        }
      }
    }

    return {
      id: index,
      name,
      author,
      imageData: engine.exportPNG(4)
    };
  });
};

const App: React.FC = () => {
  const [pixelEngine] = useState(() => createPixelEngine(32));
  const [grid, setGrid] = useState<PixelGrid>(() => pixelEngine.getGrid());
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState<'canvas' | 'gallery'>('canvas');
  const [changedPixels, setChangedPixels] = useState<{ x: number; y: number }[]>([]);
  const [animatingPixels, setAnimatingPixels] = useState<{ x: number; y: number; fromColor: string; toColor: string }[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const gridRef = useRef<PixelGrid>(grid);

  gridRef.current = grid;

  useEffect(() => {
    setGalleryItems(generateSampleGallery());
  }, []);

  const handlePixelFill = useCallback((x: number, y: number, color: string, size: number) => {
    const changed = pixelEngine.fillPixel(x, y, color, size);
    setGrid(pixelEngine.getGrid());
    setCanUndo(pixelEngine.canUndo());
    setCanRedo(pixelEngine.canRedo());
    setChangedPixels(changed);
  }, [pixelEngine]);

  const handleUndo = useCallback(() => {
    const result = pixelEngine.undo();
    if (result) {
      const prevGrid = gridRef.current;
      const animating = result.changedPixels.map(p => ({
        x: p.x,
        y: p.y,
        fromColor: prevGrid[p.y][p.x],
        toColor: result.grid[p.y][p.x]
      }));
      
      setAnimatingPixels(animating);
      setGrid(result.grid);
      setCanUndo(pixelEngine.canUndo());
      setCanRedo(pixelEngine.canRedo());

      setTimeout(() => {
        setAnimatingPixels([]);
      }, 100);
    }
  }, [pixelEngine]);

  const handleRedo = useCallback(() => {
    const result = pixelEngine.redo();
    if (result) {
      const prevGrid = gridRef.current;
      const animating = result.changedPixels.map(p => ({
        x: p.x,
        y: p.y,
        fromColor: prevGrid[p.y][p.x],
        toColor: result.grid[p.y][p.x]
      }));

      setAnimatingPixels(animating);
      setGrid(result.grid);
      setCanUndo(pixelEngine.canUndo());
      setCanRedo(pixelEngine.canRedo());

      setTimeout(() => {
        setAnimatingPixels([]);
      }, 100);
    }
  }, [pixelEngine]);

  const handleClear = useCallback(() => {
    const prevGrid = gridRef.current;
    pixelEngine.clear();
    const newGrid = pixelEngine.getGrid();
    
    const animating: { x: number; y: number; fromColor: string; toColor: string }[] = [];
    for (let y = 0; y < newGrid.length; y++) {
      for (let x = 0; x < newGrid[y].length; x++) {
        if (prevGrid[y][x] !== newGrid[y][x]) {
          animating.push({ x, y, fromColor: prevGrid[y][x], toColor: newGrid[y][x] });
        }
      }
    }

    setAnimatingPixels(animating);
    setGrid(newGrid);
    setCanUndo(pixelEngine.canUndo());
    setCanRedo(pixelEngine.canRedo());

    setTimeout(() => {
      setAnimatingPixels([]);
    }, 100);
  }, [pixelEngine]);

  const handleExport = useCallback(() => {
    setIsExporting(true);
    setTimeout(() => {
      const dataUrl = pixelEngine.exportPNG(8);
      const windowRef = window.open();
      if (windowRef) {
        windowRef.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>像素画预览</title>
            <style>
              body {
                margin: 0;
                padding: 40px;
                background: #1a1a2e;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: Arial, sans-serif;
              }
              h1 {
                color: white;
                margin-bottom: 20px;
              }
              img {
                image-rendering: pixelated;
                image-rendering: crisp-edges;
                border: 4px solid #16213e;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
              }
              a {
                margin-top: 20px;
                padding: 12px 24px;
                background: #4169E1;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 14px;
              }
              a:hover {
                background: #5179F1;
              }
            </style>
          </head>
          <body>
            <h1>你的像素画作品</h1>
            <img src="${dataUrl}" alt="Pixel Art" style="width: 512px; height: 512px;" />
            <a href="${dataUrl}" download="pixel-art.png">下载图片</a>
          </body>
          </html>
        `);
      }
      setIsExporting(false);
    }, 300);
  }, [pixelEngine]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const renderCanvasPage = () => (
    <div className="canvas-page">
      <Canvas
        grid={grid}
        gridSize={pixelEngine.getGridSize()}
        currentColor={currentColor}
        brushSize={brushSize}
        onPixelFill={handlePixelFill}
        changedPixels={changedPixels}
        animatingPixels={animatingPixels}
      />
      <div className="canvas-info">
        <p>当前颜色: <span style={{ 
          display: 'inline-block', 
          width: 16, 
          height: 16, 
          backgroundColor: currentColor,
          borderRadius: 3,
          verticalAlign: 'middle',
          marginLeft: 8,
          border: '1px solid rgba(255,255,255,0.3)'
        }}></span> {currentColor}</p>
        <p>笔刷大小: {brushSize}x{brushSize}</p>
        <p className="hint">提示: 按住鼠标拖动绘制，Ctrl+Z 撤销，Ctrl+Y 重做</p>
      </div>
    </div>
  );

  const renderGalleryPage = () => (
    <div className="gallery-page">
      <h2 className="gallery-title">作品画廊</h2>
      <p className="gallery-subtitle">欣赏其他创作者的像素艺术作品</p>
      <div className="gallery-grid">
        {galleryItems.map(item => (
          <div key={item.id} className="gallery-item">
            <div className="gallery-image-wrapper">
              <img 
                src={item.imageData} 
                alt={item.name}
                style={{ 
                  imageRendering: 'pixelated',
                  width: '100%',
                  height: '100%'
                }}
              />
            </div>
            <div className="gallery-info">
              <h4 className="gallery-item-name">{item.name}</h4>
              <p className="gallery-item-author">作者: {item.author}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <Toolbar
        currentColor={currentColor}
        onColorChange={setCurrentColor}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onClear={handleClear}
        onExport={handleExport}
        isExporting={isExporting}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      <main className="main-content">
        {currentPage === 'canvas' ? renderCanvasPage() : renderGalleryPage()}
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
        }

        #root {
          height: 100%;
        }

        .app-container {
          display: flex;
          height: 100vh;
          background-color: #1a1a2e;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .main-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 20px;
        }

        .canvas-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          width: 100%;
        }

        .canvas-info {
          margin-top: 20px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          text-align: center;
        }

        .canvas-info p {
          margin: 6px 0;
        }

        .hint {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 12px !important;
        }

        .gallery-page {
          padding: 30px;
          width: 100%;
          max-width: 1000px;
        }

        .gallery-title {
          color: white;
          font-size: 28px;
          margin: 0 0 8px 0;
          text-align: center;
        }

        .gallery-subtitle {
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
          margin-bottom: 30px;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
        }

        .gallery-item {
          background-color: #16213e;
          border-radius: 12px;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
        }

        .gallery-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
        }

        .gallery-image-wrapper {
          aspect-ratio: 1;
          background-color: #f0f0f0;
          padding: 10px;
        }

        .gallery-image-wrapper img {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .gallery-info {
          padding: 12px 14px;
        }

        .gallery-item-name {
          color: white;
          font-size: 14px;
          margin: 0 0 4px 0;
          font-weight: 600;
        }

        .gallery-item-author {
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          margin: 0;
        }

        @media (max-width: 768px) {
          .app-container {
            flex-direction: column;
          }

          .main-content {
            padding-bottom: 70px;
          }

          .canvas-page {
            padding: 10px;
          }

          .gallery-page {
            padding: 20px 15px;
          }

          .gallery-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
          }

          .canvas-info {
            font-size: 12px;
          }

          .hint {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
