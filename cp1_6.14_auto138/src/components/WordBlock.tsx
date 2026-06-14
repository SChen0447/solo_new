import { useEffect, useRef, useState } from 'react'
import { WordItem } from '../utils/gameLogic'
import { useGameStore } from '../store/useGameStore'
import './WordBlock.css'

interface Props {
  word: WordItem
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
}

const COLORS = ['#39ff14', '#ff007f', '#ffffff', '#ffff00', '#00ffff']

export function WordBlock({ word }: Props) {
  const removeExploded = useGameStore((s) => s.removeExploded)
  const [particles, setParticles] = useState<Particle[]>([])
  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const blockRef = useRef<HTMLDivElement>(null)
  const hasExploded = useRef(false)

  useEffect(() => {
    if (word.status === 'exploding' && !hasExploded.current) {
      hasExploded.current = true
      const newParticles: Particle[] = []
      const count = 12
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
        const speed = 2 + Math.random() * 4
        newParticles.push({
          id: i,
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 4 + Math.floor(Math.random() * 4)
        })
      }
      setParticles(newParticles)
      startTimeRef.current = performance.now()

      const animate = (now: number) => {
        const elapsed = now - startTimeRef.current
        if (elapsed >= 500) {
          removeExploded(word.id)
          return
        }
        const t = elapsed / 500
        setParticles((prev) =>
          prev.map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy + t * t * 10,
            size: Math.max(1, p.size * (1 - t * 0.5))
          }))
        )
        animRef.current = requestAnimationFrame(animate)
      }
      animRef.current = requestAnimationFrame(animate)

      return () => {
        if (animRef.current) {
          cancelAnimationFrame(animRef.current)
        }
      }
    }
  }, [word.status, word.id, removeExploded])

  const isExploding = word.status === 'exploding'
  const isShaking = word.status === 'shaking'

  return (
    <div
      ref={blockRef}
      className={`word-block ${isExploding ? 'exploding' : ''} ${isShaking ? 'shaking' : ''}`}
      style={{
        transform: `translate(${word.x}px, ${word.y}px)`
      }}
    >
      {!isExploding && (
        <div className="word-text">{word.word}</div>
      )}
      {isExploding && particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            transform: `translate(${p.x}px, ${p.y}px)`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`
          }}
        />
      ))}
    </div>
  )
}
