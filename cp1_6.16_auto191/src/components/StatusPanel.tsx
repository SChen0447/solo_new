import React, { useEffect, useState } from 'react'
import type { PlayerStats } from '../types'

interface StatusPanelProps {
  stats: PlayerStats
}

const StatusPanel: React.FC<StatusPanelProps> = ({ stats }) => {
  const [displayedStats, setDisplayedStats] = useState(stats)

  useEffect(() => {
    const startStats = { ...displayedStats }
    const startTime = performance.now()
    const duration = 500
    let animationId: number

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      setDisplayedStats({
        hunger: startStats.hunger + (stats.hunger - startStats.hunger) * easeProgress,
        temperature: startStats.temperature + (stats.temperature - startStats.temperature) * easeProgress,
        water: startStats.water + (stats.water - startStats.water) * easeProgress,
      })

      if (progress < 1) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationId)
  }, [stats])

  const getTemperatureColor = (temp: number): string => {
    const clampedTemp = Math.max(-10, Math.min(40, temp))
    const ratio = (clampedTemp + 10) / 50
    const r = Math.round(ratio * 255)
    const b = Math.round((1 - ratio) * 255)
    return `rgb(${r}, 100, ${b})`
  }

  const StatusBar: React.FC<{
    label: string
    icon: string
    value: number
    max: number
    color: string
    isGradient?: boolean
  }> = ({ label, icon, value, max, color, isGradient }) => {
    const percentage = Math.max(0, Math.min(100, (value / max) * 100))
    const displayValue = Math.round(value * 10) / 10

    const barStyle: React.CSSProperties = isGradient
      ? { background: `linear-gradient(90deg, #4FC3F7, ${color)` }
      : { backgroundColor: color }

    return (
      <div style={styles.statusItem}>
        <div style={styles.statusLabel}>
          <span style={styles.statusIcon}>{icon}</span>
          <span style={styles.statusName}>{label}</span>
        </div>
        <div style={styles.statusBarContainer}>
          <div
            style={{
              ...styles.statusBar,
              ...barStyle,
              width: `${percentage}%`,
              transition: 'width 0.5s ease-out',
            }}
          />
          <span style={styles.statusValue}>{displayValue}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>角色状态</h3>
      <StatusBar
        label="饥饿"
        icon="🍖"
        value={displayedStats.hunger}
        max={100}
        color="#FF8C00"
      />
      <StatusBar
        label="温度"
        icon="🌡️"
        value={displayedStats.temperature}
        max={40}
        color={getTemperatureColor(displayedStats.temperature)}
        isGradient
      />
      <StatusBar
        label="水分"
        icon="💧"
        value={displayedStats.water}
        max={100}
        color="#00BCD4"
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(44, 44, 44, 0.9)',
    border: '2px solid #4FC3F7',
    borderRadius: '8px',
    padding: '16px',
    width: '240px',
    zIndex: 100,
  },
  title: {
    color: '#F0F0F0',
    fontSize: '16px',
    marginBottom: '12px',
    textAlign: 'center',
    borderBottom: '1px solid #4FC3F7',
    paddingBottom: '8px',
  },
  statusItem: {
    marginBottom: '12px',
  },
  statusLabel: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
  },
  statusIcon: {
    fontSize: '16px',
    marginRight: '6px',
  },
  statusName: {
    color: '#F0F0F0',
    fontSize: '14px',
  },
  statusBarContainer: {
    position: 'relative',
    width: '200px',
    height: '20px',
    backgroundColor: '#1A1A2E',
    borderRadius: '4px',
    overflow: 'hidden',
    border: '1px solid #555',
  },
  statusBar: {
    height: '100%',
    borderRadius: '3px',
  },
  statusValue: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#F0F0F0',
    fontSize: '12px',
    fontWeight: 'bold',
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
  },
}

export default StatusPanel
