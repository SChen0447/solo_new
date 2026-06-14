import { useGameStore } from '../store/useGameStore'
import './GameHUD.css'

export function GameHUD() {
  const score = useGameStore((s) => s.score)
  const lives = useGameStore((s) => s.lives)
  const difficulty = useGameStore((s) => s.difficulty)

  return (
    <div className="game-hud">
      <div className="hud-left">
        <div className="lives-section">
          <span className="hud-label">LIVES</span>
          <div className="hearts">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`pixel-heart ${i <= lives ? 'active' : 'empty'}`}
              >
                ♥
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="hud-center">
        <h1 className="game-title">PIXEL TYPE BATTLE</h1>
      </div>

      <div className="hud-right">
        <div className="score-section">
          <span className="hud-label">SCORE</span>
          <span className="score-value">{String(score).padStart(6, '0')}</span>
        </div>
        <div className="difficulty-badge">{difficulty.toUpperCase()}</div>
      </div>
    </div>
  )
}

export function ComboDisplay() {
  const combo = useGameStore((s) => s.combo)
  if (combo <= 0) return null

  const isGold = combo > 5

  return (
    <div className={`combo-display ${isGold ? 'gold' : ''}`}>
      <span className="combo-label">COMBO</span>
      <span className="combo-value">x{combo}</span>
    </div>
  )
}

export function PixelAvatar() {
  const combo = useGameStore((s) => s.combo)
  const isActive = combo > 0

  return (
    <div className={`pixel-avatar ${isActive ? 'active' : ''}`}>
      <div className="avatar-face">
        <div className="avatar-eyes">
          <span className="eye left">●</span>
          <span className="eye right">●</span>
        </div>
        <div className={`avatar-mouth ${isActive ? 'open' : 'closed'}`}>
          {isActive ? '◡' : '‿'}
        </div>
      </div>
    </div>
  )
}
