import React from 'react'
import { usePlantStore } from './store'
import { STAGE_NAMES, STAGE_COLORS } from './plant'
import type { GrowthStage } from './store'

const ControlPanel: React.FC = () => {
  const {
    light,
    humidity,
    temperature,
    plantStructure,
    setLight,
    setHumidity,
    setTemperature,
    reset
  } = usePlantStore()

  const [isResetPressed, setIsResetPressed] = React.useState(false)

  const handleResetClick = () => {
    setIsResetPressed(true)
    setTimeout(() => {
      setIsResetPressed(false)
    }, 100)
    reset()
  }

  const stageColor = STAGE_COLORS[plantStructure.stage as GrowthStage]
  const isFlowering = plantStructure.stage === 'flowering'

  const progressRingSize = 40
  const strokeWidth = 4
  const radius = (progressRingSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progressOffset = circumference - (plantStructure.stageProgress * circumference)

  return (
    <>
      <div style={styles.panel}>
        <h1 style={styles.title}>数字植物园</h1>

        <div style={styles.sliderContainer}>
          <div style={styles.sliderLabel}>
            <span style={styles.sliderName}>光照</span>
            <span style={styles.sliderValue}>{Math.round(light)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={light}
            onChange={(e) => setLight(Number(e.target.value))}
            style={{
              ...styles.slider,
              ...getSliderThumbStyle('#f1c40f')
            }}
          />
        </div>

        <div style={styles.sliderContainer}>
          <div style={styles.sliderLabel}>
            <span style={styles.sliderName}>湿度</span>
            <span style={styles.sliderValue}>{Math.round(humidity)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={humidity}
            onChange={(e) => setHumidity(Number(e.target.value))}
            style={{
              ...styles.slider,
              ...getSliderThumbStyle('#3498db')
            }}
          />
        </div>

        <div style={styles.sliderContainer}>
          <div style={styles.sliderLabel}>
            <span style={styles.sliderName}>温度</span>
            <span style={styles.sliderValue}>{Math.round(temperature)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            style={{
              ...styles.slider,
              ...getSliderThumbStyle('#e74c3c')
            }}
          />
        </div>

        <button
          onClick={handleResetClick}
          onMouseDown={() => setIsResetPressed(true)}
          onMouseUp={() => setIsResetPressed(false)}
          onMouseLeave={() => setIsResetPressed(false)}
          style={{
            ...styles.resetButton,
            transform: isResetPressed ? 'scale(0.9)' : 'scale(1)'
          }}
        >
          重置
        </button>
      </div>

      <div style={styles.stageIndicator}>
        <div style={styles.progressRingContainer}>
          <svg width={progressRingSize} height={progressRingSize} style={styles.progressRing}>
            <circle
              cx={progressRingSize / 2}
              cy={progressRingSize / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={progressRingSize / 2}
              cy={progressRingSize / 2}
              r={radius}
              fill="none"
              stroke={isFlowering ? 'url(#flowerGradient)' : stageColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              transform={`rotate(-90 ${progressRingSize / 2} ${progressRingSize / 2})`}
              style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.5s ease' }}
            />
            <defs>
              <linearGradient id="flowerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6b81" />
                <stop offset="50%" stopColor="#9b59b6" />
                <stop offset="100%" stopColor="#ffeb3b" />
              </linearGradient>
            </defs>
          </svg>
          <div style={styles.stageName}>
            {STAGE_NAMES[plantStructure.stage as GrowthStage]}
          </div>
        </div>
      </div>
    </>
  )
}

function getSliderThumbStyle(color: string): React.CSSProperties {
  return {
    // @ts-ignore
    '--slider-color': color
  } as React.CSSProperties
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 260,
    height: '100%',
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    padding: '30px 20px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    zIndex: 10
  },
  title: {
    fontSize: 26,
    color: 'white',
    fontWeight: 600,
    textAlign: 'center',
    marginBottom: 20,
    textShadow: '0 0.5px 2px rgba(0,0,0,0.5)'
  },
  sliderContainer: {
    height: 70,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 10
  },
  sliderLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px'
  },
  sliderName: {
    fontSize: 14,
    color: 'white',
    fontWeight: 500
  },
  sliderValue: {
    fontSize: 14,
    color: 'white',
    fontWeight: 600,
    minWidth: 30,
    textAlign: 'right'
  },
  slider: {
    width: 180,
    height: 6,
    margin: '0 auto',
    appearance: 'none',
    WebkitAppearance: 'none',
    background: '#555',
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer'
  },
  resetButton: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    alignSelf: 'center',
    marginTop: 20,
    boxShadow: '0 2px 8px rgba(231, 76, 60, 0.4)',
    transition: 'transform 0.1s ease',
    padding: 0
  },
  stageIndicator: {
    position: 'absolute',
    left: 280,
    bottom: 30,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  progressRingContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressRing: {
    transform: 'rotate(0deg)'
  },
  stageName: {
    position: 'absolute',
    fontSize: 12,
    color: 'white',
    fontWeight: 600,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)'
  }
}

export default ControlPanel
