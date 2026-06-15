import React, { useState, useRef, useEffect, useCallback } from 'react'
import { RGB, rgbToHex, rgbToHsl, hslToRgb } from '../hooks/useColorExtractor'

interface ColorPaletteProps {
  colors: RGB[]
  onColorsChange: (colors: RGB[]) => void
}

interface TooltipState {
  index: number | null
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ colors, onColorsChange }) => {
  const [tooltip, setTooltip] = useState<TooltipState>({ index: null })
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [tempColor, setTempColor] = useState<RGB | null>(null)
  const tooltipTimersRef = useRef<Map<number, number>>(new Map())
  const lastTapRef = useRef<{ index: number; time: number } | null>(null)

  const showTooltip = useCallback((index: number) => {
    const oldTimer = tooltipTimersRef.current.get(index)
    if (oldTimer) {
      window.clearTimeout(oldTimer)
    }

    setTooltip({ index })

    const timer = window.setTimeout(() => {
      setTooltip(prev => prev.index === index ? { index: null } : prev)
      tooltipTimersRef.current.delete(index)
    }, 2000)
    tooltipTimersRef.current.set(index, timer)
  }, [])

  const handleSwatchClick = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const now = Date.now()
    const lastTap = lastTapRef.current

    if (lastTap && lastTap.index === index && now - lastTap.time < 300) {
      lastTapRef.current = null
      handleOpenPicker(index)
      return
    } else {
      lastTapRef.current = { index, time: now }
      showTooltip(index)
    }
  }, [showTooltip])

  const handleOpenPicker = useCallback((index: number) => {
    setEditingIndex(index)
    setTempColor({ ...colors[index] })
    setPickerOpen(true)
  }, [colors])

  const handleClosePicker = useCallback(() => {
    setPickerOpen(false)
    setEditingIndex(null)
    setTempColor(null)
  }, [])

  const handleConfirmColor = useCallback(() => {
    if (editingIndex !== null && tempColor) {
      const newColors = [...colors]
      newColors[editingIndex] = tempColor
      onColorsChange(newColors)
    }
    handleClosePicker()
  }, [editingIndex, tempColor, colors, onColorsChange, handleClosePicker])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }, [dragOverIndex])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      const newColors = [...colors]
      const [removed] = newColors.splice(draggedIndex, 1)
      newColors.splice(targetIndex, 0, removed)
      onColorsChange(newColors)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, colors, onColorsChange])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  useEffect(() => {
    return () => {
      tooltipTimersRef.current.forEach(timer => window.clearTimeout(timer))
    }
  }, [])

  if (colors.length === 0) return null

  return (
    <section className="palette-section">
      <h2 className="section-title">提取的主色板（拖拽排序，单击查看色值，双击编辑）</h2>
      <div className="palette-strip">
        {colors.map((color, index) => (
          <div
            key={index}
            className={`color-swatch ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index && draggedIndex !== index ? 'drag-over' : ''}`}
            style={{ backgroundColor: rgbToHex(color) }}
            draggable
            onClick={(e) => handleSwatchClick(index, e)}
            onDoubleClick={() => handleOpenPicker(index)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            {tooltip.index === index && (
              <div className="color-tooltip">
              <div className="hex">{rgbToHex(color)}</div>
              <div className="rgb">RGB({color.r}, {color.g}, {color.b})</div>
            </div>
            )}
          </div>
        ))}
      </div>

      {pickerOpen && editingIndex !== null && tempColor && (
        <ColorPickerModal
          initialColor={tempColor}
          onColorChange={setTempColor}
          onConfirm={handleConfirmColor}
          onCancel={handleClosePicker}
        />
      )}
    </section>
  )
}

interface ColorPickerModalProps {
  initialColor: RGB
  onColorChange: (color: RGB) => void
  onConfirm: () => void
  onCancel: () => void
}

