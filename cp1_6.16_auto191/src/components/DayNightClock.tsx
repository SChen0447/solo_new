import React, { useEffect, useState, useRef } from 'react'
import type { GameTime, WeatherType } from '../types'

interface DayNightClockProps {
  time: GameTime
  weather: WeatherType
}

const DayNightClock: React.FC<DayNightClockProps> = ({ time, weather }) => {
  const [displayTime, setDisplayTime] = useState(time)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef(time)

  useEffect(() => {
    const startTime = performance.now()
    const startHour = lastTimeRef.current.hour + lastTimeRef.current.minute / 60
    const endHour = time.hour + time.minute / 60
    const duration = 500

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 2)

      const currentHour = startHour + (endHour - startHour) * easeProgress
      const hour = Math.floor(currentHour) % 24
      const minute = (currentHour % 1) * 60

      setDisplayTime({ hour, minute, day: time.day })

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        lastTimeRef.current = { ...time }
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [time])

  const getSkyColor = (): string => {
    const hour = displayTime.hour + displayTime.minute / 60

    if (hour >= 6 && hour < 8) {
      const t = (hour - 6) / 2
      return interpolateColor('#1A1A2E', '#87CEEB', t)
    } else if (hour >= 8 && hour < 17) {
      return '#87CEEB'
    } else if (hour >= 17 && hour < 20) {
      const t = (hour - 17) / 3
      return interpolateColor('#87CEEB', '#FF8C00', t)
    } else if (hour >= 20 && hour < 22) {
      const t = (hour - 20) / 2
      return interpolateColor('#FF8C00', '#1A1A2E', t)
    } else {
      return '#1A1A2E'
    }
  }

  const interpolateColor = (color1: string, color2: string, t: number): string => {
    const r1 = parseInt(color1.slice(1, 3), 16)
    const g1 = parseInt(color1.slice(3, 5), 16)
    const b1 = parseInt(color1.slice(5, 7), 16)
    const r2 = parseInt(color2.slice(1, 3), 16)
    const g2 = parseInt(color2.slice(3, 5), 16)
    const b2 = parseInt(color2.slice(5, 7), 16)

    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)

    return `rgb(${r}, ${g}, ${b})`
  }

  const getWeatherInfo = (): { icon: string; name: string } => {
    const weatherMap: Record<WeatherType, { icon: string; name: string }> = {
      sunny: { icon: '☀️', name: '晴天' },
      cloudy: { icon: '☁️', name: '阴天' },
      rainy: { icon: '🌧️', name: '雨天' },
      snowy: { icon: '❄️', name: '雪天' },
      foggy: { icon: '🌫️', name: '雾天' },
    }
    return weatherMap[weather]
  }

  const formatTime = (): string => {
    const h = Math.floor(displayTime.hour)
    const m = Math.floor(displayTime.minute)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const clockRadius = 60
  const sunMoonRadius = 8

  const getSunMoonPosition = () => {
    const hour = displayTime.hour + displayTime.minute / 60
    const isDay = hour >= 6 && hour < 18
    const progress = isDay
      ? (hour - 6) / 12
      : (hour < 6 ? hour + 6 : hour - 18) / 12

    const angle = Math.PI * progress - Math.PI
    const x = clockRadius + Math.cos(angle) * (clockRadius - sunMoonRadius - 5)
    const y = clockRadius - Math.sin(angle) * (clockRadius - sunMoonRadius - 5)

    return { x, y, isDay }
  }

  const { x: sunMoonX, y: sunMoonY, isDay } = getSunMoonPosition()
  const weatherInfo = getWeatherInfo()

  return (
    <div style={styles.container}>
      <div style={styles.weatherBar}>
        <span style={styles.weatherIcon}>{weatherInfo.icon}</span>
        <span style={styles.weatherName}>{weatherInfo.name}</span>
        <span style={styles.dayText}>第 {time.day} 天</span>
      </div>

      <div
        style={{
          ...styles.clock,
          backgroundColor: getSkyColor(),
          transition: 'background-color 2s ease',
        }}
      >
        <div style={styles.clockFace}>
          {[...Array(12)].map((_, i) => {
            const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2
            const x = clockRadius + Math.cos(angle) * (clockRadius - 10)
            const y = clockRadius + Math.sin(angle) * (clockRadius - 10)
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: x - 2,
                  top: y - 2,
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.6)',
                }}
              />
            )
          })}

          <div
            style={{
              position: 'absolute',
              left: sunMoonX - sunMoonRadius,
              top: sunMoonY - sunMoonRadius,
              width: sunMoonRadius * 2,
              height: sunMoonRadius * 2,
              borderRadius: '50%',
              backgroundColor: isDay ? '#FFD700' : '#F0F0F0',
              boxShadow: isDay
                ? '0 0 20px #FFD700'
                : '0 0 10px rgba(255,255,255,0.5)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.9,
              transition: 'all 0.5s ease',
            }}
          >
            {isDay ? '☀️' : '🌙'}
          </div>

          <div style={styles.timeText}>{formatTime()}</div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 50,
  },
  weatherBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(44, 44, 44, 0.9)',
    border: '2px solid #4FC3F7',
    borderRadius: '20px',
    padding: '6px 16px',
    marginBottom: '10px',
  },
  weatherIcon: {
    fontSize: '20px',
  },
  weatherName: {
    color: '#F0F0F0',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  dayText: {
    color: '#4FC3F7',
    fontSize: '12px',
    marginLeft: '8px',
    paddingLeft: '8px',
    borderLeft: '1px solid #555',
  },
  clock: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '3px solid #4FC3F7',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 0 20px rgba(79, 195, 247, 0.3)',
  },
  clockFace: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  timeText: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#F0F0F0',
    fontSize: '18px',
    fontWeight: 'bold',
    textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
    fontFamily: 'monospace',
  },
}

export default DayNightClock
