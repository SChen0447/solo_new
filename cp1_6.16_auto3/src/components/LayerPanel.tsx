import React, { useRef, useState, useEffect } from 'react'
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Clock,
  History as HistoryIcon,
  GripVertical,
  Circle as CircleIcon,
  Square,
  Pencil,
  Type,
  Minus
} from 'lucide-react'
import { useWhiteboardStore } from '../modules/store/whiteboardStore'
import type { BoardElement } from '../modules/types'

const typeIcon = (t: BoardElement['type']) => {
  switch (t) {
    case 'circle': return CircleIcon
    case 'rectangle': return Square
    case 'line': return Pencil
    case 'text': return Type
  }
}

const formatTime = (ts: number) => {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const LayerPanel: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const {
    layerOrder,
    elements,
    selectedId,
    setSelectedId,
    toggleLayerVisible,
    toggleLayerLocked,
    deleteElement,
    moveLayerToTop,
    moveLayerToBottom,
    reorderLayer,
    snapshots,
    restoreSnapshot
  } = useWhiteboardStore()

  const listRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{
    id: string
    startIdx: number
    pointerId: number
    pressTimer: ReturnType<typeof setTimeout> | null
    active: boolean
    currentIdx: number
    pressY: number
    pressX: number
  } | null>(null)
  const [, forceTick] = useState(0)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const reversedOrder = [...layerOrder].reverse()
  const visualIdxToLayer = (vis: number) => reversedOrder[vis]
  const layerIdToVisualIdx = (id: string) => reversedOrder.indexOf(id)

  const handleLayerMouseDown = (e: React.MouseEvent, id: string, visualIdx: number) => {
    if (e.button !== 0) return
    dragState.current = {
      id,
      startIdx: visualIdx,
      pointerId: e.pointerId,
      pressTimer: null,
      active: false,
      currentIdx: visualIdx,
      pressX: e.clientX,
      pressY: e.clientY
    }
    const st = dragState.current
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    st.pressTimer = setTimeout(() => {
      if (dragState.current && dragState.current.id === id) {
        dragState.current.active = true
        forceTick((x) => x + 1)
      }
    }, 220)
  }

  const handleLayerMouseMove = (e: React.MouseEvent, _id: string, _visualIdx: number) => {
    const st = dragState.current
    if (!st) return
    if (!st.active && st.pressTimer) {
      const dx = e.clientX - st.pressX
      const dy = e.clientY - st.pressY
      if (Math.hypot(dx, dy) > 6) {
        clearTimeout(st.pressTimer)
        st.pressTimer = null
        dragState.current = null
      }
      return
    }
    if (!st.active) return
    const container = listRef.current
    if (!container) return
    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-layer-idx]'))
    let hovered: number | null = null
    for (const it of items) {
      const idx = Number(it.dataset.layerIdx)
      const r = it.getBoundingClientRect()
      if (e.clientY >= r.top && e.clientY <= r.bottom) {
        hovered = idx
        break
      }
    }
    if (hovered === null) {
      const first = items[0]?.getBoundingClientRect()
      const last = items[items.length - 1]?.getBoundingClientRect()
      if (first && e.clientY < first.top) hovered = 0
      else if (last && e.clientY > last.bottom) hovered = items.length - 1
    }
    if (hovered !== null && hovered !== st.currentIdx) {
      // 弹性阻尼：避免跳变过快
      setDragOverIdx(hovered)
      st.currentIdx = hovered
    }
  }

  const handleLayerMouseUp = (e: React.MouseEvent, id: string, visualIdx: number) => {
    const st = dragState.current
    if (!st || st.id !== id) return
    if (st.pressTimer) clearTimeout(st.pressTimer)
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
    if (st.active && st.currentIdx !== st.startIdx) {
      const fromVisual = st.startIdx
      const toVisual = st.currentIdx
      const fromActual = layerOrder.length - 1 - fromVisual
      const toActual = layerOrder.length - 1 - toVisual
      reorderLayer(fromActual, toActual)
    } else if (!st.active) {
      setSelectedId(id)
    }
    dragState.current = null
    setDragOverIdx(null)
    forceTick((x) => x + 1)
  }

  const [dragTransforms, setDragTransforms] = useState<Record<string, { y: number; scale: number }>>({})
  useEffect(() => {
    if (!dragState.current?.active || dragOverIdx === null) {
      setDragTransforms({})
      return
    }
    const st = dragState.current
    const start = st.startIdx
    const end = dragOverIdx
    const dir = end > start ? 1 : -1
    const t: Record<string, { y: number; scale: number }> = {}
    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
      const id = visualIdxToLayer(i)
      if (id === st.id) continue
      if (dir > 0 && i > start && i <= end) {
        t[id] = { y: -54, scale: 1 }
      } else if (dir < 0 && i >= end && i < start) {
        t[id] = { y: 54, scale: 1 }
      }
    }
    setDragTransforms(t)
  }, [dragOverIdx, dragState.current?.active, dragState.current?.id])

  // 快照导出 JSON
  const exportSnapshotJson = (id: string) => {
    const snap = snapshots.find(s => s.id === id)
    if (!snap) return
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${snap.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const width = collapsed ? 48 : 280

  return (
    <aside
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        bottom: 16,
        width,
        borderRadius: 16,
        background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
        boxShadow: '0 10px 40px rgba(2, 6, 23, 0.5), 0 0 0 1px rgba(255,255,255,0.06) inset',
        backdropFilter: 'blur(12px)',
        transition: 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10
      }}
      className="layer-panel"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: collapsed ? '14px 10px' : '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0
        }}
      >
        {!collapsed && (
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => setShowHistory(false)}
              style={{
                background: 'none',
                border: 'none',
                color: !showHistory ? '#FF6B6B' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                padding: 0,
                position: 'relative'
              }}
            >
              <Layers size={16} />
              图层
              {!showHistory && (
                <span style={{
                  position: 'absolute',
                  left: 0, right: 0, bottom: -14,
                  height: 2, background: '#FF6B6B',
                  borderRadius: 2
                }} />
              )}
            </button>
            <button
              onClick={() => setShowHistory(true)}
              style={{
                background: 'none',
                border: 'none',
                color: showHistory ? '#FF6B6B' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                padding: 0,
                position: 'relative'
              }}
            >
              <HistoryIcon size={16} />
              历史
              {showHistory && (
                <span style={{
                  position: 'absolute',
                  left: 0, right: 0, bottom: -14,
                  height: 2, background: '#FF6B6B',
                  borderRadius: 2
                }} />
              )}
            </button>
          </div>
        )}
        {collapsed && <Layers size={18} color="#CBD5E1" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#94A3B8',
            width: 28, height: 28,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {!collapsed && !showHistory && (
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}
        >
          {reversedOrder.length === 0 && (
            <div style={{
              padding: 24,
              textAlign: 'center',
              color: '#64748B',
              fontSize: 12
            }}>
              <Minus size={24} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
              <div>暂无图层</div>
              <div style={{ fontSize: 11, marginTop: 4, color: '#475569' }}>
                使用工具栏绘制图形
              </div>
            </div>
          )}
          {reversedOrder.map((id, visualIdx) => {
            const el = elements[id]
            if (!el) return null
            const Icon = typeIcon(el.type)
            const selected = selectedId === id
            const isDragging = dragState.current?.active && dragState.current.id === id
            const transform = dragTransforms[id] || { y: 0, scale: 1 }
            return (
              <div
                key={id}
                data-layer-idx={visualIdx}
                onPointerDown={(e) => handleLayerMouseDown(e, id, visualIdx)}
                onPointerMove={(e) => handleLayerMouseMove(e, id, visualIdx)}
                onPointerUp={(e) => handleLayerMouseUp(e, id, visualIdx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 10px 10px 6px',
                  borderRadius: 10,
                  background: selected
                    ? 'rgba(255, 107, 107, 0.12)'
                    : 'rgba(255,255,255,0.02)',
                  border: selected
                    ? '1px solid rgba(255, 107, 107, 0.3)'
                    : '1px solid rgba(255,255,255,0.04)',
                  color: el.visible ? '#F8FAFC' : '#475569',
                  cursor: 'grab',
                  userSelect: 'none',
                  touchAction: 'none',
                  transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s, box-shadow 0.2s',
                  transform: `translateY(${transform.y}px) scale(${isDragging ? 1.04 : transform.scale})`,
                  boxShadow: isDragging
                    ? '0 12px 32px rgba(255, 107, 107, 0.25), 0 0 0 1px rgba(255, 107, 107, 0.4)'
                    : 'none',
                  position: 'relative',
                  zIndex: isDragging ? 20 : 1
                }}
              >
                <div style={{
                  color: '#475569',
                  padding: '2px 2px',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: isDragging ? 1 : 0.6
                }}>
                  <GripVertical size={14} />
                </div>
                <div style={{
                  width: 32, height: 32,
                  borderRadius: 8,
                  background: el.visible ? `${el.stroke ?? '#FF6B6B'}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${el.stroke ?? '#FF6B6B'}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: el.stroke ?? '#FF6B6B',
                  flexShrink: 0
                }}>
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: selected ? 600 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {el.type === 'text' && el.text ? el.text.slice(0, 10) : `${labelOf(el.type)} ${visualIdx + 1}`}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                    {formatTime(el.updatedAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); toggleLayerVisible(id) }}
                    title={el.visible ? '隐藏' : '显示'}
                    style={miniBtn(el.visible ? '#94A3B8' : '#475569')}
                    onPointerDown={(ev) => ev.stopPropagation()}
                  >
                    {el.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); toggleLayerLocked(id) }}
                    title={el.locked ? '解锁' : '锁定'}
                    style={miniBtn(el.locked ? '#FF6B6B' : '#94A3B8')}
                    onPointerDown={(ev) => ev.stopPropagation()}
                  >
                    {el.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); deleteElement(id) }}
                    title="删除"
                    style={miniBtn('#94A3B8')}
                    onPointerDown={(ev) => ev.stopPropagation()}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!collapsed && showHistory && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          {snapshots.length === 0 && (
            <div style={{
              padding: 24,
              textAlign: 'center',
              color: '#64748B',
              fontSize: 12
            }}>
              <Clock size={24} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
              <div>暂无版本快照</div>
              <div style={{ fontSize: 11, marginTop: 4, color: '#475569' }}>
                每10步操作自动生成快照
              </div>
            </div>
          )}
          {[...snapshots].reverse().map((snap) => (
            <div key={snap.id} style={{
              padding: 12,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC' }}>
                  {snap.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>
                  {formatTime(snap.timestamp)}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 10 }}>
                共 {snap.elements.length} 个元素
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => restoreSnapshot(snap.id)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: 12,
                    borderRadius: 8,
                    background: '#FF6B6B',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  恢复
                </button>
                <button
                  onClick={() => exportSnapshotJson(snap.id)}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.06)',
                    color: '#CBD5E1',
                    border: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer'
                  }}
                  title="导出 JSON"
                >
                  JSON
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .layer-panel {
            top: auto !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 60vh;
            border-radius: 16px 16px 0 0 !important;
            transform: translateY(var(--panel-y, 0));
            transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), width 0.3s !important;
          }
        }
      `}</style>
    </aside>
  )
}

function labelOf(type: BoardElement['type']): string {
  switch (type) {
    case 'circle': return '圆形'
    case 'rectangle': return '矩形'
    case 'line': return '线条'
    case 'text': return '文字'
  }
}

const miniBtn = (color: string): React.CSSProperties => ({
  width: 26,
  height: 26,
  borderRadius: 6,
  background: 'transparent',
  border: 'none',
  color,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  transition: 'background 0.15s, color 0.15s'
})

export default LayerPanel