const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  initialColor,
  onColorChange,
  onConfirm,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [sliderPos, setSliderPos] = useState<{ x: number; y: number }>({ x: 120, y: 120 })
  const [isDragging, setIsDragging] = useState(false)

  const drawColorWheel = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(centerX, centerY) - 2

    const imageData = ctx.createImageData(width, height)
    const data = imageData.data

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX
        const dy = y - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist <= radius) {
          let hue = Math.atan2(dy, dx) * (180 / Math.PI)
          if (hue < 0) hue += 360
          const saturation = (dist / radius) * 100
          const lightness = 50

          const rgb = hslToRgb(hue, saturation, lightness)
          const idx = (y * width + x) * 4
          data[idx] = rgb.r
          data[idx + 1] = rgb.g
          data[idx + 2] = rgb.b
          data[idx + 3] = 255
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawColorWheel(ctx, 240, 240)

    const hsl = rgbToHsl(initialColor)
    const centerX = 120
    const centerY = 120
    const radius = 118
    const rad = (hsl.h * Math.PI) / 180
    const dist = (hsl.s / 100) * radius
    const x = centerX + Math.cos(rad) * dist
    const y = centerY + Math.sin(rad) * dist
    setSliderPos({ x, y })
  }, [initialColor, drawColorWheel])

  const updateColorFromPos = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const centerX = 120
    const centerY = 120
    const radius = 118

    let dx = x - centerX
    let dy = y - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)

    let clampedX = x
    let clampedY = y

    if (dist > radius) {
      const angle = Math.atan2(dy, dx)
      clampedX = centerX + Math.cos(angle) * radius
      clampedY = centerY + Math.sin(angle) * radius
      dx = clampedX - centerX
      dy = clampedY - centerY
    }

    setSliderPos({ x: clampedX, y: clampedY })

    let hue = Math.atan2(dy, dx) * (180 / Math.PI)
    if (hue < 0) hue += 360
    const saturation = (Math.min(dist, radius) / radius) * 100
    const lightness = 50

    const rgb = hslToRgb(hue, saturation, lightness)
    onColorChange(rgb)
  }, [onColorChange])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    updateColorFromPos(e.clientX, e.clientY)
  }, [updateColorFromPos])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    updateColorFromPos(e.clientX, e.clientY)
  }, [isDragging, updateColorFromPos])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      if (
        e.clientX >= rect.left - 50 &&
        e.clientX <= rect.right + 50 &&
        e.clientY >= rect.top - 50 &&
        e.clientY <= rect.bottom + 50
      ) {
        handleMouseMove({ clientX: e.clientX, clientY: e.clientY } as React.MouseEvent)
      }
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, handleMouseMove])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    setIsDragging(true)
    updateColorFromPos(touch.clientX, touch.clientY)
  }, [updateColorFromPos])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const touch = e.touches[0]
    updateColorFromPos(touch.clientX, touch.clientY)
  }, [isDragging, updateColorFromPos])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div className="color-picker-modal" onClick={onCancel}>
      <div className="color-picker-container" onClick={(e) => e.stopPropagation()}>
        <div className="color-picker-title">选择颜色</div>
        <div className="color-wheel-wrapper" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="color-wheel"
            width={240}
            height={240}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <div
            className="color-wheel-slider"
            style={{
              left: sliderPos.x,
              top: sliderPos.y,
              backgroundColor: rgbToHex(initialColor),
            }}
          />
        </div>
        <div className="picker-current-color">
          <div
            className="picker-color-preview"
            style={{ backgroundColor: rgbToHex(initialColor) }}
          />
          <div className="picker-color-values">
            <div>HEX: <strong>{rgbToHex(initialColor)}</strong></div>
            <div>RGB: <strong>({initialColor.r}, {initialColor.g}, {initialColor.b})</strong></div>
          </div>
        </div>
        <div className="picker-buttons">
          <button className="picker-btn cancel" onClick={onCancel}>
            取消
          </button>
          <button className="picker-btn confirm" onClick={onConfirm}>
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColorPalette
