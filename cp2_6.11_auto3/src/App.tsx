import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ColorSlider } from './ColorSlider';
import { ColorPalette } from './ColorPalette';
import type { SliderValues, ColorStop, Favorite, ExportData } from './types';

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * factor,
    c1.g + (c2.g - c1.g) * factor,
    c1.b + (c2.b - c1.b) * factor
  );
};

const generateColorsFromSliders = (values: SliderValues): { colors: string[]; colorStops: ColorStop[] } => {
  const [temperature, density, , darkMatter] = values;
  
  const layerCount = Math.floor(2 + (density / 100) * 4);
  const opacity = 0.4 + (density / 100) * 0.6;
  
  const coldColor = '#0a1a3a';
  const hotColor = '#ff4d4d';
  const tempFactor = temperature / 100;
  
  const baseColor = interpolateColor(coldColor, hotColor, tempFactor);
  
  const midColor1 = interpolateColor('#1a3a6a', '#ff8c42', tempFactor);
  const midColor2 = interpolateColor('#2a5a8a', '#ffd166', tempFactor);
  const darkColor = interpolateColor('#050a1a', '#1a0a0a', tempFactor * 0.5);
  
  const allColors = [darkColor, coldColor, midColor1, baseColor, midColor2, hotColor];
  
  const colors: string[] = [];
  const colorStops: ColorStop[] = [];
  
  const darkInfluence = darkMatter / 100;
  
  for (let i = 0; i < layerCount; i++) {
    const position = i / (layerCount - 1);
    const colorIndex = Math.floor((position * (allColors.length - 1)));
    const nextIndex = Math.min(colorIndex + 1, allColors.length - 1);
    const localFactor = (position * (allColors.length - 1)) % 1;
    
    let color = interpolateColor(allColors[colorIndex], allColors[nextIndex], localFactor);
    
    if (position < darkInfluence * 0.5) {
      const darkFactor = 1 - (position / (darkInfluence * 0.5));
      color = interpolateColor(color, '#000000', darkFactor * 0.7);
    }
    
    const alpha = Math.floor(opacity * 255).toString(16).padStart(2, '0');
    colors.push(color);
    colorStops.push({
      color: color + alpha,
      position
    });
  }
  
  return { colors, colorStops };
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const VIRTUAL_SCROLL_THRESHOLD = 50;
const ITEM_HEIGHT = 88;
const BUFFER_ITEMS = 5;

export const App: React.FC = () => {
  const [sliderValues, setSliderValues] = useState<SliderValues>([50, 50, 50, 30]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { colors, colorStops } = useMemo(
    () => generateColorsFromSliders(sliderValues),
    [sliderValues]
  );

  const handleSliderChange = useCallback((values: SliderValues) => {
    const startTime = performance.now();
    setSliderValues(values);
    const elapsed = performance.now() - startTime;
    if (elapsed > 16) {
      console.warn(`Slider update took ${elapsed.toFixed(2)}ms, target is <16ms`);
    }
  }, []);

  const handleFavorite = useCallback(() => {
    const newFavorite: Favorite = {
      id: generateId(),
      name: `星云#${String(favorites.length + 1).padStart(3, '0')}`,
      colors: [...colors],
      colorStops: colorStops.map(s => ({ ...s })),
      sliderValues: [...sliderValues] as SliderValues,
      createdAt: Date.now()
    };
    setFavorites(prev => [...prev, newFavorite]);
  }, [colors, colorStops, sliderValues, favorites.length]);

  const handleNameChange = useCallback((id: string, name: string) => {
    setFavorites(prev =>
      prev.map(f => (f.id === id ? { ...f, name } : f))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
    if (expandedId === id) {
      setExpandedId(null);
    }
  }, [expandedId]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const handleExport = useCallback(() => {
    const exportData: ExportData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      favorites
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starlight-palette-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [favorites]);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: ExportData = JSON.parse(e.target?.result as string);
        if (data.favorites && Array.isArray(data.favorites)) {
          setFavorites(prev => [...prev, ...data.favorites.map(f => ({ ...f, id: generateId() }))]);
        }
      } catch (err) {
        console.error('Failed to import:', err);
        alert('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const useVirtualScroll = favorites.length > VIRTUAL_SCROLL_THRESHOLD;

  const visibleItems = useMemo(() => {
    if (!useVirtualScroll) return favorites;

    const listHeight = listRef.current?.clientHeight || 600;
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_ITEMS);
    const endIndex = Math.min(
      favorites.length,
      Math.ceil((scrollTop + listHeight) / ITEM_HEIGHT) + BUFFER_ITEMS
    );
    return favorites.slice(startIndex, endIndex).map((item, idx) => ({
      ...item,
      _virtualIndex: startIndex + idx
    }));
  }, [favorites, scrollTop, useVirtualScroll]);

  const totalHeight = useMemo(() => {
    if (!useVirtualScroll) return undefined;
    return favorites.length * ITEM_HEIGHT;
  }, [favorites.length, useVirtualScroll]);

  const offsetY = useMemo(() => {
    if (!useVirtualScroll) return 0;
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_ITEMS);
    return startIndex * ITEM_HEIGHT;
  }, [scrollTop, useVirtualScroll]);

  useEffect(() => {
    const saved = localStorage.getItem('starlight-favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('starlight-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const getGradientStyle = (colorStops: ColorStop[]): string => {
    return `linear-gradient(to right, ${colorStops.map(s => `${s.color} ${s.position * 100}%`).join(', ')})`;
  };

  const sliderColors = ['#ff6b6b', '#00d4aa', '#ffd700', '#9b59b6'];
  const sliderLabels = ['恒星温度', '星云密度', '星爆强度', '暗物质比例'];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">✧</span>
          星际调色盘
          <span className="title-icon">✧</span>
        </h1>
        <p className="app-subtitle">探索宇宙的色彩，记录每一片星云的光谱</p>
      </header>

      <main className="app-main">
        <section className="control-section">
          <div className="slider-section">
            <h2 className="section-title">光谱参数</h2>
            <ColorSlider values={sliderValues} onChange={handleSliderChange} />
          </div>

          <div className="palette-section">
            <h2 className="section-title">星云预览</h2>
            <ColorPalette
              colors={colors}
              colorStops={colorStops}
              starIntensity={sliderValues[2]}
              onFavorite={handleFavorite}
            />
          </div>
        </section>

        <section className="favorites-section">
          <div className="section-header">
            <h2 className="section-title">光谱收藏</h2>
            <div className="action-buttons">
              <button className="action-btn import-btn" onClick={() => fileInputRef.current?.click()}>
                导入调色盘
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
              <button className="action-btn export-btn" onClick={handleExport}>
                导出调色盘
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            className="favorites-list"
            onScroll={handleScroll}
            style={{ height: useVirtualScroll ? '600px' : 'auto' }}
          >
            {favorites.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🌌</div>
                <p className="empty-text">还没有记录任何光谱</p>
                <p className="empty-hint">调整滑块并点击"记录光谱"开始收藏</p>
              </div>
            ) : (
              <div
                className="virtual-list-container"
                style={{ height: totalHeight, position: 'relative' }}
              >
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                  {visibleItems.map((favorite) => (
                    <div
                      key={favorite.id}
                      className={`favorite-card ${expandedId === favorite.id ? 'expanded' : ''}`}
                      onClick={() => handleToggleExpand(favorite.id)}
                    >
                      <div className="favorite-header">
                        <div
                          className="color-gradient-bar"
                          style={{ background: getGradientStyle(favorite.colorStops) }}
                        />
                        <div className="favorite-info">
                          <input
                            type="text"
                            className="name-input"
                            value={favorite.name}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleNameChange(favorite.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="输入名称"
                          />
                          <button
                            className="delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(favorite.id);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="favorite-details">
                        <div className="spectrum-title">4D 光谱图</div>
                        <div className="spectrum-chart">
                          <div
                            className="spectrum-background"
                            style={{ background: getGradientStyle(favorite.colorStops) }}
                          />
                          {favorite.sliderValues.map((value, index) => (
                            <div
                              key={index}
                              className="spectrum-marker"
                              style={{
                                left: `${value}%`,
                                backgroundColor: sliderColors[index],
                                boxShadow: `0 0 8px ${sliderColors[index]}`
                              }}
                              title={`${sliderLabels[index]}: ${value}`}
                            />
                          ))}
                        </div>
                        <div className="spectrum-legend">
                          {favorite.sliderValues.map((value, index) => (
                            <div key={index} className="legend-item">
                              <span
                                className="legend-dot"
                                style={{ backgroundColor: sliderColors[index] }}
                              />
                              <span className="legend-label">{sliderLabels[index]}</span>
                              <span className="legend-value">{value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="color-values">
                          {favorite.colors.map((color, index) => (
                            <div key={index} className="color-value-item">
                              <div
                                className="color-swatch"
                                style={{ backgroundColor: color }}
                              />
                              <span className="color-hex">{color.toUpperCase()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .app-container {
          min-height: 100vh;
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .app-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .app-title {
          font-size: 42px;
          font-weight: 800;
          background: linear-gradient(135deg, #4a9eff 0%, #9b59b6 50%, #ff6b9d 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 8px 0;
          letter-spacing: 4px;
          text-shadow: 0 0 40px rgba(74, 158, 255, 0.3);
        }

        .title-icon {
          margin: 0 12px;
          color: #ffd700;
          -webkit-text-fill-color: #ffd700;
          animation: twinkle 2s ease-in-out infinite;
        }

        .title-icon:last-child {
          animation-delay: 1s;
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .app-subtitle {
          color: rgba(224, 224, 255, 0.6);
          font-size: 16px;
          margin: 0;
        }

        .app-main {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .control-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #e0e0ff;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-title::before {
          content: '';
          width: 4px;
          height: 20px;
          background: linear-gradient(to bottom, #4a4aff, #9b59b6);
          border-radius: 2px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .section-header .section-title {
          margin-bottom: 0;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .import-btn {
          background: rgba(74, 74, 255, 0.2);
          color: #4a9eff;
          border: 1px solid rgba(74, 74, 255, 0.4);
        }

        .import-btn:hover {
          background: rgba(74, 74, 255, 0.3);
          transform: translateY(-1px);
        }

        .export-btn {
          background: linear-gradient(135deg, #4a4aff 0%, #6b4aff 100%);
          color: white;
          box-shadow: 0 4px 15px rgba(74, 74, 255, 0.3);
        }

        .export-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(74, 74, 255, 0.5);
        }

        .favorites-list {
          overflow-y: auto;
          overflow-x: hidden;
        }

        .favorites-list::-webkit-scrollbar {
          width: 8px;
        }

        .favorites-list::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }

        .favorites-list::-webkit-scrollbar-thumb {
          background: rgba(74, 74, 255, 0.5);
          border-radius: 4px;
        }

        .favorites-list::-webkit-scrollbar-thumb:hover {
          background: rgba(74, 74, 255, 0.7);
        }

        .virtual-list-container {
          width: 100%;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: rgba(224, 224, 255, 0.5);
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.6;
        }

        .empty-text {
          font-size: 18px;
          margin: 0 0 8px 0;
        }

        .empty-hint {
          font-size: 14px;
          margin: 0;
          opacity: 0.7;
        }

        .favorite-card {
          background: rgba(26, 26, 62, 0.6);
          border: 1px solid rgba(74, 74, 255, 0.3);
          border-radius: 12px;
          margin-bottom: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .favorite-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                      0 0 20px rgba(74, 74, 255, 0.2);
          border-color: rgba(74, 74, 255, 0.5);
        }

        .favorite-header {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .color-gradient-bar {
          width: 100%;
          height: 40px;
          border-radius: 8px;
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .favorite-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .name-input {
          flex: 1;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #e0e0ff;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .name-input:focus {
          outline: none;
          border-color: rgba(74, 74, 255, 0.6);
          box-shadow: 0 0 0 3px rgba(74, 74, 255, 0.2);
        }

        .delete-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 107, 107, 0.2);
          border: 1px solid rgba(255, 107, 107, 0.4);
          border-radius: 6px;
          color: #ff6b6b;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .delete-btn:hover {
          background: rgba(255, 107, 107, 0.3);
          transform: scale(1.1);
        }

        .favorite-details {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out, padding 0.3s ease-out;
          padding: 0 16px;
        }

        .favorite-card.expanded .favorite-details {
          max-height: 500px;
          padding: 0 16px 20px 16px;
        }

        .spectrum-title {
          font-size: 14px;
          font-weight: 600;
          color: rgba(224, 224, 255, 0.8);
          margin-bottom: 12px;
        }

        .spectrum-chart {
          position: relative;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .spectrum-background {
          position: absolute;
          inset: 0;
          opacity: 0.6;
        }

        .spectrum-marker {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 3px;
          transform: translateX(-50%);
          border-radius: 2px;
        }

        .spectrum-legend {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .legend-label {
          color: rgba(224, 224, 255, 0.7);
        }

        .legend-value {
          color: rgba(224, 224, 255, 0.9);
          font-family: 'Courier New', monospace;
          font-weight: 600;
        }

        .color-values {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .color-value-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
        }

        .color-swatch {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .color-hex {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: rgba(224, 224, 255, 0.8);
        }

        @media (max-width: 768px) {
          .app-container {
            padding: 16px;
          }

          .app-title {
            font-size: 28px;
            letter-spacing: 2px;
          }

          .app-subtitle {
            font-size: 14px;
          }

          .control-section {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .section-title {
            font-size: 16px;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .action-buttons {
            width: 100%;
          }

          .action-btn {
            flex: 1;
            padding: 12px;
            font-size: 13px;
          }

          .favorite-header {
            padding: 12px;
          }

          .color-gradient-bar {
            height: 32px;
          }

          .spectrum-legend {
            gap: 10px;
          }

          .legend-item {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};
