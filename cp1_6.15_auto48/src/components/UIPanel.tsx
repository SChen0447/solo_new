import { useEffect, useState } from 'react'
import { useEEGStore, BAND_COLORS, BAND_LABELS, BandType, ViewMode } from '../store/useStore'

const bandOrder: BandType[] = ['alpha', 'beta', 'theta', 'delta']

export function UIPanel() {
  const bandData = useEEGStore((state) => state.bandData)
  const speedMultiplier = useEEGStore((state) => state.speedMultiplier)
  const viewMode = useEEGStore((state) => state.viewMode)
  const fps = useEEGStore((state) => state.fps)
  const cubeCount = useEEGStore((state) => state.cubeCount)
  const setSpeedMultiplier = useEEGStore((state) => state.setSpeedMultiplier)
  const setViewMode = useEEGStore((state) => state.setViewMode)

  const [localSpeed, setLocalSpeed] = useState(speedMultiplier)

  useEffect(() => {
    setLocalSpeed(speedMultiplier)
  }, [speedMultiplier])

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setLocalSpeed(value)
    setSpeedMultiplier(value)
  }

  const viewOptions: { mode: ViewMode; label: string }[] = [
    { mode: 'front', label: '正面全景' },
    { mode: 'top', label: '俯视鸟瞰' },
    { mode: 'orbit', label: '旋转漫游' }
  ]

  const fpsColor = fps < 50 ? '#ff4444' : '#4ade80'

  return (
    <div style={styles.panel}>
      <div style={styles.title}>
        <h2 style={styles.titleText}>EEG 脑波雕塑</h2>
        <p style={styles.subtitle}>实时数据可视化</p>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>频段能量</h3>
        <div style={styles.barContainer}>
          {bandOrder.map((band) => (
            <div key={band} style={styles.barWrapper}>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    height: `${bandData[band] * 100}%`,
                    background: `linear-gradient(to top, ${BAND_COLORS[band]}dd, ${BAND_COLORS[band]}88)`,
                    boxShadow: `0 0 10px ${BAND_COLORS[band]}66`
                  }}
                />
              </div>
              <span style={{ ...styles.barLabel, color: BAND_COLORS[band] }}>
                {BAND_LABELS[band]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>数据速度</h3>
        <div style={styles.sliderContainer}>
          <span style={styles.sliderLabel}>0.5x</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={localSpeed}
            onChange={handleSpeedChange}
            style={styles.slider}
          />
          <span style={styles.sliderLabel}>3x</span>
        </div>
        <div style={styles.speedValue}>{localSpeed.toFixed(1)}x</div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>视角切换</h3>
        <div style={styles.buttonGroup}>
          {viewOptions.map((option) => (
            <button
              key={option.mode}
              onClick={() => setViewMode(option.mode)}
              style={{
                ...styles.viewButton,
                background: viewMode === option.mode ? '#7c5cbf' : 'rgba(124, 92, 191, 0.3)',
                borderColor: viewMode === option.mode ? '#9c7ce0' : 'rgba(124, 92, 191, 0.5)'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.performanceRow}>
          <div style={styles.perfItem}>
            <span style={styles.perfLabel}>FPS</span>
            <span style={{ ...styles.perfValue, color: fpsColor }}>
              {fps.toFixed(0)}
            </span>
          </div>
          <div style={styles.perfItem}>
            <span style={styles.perfLabel}>立方体</span>
            <span style={styles.perfValue}>{cubeCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '300px',
    background: 'rgba(20, 20, 30, 0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '20px',
    color: '#ffffff',
    zIndex: 1000,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  title: {
    marginBottom: '20px',
    textAlign: 'center'
  },
  titleText: {
    fontSize: '20px',
    fontWeight: 600,
    margin: 0,
    background: 'linear-gradient(135deg, #7c5cbf, #4a90e2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    margin: '4px 0 0 0'
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.7)',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  barContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '120px',
    padding: '0 10px'
  },
  barWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  barTrack: {
    width: '30px',
    height: '100px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-end'
  },
  barFill: {
    width: '100%',
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.1s ease-out',
    position: 'absolute',
    bottom: 0
  },
  barLabel: {
    fontSize: '11px',
    fontWeight: 500
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  sliderLabel: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    minWidth: '25px'
  },
  slider: {
    flex: 1,
    height: '4px',
    appearance: 'none',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer'
  },
  speedValue: {
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#7c5cbf',
    marginTop: '8px'
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  viewButton: {
    height: '40px',
    borderRadius: '8px',
    border: '1px solid',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    padding: '0 16px'
  },
  performanceRow: {
    display: 'flex',
    justifyContent: 'space-around',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  perfItem: {
    textAlign: 'center'
  },
  perfLabel: {
    display: 'block',
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: '4px'
  },
  perfValue: {
    fontSize: '18px',
    fontWeight: 600
  }
}
