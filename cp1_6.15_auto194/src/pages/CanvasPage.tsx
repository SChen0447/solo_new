import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useGraffitiStore, PRESET_COLORS, Stroke } from '../store'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const BRUSH_SIZES = [8, 16, 24]

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 0, b: 255 }
}

function drawSprayDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number,
  pressure: number = 1
) {
  const rgb = hexToRgb(color)
  const actualSize = size * pressure
  const jitterX = (Math.random() - 0.5) * actualSize * 0.3
  const jitterY = (Math.random() - 0.5) * actualSize * 0.3
  const drawX = x + jitterX
  const drawY = y + jitterY

  const gradient = ctx.createRadialGradient(
    drawX, drawY, 0,
    drawX, drawY, actualSize
  )
  gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`)
  gradient.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`)
  gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`)
  gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(drawX, drawY, actualSize, 0, Math.PI * 2)
  ctx.fill()

  const extraDots = Math.floor(actualSize * 0.3)
  for (let i = 0; i < extraDots; i++) {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * actualSize * 1.2
    const dotX = drawX + Math.cos(angle) * distance
    const dotY = drawY + Math.sin(angle) * distance
    const dotSize = Math.random() * 1.5 + 0.5
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.random() * 0.5})`
    ctx.beginPath()
    ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGlowTrail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size: number
) {
  const rgb = hexToRgb(color)
  const glowSize = size * 1.3
  const gradient = ctx.createRadialGradient(
    x, y, 0,
    x, y, glowSize
  )
  gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`)
  gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`)
  gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, glowSize, 0, Math.PI * 2)
  ctx.fill()
}

function drawWallTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#d4c5a9'
  ctx.fillRect(0, 0, w, h)

  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const brightness = Math.random() * 40 - 20
    const alpha = Math.random() * 0.08
    ctx.fillStyle = `rgba(${212 + brightness}, ${197 + brightness}, ${169 + brightness}, ${alpha})`
    ctx.fillRect(x, y, 1.5, 1.5)
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.04)'
  ctx.lineWidth = 1
  for (let y = 40; y < h; y += 80) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  for (let y = 0; y < h; y += 80) {
    const offset = (y / 80) % 2 === 0 ? 0 : 60
    for (let x = offset; x < w; x += 120) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + 40)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 60, y + 40)
      ctx.lineTo(x + 60, y + 80)
      ctx.stroke()
    }
  }
}

function generateThumbnail(canvas: HTMLCanvasElement): string {
  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = 120
  thumbCanvas.height = 90
  const thumbCtx = thumbCanvas.getContext('2d')!
  thumbCtx.drawImage(canvas, 0, 0, 120, 90)
  return thumbCanvas.toDataURL('image/png')
}

export default function CanvasPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const templateCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPosRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [customColor, setCustomColor] = useState('#ff00ff')
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [playbackProgress, setPlaybackProgress] = useState(0)
  const playbackRef = useRef<{
    animationId: number | null
    strokeIndex: number
    pointIndex: number
    startTime: number
    paused: boolean
    strokes: Stroke[]
  }>({
    animationId: null,
    strokeIndex: 0,
    pointIndex: 0,
    startTime: 0,
    paused: false,
    strokes: []
  })

  const {
    currentColor,
    currentSize,
    strokes,
    currentStroke,
    artworks,
    templateId,
    setColor,
    setSize,
    startStroke,
    addPointToStroke,
    endStroke,
    clearCanvas,
    saveArtwork,
    deleteArtwork,
    setTemplate,
    loadStrokes
  } = useGraffitiStore()

  const template = artworks.find((a) => a.id === templateId)

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawWallTexture(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)

    if (template && templateCanvasRef.current) {
      const img = new window.Image()
      img.onload = () => {
        ctx.globalAlpha = 0.35
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctx.globalAlpha = 1
        renderStrokes(ctx)
      }
      img.src = template.imageData
    } else {
      renderStrokes(ctx)
    }
  }, [strokes, currentStroke, template])

  const renderStrokes = (ctx: CanvasRenderingContext2D) => {
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes
    allStrokes.forEach((stroke) => {
      stroke.points.forEach((p, i) => {
        let pressure = 1
        if (i > 0) {
          const prev = stroke.points[i - 1]
          const dx = p.x - prev.x
          const dy = p.y - prev.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const dt = p.timestamp - prev.timestamp
          if (dt > 0) {
            const speed = dist / dt
            pressure = Math.max(0.5, Math.min(1.3, 1.2 - speed * 2))
          }
        }
        drawSprayDot(ctx, p.x, p.y, stroke.color, stroke.size, pressure)
      })
    })
  }

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying) return
    const { x, y } = getCanvasCoords(e)
    setIsDrawing(true)
    startStroke(x, y)
    lastPosRef.current = { x, y, time: Date.now() }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isPlaying) return
    const { x, y } = getCanvasCoords(e)

    if (lastPosRef.current) {
      const dx = x - lastPosRef.current.x
      const dy = y - lastPosRef.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const steps = Math.max(1, Math.floor(dist / (currentSize * 0.25)))
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const ix = lastPosRef.current.x + dx * t
        const iy = lastPosRef.current.y + dy * t
        addPointToStroke(ix, iy)
      }
    } else {
      addPointToStroke(x, y)
    }
    lastPosRef.current = { x, y, time: Date.now() }
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    endStroke()
    lastPosRef.current = null
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomColor(val)
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setColor(val)
    }
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const imageData = canvas.toDataURL('image/png')
    const thumbnail = generateThumbnail(canvas)
    saveArtwork(imageData, thumbnail)
    setShowSaveSuccess(true)
    setTimeout(() => setShowSaveSuccess(false), 2000)
  }

  const stopPlayback = () => {
    if (playbackRef.current.animationId) {
      cancelAnimationFrame(playbackRef.current.animationId)
      playbackRef.current.animationId = null
    }
    setIsPlaying(false)
  }

  const startPlayback = (progress: number = 0) => {
    if (strokes.length === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    stopPlayback()

    const pb = playbackRef.current
    pb.strokes = JSON.parse(JSON.stringify(strokes))
    pb.strokeIndex = 0
    pb.pointIndex = 0
    pb.paused = false

    let totalPoints = 0
    pb.strokes.forEach((s) => (totalPoints += s.points.length))
    if (totalPoints === 0) return

    drawWallTexture(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)

    let currentPoint = 0
    const startPoint = Math.floor(totalPoints * progress)

    const animate = () => {
      if (pb.paused) {
        pb.animationId = requestAnimationFrame(animate)
        return
      }

      const pointsPerFrame = Math.max(1, Math.floor(6 * playbackSpeed))
      let drawn = 0

      while (drawn < pointsPerFrame && pb.strokeIndex < pb.strokes.length) {
        const stroke = pb.strokes[pb.strokeIndex]
        if (pb.pointIndex >= stroke.points.length) {
          pb.strokeIndex++
          pb.pointIndex = 0
          continue
        }

        const point = stroke.points[pb.pointIndex]
        if (currentPoint >= startPoint) {
          drawGlowTrail(ctx, point.x, point.y, stroke.color, stroke.size)
          drawSprayDot(ctx, point.x, point.y, stroke.color, stroke.size)
        }
        pb.pointIndex++
        currentPoint++
        drawn++
      }

      setPlaybackProgress(currentPoint / totalPoints)

      if (pb.strokeIndex < pb.strokes.length) {
        pb.animationId = requestAnimationFrame(animate)
      } else {
        setIsPlaying(false)
        setPlaybackProgress(1)
      }
    }

    setIsPlaying(true)
    pb.animationId = requestAnimationFrame(animate)
  }

  const togglePlayback = () => {
    if (isPlaying) {
      playbackRef.current.paused = !playbackRef.current.paused
    } else {
      startPlayback(playbackProgress >= 1 ? 0 : playbackProgress)
    }
  }

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value)
    setPlaybackProgress(newProgress)
    if (isPlaying) {
      startPlayback(newProgress)
    }
  }

  const handleUseAsTemplate = (id: string) => {
    setTemplate(templateId === id ? null : id)
  }

  const handleLoadArtwork = (artwork: { strokes: Stroke[] }) => {
    loadStrokes(artwork.strokes)
    setPlaybackProgress(0)
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '32px 24px',
          overflow: 'auto'
        }}
      >
        <div
          style={{
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.08)'
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              display: 'block',
              cursor: isPlaying ? 'default' : 'crosshair',
              maxWidth: '100%',
              height: 'auto'
            }}
          />
          {showSaveSuccess && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                backgroundColor: '#4caf50',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                animation: 'fadeInOut 2s ease-out'
              }}
            >
              ✓ 作品已保存
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}
        >
          <button
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#6d28d9'
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,58,237,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#7c3aed'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17,21 17,13 7,13 7,21" />
              <polyline points="7,3 7,8 15,8" />
            </svg>
            保存作品
          </button>

          <button
            onClick={clearCanvas}
            style={{
              backgroundColor: '#2a2a2a',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3a3a3a'
              e.currentTarget.style.transform = 'translateY(-3px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2a2a2a'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            清空画布
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#1e1e1e',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <button
              onClick={togglePlayback}
              style={{
                backgroundColor: isPlaying ? '#43a047' : '#4caf50',
                color: 'white',
                border: 'none',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#43a047'
                e.currentTarget.style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isPlaying ? '#43a047' : '#4caf50'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {isPlaying && !playbackRef.current.paused ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 0.5 : 1)}
              style={{
                backgroundColor: playbackSpeed === 0.5 ? '#7c3aed' : '#2a2a2a',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease-out'
              }}
            >
              {playbackSpeed}x
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={playbackProgress}
              onChange={handleProgressChange}
              style={{
                width: '120px',
                accentColor: '#7c3aed',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {template && (
          <div
            style={{
              marginTop: '16px',
              backgroundColor: 'rgba(124,58,237,0.15)',
              border: '1px dashed #9e9e9e',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#ccc'
            }}
          >
            📋 当前模板: {template.title}
            <button
              onClick={() => setTemplate(null)}
              style={{
                marginLeft: '12px',
                backgroundColor: 'transparent',
                color: '#ff6b6b',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              移除
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          width: '240px',
          backgroundColor: '#1e1e1e',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          padding: '24px 20px',
          overflowY: 'auto',
          flexShrink: 0
        }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, marginBottom: '12px', color: 'white' }}>
          笔触大小
        </h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {BRUSH_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setSize(size)}
              style={{
                flex: 1,
                height: '44px',
                borderRadius: '8px',
                backgroundColor: currentSize === size ? '#7c3aed' : '#2a2a2a',
                border: currentSize === size ? '2px solid #ff00ff' : '1px solid rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                if (currentSize !== size) e.currentTarget.style.transform = 'translateY(-3px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  backgroundColor: currentColor
                }}
              />
              {size}px
            </button>
          ))}
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, marginBottom: '12px', color: 'white' }}>
          颜色选择
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '6px',
            marginBottom: '16px'
          }}
        >
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                setColor(color)
                setCustomColor(color)
              }}
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: color,
                border: currentColor === color ? '2px solid white' : '2px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                boxSizing: 'border-box',
                boxShadow: color === '#ffffff' ? 'inset 0 0 0 1px rgba(0,0,0,0.2)' : 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: currentColor,
              border: '1px solid rgba(255,255,255,0.2)',
              flexShrink: 0
            }}
          />
          <input
            type="text"
            value={customColor}
            onChange={handleCustomColorChange}
            placeholder="#HEX"
            maxLength={7}
            style={{
              flex: 1,
              backgroundColor: '#2a2a2a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '8px 10px',
              color: 'white',
              fontSize: '13px',
              fontFamily: 'monospace',
              outline: 'none'
            }}
          />
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, marginBottom: '12px', color: 'white' }}>
          我的作品 ({artworks.length})
        </h3>
        {artworks.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
            保存作品后将显示在这里
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}
          >
            {artworks.map((artwork) => (
              <div
                key={artwork.id}
                style={{
                  position: 'relative',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                  border: templateId === artwork.id ? '2px dashed #9e9e9e' : '2px solid transparent',
                  boxShadow: '0 2px 8px #00000030'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = templateId === artwork.id ? '0 2px 8px #00000030' : 'none'
                }}
              >
                <img
                  src={artwork.thumbnail}
                  alt={artwork.title}
                  width="100%"
                  style={{ display: 'block', borderRadius: '4px' }}
                  onClick={() => handleLoadArtwork(artwork)}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '6px 8px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    display: 'flex',
                    gap: '6px'
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUseAsTemplate(artwork.id)
                    }}
                    style={{
                      fontSize: '10px',
                      padding: '3px 6px',
                      backgroundColor: templateId === artwork.id ? '#7c3aed' : 'rgba(255,255,255,0.15)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {templateId === artwork.id ? '✓ 模板' : '模板'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteArtwork(artwork.id)
                    }}
                    style={{
                      fontSize: '10px',
                      padding: '3px 6px',
                      backgroundColor: 'rgba(255,107,107,0.6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <canvas ref={templateCanvasRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          15%, 85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @media (max-width: 768px) {
          div[style*="width: 240px"] {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: 60px !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.06) !important;
            padding: 8px 12px !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            overflow-x: auto !important;
          }
          div[style*="width: 240px"] h3 {
            display: none !important;
          }
          div[style*="width: 240px"] > div {
            margin-bottom: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
