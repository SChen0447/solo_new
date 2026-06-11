import React, { useRef } from 'react';
import type { ToolType } from '../shared/types';

interface ToolbarProps {
  tool: ToolType;
  color: string;
  thickness: number;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onAddSticky: () => void;
  onUploadImage: () => void;
  onClearCanvas: () => void;
  imageInputRef: React.RefObject<HTMLInputElement>;
}

const COLORS = [
  '#000000',
  '#ff6b35',
  '#e63946',
  '#2d6a4f',
  '#2196f3',
  '#9c27b0',
  '#ffc107',
  '#795548',
];

const THICKNESSES = [2, 4, 6, 10, 16];

function createRipple(e: React.MouseEvent<HTMLButtonElement>) {
  const button = e.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;
  const rect = button.getBoundingClientRect();
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - radius}px`;
  circle.style.top = `${e.clientY - rect.top - radius}px`;
  circle.className = 'ripple';
  const existingRipples = button.getElementsByClassName('ripple');
  if (existingRipples.length > 0) {
    existingRipples[0].remove();
  }
  button.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  color,
  thickness,
  onToolChange,
  onColorChange,
  onThicknessChange,
  onAddSticky,
  onUploadImage,
  onClearCanvas,
  imageInputRef,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleToolClick = (e: React.MouseEvent<HTMLButtonElement>, t: ToolType) => {
    createRipple(e);
    onToolChange(t);
  };

  return (
    <div
      ref={toolbarRef}
      style={{
        position: 'absolute',
        left: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 12,
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        zIndex: 100,
      }}
    >
      <ToolButton
        icon={<PenIcon />}
        label="画笔"
        active={tool === 'pen'}
        onClick={(e) => handleToolClick(e, 'pen')}
      />
      <ToolButton
        icon={<RectIcon />}
        label="矩形"
        active={tool === 'rectangle'}
        onClick={(e) => handleToolClick(e, 'rectangle')}
      />
      <ToolButton
        icon={<CircleIcon />}
        label="圆形"
        active={tool === 'circle'}
        onClick={(e) => handleToolClick(e, 'circle')}
      />
      <ToolButton
        icon={<LineIcon />}
        label="直线"
        active={tool === 'line'}
        onClick={(e) => handleToolClick(e, 'line')}
      />
      <ToolButton
        icon={<EraserIcon />}
        label="选择/移动"
        active={tool === 'select'}
        onClick={(e) => handleToolClick(e, 'select')}
      />

      <Divider />

      <ToolButton
        icon={<StickyIcon />}
        label="便签"
        onClick={(e) => {
          createRipple(e);
          onAddSticky();
        }}
      />
      <ToolButton
        icon={<ImageIcon />}
        label="图片"
        onClick={(e) => {
          createRipple(e);
          onUploadImage();
        }}
      />

      <Divider />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
          padding: '4px 0',
        }}
      >
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={(e) => {
              createRipple(e);
              onColorChange(c);
            }}
            className="toolbar-btn"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: c,
              border: color === c ? '2px solid #2d6a4f' : '2px solid #e0e6ed',
              cursor: 'pointer',
              padding: 0,
              transform: color === c ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.15s',
            }}
          />
        ))}
      </div>

      <Divider />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '4px 0',
        }}
      >
        {THICKNESSES.map((t) => (
          <button
            key={t}
            onClick={(e) => {
              createRipple(e);
              onThicknessChange(t);
            }}
            className="toolbar-btn"
            style={{
              height: 20,
              borderRadius: 6,
              background: thickness === t ? '#f0f4f8' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <div
              style={{
                width: Math.min(t * 1.5, 20),
                height: Math.min(t * 1.5, 20),
                borderRadius: '50%',
                background: thickness === t ? '#2d6a4f' : '#8898aa',
                transition: 'background 0.15s',
              }}
            />
          </button>
        ))}
      </div>

      <Divider />

      <ToolButton
        icon={<TrashIcon />}
        label="清空画布"
        onClick={(e) => {
          createRipple(e);
          onClearCanvas();
        }}
        danger
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        style={{ display: 'none' }}
      />
    </div>
  );
};

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, active, danger, onClick }) => (
  <button
    onClick={onClick}
    className={`toolbar-btn ${active ? 'active' : ''}`}
    title={label}
    style={{
      width: 40,
      height: 40,
      borderRadius: 10,
      background: active ? '#2d6a4f' : danger ? 'transparent' : 'transparent',
      color: active ? 'white' : danger ? '#e63946' : '#4a5568',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {icon}
  </button>
);

const Divider: React.FC = () => (
  <div
    style={{
      height: 1,
      background: '#e2e8f0',
      margin: '4px 0',
    }}
  />
);

const PenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

const RectIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

const CircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const LineIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="20" x2="20" y2="4" />
  </svg>
);

const EraserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h18v18H3z" fill="none" stroke="none" />
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

const StickyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z" />
    <polyline points="15 3 15 9 21 9" />
  </svg>
);

const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export default Toolbar;
