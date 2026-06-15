import React from 'react'
import { WeatherType, useParticleStore } from './useParticleStore'
import { WEATHER_THEME_COLORS } from './ParticleSystem'

const weatherLabels: Record<WeatherType, string> = {
  rain: '雨',
  snow: '雪',
  fog: '雾',
  thunderstorm: '雷暴'
}

const UIPanel: React.FC = () => {
  const weatherType = useParticleStore((s) => s.weatherType)
  const particleCount = useParticleStore((s) => s.particleCount)
  const setWeatherType = useParticleStore((s) => s.setWeatherType)
  const setParticleCount = useParticleStore((s) => s.setParticleCount)

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 100
  }

  const weatherPanelStyle: React.CSSProperties = {
    position: 'absolute',
    left: '1.5rem',
    bottom: '1.5rem',
    display: 'flex',
    gap: '12px',
    padding: '0.5rem',
    borderRadius: '0.3rem',
    pointerEvents: 'auto'
  }

  const buttonBaseStyle: React.CSSProperties = {
    width: '120px',
    height: '44px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(30,30,30,0.7)',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    outline: 'none',
    fontFamily: 'inherit'
  }

  const getButtonStyle = (type: WeatherType): React.CSSProperties => {
    const isSelected = weatherType === type
    return {
      ...buttonBaseStyle,
      borderColor: isSelected ? WEATHER_THEME_COLORS[type] : 'rgba(255,255,255,0.2)',
      background: isSelected ? 'rgba(30,30,30,0.9)' : 'rgba(30,30,30,0.7)',
      boxShadow: isSelected ? `0 0 15px ${WEATHER_THEME_COLORS[type]}40` : 'none'
    }
  }

  const sliderPanelStyle: React.CSSProperties = {
    position: 'absolute',
    right: '1.5rem',
    bottom: '1.5rem',
    padding: '0.5rem',
    borderRadius: '0.3rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    pointerEvents: 'auto'
  }

  const labelStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: '13px',
    opacity: 0.85
  }

  const sliderContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  }

  const trackStyle: React.CSSProperties = {
    width: '200px',
    height: '6px',
    background: '#555',
    borderRadius: '3px',
    position: 'relative',
    cursor: 'pointer'
  }

  const fillStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    background: 'linear-gradient(90deg, #4fc3f7, #ff8a65)',
    borderRadius: '3px'
  }

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    width: '18px',
    height: '18px',
    background: '#ffffff',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
    transition: 'transform 0.1s ease'
  }

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const track = e.currentTarget as HTMLDivElement
    const rect = track.getBoundingClientRect()

    const updateValue = (clientX: number) => {
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
      const ratio = x / rect.width
      const value = Math.round(500 + ratio * 2500)
      setParticleCount(value)
    }

    updateValue(e.clientX)

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateValue(moveEvent.clientX)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const ratio = (particleCount - 500) / 2500

  return (
    <div style={containerStyle}>
      <div style={weatherPanelStyle}>
        {(['rain', 'snow', 'fog', 'thunderstorm'] as WeatherType[]).map((type) => (
          <button
            key={type}
            style={getButtonStyle(type)}
            onClick={() => setWeatherType(type)}
          >
            {weatherLabels[type]}
          </button>
        ))}
      </div>

      <div style={sliderPanelStyle}>
        <div style={labelStyle}>粒子数量: {particleCount}</div>
        <div style={sliderContainerStyle}>
          <div
            style={trackStyle}
            onMouseDown={handleSliderMouseDown}
          >
            <div style={{ ...fillStyle, width: `${ratio * 100}%` }} />
            <div style={{ ...thumbStyle, left: `${ratio * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default UIPanel
