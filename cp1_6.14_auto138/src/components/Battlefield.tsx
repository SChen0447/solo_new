import { useEffect, useRef, useCallback } from 'react'
import { WordBlock } from './WordBlock'
import { useGameStore } from '../store/useGameStore'
import { getSpawnInterval } from '../utils/gameLogic'
import './Battlefield.css'

export function Battlefield() {
  const battlefieldRef = useRef<HTMLDivElement>(null)
  const lastTimeRef = useRef<number>(0)
  const spawnTimerRef = useRef<number>(0)
  const animRef = useRef<number | null>(null)

  const words = useGameStore((s) => s.words)
  const difficulty = useGameStore((s) => s.difficulty)
  const status = useGameStore((s) => s.status)
  const updateWords = useGameStore((s) => s.updateWords)
  const spawnWord = useGameStore((s) => s.spawnWord)
  const setBattlefieldWidth = useGameStore((s) => s.setBattlefieldWidth)

  const measureWidth = useCallback(() => {
    if (battlefieldRef.current) {
      setBattlefieldWidth(battlefieldRef.current.clientWidth)
    }
  }, [setBattlefieldWidth])

  useEffect(() => {
    measureWidth()
    window.addEventListener('resize', measureWidth)
    return () => window.removeEventListener('resize', measureWidth)
  }, [measureWidth])

  useEffect(() => {
    if (status !== 'playing') {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
      return
    }

    lastTimeRef.current = performance.now()
    spawnTimerRef.current = 0
    spawnWord()

    const animate = (now: number) => {
      const delta = now - lastTimeRef.current
      lastTimeRef.current = now

      updateWords(delta)

      spawnTimerRef.current += delta
      const interval = getSpawnInterval(difficulty)
      if (spawnTimerRef.current >= interval) {
        spawnTimerRef.current = 0
        spawnWord()
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
      }
    }
  }, [status, difficulty, updateWords, spawnWord])

  return (
    <div ref={battlefieldRef} className="battlefield">
      <div className="scanline" />
      {words.map((word) => (
        <WordBlock key={word.id} word={word} />
      ))}
    </div>
  )
}
