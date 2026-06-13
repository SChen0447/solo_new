import React, { useState, useEffect, useRef } from 'react';

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
  '#32CD32',
  '#00CED1',
  '#4169E1',
  '#9932CC',
  '#FF69B4',
  '#8B4513',
  '#D2691E',
  '#F5DEB3',
  '#C0C0C0',
  '#808080',
  '#404040',
  '#000000',
  '#FFFFFF',
  '#DC143C',
  '#FF4500',
  '#00BFFF',
  '#FF1493',
  '#9400D3',
  '#228B22'
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
  const [mobilePanelOpen, setMobilePanelOpen] = useState<'none' | 'colors' | 'tools'>('none');
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomColor(currentColor);
  }, [currentColor]);

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

  const RadialLoading = ({ size = 18 }: { size?: number }) => (
    <span
      className="radial-loading"
      style={{ width: size, height: size, display: 'inline-block', position: 'relative' }}
    >
      <span className="radial-ring radial-ring-1" />
      <span className="radial-ring radial-ring-2" />
      <span className="radial-ring radial-ring-3" />
      <span className="radial-center" />
    </span>
  );

  const ColorSwatches = ({ compact = false }: { compact?: boolean }) => (
    <div
      className="color-grid"
      style={compact ? { gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' } : {}}
    >
      {PRESET_COLORS.map((color, index) => (
        <div
          key={index}
          className={`color-swatch ${currentColor.toLowerCase() === color.toLowerCase() ? 'selected' : ''}`}
          style={{
            backgroundColor: color,
            width: compact ? 28 : 40,
            height: compact ? 28 : 40,
            borderRadius: compact ? 6 : 8,
            border: currentColor.toLowerCase() === color.toLowerCase()
              ? '2px solid #0a0a14'
              : '2px solid transparent',
            boxShadow: currentColor.toLowerCase() === color.toLowerCase()
              ? '0 0 0 1px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.3)'
              : '0 1px 3px rgba(0, 0, 0, 0.2)'
          }}
          onClick={() => {
            onColorChange(color);
            setCustomColor(color);
          }}
          title={color}
        />
      ))}
    </div>
  );

  const BrushSizeButtons = ({ compact = false }: { compact?: boolean }) => (
    <div className="brush-size-buttons">
      {[1, 2, 3].map(size => (
        <button
          key={size}
          className={`brush-btn ${brushSize === size ? 'active' : ''}`}
          onClick={() => handleBrushSizeClick(size)}
          style={{
            transform: activeBrushBtn === size ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            padding: compact ? '8px 0' : '10px 0',
            fontSize: compact ? 11 : 12
          }}
        >
          {size}x{size}
        </button>
      ))}
    </div>
  );

  const DesktopToolbar = () => (
    <aside className="desktop-toolbar">
      <div className="toolbar-header">
        <h1 className="app-title">像素拼贴</h1>
        <p className="app-subtitle">在线像素画工具</p>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-title">颜色</h3>
        <ColorSwatches />
        <div className="custom-color-input">
          <label>自定义颜色 (HEX)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={customColor}
              onChange={handleCustomColorChange}
              placeholder="#FF5733"
              maxLength={7}
            />
            <div
              className="color-preview-box"
              style={{
                backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(customColor) ? customColor : '#ccc',
                width: 32,
                height: 32,
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                flexShrink: 0
              }}
            />
          </div>
        </div>
      </div>

      <div className="toolbar-section">
        <h3 className="toolbar-title">笔刷大小</h3>
        <BrushSizeButtons />
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
              <RadialLoading size={18} />
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
    </aside>
  );

  const MobileBottomNav = () => (
    <>
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
          className={`mobile-nav-item ${mobilePanelOpen === 'colors' ? 'active' : ''}`}
          onClick={() => setMobilePanelOpen(mobilePanelOpen === 'colors' ? 'none' : 'colors')}
        >
          <span
            className="mobile-color-indicator"
            style={{ backgroundColor: currentColor }}
          />
          <span>颜色</span>
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
            <RadialLoading size={16} />
          ) : (
            <span className="mobile-nav-icon">⬇</span>
          )}
          <span>导出</span>
        </button>
      </nav>

      {mobilePanelOpen === 'colors' && (
        <div className="mobile-panel-backdrop" onClick={() => setMobilePanelOpen('none')}>
          <div
            className="mobile-panel"
            ref={mobilePanelRef}
            onClick={e => e.stopPropagation()}
          >
            <div className="mobile-panel-header">
              <h4>选择颜色</h4>
              <button
                className="mobile-panel-close"
                onClick={() => setMobilePanelOpen('none')}
              >
                ✕
              </button>
            </div>
            <ColorSwatches compact />
            <div className="mobile-custom-color">
              <label>自定义 (HEX)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  placeholder="#FF5733"
                  maxLength={7}
                />
                <div
                  style={{
                    backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(customColor) ? customColor : '#ccc',
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                />
              </div>
            </div>
            <div className="mobile-brush-section">
              <label>笔刷大小</label>
              <BrushSizeButtons compact />
            </div>
            <div className="mobile-extra-actions">
              <button
                className="mobile-action-btn"
                onClick={onRedo}
                disabled={!canRedo}
              >
                ↷ 重做
              </button>
              <button
                className="mobile-action-btn danger"
                onClick={onClear}
              >
                🗑 清空
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <DesktopToolbar />
      <MobileBottomNav />

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
          cursor: pointer;
          justify-self: center;
          transition: all 0.15s ease;
        }

        .color-swatch:hover {
          filter: brightness(1.15);
          transform: scale(1.08);
        }

        .color-swatch.selected {
          transform: scale(1.1);
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
          min-width: 0;
        }

        .custom-color-input input:focus {
          border-color: rgba(255, 255, 255, 0.5);
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
          border-color: rgba(65, 105, 225, 0.9);
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
          background-color: rgba(255, 255, 255, 0.18);
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

        .radial-loading {
          display: inline-block;
        }

        .radial-loading .radial-ring {
          position: absolute;
          border: 2px solid transparent;
          border-top-color: white;
          border-radius: 50%;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .radial-loading .radial-ring-1 {
          animation: radial-spin 1s linear infinite;
        }

        .radial-loading .radial-ring-2 {
          top: 3px;
          left: 3px;
          right: 3px;
          bottom: 3px;
          border-top-color: rgba(255, 255, 255, 0.7);
          animation: radial-spin 0.8s linear infinite reverse;
        }

        .radial-loading .radial-ring-3 {
          top: 6px;
          left: 6px;
          right: 6px;
          bottom: 6px;
          border-top-color: rgba(255, 255, 255, 0.4);
          animation: radial-spin 0.6s linear infinite;
        }

        .radial-loading .radial-center {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3px;
          height: 3px;
          background: white;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: radial-pulse 0.6s ease-in-out infinite alternate;
        }

        @keyframes radial-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes radial-pulse {
          0% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.8); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
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
          background-color: rgba(255, 255, 255, 0.18);
        }

        .nav-btn.active {
          background-color: rgba(65, 105, 225, 0.5);
        }

        .nav-icon {
          font-size: 16px;
        }

        .mobile-bottom-nav {
          display: none;
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
            height: 64px;
            background-color: #16213e;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 1000;
            padding-bottom: env(safe-area-inset-bottom);
          }

          .mobile-nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 10px;
            cursor: pointer;
            transition: all 0.2s;
            padding: 4px;
          }

          .mobile-nav-item:hover:not(:disabled),
          .mobile-nav-item.active {
            color: white;
            background-color: rgba(255, 255, 255, 0.08);
          }

          .mobile-nav-item:disabled {
            opacity: 0.4;
          }

          .mobile-nav-icon {
            font-size: 20px;
          }

          .mobile-color-indicator {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.4);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
          }

          .mobile-panel-backdrop {
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.6);
            z-index: 1100;
            display: flex;
            align-items: flex-end;
            animation: fadeIn 0.2s ease-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .mobile-panel {
            width: 100%;
            background-color: #16213e;
            border-radius: 20px 20px 0 0;
            padding: 20px 16px calc(30px + env(safe-area-inset-bottom));
            max-height: 70vh;
            overflow-y: auto;
            animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }

          .mobile-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .mobile-panel-header h4 {
            color: white;
            margin: 0;
            font-size: 16px;
          }

          .mobile-panel-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            font-size: 18px;
            cursor: pointer;
            padding: 4px 8px;
          }

          .mobile-custom-color {
            margin-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .mobile-custom-color label {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
          }

          .mobile-custom-color input {
            flex: 1;
            padding: 10px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background-color: rgba(255, 255, 255, 0.1);
            color: white;
            font-size: 14px;
            font-family: monospace;
            outline: none;
          }

          .mobile-brush-section {
            margin-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .mobile-brush-section label {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
          }

          .mobile-extra-actions {
            margin-top: 20px;
            display: flex;
            gap: 8px;
          }

          .mobile-action-btn {
            flex: 1;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background-color: rgba(255, 255, 255, 0.08);
            color: white;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .mobile-action-btn:hover:not(:disabled) {
            background-color: rgba(255, 255, 255, 0.18);
          }

          .mobile-action-btn:disabled {
            opacity: 0.4;
          }

          .mobile-action-btn.danger {
            background-color: rgba(220, 20, 60, 0.2);
            border-color: rgba(220, 20, 60, 0.4);
          }

          .mobile-action-btn.danger:hover {
            background-color: rgba(220, 20, 60, 0.35);
          }
        }
      `}</style>
    </>
  );
};

export default Toolbar;
