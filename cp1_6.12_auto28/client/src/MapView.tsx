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
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, viewportX: 0, viewportY: 0 });
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOverNode, setDragOverNode] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'inside' | 'before' | 'after' | null>(null);
  const [hoveredNoteNode, setHoveredNoteNode] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, nodeId: '' });

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

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale + delta));

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

  const handleMouseDown = useCallback(
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

  const handleMouseMove = useCallback(
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

      if (draggingNode) {
        // Drag logic handled on node elements
      }
    },
    [isPanning, viewport, onViewportChange, draggingNode]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNode(null);
    setDragOverNode(null);
    setDragPosition(null);
  }, []);

  const getNodeColor = (depth: number) => {
    const colors = ['#1a3a5c', '#4a7c9f', '#7fa9c7', '#a8c4d9'];
    return colors[Math.min(depth, colors.length - 1)];
  };

  const getTextColor = (depth: number) => {
    return depth === 0 ? '#ffffff' : '#1a3a5c';
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (spacePressed) return;
    if (editingNode === nodeId) return;

    e.stopPropagation();
    setDraggingNode(nodeId);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      nodeId,
    };
  };

  const handleNodeDragOver = (e: React.DragEvent, nodeId: string) => {
    // Not using HTML5 drag and drop
  };

  const handleNodeMouseMove = (e: React.MouseEvent, nodeId: string) => {
    if (!draggingNode || draggingNode === nodeId) return;

    const nodePos = nodePositions.get(nodeId);
    if (!nodePos) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const height = rect.height;

    if (relY < height * 0.25) {
      setDragPosition('before');
    } else if (relY > height * 0.75) {
      setDragPosition('after');
    } else {
      setDragPosition('inside');
    }

    setDragOverNode(nodeId);
  };

  const handleNodeMouseUp = (e: React.MouseEvent, nodeId: string) => {
    if (!draggingNode || draggingNode === nodeId) {
      setDraggingNode(null);
      setDragOverNode(null);
      setDragPosition(null);
      return;
    }

    if (dragOverNode && dragPosition) {
      onMoveNode(draggingNode, dragOverNode, dragPosition);
    }

    setDraggingNode(null);
    setDragOverNode(null);
    setDragPosition(null);
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    setEditingNode(nodeId);
  };

  const handleNodeEditSubmit = (nodeId: string, text: string, note?: string) => {
    onUpdateNode(nodeId, { text, note });
    setEditingNode(null);
  };

  const handleNodeEditCancel = () => {
    setEditingNode(null);
  };

  const scalePercent = Math.round(viewport.scale * 100);

  return (
    <div
      ref={containerRef}
      className={`map-view ${spacePressed ? 'panning-cursor' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="map-canvas"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
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
        </svg>

        {Array.from(nodePositions.values()).map((pos) => {
          const isHighlighted = highlightedNodeIds.has(pos.id);
          const isDragging = draggingNode === pos.id;
          const isDragOver = dragOverNode === pos.id;
          const hasChildren = pos.node.children.length > 0;
          const hasNote = !!pos.node.note;
          const isEditing = editingNode === pos.id;

          return (
            <div
              key={pos.id}
              className={`mindmap-node node-depth-${pos.depth} ${isHighlighted ? 'highlighted' : ''} ${
                isDragging ? 'dragging' : ''
              } ${isDragOver ? 'drag-over' : ''} ${isDragOver && dragPosition === 'before' ? 'drag-before' : ''} ${
                isDragOver && dragPosition === 'after' ? 'drag-after' : ''
              }`}
              style={{
                left: pos.x,
                top: pos.y,
                width: pos.width,
                height: pos.height,
                backgroundColor: getNodeColor(pos.depth),
                color: getTextColor(pos.depth),
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, pos.id)}
              onMouseMove={(e) => handleNodeMouseMove(e, pos.id)}
              onMouseUp={(e) => handleNodeMouseUp(e, pos.id)}
              onDoubleClick={() => handleNodeDoubleClick(pos.id)}
            >
              {hasChildren && (
                <button
                  className="collapse-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse(pos.id);
                  }}
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
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
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
      </div>

      <div className="zoom-indicator">{scalePercent}%</div>
      <div className="viewport-coords">
        X: {Math.round(viewport.x)}, Y: {Math.round(viewport.y)}
      </div>
    </div>
  );
};

export default MapView;
