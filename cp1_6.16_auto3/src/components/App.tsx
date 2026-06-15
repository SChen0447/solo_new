import React, { useEffect, useRef, useState } from 'react'
import { Wifi, WifiOff, Users } from 'lucide-react'
import Toolbar from './Toolbar'
import LayerPanel from './LayerPanel'
import { createCanvasRenderer, type CanvasRendererHandles } from '../modules/renderer/canvasRenderer'
import { createWebSocketClient, type WebSocketClient } from '../modules/sync/websocket'
import { useWhiteboardStore } from '../modules/store/whiteboardStore'
import type { HistoryAction, SyncMessage, BoardElement } from '../modules/types'

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<CanvasRendererHandles | null>(null)
  const wsRef = useRef<WebSocketClient | null>(null)
  const [connected, setConnected] = useState(false)
  const [peerCount, setPeerCount] = useState(0)

  const {
    activeTool,
    setActiveTool,
    initFromRemote,
    addElement,
    updateElement,
    deleteElement,
    reorderLayer,
    updateRemoteCursor,
    undo,
    redo,
    setZoom,
    setPan,
    selectedId,
    setSelectedId
  } = useWhiteboardStore()

  const subscribeSyncFromStore = useRef<() => void>(() => {})

  useEffect(() => {
    if (!canvasRef.current) return
    const renderer = createCanvasRenderer(canvasRef.current)
    rendererRef.current = renderer

    const ws = createWebSocketClient()
    wsRef.current = ws

    const handleMsg = (msg: SyncMessage) => {
      if (msg.type === 'INIT') {
        initFromRemote(msg.elements, msg.layerOrder)
        // 计算连接数量（根据服务端日志无法直接获取，此处做显示占位）
        setPeerCount(0)
      } else if (msg.type === 'ACTION') {
        // 来自远程的操作，应用到本地但不入本地历史栈
        const action = msg.action
        switch (action.type) {
          case 'ADD':
            addElement(action.element, true)
            break
          case 'UPDATE':
            updateElement(action.id, action.next, true)
            break
          case 'DELETE':
            deleteElement(action.element.id, true)
            break
          case 'REORDER':
            reorderLayer(action.from, action.to, true)
            break
        }
      } else if (msg.type === 'CURSOR') {
        updateRemoteCursor(msg.userId, msg.x, msg.y)
      }
    }
    const unsub = ws.subscribe(handleMsg)
    ws.connect()

    // 检测连接状态：每 500ms 检查一次（ws.isConnected 同步函数）
    const connTimer = setInterval(() => {
      setConnected(ws.isConnected())
    }, 500)

    // 订阅本地操作变化，广播到远程
    let lastHistoryLen = 0
    let lastLayerOrder: string[] = []
    const unsubscribeStore = useWhiteboardStore.subscribe((state, prevState) => {
      // 新 action 入栈时广播
      const stack = state.historyStack
      if (stack.length > 0 && stack.length > lastHistoryLen) {
        const latest = stack[stack.length - 1]
        ws.sendAction(latest as HistoryAction)
        lastHistoryLen = stack.length
      }
      // undo/redo 也会改变 elements —— 以 historyIndex 变化检测
      if (state.historyIndex !== prevState.historyIndex && state.historyIndex >= 0 && stack.length > 0) {
        // 重做的情况：重新广播该操作
        const act = stack[state.historyIndex]
        if (state.historyIndex > prevState.historyIndex) {
          ws.sendAction(act as HistoryAction)
        }
      }
      // 撤销不会反向广播——为了保持一致性，这里做简化处理：撤销/重做时通过 INIT 同步需要特殊协议
      // 本项目采用简单方式：当 layers 顺序或 elements 集合变化超过历史栈覆盖范围，发送整个文档替换（此处略）
      lastLayerOrder = state.layerOrder
      void lastLayerOrder
    })
    subscribeSyncFromStore.current = unsubscribeStore

    return () => {
      clearInterval(connTimer)
      unsubscribeStore()
      unsub()
      ws.disconnect()
      renderer.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== 鼠标事件处理 =====
  const interactionState = useRef<{
    mode: 'none' | 'draw' | 'pan' | 'select-drag' | 'marquee' | 'resize'
    startX: number
    startY: number
    moved: boolean
    lastX: number
    lastY: number
    spaceDown: boolean
  }>({ mode: 'none', startX: 0, startY: 0, moved: false, lastX: 0, lastY: 0, spaceDown: false })

  const canvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return
    const r = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - r.left
    const sy = e.clientY - r.top
    const wp = rendererRef.current.screenToWorld(sx, sy)

    const ist = interactionState.current
    ist.startX = sx; ist.startY = sy; ist.lastX = sx; ist.lastY = sy; ist.moved = false

    // 中键/空格+左键 平移
    const panMode = e.button === 1 || ist.spaceDown
    if (panMode) {
      ist.mode = 'pan'
      return
    }

    if (e.button !== 0) return

    if (activeTool === 'select') {
      const hit = rendererRef.current.hitTest(wp.x, wp.y)
      if (hit) {
        const el = useWhiteboardStore.getState().elements[hit]
        if (el && !el.locked) {
          setSelectedId(hit)
          rendererRef.current.startDragging(hit, wp.x, wp.y)
          ist.mode = 'select-drag'
          return
        }
      }
      // 框选
      setSelectedId(null)
      ist.mode = 'marquee'
      rendererRef.current.setSelectionBox({ x1: wp.x, y1: wp.y, x2: wp.x, y2: wp.y })
      return
    }

    if (activeTool === 'eraser') {
      const hit = rendererRef.current.hitTest(wp.x, wp.y, 12)
      if (hit) {
        deleteElement(hit)
      }
      ist.mode = 'draw' // 允许滑动擦除
      return
    }

    // 绘制工具
    rendererRef.current.startDrawing(wp.x, wp.y, activeTool)
    ist.mode = 'draw'
  }

  const canvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return
    const r = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - r.left
    const sy = e.clientY - r.top
    const wp = rendererRef.current.screenToWorld(sx, sy)

    if (wsRef.current && wsRef.current.isConnected()) {
      wsRef.current.sendCursor(wp.x, wp.y)
    }

    const ist = interactionState.current
    const dx = sx - ist.startX
    const dy = sy - ist.startY
    if (Math.hypot(dx, dy) > 3) ist.moved = true

    const st = useWhiteboardStore.getState()

    if (ist.mode === 'pan') {
      const mdx = sx - ist.lastX
      const mdy = sy - ist.lastY
      st.panBy(mdx, mdy)
    } else if (ist.mode === 'draw') {
      if (activeTool === 'eraser') {
        const hit = rendererRef.current.hitTest(wp.x, wp.y, 12)
        if (hit) deleteElement(hit)
      } else {
        rendererRef.current.updateDrawing(wp.x, wp.y)
      }
    } else if (ist.mode === 'select-drag') {
      rendererRef.current.updateDragging(wp.x, wp.y)
    } else if (ist.mode === 'marquee') {
      const box = rendererRef.current.setSelectionBox
      const cur = { x1: ist.startX, y1: ist.startY, x2: sx, y2: sy }
      const w1 = rendererRef.current.screenToWorld(cur.x1, cur.y1)
      const w2 = rendererRef.current.screenToWorld(cur.x2, cur.y2)
      box({ x1: w1.x, y1: w1.y, x2: w2.x, y2: w2.y })
    }

    ist.lastX = sx; ist.lastY = sy
  }

  const canvasMouseUp = (_e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return
    const ist = interactionState.current
    if (ist.mode === 'draw') {
      rendererRef.current.endDrawing()
    } else if (ist.mode === 'select-drag') {
      rendererRef.current.endDragging()
    } else if (ist.mode === 'marquee') {
      rendererRef.current.setSelectionBox(null)
    }
    ist.mode = 'none'
  }

  const canvasMouseLeave = () => {
    if (!rendererRef.current) return
    const ist = interactionState.current
    if (ist.mode === 'draw') rendererRef.current.cancelDrawing()
    if (ist.mode === 'marquee') rendererRef.current.setSelectionBox(null)
    ist.mode = 'none'
  }

  const canvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return
    e.preventDefault()
    const r = canvasRef.current!.getBoundingClientRect()
    const sx = e.clientX - r.left
    const sy = e.clientY - r.top
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    useWhiteboardStore.getState().zoomAt(factor, sx, sy)
  }

  // ===== 键盘快捷键 =====
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        interactionState.current.spaceDown = true
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
      }
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
      } else if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if (ctrl && e.key.toLowerCase() === 's') {
        e.preventDefault()
        useWhiteboardStore.getState().takeSnapshot()
      } else if (!ctrl && !e.altKey) {
        const k = e.key.toLowerCase()
        if (k === 'v') setActiveTool('select')
        else if (k === 'r') setActiveTool('rectangle')
        else if (k === 'o') setActiveTool('circle')
        else if (k === 'p') setActiveTool('line')
        else if (k === 't') setActiveTool('text')
        else if (k === 'e') setActiveTool('eraser')
        else if (k === 'delete' || k === 'backspace') {
          const s = selectedId
          if (s) deleteElement(s)
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        interactionState.current.spaceDown = false
        if (canvasRef.current) canvasRef.current.style.cursor = cursorFor(activeTool)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [activeTool, selectedId, undo, redo, deleteElement, setActiveTool])

  const resetZoom = () => {
    const s = useWhiteboardStore.getState()
    s.setZoom(1)
    s.setPan(0, 0)
  }

  // 初始 demo 内容（仅在完全空白状态下，且未连接服务端时添加）
  useEffect(() => {
    const t = setTimeout(() => {
      const st = useWhiteboardStore.getState()
      if (st.layerOrder.length === 0 && !wsRef.current?.isConnected()) {
        const demo1 = st.createElement({
          type: 'rectangle',
          x: 160, y: 120, width: 220, height: 140,
          fill: 'rgba(255, 107, 107, 0.15)',
          stroke: '#FF6B6B',
          strokeWidth: 3
        })
        st.addElement(demo1)
        const demo2 = st.createElement({
          type: 'circle',
          x: 500, y: 180, width: 180, height: 180,
          fill: 'rgba(108, 92, 231, 0.15)',
          stroke: '#6C5CE7',
          strokeWidth: 3
        })
        st.addElement(demo2)
        const demo3 = st.createElement({
          type: 'text',
          x: 200, y: 360, width: 280, height: 28,
          text: '欢迎使用协作白板 ✨',
          stroke: '#0F172A',
          fontSize: 22,
          strokeWidth: 0
        })
        st.addElement(demo3)
        const demo4 = st.createElement({
          type: 'line',
          x: 480, y: 400, width: 200, height: 60,
          stroke: '#4D96FF',
          strokeWidth: 4,
          points: [
            { x: 480, y: 400 },
            { x: 520, y: 440 },
            { x: 560, y: 410 },
            { x: 600, y: 450 },
            { x: 640, y: 420 },
            { x: 680, y: 460 }
          ]
        })
        st.addElement(demo4)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#0F172A',
      overflow: 'hidden'
    }}>
      <canvas
        ref={canvasRef}
        onMouseDown={canvasMouseDown}
        onMouseMove={canvasMouseMove}
        onMouseUp={canvasMouseUp}
        onMouseLeave={canvasMouseLeave}
        onWheel={canvasWheel}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          cursor: cursorFor(activeTool),
          touchAction: 'none'
        }}
      />

      <Toolbar onResetZoom={resetZoom} />
      <LayerPanel />

      {/* 顶部状态栏 */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 14px',
        borderRadius: 999,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        zIndex: 20,
        color: '#F8FAFC',
        fontSize: 12,
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {connected ? (
            <>
              <Wifi size={14} color="#6BCB77" />
              <span style={{ color: '#6BCB77' }}>已连接</span>
            </>
          ) : (
            <>
              <WifiOff size={14} color="#94A3B8" />
              <span style={{ color: '#94A3B8' }}>离线模式</span>
            </>
          )}
        </div>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={14} color="#94A3B8" />
          <span>{peerCount + 1} 人在线</span>
        </div>
      </div>

      {/* 右下角快捷键提示 */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 14px',
        borderRadius: 10,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.05)',
        color: '#64748B',
        fontSize: 11,
        zIndex: 10,
        userSelect: 'none',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <span><kbd style={kbdStyle}>V</kbd> 选择</span>
        <span><kbd style={kbdStyle}>R</kbd> 矩形</span>
        <span><kbd style={kbdStyle}>O</kbd> 圆形</span>
        <span><kbd style={kbdStyle}>P</kbd> 画笔</span>
        <span><kbd style={kbdStyle}>T</kbd> 文字</span>
        <span><kbd style={kbdStyle}>E</kbd> 橡皮</span>
        <span style={{ color: '#475569' }}>|</span>
        <span><kbd style={kbdStyle}>Ctrl+Z</kbd> 撤销</span>
        <span><kbd style={kbdStyle}>Ctrl+Y</kbd> 重做</span>
        <span><kbd style={kbdStyle}>空格</kbd> 拖拽画布</span>
      </div>
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  marginRight: 4,
  borderRadius: 4,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.1)',
  fontSize: 10,
  color: '#CBD5E1',
  fontFamily: 'ui-monospace, monospace'
}

function cursorFor(tool: string): string {
  switch (tool) {
    case 'select': return 'default'
    case 'eraser': return 'crosshair'
    case 'text': return 'text'
    default: return 'crosshair'
  }
}

export default App
