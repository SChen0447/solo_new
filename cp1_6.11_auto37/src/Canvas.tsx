import { useRef, useEffect, useState, useCallback } from 'react'
import { Packr } from 'msgpackr'
import { v4 as uuidv4 } from 'uuid'
import type {
  Shape,
  ToolType,
  Point,
  PathShape,
  RectShape,
  CircleShape,
  StickyShape,
  WSMessage,
  User,
} from './types'

const packr = new Packr({ structuredClone: true })

const MIN_SCALE = 0.5
const MAX_SCALE = 3.0
const FPS = 30
const FRAME_INTERVAL = 1000 / FPS

interface Handle {
  type: 'move' | 'rotate' | 'scale-tl' | 'scale-tr' | 'scale-bl' | 'scale-br'
  x: number
  y: number
}

interface CanvasProps {
  roomId: string
  userId: string
  userName: string
  userColor: string
  tool: ToolType
  color: string
  strokeWidth: number
  onUsersChange?: (users: Record<string, User>) => void
  onShapesChange?: (shapes: Shape[]) => void
}

export default function Canvas({
  roomId,
  userId,
  userName,
  userColor,
  tool,
  color,
  strokeWidth,
  onUsersChange,
  onShapesChange,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const shapesRef = useRef<Shape[]>([])
  const selectedIdRef = useRef<string | null>(null)

  const scaleRef = useRef(1)
  const offsetRef = useRef<Point>({ x: 0, y: 0 })

  const isDrawingRef = useRef(false)
  const isPanningRef = useRef(false)
  const isTransformingRef = useRef(false)
  const transformModeRef = useRef<'move' | 'rotate' | 'scale' | null>(null)
  const handleTypeRef = useRef<string | null>(null)

  const startPointRef = useRef<Point>({ x: 0, y: 0 })
  const lastPointRef = useRef<Point>({ x: 0, y: 0 })
  const tempShapeRef = useRef<Shape | null>(null)
  const selectedStartStateRef = useRef<Shape | null>(null)

  const pendingFramesRef = useRef(false)
  const lastFrameTimeRef = useRef(0)

  const stickyInputRef = useRef<HTMLInputElement | null>(null)
  const addingStickyRef = useRef<{ x: number; y: number } | null>(null)

  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const wsSend = useCallback((msg: WSMessage) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      const data = packr.pack(msg)
      ws.send(data)
    }
  }, [])

  const screenToWorld = useCallback((sx: number, sy: number): Point => {
    return {
      x: (sx - offsetRef.current.x) / scaleRef.current,
      y: (sy - offsetRef.current.y) / scaleRef.current,
    }
  }, [])

  const worldToScreen = useCallback((wx: number, wy: number): Point => {
    return {
      x: wx * scaleRef.current + offsetRef.current.x,
      y: wy * scaleRef.current + offsetRef.current.y,
    }
  }, [])

  const getShapeBounds = useCallback((shape: Shape): { x: number; y: number; width: number; height: number } => {
    switch (shape.type) {
      case 'path': {
        if (shape.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const p of shape.points) {
          minX = Math.min(minX, p.x)
          minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x)
          maxY = Math.max(maxY, p.y)
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
      }
      case 'rect':
        return { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
      case 'circle':
        return {
          x: shape.x - shape.radiusX,
          y: shape.y - shape.radiusY,
          width: shape.radiusX * 2,
          height: shape.radiusY * 2,
        }
      case 'sticky':
        return { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
    }
  }, [])

  const hitTestShape = useCallback((shape: Shape, wx: number, wy: number): boolean => {
    const bounds = getShapeBounds(shape)
    const padding = 10 / scaleRef.current
    return (
      wx >= bounds.x - padding &&
      wx <= bounds.x + bounds.width + padding &&
      wy >= bounds.y - padding &&
      wy <= bounds.y + bounds.height + padding
    )
  }, [getShapeBounds])

  const getHandles = useCallback((shape: Shape): Handle[] => {
    const bounds = getShapeBounds(shape)
    const handleSize = 8 / scaleRef.current
    const cx = bounds.x + bounds.width / 2
    const cy = bounds.y + bounds.height / 2
    const rotateOffset = 30 / scaleRef.current

    return [
      { type: 'scale-tl', x: bounds.x, y: bounds.y },
      { type: 'scale-tr', x: bounds.x + bounds.width, y: bounds.y },
      { type: 'scale-bl', x: bounds.x, y: bounds.y + bounds.height },
      { type: 'scale-br', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { type: 'rotate', x: cx, y: bounds.y - rotateOffset },
    ]
  }, [getShapeBounds])

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gridSize = 40 * scaleRef.current
    const offsetX = offsetRef.current.x % gridSize
    const offsetY = offsetRef.current.y % gridSize

    ctx.strokeStyle = '#3a3a5e'
    ctx.lineWidth = 1

    ctx.beginPath()
    for (let x = offsetX; x < w; x += gridSize) {
      ctx.moveTo(Math.floor(x) + 0.5, 0)
      ctx.lineTo(Math.floor(x) + 0.5, h)
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.moveTo(0, Math.floor(y) + 0.5)
      ctx.lineTo(w, Math.floor(y) + 0.5)
    }
    ctx.stroke()
  }, [])

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape, isSelected: boolean = false) => {
    ctx.save()

    const bounds = getShapeBounds(shape)
    const cx = bounds.x + bounds.width / 2
    const cy = bounds.y + bounds.height / 2

    if (shape.rotation !== 0) {
      ctx.translate(cx, cy)
      ctx.rotate((shape.rotation * Math.PI) / 180)
      ctx.translate(-cx, -cy)
    }

    switch (shape.type) {
      case 'path': {
        if (shape.points.length < 2) break
        ctx.strokeStyle = shape.color
        ctx.lineWidth = shape.strokeWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(shape.points[0].x, shape.points[0].y)
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y)
        }
        ctx.stroke()
        break
      }
      case 'rect': {
        ctx.strokeStyle = shape.color
        ctx.lineWidth = shape.strokeWidth
        if (shape.fill) {
          ctx.fillStyle = shape.fill
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height)
        }
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)
        break
      }
      case 'circle': {
        ctx.strokeStyle = shape.color
        ctx.lineWidth = shape.strokeWidth
        ctx.beginPath()
        ctx.ellipse(shape.x, shape.y, shape.radiusX, shape.radiusY, 0, 0, Math.PI * 2)
        if (shape.fill) {
          ctx.fillStyle = shape.fill
          ctx.fill()
        }
        ctx.stroke()
        break
      }
      case 'sticky': {
        ctx.fillStyle = shape.bgColor
        ctx.shadowColor = 'rgba(0,0,0,0.3)'
        ctx.shadowBlur = 8
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height)
        ctx.shadowColor = 'transparent'

        ctx.fillStyle = shape.textColor
        ctx.font = `${shape.fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`
        ctx.textBaseline = 'top'

        const padding = 8
        const maxWidth = shape.width - padding * 2
        const lines: string[] = []
        const words = shape.text.split('\n')
        for (const word of words) {
          if (ctx.measureText(word).width <= maxWidth) {
            lines.push(word)
          } else {
            let line = ''
            for (const ch of word) {
              const test = line + ch
              if (ctx.measureText(test).width <= maxWidth) {
                line = test
              } else {
                lines.push(line)
                line = ch
              }
            }
            if (line) lines.push(line)
          }
        }
        let y = shape.y + padding
        for (const line of lines) {
          ctx.fillText(line, shape.x + padding, y)
          y += shape.fontSize * 1.3
          if (y > shape.y + shape.height - padding) break
        }
        break
      }
    }

    if (isSelected) {
      ctx.restore()
      ctx.save()

      ctx.strokeStyle = '#00b4d8'
      ctx.lineWidth = 2 / scaleRef.current
      ctx.setLineDash([6 / scaleRef.current, 4 / scaleRef.current])
      ctx.strokeRect(bounds.x - 4 / scaleRef.current, bounds.y - 4 / scaleRef.current,
        bounds.width + 8 / scaleRef.current, bounds.height + 8 / scaleRef.current)
      ctx.setLineDash([])

      const handles = getHandles(shape)
      ctx.fillStyle = '#00b4d8'
      const hs = 4 / scaleRef.current
      for (const h of handles) {
        ctx.fillRect(h.x - hs, h.y - hs, hs * 2, hs * 2)
      }
    }

    ctx.restore()
  }, [getShapeBounds, getHandles])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    ctx.fillStyle = '#2a2a4e'
    ctx.fillRect(0, 0, w, h)

    drawGrid(ctx, w, h)

    ctx.save()
    ctx.translate(offsetRef.current.x, offsetRef.current.y)
    ctx.scale(scaleRef.current, scaleRef.current)

    for (const shape of shapesRef.current) {
      const isSelected = shape.id === selectedIdRef.current
      drawShape(ctx, shape, isSelected)
    }

    if (tempShapeRef.current) {
      ctx.globalAlpha = 0.7
      drawShape(ctx, tempShapeRef.current, false)
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }, [drawGrid, drawShape])

  const scheduleFrame = useCallback(() => {
    if (pendingFramesRef.current) return
    pendingFramesRef.current = true

    const now = performance.now()
    const elapsed = now - lastFrameTimeRef.current
    const delay = Math.max(0, FRAME_INTERVAL - elapsed)

    setTimeout(() => {
      pendingFramesRef.current = false
      lastFrameTimeRef.current = performance.now()
      render()
    }, delay)
  }, [render])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    scheduleFrame()
  }, [scheduleFrame])

  const startDrawing = useCallback((wx: number, wy: number) => {
    const timestamp = Date.now()

    switch (tool) {
      case 'pen': {
        const shape: PathShape = {
          id: uuidv4(),
          type: 'path',
          x: wx,
          y: wy,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          userId,
          userName,
          userColor,
          createdAt: timestamp,
          points: [{ x: wx, y: wy }],
          color,
          strokeWidth,
        }
        tempShapeRef.current = shape
        break
      }
      case 'rect': {
        const shape: RectShape = {
          id: uuidv4(),
          type: 'rect',
          x: wx,
          y: wy,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          userId,
          userName,
          userColor,
          createdAt: timestamp,
          width: 0,
          height: 0,
          color,
          strokeWidth,
          fill: null,
        }
        tempShapeRef.current = shape
        break
      }
      case 'circle': {
        const shape: CircleShape = {
          id: uuidv4(),
          type: 'circle',
          x: wx,
          y: wy,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          userId,
          userName,
          userColor,
          createdAt: timestamp,
          radiusX: 0,
          radiusY: 0,
          color,
          strokeWidth,
          fill: null,
        }
        tempShapeRef.current = shape
        break
      }
      case 'sticky': {
        addingStickyRef.current = { x: wx, y: wy }
        if (stickyInputRef.current) {
          const screen = worldToScreen(wx, wy)
          stickyInputRef.current.style.left = `${screen.x}px`
          stickyInputRef.current.style.top = `${screen.y}px`
          stickyInputRef.current.style.display = 'block'
          stickyInputRef.current.focus()
        }
        break
      }
      case 'select': {
        let foundId: string | null = null
        for (let i = shapesRef.current.length - 1; i >= 0; i--) {
          if (hitTestShape(shapesRef.current[i], wx, wy)) {
            foundId = shapesRef.current[i].id
            break
          }
        }
        selectedIdRef.current = foundId
        scheduleFrame()

        if (foundId) {
          const shape = shapesRef.current.find((s) => s.id === foundId)
          if (shape) {
            selectedStartStateRef.current = JSON.parse(JSON.stringify(shape))
            isTransformingRef.current = true
            transformModeRef.current = 'move'
          }
        }
        break
      }
    }
  }, [tool, userId, userName, userColor, color, strokeWidth, hitTestShape, worldToScreen, scheduleFrame])

  const updateDrawing = useCallback((wx: number, wy: number) => {
    if (!tempShapeRef.current) return

    const shape = tempShapeRef.current
    const startWx = startPointRef.current.x
    const startWy = startPointRef.current.y

    switch (shape.type) {
      case 'path': {
        shape.points.push({ x: wx, y: wy })
        break
      }
      case 'rect': {
        shape.x = Math.min(startWx, wx)
        shape.y = Math.min(startWy, wy)
        shape.width = Math.abs(wx - startWx)
        shape.height = Math.abs(wy - startWy)
        break
      }
      case 'circle': {
        const dx = wx - startWx
        const dy = wy - startWy
        shape.radiusX = Math.abs(dx)
        shape.radiusY = Math.abs(dy)
        break
      }
    }

    scheduleFrame()
  }, [scheduleFrame])

  const finishDrawing = useCallback(() => {
    if (tempShapeRef.current) {
      const shape = tempShapeRef.current
      if (isShapeValid(shape)) {
        shapesRef.current.push(shape)
        selectedIdRef.current = shape.id
        wsSend({
          type: 'shape_add',
          roomId,
          userId,
          payload: { shape },
          timestamp: Date.now(),
        })
      }
      tempShapeRef.current = null
    }

    if (isTransformingRef.current && selectedIdRef.current && selectedStartStateRef.current) {
      const shape = shapesRef.current.find((s) => s.id === selectedIdRef.current)
      if (shape) {
        wsSend({
          type: 'shape_update',
          roomId,
          userId,
          payload: {
            shapeId: selectedIdRef.current,
            updates: {
              x: shape.x,
              y: shape.y,
              rotation: shape.rotation,
              scaleX: shape.scaleX,
              scaleY: shape.scaleY,
              ...(shape.type === 'rect' ? { width: shape.width, height: shape.height } : {}),
              ...(shape.type === 'circle' ? { radiusX: shape.radiusX, radiusY: shape.radiusY } : {}),
              ...(shape.type === 'path' ? { points: (shape as PathShape).points } : {}),
            },
          },
          timestamp: Date.now(),
        })
      }
      selectedStartStateRef.current = null
    }

    isDrawingRef.current = false
    isTransformingRef.current = false
    transformModeRef.current = null
    handleTypeRef.current = null

    scheduleFrame()
    onShapesChange?.([...shapesRef.current])
  }, [roomId, userId, wsSend, scheduleFrame, onShapesChange])

  const isShapeValid = (shape: Shape): boolean => {
    switch (shape.type) {
      case 'path':
        return shape.points.length >= 2
      case 'rect':
        return shape.width > 2 && shape.height > 2
      case 'circle':
        return shape.radiusX > 2 || shape.radiusY > 2
      case 'sticky':
        return shape.text.trim().length > 0
      default:
        return false
    }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)

    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      isPanningRef.current = true
      startPointRef.current = { x: sx, y: sy }
      lastPointRef.current = { x: sx, y: sy }
      canvasRef.current!.style.cursor = 'grabbing'
      return
    }

    if (e.button !== 0) return

    startPointRef.current = world
    lastPointRef.current = world
    isDrawingRef.current = true
    startDrawing(world.x, world.y)
  }, [screenToWorld, startDrawing])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = screenToWorld(sx, sy)

    if (isPanningRef.current) {
      const dx = sx - lastPointRef.current.x
      const dy = sy - lastPointRef.current.y
      offsetRef.current.x += dx
      offsetRef.current.y += dy
      lastPointRef.current = { x: sx, y: sy }
      scheduleFrame()
      return
    }

    if (isTransformingRef.current && selectedIdRef.current) {
      const shape = shapesRef.current.find((s) => s.id === selectedIdRef.current)
      if (!shape) return

      const bounds = getShapeBounds(shape)
      const dx = world.x - lastPointRef.current.x
      const dy = world.y - lastPointRef.current.y

      if (transformModeRef.current === 'move') {
        if (shape.type === 'path') {
          shape.points = shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
        } else {
          shape.x += dx
          shape.y += dy
        }
      }

      lastPointRef.current = world
      scheduleFrame()
      return
    }

    if (isDrawingRef.current && tempShapeRef.current) {
      updateDrawing(world.x, world.y)
      lastPointRef.current = world
    }
  }, [screenToWorld, getShapeBounds, updateDrawing, scheduleFrame])

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false
      if (canvasRef.current) {
        canvasRef.current.style.cursor = tool === 'select' ? 'default' : 'crosshair'
      }
      return
    }

    if (isDrawingRef.current || isTransformingRef.current) {
      finishDrawing()
    }
  }, [tool, finishDrawing])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    let newScale = scaleRef.current * delta
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))

    if (newScale === scaleRef.current) return

    const ratio = newScale / scaleRef.current
    offsetRef.current.x = sx - (sx - offsetRef.current.x) * ratio
    offsetRef.current.y = sy - (sy - offsetRef.current.y) * ratio
    scaleRef.current = newScale

    scheduleFrame()
  }, [scheduleFrame])

  const handleStickyInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && addingStickyRef.current) {
      const input = e.currentTarget
      const text = input.value.trim()
      if (text && addingStickyRef.current) {
        const timestamp = Date.now()
        const shape: StickyShape = {
          id: uuidv4(),
          type: 'sticky',
          x: addingStickyRef.current.x,
          y: addingStickyRef.current.y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          userId,
          userName,
          userColor,
          createdAt: timestamp,
          text,
          width: 180,
          height: 120,
          fontSize: 14,
          bgColor: '#ffeb3b',
          textColor: '#000',
        }
        shapesRef.current.push(shape)
        selectedIdRef.current = shape.id
        wsSend({
          type: 'shape_add',
          roomId,
          userId,
          payload: { shape },
          timestamp: Date.now(),
        })
        onShapesChange?.([...shapesRef.current])
        scheduleFrame()
      }
      input.value = ''
      input.style.display = 'none'
      addingStickyRef.current = null
    } else if (e.key === 'Escape') {
      e.currentTarget.value = ''
      e.currentTarget.style.display = 'none'
      addingStickyRef.current = null
    }
  }, [userId, userName, userColor, roomId, wsSend, onShapesChange, scheduleFrame])

  const handleUndo = useCallback(() => {
    wsSend({
      type: 'undo',
      roomId,
      userId,
      timestamp: Date.now(),
    })
  }, [roomId, userId, wsSend])

  const handleRedo = useCallback(() => {
    wsSend({
      type: 'redo',
      roomId,
      userId,
      timestamp: Date.now(),
    })
  }, [roomId, userId, wsSend])

  const handleExport = useCallback(() => {
    setIsExporting(true)

    const exportCanvas = document.createElement('canvas')
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) {
      setIsExporting(false)
      return
    }

    let completed = false
    const timeoutId = setTimeout(() => {
      if (!completed) {
        setIsExporting(false)
        alert('导出超时，请重试')
      }
    }, 3000)

    requestAnimationFrame(() => {
      if (shapesRef.current.length === 0) {
        exportCanvas.width = 800
        exportCanvas.height = 600
        ctx.fillStyle = '#2a2a4e'
        ctx.fillRect(0, 0, 800, 600)
      } else {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const shape of shapesRef.current) {
          const bounds = getShapeBounds(shape)
          minX = Math.min(minX, bounds.x)
          minY = Math.min(minY, bounds.y)
          maxX = Math.max(maxX, bounds.x + bounds.width)
          maxY = Math.max(maxY, bounds.y + bounds.height)
        }

        const padding = 40
        const w = Math.ceil(maxX - minX + padding * 2)
        const h = Math.ceil(maxY - minY + padding * 2)

        exportCanvas.width = w
        exportCanvas.height = h

        ctx.fillStyle = '#2a2a4e'
        ctx.fillRect(0, 0, w, h)

        ctx.save()
        ctx.translate(padding - minX, padding - minY)
        for (const shape of shapesRef.current) {
          drawShape(ctx, shape, false)
        }
        ctx.restore()
      }

      const dataUrl = exportCanvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `whiteboard-${roomId}-${Date.now()}.png`
      link.href = dataUrl
      link.click()

      completed = true
      clearTimeout(timeoutId)
      setTimeout(() => setIsExporting(false), 300)
    })
  }, [getShapeBounds, drawShape, roomId])

  useEffect(() => {
    const exportBtn = document.getElementById('export-btn')
    if (exportBtn) {
      const handler = () => handleExport()
      exportBtn.addEventListener('click', handler)
      return () => exportBtn.removeEventListener('click', handler)
    }
  }, [handleExport])

  useEffect(() => {
    const ws = new WebSocket('/ws')
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      wsSend({
        type: 'join',
        roomId,
        userId,
        payload: {
          user: {
            id: userId,
            name: userName,
            color: userColor,
            joinedAt: Date.now(),
          },
        },
        timestamp: Date.now(),
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = new Uint8Array(event.data)
        const msg = packr.unpack(data) as WSMessage
        handleWSMessage(msg)
      } catch (e) {
        console.error('Failed to unpack WS message:', e)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
    }

    ws.onerror = (e) => {
      console.error('WebSocket error:', e)
    }

    return () => {
      ws.close()
    }
  }, [roomId, userId])

  const handleWSMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case 'shapes_snapshot': {
        shapesRef.current = msg.payload.shapes || []
        scheduleFrame()
        onShapesChange?.([...shapesRef.current])
        break
      }
      case 'user_list': {
        onUsersChange?.(msg.payload.users || {})
        break
      }
      case 'shape_add': {
        if (msg.userId !== userId) {
          const shape = msg.payload.shape as Shape
          shapesRef.current.push(shape)
          scheduleFrame()
          onShapesChange?.([...shapesRef.current])
        }
        break
      }
      case 'shape_update': {
        if (msg.userId !== userId) {
          const { shapeId, updates } = msg.payload
          const idx = shapesRef.current.findIndex((s) => s.id === shapeId)
          if (idx !== -1) {
            shapesRef.current[idx] = { ...shapesRef.current[idx], ...updates } as Shape
            scheduleFrame()
            onShapesChange?.([...shapesRef.current])
          }
        }
        break
      }
      case 'shape_delete': {
        if (msg.userId !== userId) {
          const { shapeId } = msg.payload
          shapesRef.current = shapesRef.current.filter((s) => s.id !== shapeId)
          if (selectedIdRef.current === shapeId) {
            selectedIdRef.current = null
          }
          scheduleFrame()
          onShapesChange?.([...shapesRef.current])
        }
        break
      }
      case 'history_snapshot': {
        shapesRef.current = msg.payload.shapes || []
        scheduleFrame()
        onShapesChange?.([...shapesRef.current])
        setCanUndo(shapesRef.current.length > 0 || true)
        setCanRedo(true)
        break
      }
      case 'pong':
        break
    }
  }, [userId, scheduleFrame, onShapesChange, onUsersChange])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault()
          if (e.shiftKey) {
            handleRedo()
          } else {
            handleUndo()
          }
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIdRef.current && document.activeElement?.tagName !== 'INPUT') {
          const shapeId = selectedIdRef.current
          shapesRef.current = shapesRef.current.filter((s) => s.id !== shapeId)
          selectedIdRef.current = null
          wsSend({
            type: 'shape_delete',
            roomId,
            userId,
            payload: { shapeId },
            timestamp: Date.now(),
          })
          scheduleFrame()
          onShapesChange?.([...shapesRef.current])
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [roomId, userId, handleUndo, handleRedo, wsSend, scheduleFrame, onShapesChange])

  return (
    <div ref={containerRef} style={styles.container}>
      <canvas
        ref={canvasRef}
        style={{
          ...styles.canvas,
          cursor: tool === 'select' ? 'default' : 'crosshair',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      <input
        ref={stickyInputRef}
        style={styles.stickyInput}
        placeholder="输入便签文字，按回车确认"
        onKeyDown={handleStickyInput}
        onBlur={(e) => {
          e.target.style.display = 'none'
          addingStickyRef.current = null
        }}
      />

      <div style={styles.bottomBar}>
        <button
          style={{ ...styles.bottomBtn, opacity: canUndo ? 1 : 0.4 }}
          onClick={handleUndo}
          disabled={!canUndo}
        >
          ↶ 撤销
        </button>
        <button
          style={{ ...styles.bottomBtn, opacity: canRedo ? 1 : 0.4 }}
          onClick={handleRedo}
          disabled={!canRedo}
        >
          ↷ 重做
        </button>
        <div style={styles.zoomInfo}>
          {Math.round(scaleRef.current * 100)}%
        </div>
      </div>

      {isExporting && (
        <div style={styles.exportOverlay}>
          <div style={styles.exportLoading}>
            <div className="loading-spinner" style={styles.spinner} />
            <span style={styles.exportText}>正在导出...</span>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
  },
  stickyInput: {
    position: 'absolute',
    display: 'none',
    padding: '8px 10px',
    fontSize: '13px',
    backgroundColor: '#ffeb3b',
    color: '#000',
    border: '2px solid #00b4d8',
    borderRadius: '4px',
    outline: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    width: '200px',
    zIndex: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: 'rgba(22, 33, 62, 0.9)',
    backdropFilter: 'blur(8px)',
    borderRadius: '10px',
    border: '1px solid #2a2a4e',
  },
  bottomBtn: {
    padding: '8px 14px',
    fontSize: '13px',
    color: '#e2e8f0',
    backgroundColor: '#0f3460',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  zoomInfo: {
    fontSize: '12px',
    color: '#8892b0',
    minWidth: '48px',
    textAlign: 'center',
  },
  exportOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    transition: 'opacity 0.3s',
  },
  exportLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '24px 32px',
    backgroundColor: '#16213e',
    borderRadius: '12px',
    border: '1px solid #2a2a4e',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #2a2a4e',
    borderTopColor: '#00b4d8',
    borderRadius: '50%',
  },
  exportText: {
    fontSize: '14px',
    color: '#e2e8f0',
  },
}
