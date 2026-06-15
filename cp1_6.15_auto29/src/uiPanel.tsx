import { useState, useEffect } from 'react'
import {
  useStore, MaterialType, ColorScheme, ViewPreset, MATERIALS, COLOR_SCHEMES
} from './store'

const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.1
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  } catch (e) {}
}

const VIEW_LABELS: { key: ViewPreset; label: string }[] = [
  { key: 'front', label: '正面' },
  { key: 'back', label: '背面' },
  { key: 'left', label: '左侧' },
  { key: 'right', label: '右侧' },
  { key: 'top', label: '俯视' },
]

export default function UIPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const material = useStore((s) => s.material)
  const colorScheme = useStore((s) => s.colorScheme)
  const viewPreset = useStore((s) => s.viewPreset)
  const setMaterial = useStore((s) => s.setMaterial)
  const setColorScheme = useStore((s) => s.setColorScheme)
  const setViewPreset = useStore((s) => s.setViewPreset)
  const setTriggerPosterGeneration = useStore((s) => s.setTriggerPosterGeneration)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isMobile) setIsOpen(false)
  }, [isMobile])

  const handleChangeMaterial = (m: MaterialType) => {
    playBeep()
    setMaterial(m)
  }

  const handleChangeColor = (c: ColorScheme) => {
    playBeep()
    setColorScheme(c)
  }

  const handleChangeView = (v: ViewPreset) => {
    playBeep()
    setViewPreset(v)
  }

  const handleGeneratePoster = () => {
    playBeep()
    setTriggerPosterGeneration(true)
    setTimeout(() => setTriggerPosterGeneration(false), 500)
  }

  const panelContent = (
    <div
      style={{
        width: isMobile ? '280px' : '100%',
        height: '100%',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2
          style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}
        >
          Nova Pro X1
        </h2>
        {isMobile && (
          <button
            onClick={() => setIsOpen(false)}
            style={buttonStyle}
          >
            ✕
          </button>
        )}
      </div>

      <div>
        <h3 style={sectionTitleStyle}>预设视角</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {VIEW_LABELS.map((v) => {
            const isSelected = viewPreset === v.key
            return (
              <button
                key={v.key}
                onClick={() => handleChangeView(v.key)}
                style={getViewBtnStyle(isSelected)}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                {v.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 style={sectionTitleStyle}>材质选择</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {(Object.keys(MATERIALS) as MaterialType[]).map((key) => {
            const mat = MATERIALS[key]
            const isSelected = material === key
            return (
              <div
                key={key}
                onClick={() => handleChangeMaterial(key)}
                style={optionWrapperStyle}
              >
                <div
                  style={getMaterialThumbStyle(key, isSelected)}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(1.08)' }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                />
                <span style={optionLabelStyle}>{mat.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 style={sectionTitleStyle}>配色选择</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((key) => {
            const c = COLOR_SCHEMES[key]
            const isSelected = colorScheme === key
            return (
              <div
                key={key}
                onClick={() => handleChangeColor(key)}
                style={optionWrapperStyle}
              >
                <div
                  style={getColorThumbStyle(c.hex, isSelected)}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(1.08)' }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                />
                <span style={optionLabelStyle}>{c.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={handleGeneratePoster}
          style={posterBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          🎨 生成海报
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
        <p>手势提示：握拳→张开手掌进入控制</p>
        <p>五指张开2秒退出控制</p>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 98
            }}
          />
        )}
        <div
          style={{
            position: 'fixed',
            right: isOpen ? '0' : '-300px',
            top: 0,
            height: '100%',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'right 0.3s ease',
            zIndex: 99,
            borderRadius: isOpen ? '8px 0 0 8px' : 0,
          }}
        >
          {panelContent}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'fixed',
            right: '16px',
            bottom: '16px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#00ccff',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,204,255,0.4)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          ⚙️
        </button>
      </>
    )
  }

  return (
    <div
      style={{
        width: '25%',
        height: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
    >
      {panelContent}
    </div>
  )
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: '#555',
  marginBottom: '12px',
  letterSpacing: '0.5px',
}

const getViewBtnStyle = (selected: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: '6px',
  border: selected ? '2px solid #00ccff' : '1px solid #ddd',
  backgroundColor: selected ? 'rgba(0,204,255,0.1)' : '#f5f5f5',
  color: selected ? '#00ccff' : '#555',
  fontSize: '12px',
  fontWeight: selected ? 600 : 400,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  outline: 'none',
  boxShadow: selected ? '0 0 3px rgba(0,204,255,0.4)' : 'none',
})

const optionWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  cursor: 'pointer',
}

const optionLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#666',
}

const getMaterialThumbStyle = (mat: MaterialType, selected: boolean): React.CSSProperties => {
  const base: React.CSSProperties = {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: selected ? '2px solid #00ccff' : '1px solid #ddd',
    boxShadow: selected ? '0 0 8px rgba(0,204,255,0.4)' : 'none',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  }
  switch (mat) {
    case 'matte-metal':
      return {
        ...base,
        background: 'linear-gradient(135deg, #888 0%, #555 50%, #666 100%)',
      }
    case 'glossy-plastic':
      return {
        ...base,
        background: 'linear-gradient(135deg, #e0e0e0 0%, #a0a0a0 50%, #c0c0c0 100%)',
      }
    case 'carbon-fiber':
      return {
        ...base,
        backgroundImage: 'repeating-linear-gradient(45deg, #222 0px, #222 2px, #444 2px, #444 4px)',
      }
    case 'leather':
      return {
        ...base,
        background: 'linear-gradient(135deg, #5c3a21 0%, #3e2714 100%)',
      }
    default:
      return base
  }
}

const getColorThumbStyle = (color: string, selected: boolean): React.CSSProperties => ({
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: color,
  border: selected ? '2px solid #00ccff' : '1px solid #ddd',
  boxShadow: selected ? '0 0 8px rgba(0,204,255,0.4)' : 'none',
  transition: 'all 0.2s ease',
  cursor: 'pointer',
})

const posterBtnStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  backgroundColor: '#00ccff',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: '0 2px 8px rgba(0,204,255,0.3)',
  outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '18px',
  cursor: 'pointer',
  color: '#666',
  padding: '4px 8px',
  borderRadius: '4px',
}
