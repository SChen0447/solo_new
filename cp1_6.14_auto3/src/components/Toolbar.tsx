import { useEffect, useState } from 'react';
import { useCanvasStore, ToolType } from '../store/canvasStore';

const tools: { type: ToolType; icon: string; label: string }[] = [
  { type: 'pen', icon: '✏️', label: '画笔' },
  { type: 'rect', icon: '⬜', label: '矩形' },
  { type: 'ellipse', icon: '⭕', label: '椭圆' },
  { type: 'text', icon: '📝', label: '文本' },
];

const quickColors = [
  '#ffffff', '#ff006e', '#8338ec', '#3a86ff',
  '#fb5607', '#06d6a0', '#ffbe0b', '#000000',
];

export default function Toolbar() {
  const {
    currentTool,
    currentColor,
    currentLineWidth,
    currentFontSize,
    setTool,
    setColor,
    setLineWidth,
    setFontSize,
    undo,
    redo,
    canUndo,
    canRedo,
    clearCanvas,
    currentUserColor,
    currentUserName,
    users,
  } = useCanvasStore();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if ((e.key === 'z' && e.shiftKey) || (e.key === 'y' && !e.shiftKey)) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const toolbarStyle = isMobile
    ? {
        position: 'fixed' as const,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row' as const,
        padding: '12px 16px',
        gap: '8px',
        flexWrap: 'wrap' as const,
        justifyContent: 'center',
      }
    : {
        position: 'fixed' as const,
        left: 0,
        top: 0,
        bottom: 0,
        flexDirection: 'column' as const,
        padding: '16px 12px',
        gap: '12px',
      };

  const buttonGroupStyle = isMobile
    ? { flexDirection: 'row' as const, gap: '8px' }
    : { flexDirection: 'column' as const, gap: '8px' };

  const canUndoVal = canUndo();
  const canRedoVal = canRedo();

  return (
    <div
      style={{
        display: 'flex',
        backgroundColor: '#1e1e24',
        borderRight: isMobile ? 'none' : '1px solid #2b2b3a',
        borderTop: isMobile ? '1px solid #2b2b3a' : 'none',
        zIndex: 1000,
        ...toolbarStyle,
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .tool-btn:hover {
          box-shadow: 0 0 8px #3a86ff;
        }
        .tool-btn.active {
          background-color: #3a86ff;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .control-btn:hover:not(:disabled) {
          box-shadow: 0 0 8px #3a86ff;
        }
        .control-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3a86ff;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3a86ff;
          cursor: pointer;
          border: none;
        }
      `}</style>

      <div style={{ display: 'flex', ...buttonGroupStyle }}>
        <button
          className="control-btn"
          onClick={undo}
          disabled={!canUndoVal}
          style={{
            width: isMobile ? '40px' : '48px',
            height: isMobile ? '40px' : '48px',
            borderRadius: '8px',
            backgroundColor: canUndoVal ? '#2b2b3a' : '#1e1e24',
            color: '#ffffff',
            border: 'none',
            cursor: canUndoVal ? 'pointer' : 'not-allowed',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          title="撤销 (Ctrl+Z)"
        >
          ↩️
        </button>
        <button
          className="control-btn"
          onClick={redo}
          disabled={!canRedoVal}
          style={{
            width: isMobile ? '40px' : '48px',
            height: isMobile ? '40px' : '48px',
            borderRadius: '8px',
            backgroundColor: canRedoVal ? '#2b2b3a' : '#1e1e24',
            color: '#ffffff',
            border: 'none',
            cursor: canRedoVal ? 'pointer' : 'not-allowed',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          title="重做 (Ctrl+Shift+Z)"
        >
          ↪️
        </button>
      </div>

      {!isMobile && <div style={{ height: '1px', backgroundColor: '#2b2b3a' }} />}

      <div style={{ display: 'flex', ...buttonGroupStyle }}>
        {tools.map((tool) => (
          <button
            key={tool.type}
            className={`tool-btn ${currentTool === tool.type ? 'active' : ''}`}
            onClick={() => setTool(tool.type)}
            style={{
              width: isMobile ? '48px' : '48px',
              height: isMobile ? '48px' : '48px',
              borderRadius: '8px',
              backgroundColor: currentTool === tool.type ? '#3a86ff' : '#2b2b3a',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              gap: '2px',
            }}
            title={tool.label}
          >
            <span>{tool.icon}</span>
            {isMobile && (
              <span style={{ fontSize: '10px' }}>{tool.label}</span>
            )}
          </button>
        ))}
      </div>

      {!isMobile && <div style={{ height: '1px', backgroundColor: '#2b2b3a' }} />}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '8px',
          backgroundColor: '#252530',
          borderRadius: '8px',
          minWidth: isMobile ? 'auto' : '120px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: '#888', fontSize: '12px' }}>颜色</span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px',
            }}
          >
            {quickColors.map((color) => (
              <button
                key={color}
                onClick={() => setColor(color)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: color,
                  border: currentColor === color ? '2px solid #3a86ff' : '1px solid #444',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setColor(e.target.value)}
            style={{
              width: '100%',
              height: '24px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              backgroundColor: 'transparent',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: '#888', fontSize: '12px' }}>
            粗细: {currentLineWidth}px
          </span>
          <input
            type="range"
            min="1"
            max="20"
            value={currentLineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#2b2b3a',
              borderRadius: '2px',
              outline: 'none',
              WebkitAppearance: 'none',
            }}
          />
        </div>

        {currentTool === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: '#888', fontSize: '12px' }}>
              字号: {currentFontSize}px
            </span>
            <input
              type="range"
              min="12"
              max="72"
              value={currentFontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#2b2b3a',
                borderRadius: '2px',
                outline: 'none',
                WebkitAppearance: 'none',
              }}
            />
          </div>
        )}
      </div>

      {!isMobile && <div style={{ height: '1px', backgroundColor: '#2b2b3a' }} />}

      <button
        className="control-btn"
        onClick={() => {
          if (window.confirm('确定要清空画布吗？此操作不可撤销。')) {
            clearCanvas();
          }
        }}
        style={{
          width: isMobile ? '40px' : '48px',
          height: isMobile ? '40px' : '48px',
          borderRadius: '8px',
          backgroundColor: '#2b2b3a',
          color: '#ff006e',
          border: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        title="清空画布"
      >
        🗑️
      </button>

      {!isMobile && users.size > 0 && (
        <>
          <div style={{ height: '1px', backgroundColor: '#2b2b3a' }} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '8px',
              backgroundColor: '#252530',
              borderRadius: '8px',
            }}
          >
            <span style={{ color: '#888', fontSize: '12px' }}>
              在线用户 ({users.size + 1})
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: currentUserColor,
                }}
              />
              <span style={{ color: '#fff', fontSize: '12px' }}>
                {currentUserName} (你)
              </span>
            </div>
            {Array.from(users.values()).map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: user.color,
                  }}
                />
                <span style={{ color: '#fff', fontSize: '12px' }}>
                  {user.name}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
