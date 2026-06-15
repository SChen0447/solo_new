import { useEffect } from 'react'
import { useGameStore } from '../stores/gameStore'

export const Player: React.FC = () => {
  const { player, isRewinding, isDead, setInput } = useGameStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRewinding || isDead) return

      switch (e.key.toLowerCase()) {
        case 'a':
          setInput({ left: true })
          break
        case 'd':
          setInput({ right: true })
          break
        case 'w':
          setInput({ jump: true })
          break
        case ' ':
          e.preventDefault()
          setInput({ rewind: true })
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'a':
          setInput({ left: false })
          break
        case 'd':
          setInput({ right: false })
          break
        case 'w':
          setInput({ jump: false })
          break
        case ' ':
          setInput({ rewind: false })
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isRewinding, isDead, setInput])

  return (
    <div
      style={{
        position: 'absolute',
        left: player.x - 20,
        top: player.y - 20,
        width: 40,
        height: 40,
        backgroundColor: player.color,
        opacity: player.opacity,
        transition: 'background-color 0.3s ease, opacity 0.1s ease',
        borderRadius: 4,
        boxShadow: `0 0 10px ${player.color}80`,
        pointerEvents: 'none',
      }}
    />
  )
}
