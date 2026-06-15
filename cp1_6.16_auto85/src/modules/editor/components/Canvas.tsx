import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useDrop, useDrag } from 'react-dnd'
import { useGraphStore, type Node, type Edge } from '../stores/graphStore'
import {
  autoLayout,
  generateBezierPath,
  detectEdgeIntersections,
  getNodeAnchors,
  findNearestAnchor,
  type Point
} from '../../layout/autoLayout'

interface DragItem {
  type: 'node'
  nodeType: 'rect' | 'circle'
  width: number
  height: number
}

interface ToolbarItemProps {
  nodeType: 'rect' | 'circle'
  label: string
  width: number
  height: number
}

const ToolbarItem: React.FC<ToolbarItemProps> = ({ nodeType, label, width, height }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'node',
    item: { type: 'node', nodeType, width, height },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }), [nodeType, width, height])

  return (
    <div
      ref={drag}
      style={{
        padding: 12,
        backgroundColor: '#FFFFFF',
        border: '2px dashed #E0E0E0',
        borderRadius: 8,
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#2196F3'
        e.currentTarget.style.backgroundColor = '#F0F8FF'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E0E0E0'
        e.currentTarget.style.backgroundColor = '#FFFFFF'
      }}
    >
      <div style={{
        width: nodeType === 'circle' ? 30 : 40,
        height: nodeType === 'circle' ? 30 : 20,
        backgroundColor: '#FFFFFF',
        border: '2px solid #2196F3',
        borderRadius: nodeType === 'circle' ? '50%' : '4px'
      }} />
      <span style={{ fontSize: 14, color: '#333' }}>{label}</span>
    </div>
  )
}

interface NodeComponentProps {
  node: Node
  isSelected: boolean
  isDragging: boolean
  isConnecting: boolean
  zoom: number
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void
  onDoubleClick: (nodeId: string) => void
  onAnchorMouseDown: (e: React.MouseEvent, nodeId: string, anchor: Point & { position: 'top' | 'right' | 'bottom' | 'left' }) => void
  onLabelChange: (nodeId: string, label: string) => void
  editingNodeId: string | null
  hoveredAnchor: string | null
  setHoveredAnchor: (anchorId: string | null) => void
}

