import type { BoardElement, Point, ToolType } from '../types'
import { useWhiteboardStore } from '../store/whiteboardStore'

const ACCENT = '#FF6B6B'
const GRID_BASE = 50
const GRID_FAINT = '#EDF2F7'
const GRID_BOLD = '#E2E8F0'

interface AnimationState {
  targetZoom: number
  currentZoom: number
  targetPanX: number
  targetPanY: number
  currentPanX: number
  currentPanY: number
  elementAnimations: Record<string, { startAt: number; duration: number; kind: 'add' | 'update' }>
}

export interface CanvasRendererHandles {
  screenToWorld: (sx: number, sy: number) => Point
  worldToScreen: (wx: number, wy: number) => Point
  hitTest: (wx: number, wy: number, tolerance?: number) => string | null
  startDrawing: (wx: number, wy: number, tool: ToolType) => void
  updateDrawing: (wx: number, wy: number) => void
  endDrawing: () => void
  cancelDrawing: () => void
  currentPreviewElement: BoardElement | null
  startDragging: (id: string, wx: number, wy: number) => void
  updateDragging: (wx: number, wy: number) => void
  endDragging: () => void
  setSelectionBox: (box: { x1: number; y1: number; x2: number; y2: number } | null) => void
  stop: () => void
  resize: () => void
}

