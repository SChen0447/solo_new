import { useState, useCallback } from 'react';
import { usePosterStore, FontStyle } from '../store/posterStore';

interface ControlPanelProps {
  exportPNG: () => void;
}

const ControlPanel = ({ exportPNG }: ControlPanelProps) => {
  const { text, fontStyle, fontSize, scale, offsetX, offsetY, setText, setFontStyle, setFontSize } = usePosterStore();
  const [inputValue, setInputValue] = useState(text);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 30);
    setInputValue(value);
    setText(value);
  }, [setText]);

  const handleStyleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFontStyle(e.target.value as FontStyle);
  }, [setFontStyle]);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFontSize(parseInt(e.target.value, 10));
  }, [setFontSize]);

  const handleExport = useCallback(() => {
    exportPNG();
  }, [exportPNG]);

  const styleOptions: { value: FontStyle; label: string }[] = [
    { value: 'pixel', label: '像素风' },
    { value: 'neon', label: '霓虹风' },
    { value: 'handwrite', label: '手写风' },
  ];

  return (
    <div
      style={{
        width: '280px',
        background: '#16213e',
        padding: '20px',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          style={{
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          文字内容 ({text.length}/30)
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={handleTextChange}
          placeholder="请输入文字..."
          maxLength={30}
          style={{
            width: '100%',
            height: '40px',
            padding: '0 12px',
            background: '#0f3460',
            color: '#ffffff',
            border: '2px solid transparent',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#e94560';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          style={{
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          字体风格
        </label>
        <select
          value={fontStyle}
          onChange={handleStyleChange}
          style={{
            width: '100%',
            height: '40px',
            padding: '0 12px',
            background: '#0f3460',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 8.825c-.2 0-.408-.075-.558-.225l-3.6-3.6c-.3-.3-.3-.783 0-1.083s.783-.3 1.083 0L6 6.933l3.075-3.016c.3-.3.783-.3 1.083 0s.3.783 0 1.083l-3.6 3.6c-.15.15-.358.225-.558.225z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            paddingRight: '36px',
          }}
        >
          {styleOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              style={{
                background: fontStyle === option.value ? '#e94560' : '#16213e',
                color: '#ffffff',
              }}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label
          style={{
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>字体大小</span>
          <span
            style={{
              color: '#e94560',
              fontWeight: 600,
            }}
          >
            {fontSize}px
          </span>
        </label>
        <div style={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '6px',
              background: '#0f3460',
              borderRadius: '3px',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: `${((fontSize - 12) / (200 - 12)) * 100}%`,
              height: '6px',
              background: '#e94560',
              borderRadius: '3px',
              pointerEvents: 'none',
            }}
          />
          <input
            type="range"
            min={12}
            max={200}
            value={fontSize}
            onChange={handleFontSizeChange}
            onMouseDown={() => setIsDraggingSlider(true)}
            onMouseUp={() => setIsDraggingSlider(false)}
            onMouseLeave={() => setIsDraggingSlider(false)}
            onTouchStart={() => setIsDraggingSlider(true)}
            onTouchEnd={() => setIsDraggingSlider(false)}
            style={{
              position: 'absolute',
              width: '100%',
              height: '40px',
              margin: 0,
              padding: 0,
              appearance: 'none',
              WebkitAppearance: 'none',
              background: 'transparent',
              cursor: 'pointer',
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(${((fontSize - 12) / (200 - 12)) * 100}% - 9px)`,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: isDraggingSlider ? '#ff6b6b' : '#e94560',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none',
              transition: 'background-color 0.2s ease',
              zIndex: 1,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '12px',
          background: 'rgba(15, 52, 96, 0.5)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.6)',
        }}
      >
        <div>缩放: {(scale * 100).toFixed(0)}%</div>
        <div>偏移: X: {offsetX.toFixed(1)}, Y: {offsetY.toFixed(1)}</div>
        <div style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
          滚轮缩放 · 拖拽平移
        </div>
      </div>

      <button
        onClick={handleExport}
        style={{
          width: '100%',
          height: '44px',
          background: '#e94560',
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'filter 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          filter: 'brightness(1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        导出高清PNG
      </button>
    </div>
  );
};

export default ControlPanel;
