import React from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import type { ToolType } from '../store/useCanvasStore';

interface ToolButtonProps {
  tool: ToolType;
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool, active, onClick, label, children }) => {
  return (
    <button
      onClick={onClick}
      title={`${label}${tool === 'brush' ? ' (B)' : ''}${tool === 'rectangle' ? ' (R)' : ''}${tool === 'circle' ? ' (C)' : ''}${tool === 'note' ? ' (N)' : ''}${tool === 'eraser' ? ' (E)' : ''}`}
      style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        border: 'none',
        background: active ? '#4fc3f7' : 'transparent',
        color: active ? '#fff' : '#555',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.18s ease',
        fontSize: 18,
        transform: active ? 'scale(1.08)' : 'scale(1)',
        boxShadow: active ? '0 4px 10px rgba(79,195,247,0.4)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(79,195,247,0.1)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }
      }}
    >
      {children}
    </button>
  );
};

const BrushIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.83 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.83L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/>
    <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/>
    <path d="M14.5 17.5 4.5 15"/>
  </svg>
);

const RectangleIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
  </svg>
);

const CircleIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
  </svg>
);

const NoteIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/>
    <path d="M15 3v4a2 2 0 0 0 2 2h4"/>
    <path d="M8 13h6"/>
    <path d="M8 17h4"/>
  </svg>
);

const EraserIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
    <path d="M22 21H7"/>
    <path d="m5 11 9 9"/>
  </svg>
);

const UndoIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"/>
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
  </svg>
);

const RedoIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6"/>
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
  </svg>
);

const PRESET_COLORS = [
  '#4fc3f7',
  '#ef5350',
  '#66bb6a',
  '#ffa726',
  '#ab47bc',
  '#26c6da',
  '#333333',
  '#ffffff',
];

export const Toolbar: React.FC = () => {
  const currentTool = useCanvasStore((s) => s.currentTool);
  const brushSize = useCanvasStore((s) => s.brushSize);
  const userColor = useCanvasStore((s) => s.userColor);
  const setTool = useCanvasStore((s) => s.setTool);
  const setBrushSize = useCanvasStore((s) => s.setBrushSize);
  const setBrushColor = useCanvasStore((s) => s.setBrushColor);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const userName = useCanvasStore((s) => s.userName);

  const showBrushOptions = currentTool === 'brush' || currentTool === 'rectangle' || currentTool === 'circle';

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 60,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        borderRight: '1px solid #eee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        zIndex: 100,
        gap: 6,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #4fc3f7, #29b6f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 6,
          boxShadow: '0 4px 10px rgba(79,195,247,0.35)',
        }}
        title="TeamDraw"
      >
        TD
      </div>

      <div style={{ height: 1, width: 36, background: '#eee', margin: '4px 0 6px' }} />

      <ToolButton tool="brush" active={currentTool === 'brush'} onClick={() => setTool('brush')} label="画笔">
        <BrushIcon />
      </ToolButton>

      <ToolButton tool="rectangle" active={currentTool === 'rectangle'} onClick={() => setTool('rectangle')} label="矩形">
        <RectangleIcon />
      </ToolButton>

      <ToolButton tool="circle" active={currentTool === 'circle'} onClick={() => setTool('circle')} label="圆形">
        <CircleIcon />
      </ToolButton>

      <ToolButton tool="note" active={currentTool === 'note'} onClick={() => setTool('note')} label="便签">
        <NoteIcon />
      </ToolButton>

      <ToolButton tool="eraser" active={currentTool === 'eraser'} onClick={() => setTool('eraser')} label="橡皮擦">
        <EraserIcon />
      </ToolButton>

      <div style={{ height: 1, width: 36, background: '#eee', margin: '6px 0' }} />

      <ToolButton tool="brush" active={false} onClick={undo} label="撤销 (Ctrl+Z)">
        <UndoIcon />
      </ToolButton>

      <ToolButton tool="brush" active={false} onClick={redo} label="重做 (Ctrl+Y)">
        <RedoIcon />
      </ToolButton>

      {showBrushOptions && (
        <>
          <div style={{ height: 1, width: 36, background: '#eee', margin: '6px 0' }} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '8px 0',
            }}
          >
            <span style={{ fontSize: 10, color: '#888', fontWeight: 500 }}>粗细</span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                alignItems: 'center',
              }}
            >
              {[1, 2, 3, 4, 5].map((size) => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  title={`${size}px`}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: brushSize === size ? '2px solid #4fc3f7' : '1px solid transparent',
                    background: brushSize === size ? 'rgba(79,195,247,0.1)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: size * 2 + 2,
                      height: size * 2 + 2,
                      borderRadius: '50%',
                      background: userColor,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, width: 36, background: '#eee', margin: '6px 0' }} />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '4px 0 8px',
            }}
          >
            <span style={{ fontSize: 10, color: '#888', fontWeight: 500 }}>颜色</span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 4,
              }}
            >
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setBrushColor(c)}
                  title={c}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    border: userColor === c ? '2px solid #4fc3f7' : `1px solid ${c === '#ffffff' ? '#ddd' : c}`,
                    background: c,
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.15s ease',
                    boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #eee' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {userName && (
        <div style={{ marginTop: 'auto', padding: '8px 6px', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 8px',
              background: 'rgba(0,0,0,0.03)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
            title={userName}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                flexShrink: 0,
                background: userColor,
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: '#555',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {userName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
