import { useGameStore } from '../stores/gameStore'

export const HUD: React.FC = () => {
  const { rewindTime, maxRewindTime, gems, totalGems, gameTime, isVictory, resetGame } =
    useGameStore()

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    const milliseconds = Math.floor((time % 1) * 100)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`
  }

  const circumference = Math.PI * 2 * 27
  const progress = rewindTime / maxRewindTime
  const strokeDashoffset = circumference * (1 - progress)

  const gemPercentage = Math.round((gems / totalGems) * 100)

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 8,
          color: 'white',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize: 16,
          zIndex: 10,
        }}
      >
        {formatTime(gameTime)}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 10,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <polygon
            points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"
            fill="#ffd700"
            stroke="#ff8c00"
            strokeWidth="1"
          />
        </svg>
        <span
          style={{
            color: 'white',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          {gems}/{totalGems}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
        }}
      >
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle
            cx="30"
            cy="30"
            r="27"
            fill="none"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="6"
          />
          <circle
            cx="30"
            cy="30"
            r="27"
            fill="none"
            stroke="#ff6b6b"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 30 30)"
            style={{ transition: 'stroke-dashoffset 0.2s ease' }}
          />
          <text
            x="30"
            y="35"
            textAnchor="middle"
            fill="white"
            fontFamily="'Inter', 'Segoe UI', sans-serif"
            fontSize="14"
            fontWeight="600"
          >
            {rewindTime.toFixed(1)}
          </text>
        </svg>
      </div>

      {isVictory && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <h1
            style={{
              color: 'white',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              fontSize: 48,
              fontWeight: 700,
              marginBottom: 20,
              textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
            }}
          >
            Level Complete!
          </h1>
          <div
            style={{
              color: 'white',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              fontSize: 24,
              marginBottom: 10,
            }}
          >
            用时: {formatTime(gameTime)}
          </div>
          <div
            style={{
              color: 'white',
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              fontSize: 24,
              marginBottom: 30,
            }}
          >
            宝石收集率: {gemPercentage}%
          </div>
          <button
            onClick={resetGame}
            style={{
              padding: '12px 32px',
              fontSize: 20,
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'transform 0.2s, background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.backgroundColor = '#ff5252'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.backgroundColor = '#ff6b6b'
            }}
          >
            再玩一次
          </button>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 8,
          color: 'rgba(255, 255, 255, 0.8)',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize: 12,
          zIndex: 10,
          lineHeight: 1.6,
        }}
      >
        <div>A/D: 移动</div>
        <div>W: 跳跃</div>
        <div>空格: 时间回溯</div>
      </div>
    </>
  )
}
