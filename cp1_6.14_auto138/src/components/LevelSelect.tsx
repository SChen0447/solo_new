import { Difficulty } from '../utils/gameLogic'
import { useGameStore } from '../store/useGameStore'
import './LevelSelect.css'

const LEVELS: { id: Difficulty; name: string; desc: string; color: string }[] = [
  { id: 'easy', name: 'EASY', desc: '简单词 · 速度慢', color: '#39ff14' },
  { id: 'normal', name: 'NORMAL', desc: '中等词 · 速度中', color: '#ffd700' },
  { id: 'hard', name: 'HARD', desc: '长难词 · 速度快', color: '#ff007f' }
]

export function LevelSelect() {
  const difficulty = useGameStore((s) => s.difficulty)
  const setDifficulty = useGameStore((s) => s.setDifficulty)
  const startGame = useGameStore((s) => s.startGame)

  return (
    <div className="level-select-container">
      <h2 className="menu-title">SELECT LEVEL</h2>

      <div className="level-buttons">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            className={`level-button ${difficulty === level.id ? 'selected' : ''}`}
            style={{
              borderColor: level.color,
              color: level.color,
              boxShadow: difficulty === level.id ? `4px 4px 0 ${level.color}` : `4px 4px 0 rgba(255,255,255,0.1)`
            } as React.CSSProperties}
            onClick={() => setDifficulty(level.id)}
          >
            <span className="level-name">{level.name}</span>
            <span className="level-desc">{level.desc}</span>
          </button>
        ))}
      </div>

      <button className="start-button" onClick={startGame}>
        START GAME
      </button>

      <div className="instructions">
        <p>✦ Type the words before they reach the left side</p>
        <p>✦ Press ENTER to fire</p>
        <p>✦ Build combos for bonus style!</p>
      </div>
    </div>
  )
}