const NodeComponent: React.FC<NodeComponentProps> = ({
  node,
  isSelected,
  isDragging,
  isConnecting,
  zoom,
  onMouseDown,
  onDoubleClick,
  onAnchorMouseDown,
  onLabelChange,
  editingNodeId,
  hoveredAnchor,
  setHoveredAnchor
}) => {
  const [localLabel, setLocalLabel] = useState(node.label)
  const inputRef = useRef<HTMLInputElement>(null)

  const isEditing = editingNodeId === node.id

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const anchors = getNodeAnchors(node)
  const age = Date.now() - node.createdAt
  const showEntranceAnimation = age < 150

  const nodeStyle: React.CSSProperties = {
    position: 'absolute',
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: showEntranceAnimation
      ? 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
      : 'all 0.5s ease-out',
    transform: showEntranceAnimation ? 'scale(0.8)' : 'scale(1)',
    transformOrigin: 'center center',
    filter: isDragging ? 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15))' : 'none',
    zIndex: isSelected || isDragging ? 10 : 1,
    userSelect: 'none'
  }

  const shapeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    border: `2px solid ${isSelected ? '#2196F3' : '#E0E0E0'}`,
    borderRadius: node.type === 'circle' ? '50%' : '4px',
    boxShadow: isSelected ? '0 0 0 4px rgba(33, 150, 243, 0.2)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative'
  }

  const handleInputBlur = () => {
    onLabelChange(node.id, localLabel)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onLabelChange(node.id, localLabel)
    }
  }

  return (
    <div
      style={nodeStyle}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick(node.id)
      }}
    >
      <div style={shapeStyle}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            style={{
              width: '90%',
              textAlign: 'center',
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            style={{
              fontSize: '14px',
              color: '#333333',
              padding: '4px 8px',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}
          >
            {node.label}
          </span>
        )}

        {(isSelected || isConnecting) && (
          <>
            {anchors.map((anchor, idx) => {
              const anchorId = `${node.id}-${anchor.position}`
              const isHovered = hoveredAnchor === anchorId
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredAnchor(anchorId)}
                  onMouseLeave={() => setHoveredAnchor(null)}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    onAnchorMouseDown(e, node.id, anchor)
                  }}
                  style={{
                    position: 'absolute',
                    width: 8 / zoom,
                    height: 8 / zoom,
                    backgroundColor: isHovered ? '#4CAF50' : '#2196F3',
                    borderRadius: '50%',
                    cursor: 'crosshair',
                    transform: 'translate(-50%, -50%)',
                    left: `${(anchor.x - node.x) / node.width * 100}%`,
                    top: `${(anchor.y - node.y) / node.height * 100}%`,
                    zIndex: 20,
                    border: '1px solid #FFFFFF',
                    transition: 'background-color 0.15s ease'
                  }}
                />
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

interface EdgeComponentProps {
  edge: Edge
  sourceNode: Node
  targetNode: Node
  isSelected: boolean
  direction: 'LR' | 'TB'
  nodes: Node[]
  intersectionPoints: Array<{ point: Point; count: number }>
  onClick: () => void
}

const EdgeComponent: React.FC<EdgeComponentProps> = ({
  edge,
  sourceNode,
  targetNode,
  isSelected,
  direction,
  nodes,
  intersectionPoints,
  onClick
}) => {
  const sourceAnchor = findNearestAnchor(sourceNode, {
    x: targetNode.x + targetNode.width / 2,
    y: targetNode.y + targetNode.height / 2
  }, direction)

  const targetAnchor = findNearestAnchor(targetNode, {
    x: sourceNode.x + sourceNode.width / 2,
    y: sourceNode.y + sourceNode.height / 2
  }, direction)

  const { path, points } = generateBezierPath(
    { x: sourceAnchor.x, y: sourceAnchor.y },
    { x: targetAnchor.x, y: targetAnchor.y },
    direction,
    nodes.filter(n => n.id !== sourceNode.id && n.id !== targetNode.id)
  )

  const arrowId = `arrow-${edge.id}`

  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick}>
      <defs>
        <marker
          id={arrowId}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill={isSelected ? '#2196F3' : '#666666'}
          />
        </marker>
      </defs>

      <path
        d={path}
        fill="none"
        stroke={isSelected ? '#2196F3' : '#666666'}
        strokeWidth={isSelected ? 3 : 2}
        markerEnd={`url(#${arrowId})`}
        style={{
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease'
        }}
      />

      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        style={{ cursor: 'pointer' }}
      />

      {intersectionPoints.map((intersection, idx) => (
        <g key={idx}>
          <circle
            cx={intersection.point.x}
            cy={intersection.point.y}
            r={6}
            fill="#FF9800"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
          <text
            x={intersection.point.x}
            y={intersection.point.y + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="bold"
          >
            {intersection.count}
          </text>
        </g>
      ))}
    </g>
  )
}

export const Canvas: React.FC = () => {
  const {
    nodes,
    edges,
    selectedIds,
    layoutDirection,
    isConnecting,
    connectingFrom,
    zoom,
    pan,
    isAnimating,
    addNode,
    moveNode,
    updateNodeLabel,
    addEdge,
    setSelected,
    clearSelection,
    deleteSelected,
    applyLayout,
    setZoom,
    setPan,
    startConnecting,
    endConnecting,
    setDragging
  } = useGraphStore()

  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [hoveredAnchor, setHoveredAnchor] = useState<string | null>(null)
  const [showToolbar, setShowToolbar] = useState(true)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  const [, drop] = useDrop<DragItem, void, { isOver: boolean }>(() => ({
    accept: 'node',
    drop: (item, monitor) => {
      const offset = monitor.getClientOffset()
      if (!offset || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = (offset.x - rect.left - pan.x) / zoom
      const y = (offset.y - rect.top - pan.y) / zoom

      addNode({
        type: item.nodeType,
        x: x - item.width / 2,
        y: y - item.height / 2,
        width: item.width,
        height: item.height,
        label: '新节点'
      })
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    })
  }), [pan, zoom, addNode])

  const handleResize = useCallback(() => {
    setWindowWidth(window.innerWidth)
    if (window.innerWidth < 768) {
      setShowToolbar(false)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  const screenToCanvas = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom
    }
  }, [pan, zoom])

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (isConnecting) return

    e.stopPropagation()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    setDragOffset({
      x: canvasPos.x - (node.x + node.width / 2),
      y: canvasPos.y - (node.y + node.height / 2)
    })

    setDraggingNodeId(nodeId)
    setDragging(true)

    const append = e.ctrlKey || e.metaKey
    if (!selectedIds.has(nodeId) || !append) {
      setSelected(new Set([nodeId]), append)
    }

    setEditingNodeId(null)
  }, [isConnecting, nodes, screenToCanvas, selectedIds, setSelected, setDragging])

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setEditingNodeId(nodeId)
  }, [])

  const handleLabelChange = useCallback((nodeId: string, label: string) => {
    updateNodeLabel(nodeId, label)
    setEditingNodeId(null)
  }, [updateNodeLabel])

  const handleAnchorMouseDown = useCallback((
    e: React.MouseEvent,
    nodeId: string,
    anchor: Point & { position: 'top' | 'right' | 'bottom' | 'left' }
  ) => {
    e.stopPropagation()
    startConnecting(nodeId, anchor)
  }, [startConnecting])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY)
    setMousePos(canvasPos)

    if (draggingNodeId) {
      const newX = canvasPos.x - dragOffset.x
      const newY = canvasPos.y - dragOffset.y
      moveNode(draggingNodeId, newX, newY)
    }

    if (isPanning) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      setPan(pan.x + dx, pan.y + dy)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }, [draggingNodeId, dragOffset, screenToCanvas, moveNode, isPanning, pan, panStart, setPan])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isConnecting && connectingFrom) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY)

      let targetNode: Node | null = null
      for (const node of nodes) {
        if (
          node.id !== connectingFrom.nodeId &&
          canvasPos.x >= node.x &&
          canvasPos.x <= node.x + node.width &&
          canvasPos.y >= node.y &&
          canvasPos.y <= node.y + node.height
        ) {
          targetNode = node
          break
        }
      }

      if (targetNode) {
        const sourceAnchor = findNearestAnchor(
          nodes.find(n => n.id === connectingFrom.nodeId)!,
          { x: targetNode.x + targetNode.width / 2, y: targetNode.y + targetNode.height / 2 },
          layoutDirection
        )
        const targetAnchor = findNearestAnchor(
          targetNode,
          {
            x: nodes.find(n => n.id === connectingFrom.nodeId)!.x +
              nodes.find(n => n.id === connectingFrom.nodeId)!.width / 2,
            y: nodes.find(n => n.id === connectingFrom.nodeId)!.y +
              nodes.find(n => n.id === connectingFrom.nodeId)!.height / 2
          },
          layoutDirection
        )

        addEdge({
          source: connectingFrom.nodeId,
          target: targetNode.id,
          sourceAnchor: { x: sourceAnchor.x, y: sourceAnchor.y },
          targetAnchor: { x: targetAnchor.x, y: targetAnchor.y }
        })
      }

      endConnecting()
    }

    if (draggingNodeId) {
      setDraggingNodeId(null)
      setDragging(false)
    }

    if (isPanning) {
      setIsPanning(false)
    }
  }, [isConnecting, connectingFrom, screenToCanvas, nodes, layoutDirection, addEdge, endConnecting, draggingNodeId, setDragging, isPanning])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === svgRef.current) {
      clearSelection()
      setEditingNodeId(null)

      if (e.button === 1 || e.altKey) {
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
      }
    }
  }, [clearSelection])

  const handleEdgeClick = useCallback((edgeId: string) => {
    setSelected(new Set([edgeId]), false)
  }, [setSelected])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.25, Math.min(4, zoom * delta))

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom)
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom)

      setZoom(newZoom)
      setPan(newPanX, newPanY)
    }
  }, [zoom, pan, setZoom, setPan])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT') {
          deleteSelected()
        }
      }
      if (e.key === 'Escape') {
        endConnecting()
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelected, endConnecting, clearSelection])

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return
    const result = autoLayout(nodes, edges, layoutDirection)
    applyLayout(result)
  }, [nodes, edges, layoutDirection, applyLayout])

  const edgeData = useMemo(() => {
    return edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      if (!sourceNode || !targetNode) return null

      const sourceAnchor = findNearestAnchor(sourceNode, {
        x: targetNode.x + targetNode.width / 2,
        y: targetNode.y + targetNode.height / 2
      }, layoutDirection)

      const targetAnchor = findNearestAnchor(targetNode, {
        x: sourceNode.x + sourceNode.width / 2,
        y: sourceNode.y + sourceNode.height / 2
      }, layoutDirection)

      const { points } = generateBezierPath(
        { x: sourceAnchor.x, y: sourceAnchor.y },
        { x: targetAnchor.x, y: targetAnchor.y },
        layoutDirection,
        nodes.filter(n => n.id !== sourceNode.id && n.id !== targetNode.id)
      )

      return { id: edge.id, points }
    }).filter(Boolean) as Array<{ id: string; points: Point[] }>
  }, [edges, nodes, layoutDirection])

  const intersections = useMemo(() => {
    return detectEdgeIntersections(edgeData)
  }, [edgeData])

  const connectingLine = useMemo(() => {
    if (!isConnecting || !connectingFrom) return null

    const sourceNode = nodes.find(n => n.id === connectingFrom.nodeId)
    if (!sourceNode) return null

    const sourceAnchor = connectingFrom.anchor
    const { path } = generateBezierPath(
      { x: sourceAnchor.x, y: sourceAnchor.y },
      mousePos,
      layoutDirection,
      nodes.filter(n => n.id !== sourceNode.id)
    )

    return path
  }, [isConnecting, connectingFrom, nodes, mousePos, layoutDirection])

  const canvasStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    backgroundImage: `
      linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
    `,
    backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
    backgroundPosition: `${pan.x}px ${pan.y}px`
  }

  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div style={{
        height: 48,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        zIndex: 100
      }}>
        {windowWidth < 768 && (
          <button
            onClick={() => setShowToolbar(!showToolbar)}
            style={{
              padding: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        <span style={{ fontWeight: 600, fontSize: 16, color: '#333' }}>流程图编辑器</span>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleAutoLayout}
          disabled={nodes.length === 0 || isAnimating}
          title="自动布局优化"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            backgroundColor: nodes.length === 0 || isAnimating ? '#E0E0E0' : '#2196F3',
            color: nodes.length === 0 || isAnimating ? '#999' : '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            cursor: nodes.length === 0 || isAnimating ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 500,
            transition: 'background-color 0.2s ease',
            minWidth: windowWidth < 768 ? 'auto' : 140
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 7l5 5-5 5M6 7l5 5-5 5" />
          </svg>
          {windowWidth >= 768 && <span>自动布局</span>}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setZoom(Math.max(0.25, zoom * 0.9))}
            style={{
              padding: 6,
              border: '1px solid #E0E0E0',
              background: '#FFFFFF',
              cursor: 'pointer',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span style={{ fontSize: 12, minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(4, zoom * 1.1))}
            style={{
              padding: 6,
              border: '1px solid #E0E0E0',
              background: '#FFFFFF',
              cursor: 'pointer',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: 240,
          backgroundColor: '#FAFAFA',
          borderRight: '1px solid #E0E0E0',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          transform: showToolbar ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          position: windowWidth < 768 ? 'absolute' : 'relative',
          height: '100%',
          zIndex: 50
        }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#333' }}>
            节点库
          </h3>

          <ToolbarItem
            nodeType="rect"
            label="矩形节点"
            width={120}
            height={60}
          />

          <ToolbarItem
            nodeType="circle"
            label="圆形节点"
            width={120}
            height={60}
          />

          <div style={{ marginTop: 'auto', padding: 12, backgroundColor: '#F5F5F5', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 600, color: '#666' }}>
              快捷操作
            </h4>
            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#666', lineHeight: 1.8 }}>
              <li>拖拽节点到画布添加</li>
              <li>双击节点编辑文字</li>
              <li>从蓝色锚点拖出连线</li>
              <li>Ctrl+点击多选</li>
              <li>Delete删除选中项</li>
              <li>滚轮缩放画布</li>
              <li>Alt+拖拽平移画布</li>
            </ul>
          </div>
        </div>

        <div
          ref={(el) => {
            canvasRef.current = el
            drop(el)
          }}
          style={canvasStyle}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseDown={handleCanvasMouseDown}
          onWheel={handleWheel}
        >
          <svg
            ref={svgRef}
            style={svgStyle}
          >
            <g
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0'
              }}
            >
              {edges.map((edge) => {
                const sourceNode = nodes.find(n => n.id === edge.source)
                const targetNode = nodes.find(n => n.id === edge.target)
                if (!sourceNode || !targetNode) return null

                const isSelected = selectedIds.has(edge.id)
                const intersectionPoints = intersections.get(edge.id) || []

                return (
                  <EdgeComponent
                    key={edge.id}
                    edge={edge}
                    sourceNode={sourceNode}
                    targetNode={targetNode}
                    isSelected={isSelected}
                    direction={layoutDirection}
                    nodes={nodes}
                    intersectionPoints={intersectionPoints}
                    onClick={() => handleEdgeClick(edge.id)}
                  />
                )
              })}

              {connectingLine && (
                <g style={{ pointerEvents: 'none' }}>
                  <path
                    d={connectingLine}
                    fill="none"
                    stroke="#2196F3"
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    opacity={0.7}
                  />
                </g>
              )}
            </g>
          </svg>

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%'
              }}
            >
              {nodes.map((node) => (
                <NodeComponent
                  key={node.id}
                  node={node}
                  isSelected={selectedIds.has(node.id)}
                  isDragging={draggingNodeId === node.id}
                  isConnecting={isConnecting}
                  zoom={zoom}
                  onMouseDown={handleNodeMouseDown}
                  onDoubleClick={handleNodeDoubleClick}
                  onAnchorMouseDown={handleAnchorMouseDown}
                  onLabelChange={handleLabelChange}
                  editingNodeId={editingNodeId}
                  hoveredAnchor={hoveredAnchor}
                  setHoveredAnchor={setHoveredAnchor}
                />
              ))}
            </div>
          </div>

          {nodes.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#999',
              pointerEvents: 'none'
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <path d="M10 6.5h4M10 17.5h4M6.5 10v4M17.5 10v4" />
              </svg>
              <p style={{ fontSize: 16, margin: 0 }}>从左侧工具栏拖拽节点开始绘制</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
