import { useEffect, useState } from 'react'
import { useAppStore, EMOTION_COLORS, type EmotionType, type StyleType } from '@/store/AppState'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 255, b: 255 }
}

function FloatingOrb({ x, y, color, intensity }: { x: number; y: number; color: string; intensity: number }) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    let frame: number
    const start = performance.now()
    const animate = (now: number) => {
      const t = (now - start) / 1000
      setOffset(Math.sin(t * Math.PI) * 8)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const rgb = hexToRgb(color)
  const glowOpacity = 0.3 + (intensity / 100) * 0.5

  return (
    <circle
      cx={x}
      cy={y + offset}
      r={4 + intensity * 0.04}
      fill={color}
      opacity={0.8}
    >
      <animate
        attributeName="opacity"
        values={`${glowOpacity};${glowOpacity + 0.2};${glowOpacity}`}
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
  )
}

function RotatingBeams({ emotion, intensity, style, width, height, color }: {
  emotion: EmotionType
  intensity: number
  style: StyleType
  width: number
  height: number
  color: string
}) {
  if (style === 'minimal') return null

  const cx = width / 2
  const cy = height / 2
  const speed = 3 + intensity * 0.07
  const rgb = hexToRgb(color)
  const beamOpacity = 0.1 + (intensity / 100) * 0.3

  return (
    <g>
      <rect
        x={cx - width / 2 - 6}
        y={cy - 2}
        width={width + 12}
        height={4}
        fill={`rgba(${rgb.r},${rgb.g},${rgb.b},${beamOpacity})`}
        rx={2}
        transform={`rotate(${speed * 10}, ${cx}, ${cy})`}
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${cx} ${cy}`}
          to={`-360 ${cx} ${cy}`}
          dur={`${4 - intensity * 0.02}s`}
          repeatCount="indefinite"
        />
      </rect>
      <rect
        x={cx - 2}
        y={cy - height / 2 - 6}
        width={4}
        height={height + 12}
        fill={`rgba(${rgb.r},${rgb.g},${rgb.b},${beamOpacity * 0.7})`}
        rx={2}
        transform={`rotate(${speed * 10 + 90}, ${cx}, ${cy})`}
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`90 ${cx} ${cy}`}
          to={`-270 ${cx} ${cy}`}
          dur={`${4 - intensity * 0.02}s`}
          repeatCount="indefinite"
        />
      </rect>
    </g>
  )
}

function FantasyStars({ width, height, color, intensity }: {
  width: number
  height: number
  color: string
  intensity: number
}) {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    const rx = width / 2 + 14
    const ry = height / 2 + 14
    return {
      x: width / 2 + Math.cos(angle) * rx,
      y: height / 2 + Math.sin(angle) * ry,
    }
  })

  return (
    <g>
      {stars.map((pos, i) => (
        <circle
          key={i}
          cx={pos.x}
          cy={pos.y}
          r={1.5 + intensity * 0.01}
          fill="white"
          opacity={0.4 + (intensity / 100) * 0.4}
        >
          <animate
            attributeName="opacity"
            values="0.2;0.8;0.2"
            dur={`${0.5 + Math.random() * 1.5}s`}
            begin={`${i * 0.1}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values={`${1 + intensity * 0.005};${2 + intensity * 0.015};${1 + intensity * 0.005}`}
            dur={`${0.8 + Math.random()}s`}
            begin={`${i * 0.1}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </g>
  )
}

function RomanticHearts({ width, height, color, intensity }: {
  width: number
  height: number
  color: string
  intensity: number
}) {
  const hearts = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2
    const rx = width / 2 + 18
    const ry = height / 2 + 18
    return {
      x: width / 2 + Math.cos(angle) * rx,
      y: height / 2 + Math.sin(angle) * ry,
      delay: i * 0.25,
    }
  })

  return (
    <g>
      {hearts.map((pos, i) => (
        <g key={i}>
          <text
            x={pos.x}
            y={pos.y}
            fontSize={8 + intensity * 0.06}
            fill={color}
            textAnchor="middle"
            dominantBaseline="middle"
            opacity={0.3 + (intensity / 100) * 0.4}
          >
            ♥
            <animate
              attributeName="opacity"
              values="0.2;0.7;0.2"
              dur="2s"
              begin={`${pos.delay}s`}
              repeatCount="indefinite"
            />
          </text>
        </g>
      ))}
    </g>
  )
}

export default function FrameRenderer({ imageWidth, imageHeight }: { imageWidth: number; imageHeight: number }) {
  const emotion = useAppStore((s) => s.emotion)
  const intensity = useAppStore((s) => s.intensity)
  const style = useAppStore((s) => s.style)

  const color = EMOTION_COLORS[emotion]
  const rgb = hexToRgb(color)

  const borderWidth = 6 + (intensity / 100) * 14
  const outerBorderWidth = 4
  const spacing = 8
  const borderRadius = 12

  const innerW = imageWidth + borderWidth * 2
  const innerH = imageHeight + borderWidth * 2
  const outerW = innerW + spacing * 2 + outerBorderWidth * 2
  const outerH = innerH + spacing * 2 + outerBorderWidth * 2

  const svgW = outerW + 40
  const svgH = outerH + 40
  const offsetX = 20
  const offsetY = 20

  const gradientId = 'frameGradient'
  const innerGradientId = 'innerFrameGradient'
  const glowFilterId = 'frameGlow'

  const corners = [
    { x: offsetX + outerBorderWidth / 2, y: offsetY + outerBorderWidth / 2 },
    { x: offsetX + outerW - outerBorderWidth / 2, y: offsetY + outerBorderWidth / 2 },
    { x: offsetX + outerBorderWidth / 2, y: offsetY + outerH - outerBorderWidth / 2 },
    { x: offsetX + outerW - outerBorderWidth / 2, y: offsetY + outerH - outerBorderWidth / 2 },
  ]

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.6 + (intensity / 100) * 0.4} />
          <stop offset="50%" stopColor={`rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`} stopOpacity={0.3 + (intensity / 100) * 0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.6 + (intensity / 100) * 0.4} />
        </linearGradient>
        <linearGradient id={innerGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={`rgb(${Math.min(255, rgb.r + 40)},${Math.min(255, rgb.g + 40)},${Math.min(255, rgb.b + 40)})`} />
        </linearGradient>
        <filter id={glowFilterId}>
          <feGaussianBlur stdDeviation={2 + intensity * 0.03} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x={offsetX}
        y={offsetY}
        width={outerW}
        height={outerH}
        rx={borderRadius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={outerBorderWidth}
        filter={`url(#${glowFilterId})`}
      />

      <rect
        x={offsetX + outerBorderWidth + spacing}
        y={offsetY + outerBorderWidth + spacing}
        width={innerW}
        height={innerH}
        rx={borderRadius - 2}
        fill="none"
        stroke={`url(#${innerGradientId})`}
        strokeWidth={borderWidth}
        filter={`url(#${glowFilterId})`}
      />

      <RotatingBeams
        emotion={emotion}
        intensity={intensity}
        style={style}
        width={outerW}
        height={outerH}
        color={color}
      />

      {corners.map((pos, i) => (
        <FloatingOrb key={i} x={pos.x} y={pos.y} color={color} intensity={intensity} />
      ))}

      {style === 'fantasy' && (
        <FantasyStars width={outerW} height={outerH} color={color} intensity={intensity} />
      )}

      {style === 'romantic' && (
        <RomanticHearts width={outerW} height={outerH} color={color} intensity={intensity} />
      )}
    </svg>
  )
}
