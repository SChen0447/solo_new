import { useGameStore } from '../store/useGameStore'
import { getStarsForGrade } from '../utils/gameLogic'
import './ResultPanel.css'

export function ResultPanel() {
  const result = useGameStore((s) => s.result)
  const startGame = useGameStore((s) => s.startGame)

  if (!result) return null

  const stars = getStarsForGrade(result.grade)

  return (
    <div className="result-panel-overlay">
      <div className="result-panel">
        <h2 className="result-title">GAME OVER</h2>

        <div className="grade-section">
          <div className={`grade-letter grade-${result.grade}`}>{result.grade}</div>
          <div className="stars-row">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`pixel-star ${i <= stars ? 'active' : 'inactive'}`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">DESTROYED</span>
            <span className="stat-value">{result.totalDestroyed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">MAX COMBO</span>
            <span className="stat-value">{result.maxCombo}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">SCORE</span>
            <span className="stat-value score">{result.score}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">AVG REACTION</span>
            <span className="stat-value">{result.avgReactionTime}ms</span>
          </div>
        </div>

        <div className="accuracy-section">
          <span className="stat-label">ACCURACY</span>
          <div className="accuracy-bar-container">
            <div
              className="accuracy-bar-fill"
              style={{ width: `${result.accuracy}%` }}
            />
            <div className="accuracy-bar-pixels" />
          </div>
          <span className="accuracy-text">{result.accuracy}%</span>
        </div>

        <button className="pixel-button primary" onClick={startGame}>
          PLAY AGAIN
        </button>
      </div>
    </div>
  )
}
