import React from 'react';
import { useStore } from '../store/useStore';
import type { ToolType } from '../types';

interface ToolButtonProps {
  tool: ToolType;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool, icon, label, isActive, onClick }) => {
  return (
    <button
      className="toolbar-btn"
      data-tool={tool}
      onClick={onClick}
      title={label}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: isActive ? '#3a3a3a' : 'transparent',
        color: isActive ? '#fff' : '#e0e0e0',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        position: 'relative',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = '#3a3a3a';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {icon}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '20px',
            height: '2px',
            backgroundColor: '#3b82f6',
            borderRadius: '1px',
          }}
        />
      )}
    </button>
  );
};

const RectangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="14" rx="1" />
  </svg>
);

const CircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const PolygonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12,2 22,9 19,21 5,21 2,9" />
  </svg>
);

const PencilIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

const EyedropperIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 14l-7 7" />
    <path d="M21 14l-3-3" />
    <path d="M18 11l3 3" />
    <path d="M15 8l-5 5" />
    <path d="M15 8l3 3" />
    <path d="M12 11l-3-3" />
    <path d="M9 8L6 5" />
    <path d="M3 21l3-6 6-6 6-6-3-3-6 6-6 6-3 6z" />
  </svg>
);

const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v6h6" />
    <path d="M3 13a9 9 0 1 0 3-7.7L3 10" />
  </svg>
);

const RedoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 7v6h-6" />
    <path d="M21 13a9 9 0 1 1-3-7.7l3 4.7" />
  </svg>
);

const Divider = () => (
  <div
    style={{
      width: '100%',
      height: '1px',
      backgroundColor: '#444',
      margin: '8px 0',
    }}
  />
);

export const Toolbar: React.FC = () => {
  const {
    currentTool,
    currentColor,
    lineWidth,
    setTool,
    setColor,
    setLineWidth,
    undo,
    redo,
    historyIndex,
    history,
  } = useStore();

  const tools: { tool: ToolType; icon: React.ReactNode; label: string }[] = [
    { tool: 'rectangle', icon: <RectangleIcon />, label: '矩形 (R)' },
    { tool: 'circle', icon: <CircleIcon />, label: '圆形 (C)' },
    { tool: 'polygon', icon: <PolygonIcon />, label: '多边形 (P)' },
    { tool: 'freehand', icon: <PencilIcon />, label: '自由线条 (F)' },
    { tool: 'eyedropper', icon: <EyedropperIcon />, label: '拾色器 (I)' },
  ];

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div
      className="toolbar"
      style={{
        width: '64px',
        backgroundColor: '#2c2c2c',
        color: '#e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '8px',
        flexShrink: 0,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {tools.map(({ tool, icon, label }) => (
        <ToolButton
          key={tool}
          tool={tool}
          icon={icon}
          label={label}
          isActive={currentTool === tool}
          onClick={() => setTool(tool)}
        />
      ))}

      <Divider />

      <div
        style={{
          position: 'relative',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          overflow: 'hidden',
          cursor: 'pointer',
          border: '2px solid #444',
          flexShrink: 0,
        }}
        title="选择颜色"
      >
        <input
          type="color"
          value={currentColor}
          onChange={(e) => setColor(e.target.value)}
          style={{
            position: 'absolute',
            width: '150%',
            height: '150%',
            top: '-25%',
            left: '-25%',
            cursor: 'pointer',
            border: 'none',
            padding: 0,
          }}
        />
      </div>

      <div
        style={{
          width: '100%',
          padding: '0 8px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            color: '#888',
            marginBottom: '4px',
            textAlign: 'center',
          }}
        >
          {lineWidth}px
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: '#3b82f6',
          }}
          title="线条粗细"
        />
      </div>

      <Divider />

      <ToolButton
        tool="rectangle"
        icon={<UndoIcon />}
        label="撤销 (Ctrl+Z)"
        isActive={false}
        onClick={undo}
      />
      <ToolButton
        tool="rectangle"
        icon={<RedoIcon />}
        label="重做 (Ctrl+Y)"
        isActive={false}
        onClick={redo}
      />

      <div
        style={{
          marginTop: 'auto',
          fontSize: '10px',
          color: '#666',
          textAlign: 'center',
        }}
      >
        空格+拖拽<br />平移画布
      </div>
    </div>
  );
};
