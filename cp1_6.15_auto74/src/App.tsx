import { useEffect, useRef, useCallback } from 'react'
import {
  useIllusionStore,
  PatternType,
  patternNames
} from './store'
import { renderers, RenderContext } from './renderers'

const CANVAS_SIZE = 500

const patternList: PatternType[] = ['rotatingSnake', 'hermannGrid', 'scintillatingGrid']

function PatternCard({
  type,
  isSelected,
  onClick
}: {
  type: PatternType
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 80,
        height: 80,
        borderRadius: 10,
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
        border: isSelected ? '2px solid #00bcd4' : '2px solid transparent',
        boxShadow: isSelected ? '0 4px 12px rgba(0, 188, 212, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
        userSelect: 'none',
        flexDirection: 'column',
        gap: 4
      }}
    >
      <div style={{ fontSize: 28 }}>
        {type === 'rotatingSnake' ? '🌀' : type === 'hermannGrid' ? '⬛' : '✨'}
      </div>
      <div style={{ fontSize: 10, color: '#333', fontWeight: 500 }}>
        {patternNames[type]}
      </div>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#eee', fontWeight: 500 }}>{label}</span>
        <span style={{
          fontSize: 13,
          color: '#00bcd4',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 50,
          textAlign: 'right'
        }}>
          {value.toFixed(step < 1 ? 0 : 0)}{unit || ''}
        </span>
      </div>
      <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute',
          width: 200,
          height: 6,
          backgroundColor: '#ddd',
          borderRadius: 3,
          left: 0
        }} />
        <div style={{
          position: 'absolute',
          width: `${((value - min) / (max - min)) * 200}px`,
          height: 6,
          backgroundColor: '#00bcd4',
          borderRadius: 3,
          left: 0
        }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            width: 200,
            height: 24,
            left: 0,
            margin: 0,
            opacity: 0,
            cursor: 'pointer',
            zIndex: 10
          }}
        />
        <div style={{
          position: 'absolute',
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          border: '1px solid #aaa',
          left: `${((value - min) / (max - min)) * 200 - 9}px`,
          pointerEvents: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.05s ease'
        }} />
      </div>
    </div>
  )
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameCountRef = useRef(0)
  const animationRef = useRef<number | null>(null)

  const currentPattern = useIllusionStore((s) => s.currentPattern)
  const params = useIllusionStore((s) => s.params)
  const setCurrentPattern = useIllusionStore((s) => s.setCurrentPattern)
  const setSpeed = useIllusionStore((s) => s.setSpeed)
  const setDensity = useIllusionStore((s) => s.setDensity)
  const setColorShift = useIllusionStore((s) => s.setColorShift)

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== CANVAS_SIZE * dpr || canvas.height !== CANVAS_SIZE * dpr) {
      canvas.width = CANVAS_SIZE * dpr
      canvas.height = CANVAS_SIZE * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const renderContext: RenderContext = {
      ctx,
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      frameCount: frameCountRef.current,
      params
    }

    const renderer = renderers[currentPattern]
    if (renderer) {
      renderer(renderContext)
    }

    frameCountRef.current++
    animationRef.current = requestAnimationFrame(renderFrame)
  }, [currentPattern, params])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(renderFrame)
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [renderFrame])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    const paramStr = `s${params.speed}_d${params.density}_c${params.colorShift}`
    link.download = `${patternNames[currentPattern]}_${paramStr}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [currentPattern, params])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1e1e1e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <h1 style={{
        color: '#eee',
        fontSize: 28,
        fontWeight: 600,
        margin: '0 0 8px 0',
        letterSpacing: 1
      }}>
        视错觉艺术生成器
      </h1>
      <p style={{
        color: '#888',
        fontSize: 14,
        margin: '0 0 32px 0'
      }}>
        调节参数，探索神奇的视错觉世界
      </p>

      <div style={{
        display: 'flex',
        gap: 16,
        marginBottom: 28,
        padding: '16px 20px',
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
      }}>
        {patternList.map((type) => (
          <PatternCard
            key={type}
            type={type}
            isSelected={currentPattern === type}
            onClick={() => setCurrentPattern(type)}
          />
        ))}
      </div>

      <div style={{ position: 'relative', marginBottom: 28 }}>
        <canvas
          ref={canvasRef}
          style={{
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'block'
          }}
        />
        <button
          onClick={handleDownload}
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: '#333333',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            padding: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#555555'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#333333'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title="下载图案"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '24px 28px',
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        minWidth: 280
      }}>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#00bcd4',
          borderBottom: '1px solid #3a3a3a',
          paddingBottom: 12,
          marginBottom: 4
        }}>
          参数控制 · {patternNames[currentPattern]}
        </div>
        <Slider
          label="速度"
          value={params.speed}
          min={0}
          max={10}
          step={1}
          onChange={setSpeed}
        />
        <Slider
          label="密度"
          value={params.density}
          min={5}
          max={30}
          step={1}
          onChange={setDensity}
        />
        <Slider
          label="颜色偏移"
          value={params.colorShift}
          min={-180}
          max={180}
          step={1}
          unit="°"
          onChange={setColorShift}
        />
      </div>

      <div style={{
        marginTop: 24,
        fontSize: 12,
        color: '#555'
      }}>
        提示：注视图案中心区域可获得最佳视错觉效果
      </div>
    </div>
  )
}

export default App
