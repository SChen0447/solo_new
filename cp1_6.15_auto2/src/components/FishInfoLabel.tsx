import React, { useState, useEffect, useRef } from 'react'
import { useEnvironmentStore } from '@/store/useEnvironmentStore'
import { FISH_SPECIES } from '@/types'

export const FishInfoLabel: React.FC = () => {
  const { hoveredFish, setHoveredFish } = useEnvironmentStore()
  const [displayedText, setDisplayedText] = useState('')
  const [charIndex, setCharIndex] = useState(0)
  const lastCharTime = useRef(0)
  const CHARS_PER_SECOND = 5

  const species = hoveredFish
    ? FISH_SPECIES.find(s => s.id === hoveredFish.speciesId)
    : null

  const fullText = species
    ? `${species.name}：${species.description}`
    : ''

  useEffect(() => {
    if (!hoveredFish || !species) {
      setDisplayedText('')
      setCharIndex(0)
      return
    }

    setDisplayedText('')
    setCharIndex(0)
    lastCharTime.current = performance.now()
  }, [hoveredFish?.fishId, species])

  useEffect(() => {
    if (!hoveredFish || !species || charIndex >= fullText.length) return

    const interval = setInterval(() => {
      const now = performance.now()
      const elapsed = now - lastCharTime.current
      const charsToAdd = Math.floor(elapsed / (1000 / CHARS_PER_SECOND))

      if (charsToAdd > 0) {
        const newIndex = Math.min(charIndex + charsToAdd, fullText.length)
        setDisplayedText(fullText.slice(0, newIndex))
        setCharIndex(newIndex)
        lastCharTime.current = now
      }
    }, 50)

    return () => clearInterval(interval)
  }, [hoveredFish, species, charIndex, fullText])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (hoveredFish) {
        setHoveredFish({
          ...hoveredFish,
          screenPosition: { x: e.clientX, y: e.clientY }
        })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [hoveredFish, setHoveredFish])

  if (!hoveredFish || !species) return null

  return (
    <div
      className="fixed z-50 pointer-events-none transition-opacity duration-300"
      style={{
        left: hoveredFish.screenPosition.x + 15,
        top: hoveredFish.screenPosition.y - 10,
        transform: 'translateY(-100%)',
        opacity: charIndex > 0 ? 1 : 0
      }}
    >
      <div
        className="px-4 py-3 rounded-xl max-w-xs"
        style={{
          background: 'rgba(10, 30, 50, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${`#${species.color.toString(16).padStart(6, '0')}40`}`,
          boxShadow: `0 4px 20px ${`#${species.color.toString(16).padStart(6, '0')}30`}`
        }}
      >
        <div
          className="font-bold text-lg mb-1 flex items-center gap-2"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            color: `#${species.color.toString(16).padStart(6, '0')}`
          }}
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: `#${species.color.toString(16).padStart(6, '0')}` }}
          />
          {species.name}
        </div>
        <p className="text-white/90 text-sm leading-relaxed">
          {displayedText}
          {charIndex < fullText.length && (
            <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse" />
          )}
        </p>
      </div>

      <div
        className="absolute -bottom-2 left-4 w-0 h-0"
        style={{
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid rgba(10, 30, 50, 0.85)'
        }}
      />
    </div>
  )
}
