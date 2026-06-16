import React, { useEffect, useRef, useState } from 'react'
import type { WeatherType } from '../types'

interface WeatherEffectsProps {
  weather: WeatherType
  nightIntensity: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

const WeatherEffects: React.FC<WeatherEffectsProps> = ({ weather, nightIntensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | null>(null)
  const weatherRef = useRef(weather)
  const nightRef = useRef(nightIntensity)
  const [brightness, setBrightness] = useState(1)
  const [fogOpacity, setFogOpacity] = useState(0)

  useEffect(() => {
    weatherRef.current = weather
    nightRef.current = nightIntensity

    if (weather === 'sunny') {
      setBrightness(1)
      setFogOpacity(0)
    } else if (weather === 'cloudy') {
      setBrightness(0.8)
      setFogOpacity(0)
    } else if (weather === 'rainy') {
      setBrightness(0.7)
      setFogOpacity(0)
    } else if (weather === 'snowy') {
      setBrightness(0.85)
      setFogOpacity(0)
    } else if (weather === 'foggy') {
      setBrightness(0.9)
      setFogOpacity(0.6)
    }
  }, [weather, nightIntensity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const initParticles = () => {
      const particles: Particle[] = []
      const count = weatherRef.current === 'snowy' ? 150 : weatherRef.current === 'rainy' ? 180 : 0

      for (let i = 0; i < count; i++) {
        particles.push(createParticle(canvas, weatherRef.current))
      }
      particlesRef.current = particles
    }

    initParticles()

    let lastTime = performance.now()
    let spawnTimer = 0

    const animate = (now: number) => {
      const deltaTime = (now - lastTime) / 1000
      lastTime = now
      spawnTimer += deltaTime

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (weatherRef.current === 'rainy') {
        if (spawnTimer > 0.02 && particlesRef.current.length < 200) {
          particlesRef.current.push(createParticle(canvas, 'rainy'))
          spawnTimer = 0
        }

        ctx.strokeStyle = 'rgba(174, 194, 224, 0.6)'
        ctx.lineWidth = 1.5

        particlesRef.current = particlesRef.current.filter(p => {
          p.y += p.vy * deltaTime
          p.x += p.vx * deltaTime

          if (p.y > canvas.height + 20) {
            return false
          }

          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x + p.vx * 0.02, p.y - p.size)
          ctx.stroke()

          return true
        })
      } else if (weatherRef.current === 'snowy') {
        if (spawnTimer > 0.03 && particlesRef.current.length < 200) {
          particlesRef.current.push(createParticle(canvas, 'snowy'))
          spawnTimer = 0
        }

        particlesRef.current = particlesRef.current.filter(p => {
          p.y += p.vy * deltaTime
          p.x += Math.sin(now / 1000 + p.x * 0.01) * p.vx * deltaTime * 0.5
          p.opacity = Math.max(0, Math.min(1, p.opacity + Math.sin(now / 500 + p.x) * 0.01))

          if (p.y > canvas.height + 10) {
            return false
          }

          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()

          return true
        })
      }

      if (nightRef.current > 0) {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, canvas.width * (0.6 - nightRef.current * 0.3),
          canvas.width / 2, canvas.height / 2, canvas.width * 0.8
        )
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
        gradient.addColorStop(1, `rgba(0, 0, 0, ${nightRef.current * 0.7})`)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const createParticle = (canvas: HTMLCanvasElement, type: WeatherType): Particle => {
    if (type === 'rainy') {
      return {
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 100,
        vx: -50 + Math.random() * 30,
        vy: 400 + Math.random() * 200,
        size: 15 + Math.random() * 10,
        opacity: 0.4 + Math.random() * 0.4,
      }
    } else {
      return {
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 50,
        vx: 10 + Math.random() * 20,
        vy: 30 + Math.random() * 40,
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.5 + Math.random() * 0.5,
      }
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
          transition: 'filter 2s ease',
          filter: `brightness(${brightness})`,
        }}
      />
      {fogOpacity > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: `rgba(255, 255, 255, ${fogOpacity})`,
            pointerEvents: 'none',
            zIndex: 11,
            transition: 'opacity 2s ease',
          }}
        />
      )}
    </>
  )
}

export default WeatherEffects
