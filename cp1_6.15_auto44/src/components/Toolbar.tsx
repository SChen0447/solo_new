import React from 'react';
import { useStore } from '../store';

interface ToolbarProps {
  onUpload: () => void;
  onAutoLayout: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
}

const btnBase: React.CSSProperties = {
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  color: '#aaa',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontSize: 20,
};

const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const LayoutIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const UndoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const RedoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
  </svg>
);

const ExportIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const DividerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

const Toolbar: React.FC<ToolbarProps> = ({
  onUpload,
  onAutoLayout,
  onUndo,
  onRedo,
  onExport,
}) => {
  const images = useStore((s) => s.images);
  const history = useStore((s) => s.history);
  const historyIndex = useStore((s) => s.historyIndex);

  const [hovered, setHovered] = React.useState<string | null>(null);

  const handleMouseEnter = (id: string) => setHovered(id);
  const handleMouseLeave = () => setHovered(null);

  const getBtnStyle = (id: string): React.CSSProperties => ({
    ...btnBase,
    color: hovered === id ? '#646cff' : '#aaa',
    transform: hovered === id ? 'scale(1.1)' : 'scale(1)',
    background: hovered === id ? 'rgba(100,108,255,0.1)' : 'transparent',
  });

  return (
    <div
      style={{
        width: 64,
        height: '100%',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 16,
        gap: 8,
        borderRight: '1px solid #2d2d44',
        flexShrink: 0,
      }}
    >
      <button
        style={getBtnStyle('upload')}
        onClick={onUpload}
        onMouseEnter={() => handleMouseEnter('upload')}
        onMouseLeave={handleMouseLeave}
        title="上传分镜"
      >
        <UploadIcon />
      </button>

      <button
        style={getBtnStyle('layout')}
        onClick={onAutoLayout}
        onMouseEnter={() => handleMouseEnter('layout')}
        onMouseLeave={handleMouseLeave}
        title="智能排版"
        disabled={images.length === 0}
      >
        <LayoutIcon />
      </button>

      <div
        style={{
          width: 28,
          height: 1,
          background: '#333',
          margin: '4px 0',
        }}
      />

      <button
        style={{
          ...getBtnStyle('undo'),
          opacity: historyIndex < 0 ? 0.3 : 1,
          cursor: historyIndex < 0 ? 'not-allowed' : 'pointer',
        }}
        onClick={onUndo}
        onMouseEnter={() => handleMouseEnter('undo')}
        onMouseLeave={handleMouseLeave}
        title="撤销"
      >
        <UndoIcon />
      </button>

      <button
        style={{
          ...getBtnStyle('redo'),
          opacity: historyIndex >= history.length - 1 ? 0.3 : 1,
          cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
        }}
        onClick={onRedo}
        onMouseEnter={() => handleMouseEnter('redo')}
        onMouseLeave={handleMouseLeave}
        title="重做"
      >
        <RedoIcon />
      </button>

      <div
        style={{
          width: 28,
          height: 1,
          background: '#333',
          margin: '4px 0',
        }}
      />

      <button
        style={getBtnStyle('export')}
        onClick={onExport}
        onMouseEnter={() => handleMouseEnter('export')}
        onMouseLeave={handleMouseLeave}
        title="导出PDF"
      >
        <ExportIcon />
      </button>

      <div style={{ flex: 1 }} />

      <button
        style={{
          ...getBtnStyle('more'),
          marginBottom: 16,
        }}
        onMouseEnter={() => handleMouseEnter('more')}
        onMouseLeave={handleMouseLeave}
        title="更多"
      >
        <DividerIcon />
      </button>
    </div>
  );
};

export default Toolbar;
