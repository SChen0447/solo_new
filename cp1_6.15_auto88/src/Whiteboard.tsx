import { useRef, useEffect, useCallback, useState } from 'react'
import axios from 'axios'
import { useStore } from './store'

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasContent = useRef(false)

  const addTasks = useStore((s) => s.addTasks)
  const groups = useStore((s) => s.groups)
  const ocrLoading = useStore((s) => s.ocrLoading)
  const setOcrLoading = useStore((s) => s.setOcrLoading)

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      const w = rect.width - 32
      const h = w * (297 / 210)
      setCanvasSize({ width: Math.floor(w), height: Math.floor(Math.min(h, rect.height - 80)) })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || canvasSize.width === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#f7f3e3'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.strokeStyle = 'rgba(200,168,130,0.15)'
    ctx.lineWidth = 1
    const lineSpacing = 32
    for (let y = lineSpacing; y < canvasSize.height; y += lineSpacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasSize.width, y)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(200,168,130,0.25)'
    ctx.lineWidth = 1.5
    const leftMargin = 48
    ctx.beginPath()
    ctx.moveTo(leftMargin, 0)
    ctx.lineTo(leftMargin, canvasSize.height)
    ctx.stroke()
  }, [canvasSize])

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      if (e.touches.length === 0) return null
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const point = getCanvasPoint(e)
    if (!point) return

    isDrawing.current = true
    lastPoint.current = point

    if (idleTimer.current) {
      clearTimeout(idleTimer.current)
      idleTimer.current = null
    }
  }, [getCanvasPoint])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing.current) return

    const point = getCanvasPoint(e)
    if (!point || !lastPoint.current) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    ctx.beginPath()
    ctx.strokeStyle = '#2d2d2d'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()

    lastPoint.current = point
    hasContent.current = true
  }, [getCanvasPoint])

  const stopDrawing = useCallback(() => {
    isDrawing.current = false
    lastPoint.current = null

    if (!hasContent.current) return

    if (idleTimer.current) {
      clearTimeout(idleTimer.current)
    }
    idleTimer.current = setTimeout(() => {
      triggerOCR()
    }, 2000)
  }, [])

  const triggerOCR = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasContent.current) return

    setOcrLoading(true)

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) {
        setOcrLoading(false)
        return
      }

      const formData = new FormData()
      formData.append('image', blob, 'whiteboard.png')

      const response = await axios.post('/api/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (response.data.success && response.data.tasks.length > 0) {
        const defaultGroup = groups[0]?.id || 'default'
        const newTasks = response.data.tasks.map(
          (task: { name: string; startDate: string; endDate: string; progress: number; priority: 'high' | 'medium' | 'low' }) => ({
            id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: task.name,
            startDate: task.startDate,
            endDate: task.endDate,
            progress: task.progress,
            priority: task.priority,
            groupId: defaultGroup,
          })
        )
        addTasks(newTasks)
      }
    } catch (error) {
      console.error('OCR failed:', error)
    } finally {
      setOcrLoading(false)
    }
  }, [addTasks, groups, setOcrLoading])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    ctx.fillStyle = '#f7f3e3'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.strokeStyle = 'rgba(200,168,130,0.15)'
    ctx.lineWidth = 1
    const lineSpacing = 32
    for (let y = lineSpacing; y < canvasSize.height; y += lineSpacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasSize.width, y)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(200,168,130,0.25)'
    ctx.lineWidth = 1.5
    const leftMargin = 48
    ctx.beginPath()
    ctx.moveTo(leftMargin, 0)
    ctx.lineTo(leftMargin, canvasSize.height)
    ctx.stroke()

    hasContent.current = false
  }, [canvasSize])

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center p-4">
      <div className="flex items-center justify-between w-full mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-ink font-journal text-lg tracking-wide">✏️ 白板</span>
          {ocrLoading && (
            <span className="text-xs text-wood-dark animate-pulse">识别中...</span>
          )}
        </div>
        <button
          onClick={clearCanvas}
          className="px-3 py-1 text-xs rounded-md bg-wood/10 text-wood-dark hover:bg-wood/20 transition-colors"
        >
          清除
        </button>
      </div>

      <div
        className="relative rounded-md shadow-[0_2px_6px_rgba(0,0,0,0.1)] overflow-hidden"
        style={{ width: canvasSize.width || '100%', height: canvasSize.height || '100%' }}
      >
        <canvas
          ref={canvasRef}
          className="touch-none cursor-crosshair"
          style={{ width: canvasSize.width || '100%', height: canvasSize.height || '100%' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {!hasContent.current && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-wood/40">
              <p className="text-sm font-body mb-1">在此处手写待办事项</p>
              <p className="text-xs">格式：任务名 起始日/月 截止日/月 进度%</p>
              <p className="text-xs mt-0.5">例：调研完成 15/03 20/03 60%</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
