import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useOrderStore, CARD_COLORS, DoodlePoint } from '../stores/orderStore'

interface CardCanvasProps {
  isOpen: boolean
  onClose: () => void
}

const CardCanvas: React.FC<CardCanvasProps> = ({ isOpen, onClose }) => {
  const { card, setCardData } = useOrderStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<DoodlePoint[]>([])

  const canvasWidth = 300
  const canvasHeight = 200

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = card.backgroundColor
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.strokeStyle = '#333'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ;[...card.doodles, currentPath].forEach((path) => {
      if (path.length < 2) return
      ctx.beginPath()
      ctx.moveTo(path[0].x, path[0].y)
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y)
      }
      ctx.stroke()
    })

    if (card.text) {
      ctx.font = '20px cursive'
      ctx.fillStyle = '#333'
      ctx.textAlign = 'center'
      ctx.fillText(card.text, canvasWidth / 2, canvasHeight - 20)
    }
  }, [card, currentPath])

  useEffect(() => {
    if (isOpen) {
      redrawCanvas()
    }
  }, [isOpen, redrawCanvas])

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): DoodlePoint => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const point = getCanvasPoint(e)
    setCurrentPath([point])
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const point = getCanvasPoint(e)
    setCurrentPath((prev) => [...prev, point])
  }

  const handleMouseUp = () => {
    if (!isDrawing || currentPath.length === 0) return
    setIsDrawing(false)
    setCardData({ doodles: [...card.doodles, currentPath] })
    setCurrentPath([])
  }

  const handleMouseLeave = () => {
    if (isDrawing && currentPath.length > 0) {
      setIsDrawing(false)
      setCardData({ doodles: [...card.doodles, currentPath] })
      setCurrentPath([])
    }
  }

  const handleClearDoodles = () => {
    setCardData({ doodles: [] })
    setCurrentPath([])
  }

  const handleColorSelect = (color: string) => {
    setCardData({ backgroundColor: color })
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.slice(0, 50)
    setCardData({ text })
  }

  if (!isOpen) return null

  return (
    <div className="card-modal-overlay" onClick={onClose}>
      <div
        className="card-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-modal-header">
          <h3>祝福卡片设计</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="card-canvas-container">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="card-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
        </div>

        <div className="card-controls">
          <div className="color-picker-section">
            <label>背景色：</label>
            <div className="color-options">
              {CARD_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-option ${card.backgroundColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                />
              ))}
            </div>
          </div>

          <div className="text-input-section">
            <label>祝福语（最多50字）：</label>
            <input
              type="text"
              value={card.text}
              onChange={handleTextChange}
              placeholder="写下你的祝福..."
              maxLength={50}
              className="blessing-input"
            />
            <span className="char-count">{card.text.length}/50</span>
          </div>

          <button className="clear-btn" onClick={handleClearDoodles}>
            清除涂鸦
          </button>
        </div>
      </div>
    </div>
  )
}

export default CardCanvas
