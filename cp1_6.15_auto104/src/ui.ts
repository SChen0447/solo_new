import React from 'react';
import { GameState, CRYSTAL_COLORS } from './entities';

interface HUDProps {
  gameState: GameState;
}

export const HUD: React.FC<HUDProps> = ({ gameState }) => {
  const { energy, level, ship } = gameState;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        fontFamily: 'sans-serif'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {energy}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: energy }).map((_, i) => (
            <HexagonIcon key={i} color={CRYSTAL_COLORS[i % CRYSTAL_COLORS.length]} size={12} />
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px'
        }}
      >
        {Array.from({ length: ship.health }).map((_, i) => (
          <HeartIcon key={i} size={20} />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px'
        }}
      >
        <span
          style={{
            color: '#ffd700',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
          }}
        >
          等级 {level}
        </span>
      </div>
    </div>
  );
};

interface HexagonIconProps {
  color: string;
  size: number;
}

const HexagonIcon: React.FC<HexagonIconProps> = ({ color, size }) => {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = size / 2 + (size / 2) * Math.cos(angle);
    const y = size / 2 + (size / 2) * Math.sin(angle);
    points.push(`${x},${y}`);
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon
        points={points.join(' ')}
        fill={color}
        stroke="rgba(255, 255, 255, 0.5)"
        strokeWidth="0.5"
      />
    </svg>
  );
};

interface HeartIconProps {
  size: number;
}

const HeartIcon: React.FC<HeartIconProps> = ({ size }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="#ff0000"
      />
    </svg>
  );
};

interface UpgradeHintProps {
  show: boolean;
}

export const UpgradeHint: React.FC<UpgradeHintProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#e91e63',
        fontSize: '18px',
        fontWeight: 'bold',
        textShadow: '0 0 10px rgba(233, 30, 99, 0.8)',
        animation: 'pulse 1.2s ease-in-out infinite'
      }}
    >
      传送门已开启！进入升级飞船
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.7; transform: translateX(-50%) scale(1.05); }
        }
      `}</style>
    </div>
  );
};
