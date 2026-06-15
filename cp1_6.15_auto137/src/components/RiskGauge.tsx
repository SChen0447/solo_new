import React from 'react';

interface RiskGaugeProps {
  volatility: number;
  maxDrawdown: number;
  size?: number;
}

export default function RiskGauge({ volatility, maxDrawdown, size = 180 }: RiskGaugeProps) {
  const radius = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2 + 5;
  const strokeW = 10;

  const volPercent = Math.min(volatility / 50, 1);
  const ddPercent = Math.min(maxDrawdown / 30, 1);

  const volArcLen = volPercent * Math.PI * radius;
  const ddArcLen = ddPercent * Math.PI * radius;

  const circ = Math.PI * radius;

  const volGradId = 'volGrad';
  const ddGradId = 'ddGrad';

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      <defs>
        <linearGradient id={volGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4CAF50" />
          <stop offset="100%" stopColor="#FF9800" />
        </linearGradient>
        <linearGradient id={ddGradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2196F3" />
          <stop offset="100%" stopColor="#F44336" />
        </linearGradient>
      </defs>

      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#2a2a4a"
        strokeWidth={strokeW}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(180 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={`url(#${volGradId})`}
        strokeWidth={strokeW}
        strokeDasharray={`${volArcLen} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(180 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
      />

      <circle
        cx={cx}
        cy={cy}
        r={radius - strokeW - 6}
        fill="none"
        stroke="#2a2a4a"
        strokeWidth={strokeW - 2}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(180 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius - strokeW - 6}
        fill="none"
        stroke={`url(#${ddGradId})`}
        strokeWidth={strokeW - 2}
        strokeDasharray={`${ddArcLen} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(180 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
      />

      <text x={cx} y={cy - 14} textAnchor="middle" fill="#e0e0e0" fontSize={14} fontWeight={600} fontFamily="Inter">
        {volatility.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#888" fontSize={10} fontFamily="Inter">
        波动率
      </text>

      <text x={cx} y={cy + 22} textAnchor="middle" fill="#e0e0e0" fontSize={12} fontWeight={600} fontFamily="Inter">
        {maxDrawdown.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 36} textAnchor="middle" fill="#888" fontSize={9} fontFamily="Inter">
        最大回撤
      </text>

      <text x={cx - radius + 8} y={cy + radius * 0.1} textAnchor="start" fill="#4CAF50" fontSize={9} fontFamily="Inter">
        低
      </text>
      <text x={cx + radius - 8} y={cy + radius * 0.1} textAnchor="end" fill="#FF9800" fontSize={9} fontFamily="Inter">
        高
      </text>
    </svg>
  );
}
