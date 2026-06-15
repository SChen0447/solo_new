import React, { useState } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';

const ZoomInIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const ZoomOutIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const ResetIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

const PanIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4"/>
    <path d="m5 9-3-3 3-3"/>
    <path d="M2 12h4"/>
    <path d="M22 12h-4"/>
    <path d="M19 9 22 6 19 3"/>
    <path d="M12 22v-4"/>
    <path d="M5 15l-3 3 3 3"/>
    <path d="M19 15l3 3-3 3"/>
  </svg>
);

export const ZoomControls: React.FC = () => {
  const targetZoom = useCanvasStore((s) => s.targetZoom);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const setPanOffset = useCanvasStore((s) => s.setPanOffset);
  const panOffset = useCanvasStore((s) => s.panOffset);
  const [hovered, setHovered] = useState(false);

  const percent = Math.round(targetZoom * 100);

  const handleZoomIn = () => {
    setZoom(Math.min(2, targetZoom + 0.1));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(0.5, targetZoom - 0.1));
  };

  const handleReset = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setZoom(v);
  };

  const panStep = 80;
  const handlePanLeft = () => setPanOffset({ x: panOffset.x + panStep, y: panOffset.y });
  const handlePanRight = () => setPanOffset({ x: panOffset.x - panStep, y: panOffset.y });
  const handlePanUp = () => setPanOffset({ x: panOffset.x, y: panOffset.y + panStep });
  const handlePanDown = () => setPanOffset({ x: panOffset.x, y: panOffset.y - panStep });

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        background: hovered ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.6)',
        backdropFilter: hovered ? 'blur(14px)' : 'blur(6px)',
        borderRadius: 14,
        border: '1px solid rgba(79,195,247,0.2)',
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.12)'
          : '0 4px 12px rgba(0,0,0,0.06)',
        transition: 'all 0.25s ease',
        opacity: hovered ? 1 : 0.75,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 28px)',
          gridTemplateRows: 'repeat(3, 28px)',
          gap: 2,
          placeItems: 'center',
        }}
      >
        <div />
        <button
          onClick={handlePanUp}
          style={panBtnStyle}
          title="向上平移"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
        <div />

        <button
          onClick={handlePanLeft}
          style={panBtnStyle}
          title="向左平移"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button
          onClick={handleReset}
          style={{
            ...panBtnStyle,
            background: '#4fc3f7',
            color: '#fff',
          }}
          title="重置视图"
        >
          <ResetIcon />
        </button>
        <button
          onClick={handlePanRight}
          style={panBtnStyle}
          title="向右平移"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <div />
        <button
          onClick={handlePanDown}
          style={panBtnStyle}
          title="向下平移"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
        }}
      >
        <button
          onClick={handleZoomOut}
          style={zoomBtnStyle}
          title="缩小"
          disabled={targetZoom <= 0.5}
        >
          <ZoomOutIcon />
        </button>

        <div
          style={{
            minWidth: 80,
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: '#555',
            padding: '4px 6px',
            background: 'rgba(79,195,247,0.08)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
          onClick={handleReset}
          title="点击重置缩放"
        >
          {percent}%
        </div>

        <button
          onClick={handleZoomIn}
          style={zoomBtnStyle}
          title="放大"
          disabled={targetZoom >= 2}
        >
          <ZoomInIcon />
        </button>
      </div>

      <input
        type="range"
        min="0.5"
        max="2"
        step="0.05"
        value={targetZoom}
        onChange={handleSlider}
        style={{
          width: 120,
          cursor: 'pointer',
          accentColor: '#4fc3f7',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 10,
          color: '#999',
        }}
      >
        <PanIcon />
        <span>Alt+拖拽 平移</span>
      </div>
    </div>
  );
};

const panBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  border: 'none',
  background: 'rgba(0,0,0,0.04)',
  color: '#555',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
};

const zoomBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.06)',
  background: '#fff',
  color: '#555',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  fontSize: 14,
  fontWeight: 600,
};

export default ZoomControls;
