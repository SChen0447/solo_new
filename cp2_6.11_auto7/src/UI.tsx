import React, { useRef } from 'react'
import type { RibbonData } from './Scene'

export interface SavedFabric {
  id: string
  name: string
  ribbons: RibbonData[]
  windStrength: number
  thumbnail: string
  createdAt: number
}

interface UIProps {
  windStrength: number
  onWindChange: (v: number) => void
  savedFabrics: SavedFabric[]
  onSaveFabric: () => void
  onLoadFabric: (fabric: SavedFabric) => void
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(10px)',
  borderRadius: 12,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#e0e0e0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  userSelect: 'none'
}

const buttonBase: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#e0e0e0',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: 8,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 13,
  transition: 'all 0.2s ease',
  fontFamily: 'inherit'
}

const ControlPanel: React.FC<UIProps> = ({ windStrength, onWindChange, onSaveFabric }) => {
  return (
    <div
      style={{
        ...panelStyle,
        right: 24,
        bottom: 24,
        padding: '20px 22px',
        minWidth: 220
      }}
    >
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.6, marginBottom: 4 }}>
        Wind Weaver
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#fff' }}>
        风痕织机
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.85 }}>风力强度</span>
          <span style={{ fontSize: 13, color: '#ffd93d', fontWeight: 600 }}>{windStrength.toFixed(1)}</span>
        </div>
        <div style={{ position: 'relative', height: 4, display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: 4,
              background: '#2a2a2a',
              borderRadius: 2
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: `${(windStrength / 10) * 100}%`,
              height: 4,
              background: 'linear-gradient(90deg, #6c63ff, #ffd93d)',
              borderRadius: 2
            }}
          />
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={windStrength}
            onChange={e => onWindChange(parseFloat(e.target.value))}
            style={{
              position: 'absolute',
              width: '100%',
              height: 20,
              opacity: 0,
              cursor: 'pointer',
              zIndex: 2
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(${(windStrength / 10) * 100}% - 4px)`,
              width: 8,
              height: 8,
              background: '#ffd93d',
              borderRadius: '50%',
              boxShadow: '0 0 8px rgba(255, 217, 61, 0.6)',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>

      <button
        onClick={onSaveFabric}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        onMouseDown={e => {
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseUp={e => {
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        style={buttonBase}
      >
        ✦ 保存当前织物
      </button>

      <div style={{ marginTop: 16, fontSize: 11, opacity: 0.4, lineHeight: 1.6 }}>
        双击空白创建光带<br />
        左键拖拽控制点变形<br />
        右键旋转 / 滚轮缩放
      </div>
    </div>
  )
}

interface SidebarProps {
  savedFabrics: SavedFabric[]
  onLoadFabric: (fabric: SavedFabric) => void
}

const Sidebar: React.FC<SidebarProps> = ({ savedFabrics, onLoadFabric }) => {
  return (
    <div
      style={{
        ...panelStyle,
        left: 24,
        top: 24,
        bottom: 24,
        width: 170,
        padding: 16,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.6, marginBottom: 4 }}>
        Gallery
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: '#fff' }}>
        织物收藏
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingRight: 4
        }}
      >
        {savedFabrics.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.4, textAlign: 'center', padding: '40px 8px', lineHeight: 1.6 }}>
            暂无保存的织物<br />
            点击右下角按钮保存
          </div>
        )}
        {savedFabrics.map(fabric => (
          <FabricCard key={fabric.id} fabric={fabric} onClick={() => onLoadFabric(fabric)} />
        ))}
      </div>
    </div>
  )
}

interface CardProps {
  fabric: SavedFabric
  onClick: () => void
}

const FabricCard: React.FC<CardProps> = ({ fabric, onClick }) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 120,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        backgroundImage: fabric.thumbnail ? `url(${fabric.thumbnail})` : 'linear-gradient(135deg, #1a1a2e, #16213e)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transform: hovered ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: hovered ? '0 8px 24px rgba(108, 99, 255, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '6px 8px',
          background: 'linear-gradient(transparent, rgba(11, 16, 36, 0.9))',
          fontSize: 10,
          opacity: hovered ? 1 : 0.7,
          transition: 'opacity 0.2s ease',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 70 }}>
          {fabric.name}
        </span>
        <span style={{ opacity: 0.6, fontSize: 9 }}>
          {fabric.ribbons.length}带
        </span>
      </div>
    </div>
  )
}

const UI: React.FC<UIProps> = (props) => {
  return (
    <>
      <Sidebar savedFabrics={props.savedFabrics} onLoadFabric={props.onLoadFabric} />
      <ControlPanel {...props} />
    </>
  )
}

export default UI
