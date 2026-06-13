import React, { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { eventBus } from './eventBus'
import type {
  Scene,
  PlacedItem,
  Bubble,
  BubbleStyle,
  Asset,
  Position,
  DropEvent,
  DragStartEvent
} from './types'
import './Canvas.css'

interface CanvasProps {
  scene: Scene | null
  onSceneUpdate: (scene: Scene) => void
  scale: number
}

const GRID_SIZE = 40
const BOUNCE_ANIMATION_DURATION = 400

export const Canvas: React.FC<CanvasProps> = ({ scene, onSceneUpdate, scale }) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [draggingAsset, setDraggingAsset] = useState<Asset | null>(null)
  const [dragPosition, setDragPosition] = useState<Position>({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    itemId: string
    position: Position
  } | null>(null)
  const [bouncingItems, setBouncingItems] = useState<Set<string>>(new Set())
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null)
  const [draggingBubbleId, setDraggingBubbleId] = useState<string | null>(null)
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 })

  const snapToGrid = useCallback((value: number): number => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }, [])

  const snapPositionToGrid = useCallback((pos: Position): Position => ({
    x: snapToGrid(pos.x),
    y: snapToGrid(pos.y)
  }), [snapToGrid])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'

    if (!canvasRef.current || !draggingAsset) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    setDragPosition({ x, y })
  }, [draggingAsset, scale])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!canvasRef.current || !scene) return

    const assetData = e.dataTransfer.getData('application/json')
    if (!assetData) return

    const asset: Asset = JSON.parse(assetData)
    const rect = canvasRef.current.getBoundingClientRect()
    const canvasX = (e.clientX - rect.left) / scale
    const canvasY = (e.clientY - rect.top) / scale

    const snappedPos = snapPositionToGrid({ x: canvasX, y: canvasY })

    const event: DropEvent = {
      asset,
      canvasX: snappedPos.x,
      canvasY: snappedPos.y
    }
    eventBus.emit('drop:item', event)

    const newItem: PlacedItem = {
      id: uuidv4(),
      assetId: asset.id,
      type: asset.type,
      emoji: asset.emoji,
      name: asset.name,
      position: {
        x: snappedPos.x - 30,
        y: snappedPos.y - 30
      },
      scale: 1,
      rotation: 0,
      color: asset.type === 'character' ? (asset as any).color : undefined,
      hasBubble: asset.type === 'character',
      bubble: asset.type === 'character' ? {
        id: uuidv4(),
        text: '请输入对话...',
        style: 'normal',
        position: { x: 10, y: -70 },
        visible: true
      } : undefined
    }

    const newItems = [...scene.items, newItem]
    onSceneUpdate({ ...scene, items: newItems })

    setBouncingItems(prev => new Set(prev).add(newItem.id))
    setTimeout(() => {
      setBouncingItems(prev => {
        const next = new Set(prev)
        next.delete(newItem.id)
        return next
      })
    }, BOUNCE_ANIMATION_DURATION)

    setDraggingAsset(null)
  }, [scene, onSceneUpdate, snapPositionToGrid, scale])

  useEffect(() => {
    const handleDragStart = (event: DragStartEvent) => {
      setDraggingAsset(event.asset)
    }
    const handleDragEnd = () => {
      setDraggingAsset(null)
    }

    const unsub1 = eventBus.on('drag:start', handleDragStart)
    const unsub2 = eventBus.on('drag:end', handleDragEnd)

    return () => {
      unsub1()
      unsub2()
    }
  }, [])

  const handleItemMouseDown = useCallback((
    e: React.MouseEvent,
    item: PlacedItem
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingItemId(item.id)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const handleBubbleMouseDown = useCallback((
    e: React.MouseEvent,
    itemId: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingBubbleId(itemId)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || !scene) return
      const rect = canvasRef.current.getBoundingClientRect()

      if (draggingItemId) {
        const x = (e.clientX - rect.left) / scale - dragOffsetRef.current.x
        const y = (e.clientY - rect.top) / scale - dragOffsetRef.current.y

        const newItems = scene.items.map(item =>
          item.id === draggingItemId
            ? { ...item, position: { x, y } }
            : item
        )
        onSceneUpdate({ ...scene, items: newItems })
      }

      if (draggingBubbleId) {
        const item = scene.items.find(i => i.id === draggingBubbleId)
        if (!item || !item.bubble) return

        const x = (e.clientX - rect.left) / scale - item.position.x - dragOffsetRef.current.x
        const y = (e.clientY - rect.top) / scale - item.position.y - dragOffsetRef.current.y

        eventBus.emit('bubble:position:change', {
          itemId: draggingBubbleId,
          position: { x, y }
        })

        const newItems = scene.items.map(i =>
          i.id === draggingBubbleId && i.bubble
            ? {
                ...i,
                bubble: { ...i.bubble, position: { x, y } }
              }
            : i
        )
        onSceneUpdate({ ...scene, items: newItems })
      }
    }

    const handleMouseUp = () => {
      if (draggingItemId && scene) {
        const item = scene.items.find(i => i.id === draggingItemId)
        if (item) {
          const snappedPos = snapPositionToGrid(item.position)
          const newItems = scene.items.map(i =>
            i.id === draggingItemId
              ? { ...i, position: snappedPos }
              : i
          )
          onSceneUpdate({ ...scene, items: newItems })

          setBouncingItems(prev => new Set(prev).add(draggingItemId))
          setTimeout(() => {
            setBouncingItems(prev => {
              const next = new Set(prev)
              next.delete(draggingItemId)
              return next
            })
          }, BOUNCE_ANIMATION_DURATION)
        }
      }
      setDraggingItemId(null)
      setDraggingBubbleId(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingItemId, draggingBubbleId, scene, onSceneUpdate, snapPositionToGrid, scale])

  const handleContextMenu = useCallback((
    e: React.MouseEvent,
    itemId: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      itemId,
      position: { x: e.clientX, y: e.clientY }
    })
  }, [])

  const handleBubbleStyleChange = useCallback((style: BubbleStyle) => {
    if (!contextMenu || !scene) return

    eventBus.emit('bubble:style:change', {
      itemId: contextMenu.itemId,
      style
    })

    const newItems = scene.items.map(item =>
      item.id === contextMenu.itemId && item.bubble
        ? { ...item, bubble: { ...item.bubble, style } }
        : item
    )
    onSceneUpdate({ ...scene, items: newItems })
    setContextMenu(null)
  }, [contextMenu, scene, onSceneUpdate])

  const handleBubbleTextChange = useCallback((
    itemId: string,
    text: string
  ) => {
    if (!scene) return

    eventBus.emit('bubble:text:change', { itemId, text })

    const newItems = scene.items.map(item =>
      item.id === itemId && item.bubble
        ? { ...item, bubble: { ...item.bubble, text } }
        : item
    )
    onSceneUpdate({ ...scene, items: newItems })
  }, [scene, onSceneUpdate])

  const handleCanvasClick = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleItemDelete = useCallback((itemId: string) => {
    if (!scene) return
    eventBus.emit('item:delete', itemId)
    const newItems = scene.items.filter(item => item.id !== itemId)
    onSceneUpdate({ ...scene, items: newItems })
    setContextMenu(null)
  }, [scene, onSceneUpdate])

  const renderGrid = () => {
    const lines = []
    const width = 1200
    const height = 800

    for (let x = 0; x <= width; x += GRID_SIZE) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="rgba(139, 105, 20, 0.1)"
          strokeWidth="1"
        />
      )
    }
    for (let y = 0; y <= height; y += GRID_SIZE) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="rgba(139, 105, 20, 0.1)"
          strokeWidth="1"
        />
      )
    }
    return lines
  }

  const renderBubble = (item: PlacedItem) => {
    if (!item.bubble || !item.hasBubble) return null

    const bubble = item.bubble
    const isDragging = draggingBubbleId === item.id

    return (
      <div
        key={`bubble-${item.id}`}
        className={`bubble ${bubble.style} ${isDragging ? 'dragging' : ''}`}
        style={{
          left: bubble.position.x,
          top: bubble.position.y,
          transition: isDragging ? 'none' : 'transform 0.3s ease'
        }}
        onMouseDown={(e) => handleBubbleMouseDown(e, item.id)}
        onContextMenu={(e) => handleContextMenu(e, item.id)}
      >
        <div className="bubble-arrow" />
        <textarea
          className="bubble-text"
          value={bubble.text}
          onChange={(e) => handleBubbleTextChange(item.id, e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="输入对话..."
        />
        <div className="bubble-style-indicator">
          {bubble.style === 'normal' && '💬'}
          {bubble.style === 'thought' && '💭'}
          {bubble.style === 'shout' && '📢'}
        </div>
      </div>
    )
  }

  const renderItem = (item: PlacedItem) => {
    const isBouncing = bouncingItems.has(item.id)
    const isDragging = draggingItemId === item.id

    return (
      <div
        key={item.id}
        className={`placed-item ${isBouncing ? 'bouncing' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{
          left: item.position.x,
          top: item.position.y,
          transition: isDragging ? 'none' : `all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)`
        }}
        onMouseDown={(e) => handleItemMouseDown(e, item)}
        onContextMenu={(e) => handleContextMenu(e, item.id)}
      >
        <div
          className="item-avatar"
          style={item.color ? { borderColor: item.color } : undefined}
        >
          <span className="item-emoji">{item.emoji}</span>
        </div>
        {renderBubble(item)}
      </div>
    )
  }

  return (
    <>
      <div
        ref={canvasRef}
        className="canvas-container"
        style={{ transform: `scale(${scale})` }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleCanvasClick}
      >
        <svg className="grid-overlay" width="1200" height="800">
          {renderGrid()}
        </svg>

        {draggingAsset && (
          <div
            className="drag-preview"
            style={{
              left: dragPosition.x - 40,
              top: dragPosition.y - 40
            }}
          >
            <div className="drag-preview-shadow" />
            <div className="drag-preview-content">
              <span>{draggingAsset.emoji}</span>
            </div>
          </div>
        )}

        {scene?.items.map(renderItem)}
      </div>

      {contextMenu?.visible && (
        <div
          className="context-menu"
          style={{
            left: contextMenu.position.x,
            top: contextMenu.position.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-title">气泡样式</div>
          <div className="context-menu-item" onClick={() => handleBubbleStyleChange('normal')}>
            <span>💬 普通</span>
          </div>
          <div className="context-menu-item" onClick={() => handleBubbleStyleChange('thought')}>
            <span>💭 思考</span>
          </div>
          <div className="context-menu-item" onClick={() => handleBubbleStyleChange('shout')}>
            <span>📢 大喊</span>
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item delete" onClick={() => handleItemDelete(contextMenu.itemId)}>
            <span>🗑️ 删除</span>
          </div>
        </div>
      )}
    </>
  )
}

export default Canvas