export function createCanvasRenderer(canvas: HTMLCanvasElement): CanvasRendererHandles {
  const ctx = canvas.getContext('2d')!
  let dpr = window.devicePixelRatio || 1
  let width = 0
  let height = 0
  let rafId = 0
  let running = true

  const anim: AnimationState = {
    targetZoom: 1,
    currentZoom: 1,
    targetPanX: 0,
    targetPanY: 0,
    currentPanX: 0,
    currentPanY: 0,
    elementAnimations: {}
  }

  let previewEl: BoardElement | null = null
  let previewStartPoint: Point | null = null
  let selectionBox: { x1: number; y1: number; x2: number; y2: number } | null = null

  let dragging: { id: string; offsetX: number; offsetY: number; prevX: number; prevY: number } | null = null

  function resize() {
    const rect = canvas.getBoundingClientRect()
    width = rect.width
    height = rect.height
    dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
  }

  resize()
  window.addEventListener('resize', resize)

  function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t
  }
  function damp(prev: number, target: number, dt: number, smoothTime: number = 0.12) {
    const omega = 2 / Math.max(0.001, smoothTime)
    const x = omega * dt
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
    return lerp(target, prev, exp)
  }

  function screenToWorld(sx: number, sy: number): Point {
    return {
      x: (sx - anim.currentPanX) / anim.currentZoom,
      y: (sy - anim.currentPanY) / anim.currentZoom
    }
  }
  function worldToScreen(wx: number, wy: number): Point {
    return {
      x: wx * anim.currentZoom + anim.currentPanX,
      y: wy * anim.currentZoom + anim.currentPanY
    }
  }

  function readViewport() {
    const st = useWhiteboardStore.getState()
    anim.targetZoom = st.zoom
    anim.targetPanX = st.panX
    anim.targetPanY = st.panY
  }

  function drawGrid() {
    ctx.fillStyle = '#F8FAFC'
    ctx.fillRect(0, 0, width, height)

    const z = anim.currentZoom
    let spacing = GRID_BASE
    while (spacing * z < 25) spacing *= 2
    while (spacing * z > 100) spacing /= 2

    const majorSpacing = spacing * 5

    const originX = anim.currentPanX
    const originY = anim.currentPanY

    const startX = ((-originX) % (spacing * z) + spacing * z) % (spacing * z)
    const startY = ((-originY) % (spacing * z) + spacing * z) % (spacing * z)

    ctx.strokeStyle = GRID_FAINT
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = startX; x < width; x += spacing * z) {
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, height)
    }
    for (let y = startY; y < height; y += spacing * z) {
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(width, y + 0.5)
    }
    ctx.stroke()

    const mStartX = ((-originX) % (majorSpacing * z) + majorSpacing * z) % (majorSpacing * z)
    const mStartY = ((-originY) % (majorSpacing * z) + majorSpacing * z) % (majorSpacing * z)
    ctx.strokeStyle = GRID_BOLD
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = mStartX; x < width; x += majorSpacing * z) {
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, height)
    }
    for (let y = mStartY; y < height; y += majorSpacing * z) {
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(width, y + 0.5)
    }
    ctx.stroke()
  }

  function drawElement(el: BoardElement, alpha = 1, extraScale = 1) {
    if (!el.visible) return
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.lineWidth = Math.max(1, el.strokeWidth * anim.currentZoom)
    ctx.strokeStyle = el.stroke ?? ACCENT
    ctx.fillStyle = el.fill ?? 'transparent'

    const cx = el.x
    const cy = el.y
    const w = el.width * extraScale
    const h = el.height * extraScale

    switch (el.type) {
      case 'circle': {
        const rx = Math.abs(w) / 2
        const ry = Math.abs(h) / 2
        const centerX = cx + (w >= 0 ? 0 : w) + (el.width >= 0 ? 0 : 0)
        const centerY = cy + (h >= 0 ? 0 : h)
        ctx.beginPath()
        ctx.ellipse(centerX + Math.abs(el.width) / 2, centerY + Math.abs(el.height) / 2, rx, ry, 0, 0, Math.PI * 2)
        if (el.fill) { ctx.fill() }
        if (el.stroke && el.strokeWidth > 0) { ctx.stroke() }
        break
      }
      case 'rectangle': {
        const drawX = w >= 0 ? cx : cx + w
        const drawY = h >= 0 ? cy : cy + h
        if (el.fill) { ctx.fillRect(drawX, drawY, Math.abs(w), Math.abs(h)) }
        if (el.stroke && el.strokeWidth > 0) { ctx.strokeRect(drawX, drawY, Math.abs(w), Math.abs(h)) }
        break
      }
      case 'line': {
        if (!el.points || el.points.length < 2) {
          const drawX = w >= 0 ? cx : cx + w
          const drawY = h >= 0 ? cy : cy + h
          ctx.beginPath()
          ctx.moveTo(drawX, drawY)
          ctx.lineTo(drawX + Math.abs(w), drawY + Math.abs(h))
          ctx.stroke()
          break
        }
        ctx.beginPath()
        const pts = el.points
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y)
        }
        ctx.stroke()
        break
      }
      case 'text': {
        const drawX = w >= 0 ? cx : cx + w
        const drawY = h >= 0 ? cy : cy + h
        const fs = (el.fontSize ?? 18) * anim.currentZoom
        ctx.font = `${Math.round(fs)}px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif`
        ctx.fillStyle = el.stroke ?? ACCENT
        ctx.textBaseline = 'top'
        ctx.fillText(el.text ?? '', drawX, drawY)
        break
      }
    }
    ctx.restore()
  }

  function drawSelectionFrame(el: BoardElement) {
    ctx.save()
    const cx = el.x
    const cy = el.y
    let x1 = cx, y1 = cy, x2 = cx + el.width, y2 = cy + el.height
    if (el.type === 'line' && el.points && el.points.length > 0) {
      x1 = Math.min(...el.points.map(p => p.x))
      y1 = Math.min(...el.points.map(p => p.y))
      x2 = Math.max(...el.points.map(p => p.x))
      y2 = Math.max(...el.points.map(p => p.y))
    }
    if (x1 > x2) { [x1, x2] = [x2, x1] }
    if (y1 > y2) { [y1, y2] = [y2, y1] }
    ctx.strokeStyle = ACCENT
    ctx.lineWidth = 2
    ctx.setLineDash([6 * anim.currentZoom, 4 * anim.currentZoom])
    ctx.strokeRect(x1 - 4, y1 - 4, (x2 - x1) + 8, (y2 - y1) + 8)
    ctx.setLineDash([])
    ctx.fillStyle = ACCENT
    const size = 8 * anim.currentZoom
    const corners = [[x1, y1], [x2, y1], [x1, y2], [x2, y2]]
    for (const [cx, cy] of corners) {
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size)
    }
    ctx.restore()
  }

  function drawRemoteCursors() {
    const st = useWhiteboardStore.getState()
    const cursors = st.remoteCursors
    const now = Date.now()
    for (const [uid, c] of Object.entries(cursors)) {
      if (now - c.lastSeen > 10000) continue
      const p = worldToScreen(c.x, c.y)
      ctx.save()
      const color = colorFromId(uid)
      ctx.fillStyle = color
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + 16, p.y + 6)
      ctx.lineTo(p.x + 6, p.y + 16)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }
  }

  function colorFromId(uid: string): string {
    let h = 0
    for (let i = 0; i < uid.length; i++) {
      h = (h * 31 + uid.charCodeAt(i)) >>> 0
    }
    return `hsl(${h % 360}, 70%, 55%)`
  }

  function drawSelectionBox() {
    if (!selectionBox) return
    const p1 = worldToScreen(selectionBox.x1, selectionBox.y1)
    const p2 = worldToScreen(selectionBox.x2, selectionBox.y2)
    const x = Math.min(p1.x, p2.x)
    const y = Math.min(p1.y, p2.y)
    const w = Math.abs(p2.x - p1.x)
    const h = Math.abs(p2.y - p1.y)
    ctx.save()
    ctx.fillStyle = 'rgba(255, 107, 107, 0.12)'
    ctx.strokeStyle = ACCENT
    ctx.lineWidth = 1.5
    ctx.fillRect(x, y, w, h)
    ctx.strokeRect(x, y, w, h)
    ctx.restore()
  }

  function render() {
    if (!running) return
    readViewport()

    const lastFrame = (renderer as any)._lastTime ?? performance.now()
    const now = performance.now()
    let dt = (now - lastFrame) / 1000
    if (dt > 0.1) dt = 0.1
    ;(renderer as any)._lastTime = now

    anim.currentZoom = damp(anim.currentZoom, anim.targetZoom, dt, 0.1)
    anim.currentPanX = damp(anim.currentPanX, anim.targetPanX, dt, 0.1)
    anim.currentPanY = damp(anim.currentPanY, anim.targetPanY, dt, 0.1)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawGrid()

    ctx.save()
    ctx.translate(anim.currentPanX, anim.currentPanY)
    ctx.scale(anim.currentZoom, anim.currentZoom)

    const st = useWhiteboardStore.getState()
    const selectedId = st.selectedId

    for (const id of st.layerOrder) {
      const el = st.elements[id]
      if (!el) continue
      const animRec = anim.elementAnimations[id]
      let scale = 1
      let alpha = 1
      if (animRec) {
        const t = Math.min(1, (now - animRec.startAt) / animRec.duration)
        const eased = 1 - Math.pow(1 - t, 3)
        if (animRec.kind === 'add') {
          scale = 0.7 + 0.3 * eased
          alpha = eased
        }
        if (t >= 1) delete anim.elementAnimations[id]
      }
      drawElement(el, alpha, scale)
    }

    if (previewEl) {
      ctx.save()
      ctx.globalAlpha = 0.75
      drawElement(previewEl, 0.85)
      ctx.restore()
    }

    if (selectedId) {
      const sel = st.elements[selectedId]
      if (sel && sel.visible) drawSelectionFrame(sel)
    }

    drawSelectionBox()

    ctx.restore()

    drawRemoteCursors()

    rafId = requestAnimationFrame(render)
  }

  function hitTest(wx: number, wy: number, tolerance = 8): string | null {
    const st = useWhiteboardStore.getState()
    const tolW = tolerance / anim.currentZoom
    for (let i = st.layerOrder.length - 1; i >= 0; i--) {
      const id = st.layerOrder[i]
      const el = st.elements[id]
      if (!el || !el.visible) continue
      let hit = false
      if (el.type === 'line' && el.points && el.points.length > 1) {
        for (let j = 1; j < el.points.length; j++) {
          const p0 = el.points[j - 1]
          const p1 = el.points[j]
          if (distPointToSegment(wx, wy, p0.x, p0.y, p1.x, p1.y) <= tolW) {
            hit = true; break
          }
        }
      } else if (el.type === 'text') {
        const x1 = Math.min(el.x, el.x + el.width)
        const y1 = Math.min(el.y, el.y + el.height)
        const x2 = Math.max(el.x, el.x + el.width)
        const y2 = Math.max(el.y, el.y + el.height)
        hit = wx >= x1 - tolW && wx <= x2 + tolW && wy >= y1 - tolW && wy <= y2 + tolW
      } else {
        const cx = el.x + el.width / 2
        const cy = el.y + el.height / 2
        const rx = Math.abs(el.width) / 2
        const ry = Math.abs(el.height) / 2
        if (el.type === 'circle') {
          const dx = (wx - cx) / Math.max(1, rx)
          const dy = (wy - cy) / Math.max(1, ry)
          hit = dx * dx + dy * dy <= 1
        } else {
          hit = wx >= el.x - tolW && wx <= el.x + el.width + tolW && wy >= el.y - tolW && wy <= el.y + el.height + tolW
        }
      }
      if (hit) return id
    }
    return null
  }

  function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return Math.hypot(px - x1, py - y1)
    let t = ((px - x1) * dx + (py - y1) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    const cx = x1 + t * dx
    const cy = y1 + t * dy
    return Math.hypot(px - cx, py - cy)
  }

  function now() { return Date.now() }

  function scheduleAnim(id: string, kind: 'add' | 'update') {
    anim.elementAnimations[id] = { startAt: performance.now(), duration: 250, kind }
  }

  function startDrawing(wx: number, wy: number, tool: ToolType) {
    previewStartPoint = { x: wx, y: wy }
    const st = useWhiteboardStore.getState()
    if (tool === 'select' || tool === 'eraser') return
    let p: Partial<BoardElement> & { type: any }
    if (tool === 'line') {
      p = { type: 'line', x: wx, y: wy, width: 0, height: 0, points: [{ x: wx, y: wy }] }
    } else if (tool === 'text') {
      const text = prompt('输入文字内容：', '文字便签')
      if (!text) { previewEl = null; previewStartPoint = null; return }
      const el = st.createElement({
        type: 'text',
        x: wx,
        y: wy,
        width: 120,
        height: 28,
        text,
        strokeWidth: 0,
        fill: undefined
      })
      el.stroke = '#0F172A'
      st.addElement(el)
      scheduleAnim(el.id, 'add')
      previewEl = null
      previewStartPoint = null
      return
    } else {
      p = { type: tool, x: wx, y: wy, width: 0, height: 0 }
    }
    previewEl = st.createElement(p)
  }

  function updateDrawing(wx: number, wy: number) {
    if (!previewEl || !previewStartPoint) return
    const { x: sx, y: sy } = previewStartPoint
    if (previewEl.type === 'line') {
      if (!previewEl.points) previewEl.points = []
      const last = previewEl.points[previewEl.points.length - 1]
      if (!last || Math.hypot(last.x - wx, last.y - wy) > 2 / anim.currentZoom) {
        previewEl.points.push({ x: wx, y: wy })
      }
      previewEl.x = Math.min(sx, wx)
      previewEl.y = Math.min(sy, wy)
      previewEl.width = Math.abs(wx - sx)
      previewEl.height = Math.abs(wy - sy)
    } else {
      previewEl.width = wx - sx
      previewEl.height = wy - sy
    }
  }

  function endDrawing() {
    if (!previewEl || !previewStartPoint) return
    const st = useWhiteboardStore.getState()
    const hasContent =
      previewEl.type === 'line'
        ? (previewEl.points?.length ?? 0) >= 2
        : Math.abs(previewEl.width) > 2 || Math.abs(previewEl.height) > 2
    if (hasContent) {
      const el = { ...previewEl }
      st.addElement(el)
      scheduleAnim(el.id, 'add')
    }
    previewEl = null
    previewStartPoint = null
  }

  function cancelDrawing() {
    previewEl = null
    previewStartPoint = null
  }

  function startDragging(id: string, wx: number, wy: number) {
    const st = useWhiteboardStore.getState()
    const el = st.elements[id]
    if (!el) return
    dragging = {
      id,
      offsetX: wx - el.x,
      offsetY: wy - el.y,
      prevX: el.x,
      prevY: el.y
    }
  }
  function updateDragging(wx: number, wy: number) {
    if (!dragging) return
    const st = useWhiteboardStore.getState()
    const el = st.elements[dragging.id]
    if (!el) return
    const nx = wx - dragging.offsetX
    const ny = wy - dragging.offsetY
    if (el.type === 'line' && el.points) {
      const dx = nx - el.x
      const dy = ny - el.y
      const newPoints = el.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
      st.updateElement(dragging.id, {
        x: nx,
        y: ny,
        points: newPoints
      })
    } else {
      st.updateElement(dragging.id, { x: nx, y: ny })
    }
  }
  function endDragging() {
    dragging = null
  }

  function setSelectionBox(box: { x1: number; y1: number; x2: number; y2: number } | null) {
    selectionBox = box
  }

  function stop() {
    running = false
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', resize)
  }

  ;(renderer as any)._lastTime = performance.now()
  rafId = requestAnimationFrame(render)

  const renderer: CanvasRendererHandles = {
    screenToWorld,
    worldToScreen,
    hitTest,
    startDrawing,
    updateDrawing,
    endDrawing,
    cancelDrawing,
    currentPreviewElement: null as any,
    startDragging,
    updateDragging,
    endDragging,
    setSelectionBox,
    stop,
    resize
  }
  Object.defineProperty(renderer, 'currentPreviewElement', {
    get() { return previewEl }
  })
  return renderer
}
