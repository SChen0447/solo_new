import React, { useMemo } from 'react'

interface GaugeProps {
  value: number
  maxValue: number
  label: string
  unit: string
  gradientStart: string
  gradientEnd: string
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  maxValue,
  label,
  unit,
  gradientStart,
  gradientEnd
}) => {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100))
  const angle = (percentage / 100) * 270 - 135

  const gradientId = useMemo(() => `gauge-gradient-${label.replace(/\s/g, '-')}`, [label])

  const displayValue = Math.round(value * 10) / 10

  return (
    <div className="relative flex flex-col items-center">
      <svg width="80" height="80" viewBox="0 0 100 100">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>

      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="6"
        strokeDasharray="188.5"
        strokeDashoffset="47.12"
        strokeLinecap="round"
        transform="rotate(135 50 50)"
      />

      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="6"
        strokeDasharray="188.5"
        strokeDashoffset={188.5 - (percentage / 100) * 188.5}
        strokeLinecap="round"
        transform="rotate(135 50 50)"
        style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
      />

      <line
        x1="50"
        y1="50"
        x2={50 + 25 * Math.cos((angle * Math.PI) / 180)}
        y2={50 + 25 * Math.sin((angle * Math.PI) / 180)}
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ transition: 'all 0.5s ease-out' }}
      />

      <circle cx="50" cy="50" r="4" fill="white" />
      </svg>

      <div className="text-center mt-1">
        <div className="text-lg font-bold text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          {displayValue}
          <span className="text-xs ml-1 opacity-80">{unit}</span>
        </div>
        <div className="text-xs text-cyan-300 opacity-80">{label}</div>
      </div>
    </div>
  )
}
