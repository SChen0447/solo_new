import React, { useState } from 'react';

interface ToolbarProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
  onExport: () => void;
  isExporting: boolean;
  currentPage: 'canvas' | 'gallery';
  onPageChange: (page: 'canvas' | 'gallery') => void;
}

const PRESET_COLORS = [
  '#FF0000',
  '#FF6B00',
  '#FFD700',
  '#00FF00',
  '#00CED1',
  '#4169E1',
  '#9932CC',
  '#FF69B4',
  '#8B4513',
  '#A0522D',
  '#F5F5DC',
  '#D3D3D3',
  '#808080',
  '#696969',
  '#000000',
  '#FFFFFF',
  '#DC143C',
  '#FF4500',
  '#32CD32',
  '#00BFFF',
  '#FF1493',
  '#9400D3'
];

const Toolbar: React.FC<ToolbarProps> = ({
  currentColor,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClear,
  onExport,
  isExporting,
  currentPage,
  onPageChange
}) => {
  const [customColor, setCustomColor] = useState(currentColor);
  const [activeBrushBtn, setActiveBrushBtn] = useState(brushSize);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith('#')) {
      value = '#' + value;
    }
    setCustomColor(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onColorChange(value);
    }
  };

  const handleBrushSizeClick = (size: number) => {
    setActiveBrushBtn(size);
    onBrushSizeChange(size);
  };

  const ToolbarContent = () => (
    <>
      <div className="toolbar-section">
        <h3 className="toolbar-title">颜色</h3>
        <div className="color-grid">
          {PRESET_COLORS.map((color, index) => (
            <div
              key={index}
              className={`color-swatch ${currentColor.toLowerCase() === color.toLowerCase() ? 'selected' : ''}`}
              style={{
                backgroundColor: color,
                border: currentColor.toLowerCase() === color.toLowerCase() 
                  ? '2px solid #0f0f1a' 
                  : '2px solid transparent'
              }}
              onClick={() => {
                onColorChange(color);
                setCustomColor(color);
              }}
              title={color}
            />
          ))}
        </div>
        <div className="custom-color-input">
          <label>自定义颜色</label>
          <input
            type="text"
            value={customColor}
            onChange={handleCustomColorChange}
            placeholder="#FF5733"
            maxLength={7}
          />
          <div 
            className="color-preview"
            style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(customColor) ? customColor : '#ccc' }}
          />
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-title">笔刷大小</h3>
        <div className="brush-size-buttons">
          {[1, 2, 3].map(size => (
            <button
              key={size}
              className={`brush-btn ${brushSize === size ? 'active' : ''}`}
              onClick={() => handleBrushSizeClick(size)}
              style={{
                transform: activeBrushBtn === size ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
              }}
            >
              {size}x{size}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-title">操作</h3>
        <div className="action-buttons">
          <button
            className="action-btn undo-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
          >
            <span className="btn-icon">↶</span>
            <span className="btn-text">撤销</span>
          </button>
          <button
            className="action-btn redo-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="重做 (Ctrl+Y)"
          >
            <span className="btn-icon">↷</span>
            <span className="btn-text">重做</span>
          </button>
          <button
            className="action-btn clear-btn"
            onClick={onClear}
            title="清空画布"
          >
            <span className="btn-icon">🗑</span>
            <span className="btn-text">清空</span>
          </button>
          <button
            className="action-btn export-btn"
            onClick={onExport}
            disabled={isExporting}
            title="导出PNG"
          >
            {isExporting ? (
              <span className="export-loading" />
            ) : (
              <span className="btn-icon">⬇</span>
            )}
            <span className="btn-text">导出</span>
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-title">导航</h3>
        <div className="nav-buttons">
          <button
            className={`nav-btn ${currentPage === 'canvas' ? 'active' : ''}`}
            onClick={() => onPageChange('canvas')}
          >
            <span className="nav-icon">🎨</span>
            <span>画布</span>
          </button>
          <button
            className={`nav-btn ${currentPage === 'gallery' ? 'active' : ''}`}
            onClick={() => onPageChange('gallery')}
          >
            <span className="nav-icon">🖼</span>
            <span>画廊</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="desktop-toolbar">
        <div className="toolbar-header">
          <h1 className="app-title">像素拼贴</h1>
          <p className="app-subtitle">在线像素画工具</p>
        </div>
        <ToolbarContent />
      </aside>

      <nav className="mobile-bottom-nav">
        <button 
          className={`mobile-nav-item ${currentPage === 'canvas' ? 'active' : ''}`}
          onClick={() => onPageChange('canvas')}
        >
          <span className="mobile-nav-icon">🎨</span>
          <span>画布</span>
        </button>
        <button 
          className={`mobile-nav-item ${currentPage === 'gallery' ? 'active' : ''}`}
          onClick={() => onPageChange('gallery')}
        >
          <span className="mobile-nav-icon">🖼</span>
          <span>画廊</span>
        </button>
        <button 
          className="mobile-nav-item"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <span className="mobile-nav-icon">↶</span>
          <span>撤销</span>
        </button>
        <button 
          className="mobile-nav-item"
          onClick={onExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <span className="export-loading-small" />
          ) : (
            <span className="mobile-nav-icon">⬇</span>
          )}
          <span>导出</span>
        </button>
      </nav>

      <style>{`
        .desktop-toolbar {
          width: 220px;
          min-width: 220px;
          background-color: #16213e;
          padding: 20px 16px;
          overflow-y: auto;
          height: 100vh;
          box-sizing: border-box;
          border-right: 1px solid #1a1a2e;
        }

        .toolbar-header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .app-title {
          color: white;
          font-size: 20px;
          margin: 0 0 4px 0;
          font-weight: 700;
        }

        .app-subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          margin: 0;
        }

        .toolbar-section {
          margin-bottom: 24px;
        }

        .toolbar-title {
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .color-swatch {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          cursor: pointer;
          justify-self: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .color-swatch:hover {
          filter: brightness(1.1);
          transform: scale(1.05);
        }

        .color-swatch.selected {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .custom-color-input {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .custom-color-input label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 11px;
        }

        .custom-color-input input {
          flex: 1;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 12px;
          font-family: monospace;
          outline: none;
          transition: border-color 0.2s;
        }

        .custom-color-input input:focus {
          border-color: rgba(255, 255, 255, 0.5);
        }

        .color-preview {
          width: 100%;
          height: 24px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .brush-size-buttons {
          display: flex;
          gap: 8px;
        }

        .brush-btn {
          flex: 1;
          padding: 10px 0;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background-color: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .brush-btn:hover {
          background-color: rgba(255, 255, 255, 0.15);
        }

        .brush-btn.active {
          background-color: rgba(65, 105, 225, 0.6);
          border-color: rgba(65, 105, 225, 0.8);
        }

        .action-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background-color: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover:not(:disabled) {
          background-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }

        .action-btn:active:not(:disabled) {
          transform: translateY(0);
          transition: transform 0.2s;
        }

        .action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-icon {
          font-size: 18px;
        }

        .export-btn .export-loading {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .nav-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nav-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          border: none;
          background-color: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .nav-btn:hover {
          background-color: rgba(255, 255, 255, 0.15);
        }

        .nav-btn.active {
          background-color: rgba(65, 105, 225, 0.4);
        }

        .nav-icon {
          font-size: 16px;
        }

        .mobile-bottom-nav {
          display: none;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .desktop-toolbar {
            display: none;
          }

          .mobile-bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 60px;
            background-color: #16213e;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
          }

          .mobile-nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 10px;
            cursor: pointer;
            transition: color 0.2s;
          }

          .mobile-nav-item:hover,
          .mobile-nav-item.active {
            color: white;
          }

          .mobile-nav-item:disabled {
            opacity: 0.4;
          }

          .mobile-nav-icon {
            font-size: 20px;
          }

          .export-loading-small {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
          }
        }
      `}</style>
    </>
  );
};

export default Toolbar;
