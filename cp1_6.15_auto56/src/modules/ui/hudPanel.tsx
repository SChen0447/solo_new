import { useGameStore, PATTERN_NAMES } from '../../store/gameStore';

function Heart({ filled }: { filled: boolean }) {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        position: 'relative',
        display: 'inline-block',
        marginRight: 4
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path
          d="M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 19 11c0 5.65-7 10-7 10z"
          fill={filled ? '#e74c3c' : '#ccc'}
          stroke={filled ? '#c0392b' : '#999'}
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

export default function HudPanel() {
  const lives = useGameStore((s) => s.lives);
  const score = useGameStore((s) => s.score);
  const bossHp = useGameStore((s) => s.bossHp);
  const bossMaxHp = useGameStore((s) => s.bossMaxHp);
  const currentPattern = useGameStore((s) => s.currentPattern);
  const patternDisplayOpacity = useGameStore((s) => s.patternDisplayOpacity);

  const hpRatio = Math.max(0, bossHp / bossMaxHp);
  const hpColor = hpRatio > 0.5
    ? `rgb(${Math.floor(46 + (231 - 46) * (1 - hpRatio) * 2)}, ${Math.floor(204 - (204 - 76) * (1 - hpRatio) * 2)}, ${Math.floor(113)})`
    : `rgb(${Math.floor(231)}, ${Math.floor(76 + (204 - 76) * hpRatio * 2)}, ${Math.floor(60)})`;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '10px 14px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 8,
          zIndex: 5,
          pointerEvents: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          {[0, 1, 2].map((i) => (
            <Heart key={i} filled={i < lives} />
          ))}
        </div>
        <div
          style={{
            color: 'white',
            fontSize: 20,
            fontWeight: 'bold',
            transition: 'transform 0.3s ease, color 0.3s ease',
            transform: score > 0 ? 'scale(1)' : 'scale(1)',
            textShadow: '0 0 8px rgba(0, 229, 255, 0.4)'
          }}
        >
          Score: {score}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            width: 300,
            height: 12,
            background: '#333',
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid #555',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${hpRatio * 100}%`,
              background: hpColor,
              transition: 'width 0.2s ease, background 0.3s ease',
              boxShadow: `0 0 8px ${hpColor}`
            }}
          />
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: '#888',
            marginTop: 4,
            letterSpacing: 1
          }}
        >
          BOSS {Math.ceil(bossHp)} / {bossMaxHp}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: patternDisplayOpacity,
          transition: 'opacity 0.3s ease',
          fontSize: 18,
          color: '#888',
          fontWeight: 500,
          letterSpacing: 2,
          textShadow: '0 0 8px rgba(0,0,0,0.8)'
        }}
      >
        {PATTERN_NAMES[currentPattern]}
      </div>
    </>
  );
}
