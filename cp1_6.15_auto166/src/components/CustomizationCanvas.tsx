import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useOrderStore, PlacedFlower, PackagingStyle } from '../stores/orderStore'

interface CustomizationCanvasProps {
  packaging: PackagingStyle | null
}

const CustomizationCanvas: React.FC<CustomizationCanvasProps> = ({ packaging }) => {
  const { flowers, addFlower, updateFlowerPosition, removeFlower } = useOrderStore()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragImage, setDragImage] = useState<{ emoji: string; x: number; y: number } | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const flowerData = e.dataTransfer.getData('application/json')
    if (!flowerData || !canvasRef.current) return

    try {
      const flower = JSON.parse(flowerData)
      const rect = canvasRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(e.clientX - rect.left - 50, 300))
      const y = Math.max(0, Math.min(e.clientY - rect.top - 50, 300))

      const placedFlower: PlacedFlower = {
        id: `${flower.id}-${Date.now()}`,
        flowerId: flower.id,
        name: flower.name,
        emoji: flower.emoji,
        color: flower.color,
        x,
        y
      }
      addFlower(placedFlower)
    } catch (err) {
      console.error('Drop error:', err)
    }
    setDragImage(null)
  }

  const handleFlowerMouseDown = (e: React.MouseEvent, flower: PlacedFlower) => {
    if (!canvasRef.current) return
    e.stopPropagation()
    const rect = canvasRef.current.getBoundingClientRect()
    setDraggingId(flower.id)
    setDragOffset({
      x: e.clientX - rect.left - flower.x,
      y: e.clientY - rect.top - flower.y
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, 300))
    const y = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, 300))
    updateFlowerPosition(draggingId, x, y)
  }, [draggingId, dragOffset, updateFlowerPosition])

  const handleMouseUp = useCallback(() => {
    setDraggingId(null)
  }, [])

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggingId, handleMouseMove, handleMouseUp])

  const handleFlowerDoubleClick = (id: string) => {
    removeFlower(id)
  }

  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement
      if (target.dataset.flowerEmoji) {
        setDragImage({
          emoji: target.dataset.flowerEmoji,
          x: e.clientX,
          y: e.clientY
        })
      }
    }

    const handleDragEnd = () => {
      setDragImage(null)
    }

    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('dragend', handleDragEnd)
    return () => {
      document.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('dragend', handleDragEnd)
    }
  }, [])

  const bgStyle = packaging
    ? { backgroundColor: packaging.color, backgroundImage: packaging.pattern || 'none' }
    : { backgroundColor: '#fafafa' }

  return (
    <div className="canvas-wrapper">
      <div
        ref={canvasRef}
        className="customization-canvas"
        style={bgStyle}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {flowers.length === 0 && (
          <div className="canvas-placeholder">
            <span>🌸</span>
            <p>将花材拖拽到这里</p>
          </div>
        )}
        {flowers.map((flower) => (
          <div
            key={flower.id}
            className={`placed-flower ${draggingId === flower.id ? 'dragging' : ''}`}
            style={{ left: flower.x, top: flower.y }}
            onMouseDown={(e) => handleFlowerMouseDown(e, flower)}
            onDoubleClick={() => handleFlowerDoubleClick(flower.id)}
            title={`${flower.name}（双击删除）`}
          >
            <span className="flower-emoji">{flower.emoji}</span>
          </div>
        ))}
      </div>
      {dragImage && (
        <div
          className="drag-ghost"
          style={{
            left: dragImage.x - 30,
            top: dragImage.y - 30
          }}
        >
          {dragImage.emoji}
        </div>
      )}
    </div>
  )
}

export default CustomizationCanvas
