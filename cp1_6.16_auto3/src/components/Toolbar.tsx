import React from 'react'
import {
  MousePointer2,
  Circle,
  Square,
  Pencil,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Camera,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react'
import type { ToolType } from '../modules/types'
import { useWhiteboardStore } from '../modules/store/whiteboardStore'

interface ToolItem {
  id: ToolType
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
}

const TOOLS: ToolItem[] = [
  { id: 'select', label: '选择 (V)', icon: MousePointer2 },
  { id: 'rectangle', label: '矩形 (R)', icon: Square },
  { id: 'circle', label: '圆形 (O)', icon: Circle },
  { id: 'line', label: '自由线条 (P)', icon: Pencil },
  { id: 'text', label: '文字 (T)', icon: Type },
  { id: 'eraser', label: '橡皮擦 (E)', icon: Eraser }
]

const COLOR_PALETTE = [
  '#FF6B6B', '#FF8C42', '#FFD93D', '#6BCB77',
  '#4D96FF', '#6C5CE7', '#FF6EC7', '#0F172A'
]

interface Props {
  onResetZoom: () => void
}

const Toolbar: React.FC<Props> = ({ onResetZoom }) => {
  const {
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    undo, redo, canUndo, canRedo,
    takeSnapshot,
    zoomAt,
    setZoom,
    zoom
  } = useWhiteboardStore()

  return (
    <aside
      style={toolbarStyle}
      className="toolbar-container"
    >
      <div style={logoStyle}>
        <div style={logoDot} />
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, color: '#F8FAFC' }}>
          协作白板
        </div>
      </div>

      <div style={divider} />

      <div style={toolsGroup}>
        {TOOLS.map((tool, idx) => {
          const Icon = tool.icon
          const active = activeTool === tool.id
          return (
            <button
              key={tool.id}
              title={tool.label}
              onClick={() => setActiveTool(tool.id)}
              style={{
                ...toolBtnStyle,
                background: active ? 'rgba(255, 107, 107, 0.12)' : 'transparent',
                color: active ? '#FF6B6B' : '#CBD5E1'
              }}
              className="tool-btn"
              data-active={active}
              data-order={idx}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: active ? 'translateX(-50%) scaleX(1)' : 'translateX(-50%) scaleX(0)',
                  width: 24,
                  height: 3,
                  background: '#FF6B6B',
                  borderRadius: '3px 3px 0 0',
                  transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                  transformOrigin: 'center'
                }}
              />
            </button>
          )
        })}
      </div>

      <div style={divider} />

      <div style={sectionLabel}>颜色</div>
      <div style={colorPalette}>
        {COLOR_PALETTE.map((c) => {
          const active = strokeColor === c
          return (
            <button
              key={c}
              onClick={() => setStrokeColor(c)}
              title={c}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: c,
                border: active ? '2px solid #fff' : '2px solid transparent',
                boxShadow: active
                  ? `0 0 0 2px ${c}, 0 4px 12px rgba(0,0,0,0.3)`
                  : '0 1px 2px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                transform: active ? 'scale(1.1)' : 'scale(1)',
                padding: 0
              }}
            />
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 10px' }}>
        <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', justifyContent: 'space-between' }}>
          <span>线宽</span>
          <span style={{ color: '#F8FAFC', fontWeight: 500 }}>{strokeWidth}px</span>
        </div>
        <input
          type="range"
          min={1}
          max={12}
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#FF6B6B' }}
        />
      </div>

      <div style={divider} />

      <div style={sectionLabel}>历史</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '0 10px' }}>
        <button
          onClick={undo}
          disabled={!canUndo()}
          title="撤销 (Ctrl+Z)"
          style={{
            ...iconBtnStyle,
            opacity: canUndo() ? 1 : 0.35
          }}
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          title="重做 (Ctrl+Y)"
          style={{
            ...iconBtnStyle,
            opacity: canRedo() ? 1 : 0.35
          }}
        >
          <Redo2 size={18} />
        </button>
      </div>

      <button
        onClick={() => takeSnapshot()}
        title="创建版本快照"
        style={{
          ...iconBtnStyle,
          margin: '8px 10px 0',
          color: '#FF6B6B',
          background: 'rgba(255, 107, 107, 0.1)',
          gap: 6,
          fontSize: 12
        }}
      >
        <Camera size={16} />
        <span>保存快照</span>
      </button>

      <div style={divider} />

      <div style={sectionLabel}>视图</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '0 10px' }}>
        <button
          onClick={() => zoomAt(1.2, window.innerWidth / 2, window.innerHeight / 2)}
          title="放大"
          style={iconBtnStyle}
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => zoomAt(0.8, window.innerWidth / 2, window.innerHeight / 2)}
          title="缩小"
          style={iconBtnStyle}
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={onResetZoom}
          title="重置视图"
          style={iconBtnStyle}
        >
          <Maximize2 size={18} />
        </button>
      </div>

      <div style={{ padding: '4px 12px 12px', fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>
        {Math.round(zoom * 100)}%
      </div>

      <style>{`
        .tool-btn:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          color: #F8FAFC !important;
        }
        .tool-btn[data-active="true"]:hover {
          background: rgba(255, 107, 107, 0.18) !important;
          color: #FF6B6B !important;
        }
        .toolbar-container {
          backdrop-filter: blur(12px);
          background: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
        }
        @media (max-width: 1024px) {
          .toolbar-container {
            width: 100% !important;
            height: 64px !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: auto !important;
            border-radius: 0 !important;
            flex-direction: row !important;
            padding: 8px 12px !important;
            overflow-x: auto !important;
          }
          .toolbar-container > * { flex-shrink: 0; }
          .toolbar-container .tools-group {
            flex-direction: row !important;
          }
          .toolbar-container .color-palette { flex-direction: row !important; }
          .toolbar-container .divider-v {
            width: 1px !important;
            height: 32px !important;
            margin: 0 10px !important;
          }
        }
      `}</style>
    </aside>
  )
}

const toolbarStyle: React.CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  bottom: 16,
  width: 76,
  borderRadius: 16,
  boxShadow: '0 10px 40px rgba(2, 6, 23, 0.5), 0 0 0 1px rgba(255,255,255,0.06) inset',
  display: 'flex',
  flexDirection: 'column',
  padding: '12px 8px',
  gap: 4,
  zIndex: 10,
  userSelect: 'none'
}

const logoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 4px 12px'
}

const logoDot: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
  boxShadow: '0 4px 12px rgba(255, 107, 107, 0.5)'
}

const divider: React.CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.08)',
  margin: '8px 10px'
}

const toolsGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '0 4px',
  className: 'tools-group'
} as any

const toolBtnStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s, color 0.15s',
  padding: 0
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: '#64748B',
  padding: '4px 14px 6px',
  textTransform: 'uppercase',
  letterSpacing: 1
}

const colorPalette: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: '0 10px 8px',
  className: 'color-palette'
} as any

const iconBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 36,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: '#CBD5E1',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s, transform 0.1s',
  padding: 0
}

export default Toolbar
