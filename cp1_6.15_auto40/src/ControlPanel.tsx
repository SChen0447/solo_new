import React, { useState, useEffect, useRef } from 'react'
import {
  useAppStore,
  ColorTheme,
  colorPalettes,
  ExpressionWeights,
  FacialExpressions
} from './store'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
  activeValue?: number
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
  activeValue
}) => {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <div style={{
      marginBottom: '14px',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
        height: '20px'
      }}>
        <span style={{
          color: '#b0b0c8',
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}>
          {label}
        </span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {activeValue !== undefined && (
            <span style={{
              color: '#6a8fff',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '2px 6px',
              background: 'rgba(106,143,255,0.12)',
              borderRadius: '4px'
            }}>
              {(activeValue * 100).toFixed(0)}%
            </span>
          )}
          <span
            style={{
              color: isDragging ? '#ffd700' : '#e0e0f0',
              fontSize: '13px',
              fontFamily: 'monospace',
              fontWeight: 600,
              transform: isDragging ? 'scale(1.1)' : 'scale(1)',
              transformOrigin: 'right center',
              transition: 'all 0.15s ease',
              minWidth: '32px',
              textAlign: 'right'
            }}
          >
            {value.toFixed(2)}{unit}
          </span>
        </div>
      </div>
      <div style={{
        position: 'relative',
        height: '4px',
        background: 'rgba(80,80,120,0.4)',
        borderRadius: '2px',
        marginBottom: '4px'
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${((value - min) / (max - min)) * 100}%`,
          background: isDragging
            ? 'linear-gradient(90deg, #ffd700, #ffaa00)'
            : 'linear-gradient(90deg, #667eea, #764ba2)',
          borderRadius: '2px',
          transition: 'background 0.2s ease'
        }} />
        <div style={{
          position: 'absolute',
          left: '1px',
          right: '1px',
          top: '50%',
          height: '1px',
          borderTop: '1px dashed rgba(180,180,220,0.25)',
          pointerEvents: 'none'
        }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: '18px',
          margin: 0,
          padding: 0,
          position: 'relative',
          top: '-11px',
          opacity: 0,
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${((value - min) / (max - min)) * 100}%`,
          top: '26px',
          transform: 'translateX(-50%)',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: isDragging ? '#ffd700' : '#ffffff',
          boxShadow: isDragging
            ? '0 0 12px rgba(255,215,0,0.7), 0 2px 6px rgba(0,0,0,0.4)'
            : '0 0 6px rgba(102,126,234,0.5), 0 2px 4px rgba(0,0,0,0.3)',
          border: isDragging ? '2px solid #ffed4e' : '2px solid #667eea',
          transition: 'all 0.15s ease',
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}

interface ControlPanelProps {
  isMobile: boolean
  isOpen: boolean
  onToggle: () => void
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ isMobile, isOpen, onToggle }) => {
  const expressions = useAppStore((state) => state.expressions)
  const expressionWeights = useAppStore((state) => state.expressionWeights)
  const particleState = useAppStore((state) => state.particleState)
  const landmarks = useAppStore((state) => state.landmarks)
  const isCameraActive = useAppStore((state) => state.isCameraActive)
  const isFaceDetected = useAppStore((state) => state.isFaceDetected)
  const fps = useAppStore((state) => state.fps)
  
  const updateExpressionWeight = useAppStore((state) => state.updateExpressionWeight)
  const updateParticleCount = useAppStore((state) => state.updateParticleCount)
  const updateColorTheme = useAppStore((state) => state.updateColorTheme)
  const resetExpressions = useAppStore((state) => state.resetExpressions)

  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(10,10,30,0.6)'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = 'rgba(100,120,180,0.3)'
    ctx.lineWidth = 1
    for (let i = 0; i < w; i += 20) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, h)
      ctx.stroke()
    }
    for (let i = 0; i < h; i += 20) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(w, i)
      ctx.stroke()
    }

    if (landmarks && landmarks.length > 0) {
      ctx.fillStyle = isFaceDetected ? '#4facfe' : '#ff6b6b'
      for (const point of landmarks) {
        const px = point.x * w
        const py = point.y * h
        ctx.beginPath()
        ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.strokeStyle = 'rgba(79,172,254,0.5)'
      ctx.lineWidth = 1
      const chin = landmarks[8]
      const leftEye = landmarks[36]
      const rightEye = landmarks[45]
      const mouthLeft = landmarks[48]
      const mouthRight = landmarks[54]
      if (chin && leftEye && rightEye) {
        ctx.beginPath()
        ctx.moveTo(leftEye.x * w, leftEye.y * h)
        ctx.lineTo(rightEye.x * w, rightEye.y * h)
        ctx.stroke()
      }
      if (mouthLeft && mouthRight) {
        ctx.beginPath()
        ctx.moveTo(mouthLeft.x * w, mouthLeft.y * h)
        ctx.lineTo(mouthRight.x * w, mouthRight.y * h)
        ctx.stroke()
      }
    } else {
      ctx.fillStyle = 'rgba(120,120,160,0.5)'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(isCameraActive ? '检测中...' : '等待相机', w / 2, h / 2 + 4)
    }
  }, [landmarks, isFaceDetected, isCameraActive])

  const themeColors = colorPalettes[particleState.colorTheme]
  const accentColor = themeColors[0]

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: isOpen ? '0' : '-320px',
        left: 0,
        right: 0,
        height: '300px',
        background: 'rgba(20,20,30,0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: `2px solid ${accentColor}`,
        boxShadow: `0 -4px 30px rgba(0,0,0,0.5), 0 -1px 0 ${accentColor}33 inset`,
        zIndex: 100,
        transition: 'bottom 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '14px 18px',
        WebkitOverflowScrolling: 'touch'
      }
    : {
        position: 'fixed',
        top: 0,
        right: 0,
        width: '280px',
        height: '100vh',
        background: 'rgba(20,20,30,0.85)',
        backdropFilter: 'blur(16px)',
        borderLeft: `2px solid ${accentColor}`,
        boxShadow: `-4px 0 30px rgba(0,0,0,0.4), 1px 0 0 ${accentColor}22 inset`,
        zIndex: 100,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '20px 18px',
        WebkitOverflowScrolling: 'touch'
      }

  const weightKeys: Array<{ key: keyof ExpressionWeights; label: string; activeKey: keyof FacialExpressions }> = [
    { key: 'mouthOpen', label: '张嘴权重', activeKey: 'mouthOpen' },
    { key: 'browHeight', label: '眉毛权重', activeKey: 'leftBrowHeight' },
    { key: 'mouthCurve', label: '嘴角权重', activeKey: 'mouthCurve' },
    { key: 'eyeClosed', label: '闭眼权重', activeKey: 'leftEyeClosed' }
  ]

  const themeOptions: Array<{ key: ColorTheme; label: string }> = [
    { key: 'nebula', label: '星云' },
    { key: 'fire', label: '火焰' },
    { key: 'emerald', label: '翡翠' }
  ]

  return (
    <>
      {isMobile && (
        <button
          onClick={onToggle}
          style={{
            position: 'fixed',
            bottom: isOpen ? '300px' : '16px',
            right: '16px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${accentColor}, ${themeColors[1] || accentColor})`,
            border: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            cursor: 'pointer',
            zIndex: 101,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            color: '#fff',
            fontSize: '20px'
          }}
        >
          {isOpen ? '▼' : '⚙'}
        </button>
      )}
      <div style={panelStyle}>
        <div style={{ marginBottom: '18px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
            <h2 style={{
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 600,
              margin: 0,
              letterSpacing: '1px',
              background: `linear-gradient(90deg, ${accentColor}, ${themeColors[3] || accentColor})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              ✦ 表情控制面板
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              background: fps > 50 ? 'rgba(67,233,123,0.15)' : 'rgba(255,107,107,0.15)',
              borderRadius: '10px'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: fps > 50 ? '#43e97b' : '#ff6b6b',
                boxShadow: `0 0 6px ${fps > 50 ? '#43e97b' : '#ff6b6b'}`
              }} />
              <span style={{
                color: fps > 50 ? '#43e97b' : '#ff6b6b',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 600
              }}>
                {fps}fps
              </span>
            </div>
          </div>
          <div style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center'
          }}>
            <div style={{
              flex: 1,
              padding: '5px 8px',
              background: isCameraActive ? 'rgba(67,233,123,0.1)' : 'rgba(255,170,0,0.1)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <div style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: isCameraActive ? '#43e97b' : '#ffaa00',
                animation: isCameraActive ? 'none' : 'pulse 1.5s infinite'
              }} />
              <span style={{
                color: isCameraActive ? '#43e97b' : '#ffaa00',
                fontSize: '10px',
                fontWeight: 500
              }}>
                {isCameraActive ? '相机已连接' : '模拟模式'}
              </span>
            </div>
            <div style={{
              padding: '5px 8px',
              background: isFaceDetected ? 'rgba(79,172,254,0.1)' : 'rgba(150,150,180,0.1)',
              borderRadius: '6px'
            }}>
              <span style={{
                color: isFaceDetected ? '#4facfe' : '#9090a8',
                fontSize: '10px',
                fontWeight: 500
              }}>
                {isFaceDetected ? '✓ 已检测' : '○ 无面部'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <h3 style={{
              color: '#c8c8e0',
              fontSize: '12px',
              fontWeight: 600,
              margin: 0,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              ◉ 实时预览
            </h3>
            <span style={{
              color: '#707090',
              fontSize: '10px'
            }}>68 关键点</span>
          </div>
          <div style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '75%',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid rgba(100,120,180,0.3)',
            background: 'rgba(5,5,20,0.8)'
          }}>
            <canvas
              ref={previewCanvasRef}
              width={240}
              height={180}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'block'
              }}
            />
          </div>
        </div>

        <div style={{
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${accentColor}44, transparent)`,
          margin: '14px 0'
        }} />

        <div style={{ marginBottom: '18px' }}>
          <h3 style={{
            color: '#c8c8e0',
            fontSize: '12px',
            fontWeight: 600,
            margin: '0 0 12px 0',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            ◈ 表情权重调节
          </h3>
          {weightKeys.map(({ key, label, activeKey }) => (
            <Slider
              key={key}
              label={label}
              value={expressionWeights[key]}
              min={0}
              max={2}
              step={0.01}
              unit="x"
              onChange={(v) => updateExpressionWeight(key, v)}
              activeValue={expressions[activeKey]}
            />
          ))}
        </div>

        <div style={{
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${accentColor}44, transparent)`,
          margin: '14px 0'
        }} />

        <div style={{ marginBottom: '18px' }}>
          <h3 style={{
            color: '#c8c8e0',
            fontSize: '12px',
            fontWeight: 600,
            margin: '0 0 12px 0',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            ✺ 粒子系统
          </h3>
          <Slider
            label="粒子数量"
            value={particleState.count}
            min={1000}
            max={4000}
            step={100}
            onChange={updateParticleCount}
          />
          <div style={{ marginTop: '12px' }}>
            <div style={{
              color: '#b0b0c8',
              fontSize: '12px',
              marginBottom: '8px',
              fontWeight: 500
            }}>
              颜色主题
            </div>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              {themeOptions.map(({ key, label }) => {
                const palette = colorPalettes[key]
                const isActive = particleState.colorTheme === key
                return (
                  <button
                    key={key}
                    onClick={() => updateColorTheme(key)}
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                      border: isActive
                        ? `2px solid ${palette[0]}`
                        : '1px solid rgba(100,100,140,0.3)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      gap: '1px'
                    }}>
                      {palette.slice(0, 6).map((c, i) => (
                        <div
                          key={i}
                          style={{
                            width: '6px',
                            height: '14px',
                            background: c,
                            borderRadius: i === 0 ? '3px 0 0 3px' : i === 5 ? '0 3px 3px 0' : '0'
                          }}
                        />
                      ))}
                    </div>
                    <span style={{
                      color: isActive ? palette[0] : '#8080a0',
                      fontSize: '10px',
                      fontWeight: isActive ? 600 : 400
                    }}>
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${accentColor}44, transparent)`,
          margin: '14px 0'
        }} />

        <button
          onClick={resetExpressions}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2))',
            border: `1px solid ${accentColor}66`,
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '10px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `linear-gradient(135deg, ${accentColor}33, ${themeColors[3] || accentColor}33)`
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = `0 4px 16px ${accentColor}33`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2))'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <span>↻</span>
          <span>重置为中性表情</span>
        </button>

        <div style={{
          padding: '10px 12px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '6px',
          marginTop: '10px'
        }}>
          <div style={{
            color: '#707090',
            fontSize: '10px',
            marginBottom: '4px',
            letterSpacing: '0.5px'
          }}>
            当前表情数值
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 10px'
          }}>
            {[
              ['张嘴', expressions.mouthOpen],
              ['左眉', expressions.leftBrowHeight],
              ['右眉', expressions.rightBrowHeight],
              ['嘴角', expressions.mouthCurve],
              ['左眼', expressions.leftEyeClosed],
              ['右眼', expressions.rightEyeClosed]
            ].map(([label, val]) => (
              <div key={label as string} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px'
              }}>
                <span style={{ color: '#8080a0' }}>{label as string}</span>
                <span style={{
                  color: '#a0c0ff',
                  fontFamily: 'monospace',
                  fontWeight: 600
                }}>
                  {(val as number).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
