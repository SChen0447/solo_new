import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MindMapNode, ViewportState } from './types';
import NodeEditor from './NodeEditor';

interface MapViewProps {
  rootNode: MindMapNode;
  viewport: ViewportState;
  onViewportChange: (viewport: ViewportState) => void;
  onUpdateNode: (nodeId: string, updates: Partial<MindMapNode>) => void;
  onToggleCollapse: (nodeId: string) => void;
  onMoveNode: (sourceId: string, targetId: string, position: 'inside' | 'before' | 'after') => void;
  highlightedNodeIds: Set<string>;
  searchKeyword: string;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  node: MindMapNode;
  parentId?: string;
}

const NODE_HEIGHT = 44;
const NODE_MIN_WIDTH = 120;
const H_GAP = 80;
const V_GAP = 20;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const DRAG_THRESHOLD = 5;

const MapView: React.FC<MapViewProps> = ({
  rootNode,
  viewport,
  onViewportChange,
  onUpdateNode,
  onToggleCollapse,
  onMoveNode,
  highlightedNodeIds,
  searchKeyword,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, viewportX: 0, viewportY: 0 });
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    sourceId: string | null;
    overId: string | null;
    position: 'inside' | 'before' | 'after' | null;
    currentX: number;
    currentY: number;
  }>({ isDragging: false, sourceId: null, overId: null, position: null, currentX: 0, currentY: 0 });
  const [hoveredNoteNode, setHoveredNoteNode] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });

  const nodePositions = useMemo(() => {
    const positions = new Map<string, NodePosition>();

    const calculateLayout = (
      node: MindMapNode,
      x: number,
      y: number,
      depth: number = 0,
      parentId?: string
    ): { height: number } => {
      const nodeWidth = Math.max(NODE_MIN_WIDTH, node.text.length * 14 + 40);

      if (node.collapsed || node.children.length === 0) {
        positions.set(node.id, {
          id: node.id,
          x,
          y,
          width: nodeWidth,
          height: NODE_HEIGHT,
          depth,
          node,
          parentId,
        });
        return { height: NODE_HEIGHT };
      }

      let currentY = y;
      let totalHeight = 0;

      const childResults = node.children.map((child) => {
        const result = calculateLayout(
          child,
          x + nodeWidth + H_GAP,
          currentY,
          depth + 1,
          node.id
        );
        currentY += result.height + V_GAP;
        totalHeight += result.height + V_GAP;
        return result;
      });

      totalHeight -= V_GAP;
      const adjustedHeight = Math.max(NODE_HEIGHT, totalHeight);
      const offsetY = (adjustedHeight - totalHeight) / 2;

      positions.set(node.id, {
        id: node.id,
        x,
        y: y + offsetY + (totalHeight - NODE_HEIGHT) / 2,
        width: nodeWidth,
        height: NODE_HEIGHT,
        depth,
        node,
        parentId,
      });

      childResults.forEach((_, index) => {
        const pos = positions.get(node.children[index].id);
        if (pos) {
          pos.y += offsetY;
        }
      });

      return { height: adjustedHeight };
    };

    calculateLayout(rootNode, 60, 60, 0);

    return positions;
  }, [rootNode]);

  const connections = useMemo(() => {
    const conns: Array<{ from: NodePosition; to: NodePosition }> = [];

    const traverse = (node: MindMapNode) => {
      if (node.collapsed) return;

      const fromPos = nodePositions.get(node.id);
      if (!fromPos) return;

      node.children.forEach((child) => {
        const toPos = nodePositions.get(child.id);
        if (toPos) {
          conns.push({ from: fromPos, to: toPos });
        }
        traverse(child);
      });
    };

    traverse(rootNode);
    return conns;
  }, [rootNode, nodePositions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const step = 0.1;
      const delta = e.deltaY > 0 ? -step : step;
      const newScale = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale + delta)) * 10) / 10;

      if (Math.abs(newScale - viewport.scale) < 0.001) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - viewport.x) / viewport.scale;
      const worldY = (mouseY - viewport.y) / viewport.scale;

      const newX = mouseX - worldX * newScale;
      const newY = mouseY - worldY * newScale;

      onViewportChange({
        x: newX,
        y: newY,
        scale: newScale,
      });
    },
    [viewport, onViewportChange]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && spacePressed)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          viewportX: viewport.x,
          viewportY: viewport.y,
        };
      }
    },
    [spacePressed, viewport]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        onViewportChange({
          ...viewport,
          x: panStartRef.current.viewportX + dx,
          y: panStartRef.current.viewportY + dy,
        });
      }
    },
    [isPanning, viewport, onViewportChange]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (spacePressed) return;
    if (editingNode === nodeId) return;
    if (e.button !== 0) return;

    e.stopPropagation();
    e.preventDefault();

    const nodePos = nodePositions.get(nodeId);
    if (!nodePos) return;

    const startX = e.clientX;
    const startY = e.clientY;

    dragStartRef.current = {
      x: startX,
      y: startY,
      nodeX: nodePos.x,
      nodeY: nodePos.y,
    };

    let hasExceededThreshold = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!hasExceededThreshold && dist > DRAG_THRESHOLD) {
        hasExceededThreshold = true;
      }

      if (!hasExceededThreshold) return;

      const newX = dragStartRef.current.nodeX + dx / viewport.scale;
      const newY = dragStartRef.current.nodeY + dy / viewport.scale;

      let overId: string | null = null;
      let position: 'inside' | 'before' | 'after' | null = null;

      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const screenX = moveEvent.clientX - containerRect.left;
        const screenY = moveEvent.clientY - containerRect.top;

        const worldX = (screenX - viewport.x) / viewport.scale;
        const worldY = (screenY - viewport.y) / viewport.scale;

        let found: { id: string; pos: NodePosition } | null = null;
        nodePositions.forEach((pos, id) => {
          if (id !== nodeId &&
              worldX >= pos.x && worldX <= pos.x + pos.width &&
              worldY >= pos.y && worldY <= pos.y + pos.height) {
            if (!found || pos.depth > found.pos.depth) {
              found = { id, pos };
            }
          }
        });

        if (found) {
          overId = found.id;
          const relY = worldY - found.pos.y;
          const h = found.pos.height;
          if (relY < h * 0.25) {
            position = 'before';
          } else if (relY > h * 0.75) {
            position = 'after';
          } else {
            position = 'inside';
          }
        }
      }

      setDragState({
        isDragging: true,
        sourceId: nodeId,
        overId,
        position,
        currentX: newX,
        currentY: newY,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      setDragState((prev) => {
        if (prev.isDragging && prev.overId && prev.position && prev.sourceId) {
          onMoveNode(prev.sourceId, prev.overId, prev.position);
        }
        return { isDragging: false, sourceId: null, overId: null, position: null, currentX: 0, currentY: 0 };
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    if (dragState.isDragging) return;
    setEditingNode(nodeId);
  };

  const handleNodeEditSubmit = (nodeId: string, text: string, note?: string) => {
    onUpdateNode(nodeId, { text, note });
    setEditingNode(null);
  };

  const handleNodeEditCancel = () => {
    setEditingNode(null);
  };

  const getNodeColor = (depth: number) => {
    const colors = ['#1a3a5c', '#4a7c9f', '#7fa9c7', '#a8c4d9'];
    return colors[Math.min(depth, colors.length - 1)];
  };

  const getTextColor = (depth: number) => {
    return depth === 0 ? '#ffffff' : '#1a3a5c';
  };

  const scalePercent = Math.round(viewport.scale * 100);

  return (
    <div
      ref={containerRef}
      className={`map-view ${spacePressed && !isPanning ? 'pannable-cursor' : ''} ${isPanning ? 'panning-cursor' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
    >
      <div
        ref={canvasRef}
        className="map-canvas"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: '0 0',
          transition: isPanning || dragState.isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <svg className="connections-svg">
          {connections.map((conn, index) => {
            const fromX = conn.from.x + conn.from.width;
            const fromY = conn.from.y + conn.from.height / 2;
            const toX = conn.to.x;
            const toY = conn.to.y + conn.to.height / 2;
            const midX = (fromX + toX) / 2;

            return (
              <path
                key={index}
                d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                fill="none"
                stroke="#b0c4d9"
                strokeWidth={2}
                className="connection-path"
              />
            );
          })}

          {dragState.isDragging && dragState.sourceId && dragState.overId && (() => {
            const sourcePos = nodePositions.get(dragState.sourceId);
            const targetPos = nodePositions.get(dragState.overId);
            if (!sourcePos || !targetPos) return null;

            let lineX1: number, lineY1: number, lineX2: number, lineY2: number;

            if (dragState.position === 'inside') {
              lineX1 = dragState.currentX + sourcePos.width / 2;
              lineY1 = dragState.currentY + sourcePos.height / 2;
              lineX2 = targetPos.x + targetPos.width / 2;
              lineY2 = targetPos.y + targetPos.height / 2;
            } else if (dragState.position === 'before') {
              lineX1 = dragState.currentX + sourcePos.width;
              lineY1 = dragState.currentY + sourcePos.height / 2;
              lineX2 = targetPos.x;
              lineY2 = targetPos.y - 2;
            } else {
              lineX1 = dragState.currentX + sourcePos.width;
              lineY1 = dragState.currentY + sourcePos.height / 2;
              lineX2 = targetPos.x;
              lineY2 = targetPos.y + targetPos.height + 2;
            }

            const midX = (lineX1 + lineX2) / 2;

            return (
              <path
                d={`M ${lineX1} ${lineY1} C ${midX} ${lineY1}, ${midX} ${lineY2}, ${lineX2} ${lineY2}`}
                fill="none"
                stroke="#1a3a5c"
                strokeWidth={2}
                strokeDasharray="6,4"
                className="drag-preview-line"
              />
            );
          })()}
        </svg>

        {Array.from(nodePositions.values()).map((pos) => {
          const isHighlighted = highlightedNodeIds.has(pos.id);
          const isSourceDragging = dragState.isDragging && dragState.sourceId === pos.id;
          const isDragOver = dragState.overId === pos.id;
          const hasChildren = pos.node.children.length > 0;
          const hasNote = !!pos.node.note;
          const isEditing = editingNode === pos.id;

          let dragOverClass = '';
          if (isDragOver && dragState.isDragging) {
            if (dragState.position === 'inside') dragOverClass = 'drag-over';
            else if (dragState.position === 'before') dragOverClass = 'drag-before';
            else if (dragState.position === 'after') dragOverClass = 'drag-after';
          }

          return (
            <div
              key={pos.id}
              className={`mindmap-node node-depth-${pos.depth} ${isHighlighted ? 'highlighted' : ''} ${
                isSourceDragging ? 'dragging-source' : ''
              } ${dragOverClass}`}
              style={{
                left: pos.x,
                top: pos.y,
                width: pos.width,
                height: pos.height,
                backgroundColor: getNodeColor(pos.depth),
                color: getTextColor(pos.depth),
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, pos.id)}
              onDoubleClick={() => handleNodeDoubleClick(pos.id)}
            >
              {hasChildren && (
                <button
                  className="collapse-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse(pos.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {pos.node.collapsed ? '+' : '−'}
                </button>
              )}

              {isEditing ? (
                <NodeEditor
                  node={pos.node}
                  onSubmit={(text, note) => handleNodeEditSubmit(pos.id, text, note)}
                  onCancel={handleNodeEditCancel}
                />
              ) : (
                <>
                  <span className="node-text">{pos.node.text}</span>
                  {hasNote && (
                    <div
                      className="note-indicator"
                      onMouseEnter={() => setHoveredNoteNode(pos.id)}
                      onMouseLeave={() => setHoveredNoteNode(null)}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                      </svg>
                      {hoveredNoteNode === pos.id && (
                        <div className="note-tooltip">{pos.node.note}</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {dragState.isDragging && dragState.sourceId && (() => {
          const pos = nodePositions.get(dragState.sourceId);
          if (!pos) return null;

          return (
            <div
              className="mindmap-node dragging-ghost"
              style={{
                left: dragState.currentX,
                top: dragState.currentY,
                width: pos.width,
                height: pos.height,
                backgroundColor: getNodeColor(pos.depth),
                color: getTextColor(pos.depth),
              }}
            >
              <span className="node-text">{pos.node.text}</span>
            </div>
          );
        })()}
      </div>

      <div className="zoom-indicator">{scalePercent}%</div>
      <div className="viewport-coords">
        X: {Math.round(viewport.x)}, Y: {Math.round(viewport.y)}
      </div>
    </div>
  );
};

export default MapView;
