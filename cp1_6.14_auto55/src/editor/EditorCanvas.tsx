import React, { useRef, useEffect, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  useGameStore,
  LEVEL_WIDTH,
  LEVEL_HEIGHT,
  LevelElement,
  ToolType
} from '../store/gameStore'

type DragMode = 'none' | 'move' | 'resize' | 'select'

interface DragState {
  mode: DragMode
  elementId: string | null
  startX: number
  startY: number
  startElementX: number
  startElementY: number
  startElementWidth: number
  selectedIds: Set<string>
  selectBoxStart: { x: number; y: number } | null
}

const PLATFORM_DEFAULT = { width: 120, height: 24 }
const TRAP_DEFAULT = { width: 30, height: 30 }
const FLAG_DEFAULT = { width: 40, height: 60 }

const EditorCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const {
    elements,
    selectedTool,
    addElement,
    updateElement,
    removeElement,
    removeElements,
    setSelectedTool
  } = useGameStore()

  const [hoveredElement, setHoveredElement] = useState<string | null>(null)
  const [selectedElements, setSelectedElements] = useState<Set<string>>(
    new Set()
  )
  const [dragState, setDragState] = useState<DragState>({
    mode: 'none',
    elementId: null,
    startX: 0,
    startY: 0,
    startElementX: 0,
    startElementY: 0,
    startElementWidth: 0,
    selectedIds: new Set(),
    selectBoxStart: null
  })
  const [currentMousePos, setCurrentMousePos] = useState<{
    x: number
    y: number
  } | null>(null)

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      return {
        x: clientX - rect.left + canvas.scrollLeft,
        y: clientY - rect.top + canvas.scrollTop
      }
    },
    []
  )

  const findElementAt = useCallback(
    (x: number, y: number): LevelElement | null => {
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i]
        if (
          x >= el.x &&
          x <= el.x + el.width &&
          y >= el.y &&
          y <= el.y + el.height
        ) {
          return el
        }
      }
      return null
    },
    [elements]
  )

  const isOnResizeHandle = useCallback(
    (element: LevelElement, x: number, y: number): boolean => {
      if (element.type !== 'platform') return false
      const handleX = element.x + element.width
      const handleY = element.y + element.height / 2
      const distance = Math.sqrt(
        (x - handleX) ** 2 + (y - handleY) ** 2
      )
      return distance <= 10
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const coords = getCanvasCoords(e.clientX, e.clientY)
      const targetElement = findElementAt(coords.x, coords.y)

      if (e.shiftKey) {
        if (targetElement) {
          removeElement(targetElement.id)
        }
        return
      }

      if (targetElement) {
        if (isOnResizeHandle(targetElement, coords.x, coords.y)) {
          setDragState({
            mode: 'resize',
            elementId: targetElement.id,
            startX: coords.x,
            startY: coords.y,
            startElementX: targetElement.x,
            startElementY: targetElement.y,
            startElementWidth: targetElement.width,
            selectedIds: new Set([targetElement.id]),
            selectBoxStart: null
          })
        } else {
          const newSelected = new Set(selectedElements)
          if (!e.ctrlKey && !newSelected.has(targetElement.id)) {
            newSelected.clear()
          }
          newSelected.add(targetElement.id)
          setSelectedElements(newSelected)

          setDragState({
            mode: 'move',
            elementId: targetElement.id,
            startX: coords.x,
            startY: coords.y,
            startElementX: targetElement.x,
            startElementY: targetElement.y,
            startElementWidth: targetElement.width,
            selectedIds: new Set(newSelected),
            selectBoxStart: null
          })
        }
      } else {
        setSelectedElements(new Set())
        setDragState({
          mode: 'select',
          elementId: null,
          startX: coords.x,
          startY: coords.y,
          startElementX: 0,
          startElementY: 0,
          startElementWidth: 0,
          selectedIds: new Set(),
          selectBoxStart: { x: coords.x, y: coords.y }
        })
      }
    },
    [
      getCanvasCoords,
      findElementAt,
      isOnResizeHandle,
      selectedElements,
      removeElement
    ]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY)
      setCurrentMousePos(coords)

      const hovered = findElementAt(coords.x, coords.y)
      setHoveredElement(hovered ? hovered.id : null)

      if (dragState.mode === 'none') return

      if (dragState.mode === 'move' && dragState.elementId) {
        const dx = coords.x - dragState.startX
        const dy = coords.y - dragState.startY

        const idsToMove =
          dragState.selectedIds.size > 0
            ? dragState.selectedIds
            : new Set([dragState.elementId])

        elements.forEach((el) => {
          if (idsToMove.has(el.id)) {
            let newX = el.id === dragState.elementId
              ? dragState.startElementX + dx
              : el.x + dx
            let newY = el.id === dragState.elementId
              ? dragState.startElementY + dy
              : el.y + dy
            newX = Math.max(0, Math.min(LEVEL_WIDTH - el.width, newX))
            newY = Math.max(0, Math.min(LEVEL_HEIGHT - el.height, newY))
            updateElement(el.id, { x: newX, y: newY })
          }
        })
      } else if (dragState.mode === 'resize' && dragState.elementId) {
        const dx = coords.x - dragState.startX
        let newWidth = dragState.startElementWidth + dx
        newWidth = Math.max(40, Math.min(LEVEL_WIDTH - dragState.startElementX, newWidth))
        updateElement(dragState.elementId, { width: newWidth })
      } else if (dragState.mode === 'select') {
        const boxStart = dragState.selectBoxStart!
        const minX = Math.min(boxStart.x, coords.x)
        const maxX = Math.max(boxStart.x, coords.x)
        const minY = Math.min(boxStart.y, coords.y)
        const maxY = Math.max(boxStart.y, coords.y)

        const newSelected = new Set<string>()
        elements.forEach((el) => {
          if (
            el.x < maxX &&
            el.x + el.width > minX &&
            el.y < maxY &&
            el.y + el.height > minY
          ) {
            newSelected.add(el.id)
          }
        })
        setSelectedElements(newSelected)
      }
    },
    [
      getCanvasCoords,
      findElementAt,
      dragState,
      elements,
      updateElement
    ]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const coords = getCanvasCoords(e.clientX, e.clientY)

      if (dragState.mode === 'none' && !e.shiftKey) {
        const existingElement = findElementAt(coords.x, coords.y)
        if (!existingElement) {
          let defaultSize
          switch (selectedTool) {
            case 'platform':
              defaultSize = PLATFORM_DEFAULT
              break
            case 'trap':
              defaultSize = TRAP_DEFAULT
              break
            case 'flag':
              defaultSize = FLAG_DEFAULT
              break
          }

          const x = Math.max(
            0,
            Math.min(
              LEVEL_WIDTH - defaultSize.width,
              coords.x - defaultSize.width / 2
            )
          )
          const y = Math.max(
            0,
            Math.min(
              LEVEL_HEIGHT - defaultSize.height,
              coords.y - defaultSize.height / 2
            )
          )

          const newElement: LevelElement = {
            id: uuidv4(),
            type: selectedTool,
            x: Math.round(x),
            y: Math.round(y),
            width: defaultSize.width,
            height: defaultSize.height
          }
          addElement(newElement)
          setSelectedElements(new Set([newElement.id]))
        }
      }

      if (dragState.mode === 'select') {
        if (selectedElements.size > 0) {
          // Selection box completed
        }
      }

      setDragState({
        mode: 'none',
        elementId: null,
        startX: 0,
        startY: 0,
        startElementX: 0,
        startElementY: 0,
        startElementWidth: 0,
        selectedIds: new Set(),
        selectBoxStart: null
      })
    },
    [
      getCanvasCoords,
      dragState,
      findElementAt,
      selectedTool,
      selectedElements,
      addElement
    ]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (selectedElements.size > 0) {
        removeElements(Array.from(selectedElements))
        setSelectedElements(new Set())
      }
    },
    [selectedElements, removeElements]
  )

  const renderElement = (element: LevelElement) => {
    const isSelected = selectedElements.has(element.id)
    const isHovered = hoveredElement === element.id
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      cursor: dragState.mode === 'none' ? 'move' : 'default',
      outline: isSelected
        ? '2px solid #E67E22'
        : isHovered
        ? '2px dashed rgba(230, 126, 34, 0.6)'
        : 'none',
      outlineOffset: '2px',
      userSelect: 'none',
      boxSizing: 'border-box'
    }

    if (element.type === 'platform') {
      return (
        <div
          key={element.id}
          style={{
            ...baseStyle,
            backgroundColor: '#27AE60',
            borderRadius: '4px',
            border: '2px solid #219653',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: -8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 12,
              height: 24,
              backgroundColor: '#F39C12',
              borderRadius: 4,
              cursor: 'ew-resize',
              border: '2px solid #E67E22',
              display: isHovered || isSelected ? 'block' : 'none'
            }}
          />
        </div>
      )
    }

    if (element.type === 'trap') {
      const spikeCount = Math.max(2, Math.floor(element.width / 15))
      const spikeWidth = element.width / spikeCount
      return (
        <div
          key={element.id}
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'flex-end'
          }}
        >
          {Array.from({ length: spikeCount }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 0,
                height: 0,
                borderLeft: `${spikeWidth / 2}px solid transparent`,
                borderRight: `${spikeWidth / 2}px solid transparent`,
                borderBottom: `${element.height}px solid #E74C3C`,
                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))'
              }}
            />
          ))}
        </div>
      )
    }

    if (element.type === 'flag') {
      return (
        <div
          key={element.id}
          style={baseStyle}
        >
          <div
            style={{
              position: 'absolute',
              left: 4,
              top: 0,
              width: 4,
              height: element.height,
              backgroundColor: '#7F8C8D',
              borderRadius: 2
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 8,
              top: 2,
              width: element.width - 10,
              height: element.height * 0.55,
              backgroundColor: '#F1C40F',
              clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: element.width,
              height: 6,
              backgroundColor: '#BDC3C7',
              borderRadius: 2
            }}
          />
        </div>
      )
    }

    return null
  }

  const getSelectionBox = () => {
    if (dragState.mode !== 'select' || !dragState.selectBoxStart || !currentMousePos) {
      return null
    }
    const boxStart = dragState.selectBoxStart
    const x = Math.min(boxStart.x, currentMousePos.x)
    const y = Math.min(boxStart.y, currentMousePos.y)
    const w = Math.abs(currentMousePos.x - boxStart.x)
    const h = Math.abs(currentMousePos.y - boxStart.y)
    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          border: '1.5px dashed #E67E22',
          backgroundColor: 'rgba(230, 126, 34, 0.1)',
          pointerEvents: 'none'
        }}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
          backgroundColor: '#34495E',
          borderBottom: '1px solid #2C3E50'
        }}
      >
        {(['platform', 'trap', 'flag'] as ToolType[]).map((tool) => (
          <button
            key={tool}
            onClick={() => setSelectedTool(tool)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: selectedTool === tool ? '#E67E22' : '#5D6D7E',
              color: 'white',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedTool !== tool) {
                e.currentTarget.style.backgroundColor = '#7F8C8D'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTool !== tool) {
                e.currentTarget.style.backgroundColor = '#5D6D7E'
              }
            }}
          >
            {tool === 'platform' && '🟩 平台'}
            {tool === 'trap' && '🔺 陷阱'}
            {tool === 'flag' && '🏁 终点'}
          </button>
        ))}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            color: '#BDC3C7',
            fontSize: 12
          }}
        >
          画布: {LEVEL_WIDTH} × {LEVEL_HEIGHT} px · 元素: {elements.length}
        </div>
      </div>

      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          backgroundColor: '#1A252F',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          cursor:
            dragState.mode === 'move'
              ? 'grabbing'
              : dragState.mode === 'resize'
              ? 'ew-resize'
              : dragState.mode === 'select'
              ? 'crosshair'
              : 'crosshair'
        }}
      >
        <div
          style={{
            position: 'relative',
            width: LEVEL_WIDTH,
            height: LEVEL_HEIGHT,
            minWidth: LEVEL_WIDTH,
            minHeight: LEVEL_HEIGHT
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: LEVEL_WIDTH,
              height: 4,
              backgroundColor: 'rgba(230, 126, 34, 0.5)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 20,
              top: LEVEL_HEIGHT - 60,
              color: 'rgba(52, 152, 219, 0.6)',
              fontSize: 12,
              fontWeight: 600,
              pointerEvents: 'none'
            }}
          >
            ▶ 起点
          </div>
          {elements.map(renderElement)}
          {getSelectionBox()}
        </div>
      </div>

      <div
        style={{
          padding: '6px 12px',
          backgroundColor: '#34495E',
          borderTop: '1px solid #2C3E50',
          color: '#95A5A6',
          fontSize: 11,
          display: 'flex',
          gap: 20
        }}
      >
        <span>📌 点击画布放置元素</span>
        <span>🖱️ 拖拽移动元素</span>
        <span>↔️ 拖动平台右侧调整宽度</span>
        <span>⇧ Shift+点击 删除</span>
        <span>📦 框选批量移动</span>
        <span>🗑️ 右键删除选中</span>
      </div>
    </div>
  )
}

export default EditorCanvas
