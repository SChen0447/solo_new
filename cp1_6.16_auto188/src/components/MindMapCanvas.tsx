import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MindMapNode, ThemeColors } from '../types';

interface Props {
  nodes: Record<string, MindMapNode>;
  themeColors: ThemeColors;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onMoveNode: (nodeId: string, x: number, y: number, children: { id: string; x: number; y: number }[]) => void;
  onMoveNodeEnd: (nodeId: string, x: number, y: number, children: { id: string; x: number; y: number }[]) => void;
  onUpdateText: (nodeId: string, text: string) => void;
  isPreview: boolean;
}

interface NodeAnimState {
  opacity: number;
  displayX: number;
  displayY: number;
  targetX: number;
  targetY: number;
  scale: number;
  isNew: boolean;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 48;
const MIN_TOUCH_SIZE = 44;

function getDescendants(nodes: Record<string, MindMapNode>, nodeId: string): string[] {
  const result: string[] = [];
  const node = nodes[nodeId];
  if (!node) return result;
  for (const childId of node.children) {
    result.push(childId);
    result.push(...getDescendants(nodes, childId));
  }
  return result;
}

function MindMapCanvas({ nodes, themeColors, selectedNodeId, onSelectNode, onMoveNode, onMoveNodeEnd, onUpdateText, isPreview }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [animStates, setAnimStates] = useState<Record<string, NodeAnimState>>({});
  const [zoomDisplay, setZoomDisplay] = useState('100%');
  const prevNodesRef = useRef<Record<string, MindMapNode>>({});
  const dragNodeStartRef = useRef<Record<string, { x: number; y: number }>>({});
  const animFrameRef = useRef<number>(0);
  const moveThrottleRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevNodesRef.current;
    const nextAnim: Record<string, NodeAnimState> = {};
    const nodeIds = Object.keys(nodes);

    for (const id of nodeIds) {
      const node = nodes[id];
      const isNew = !prev[id];
      const existing = animStates[id];

      if (existing) {
        nextAnim[id] = {
          ...existing,
          targetX: node.x,
          targetY: node.y,
          isNew: false,
        };
      } else {
        nextAnim[id] = {
          opacity: isNew ? 0 : 1,
          displayX: node.x,
          displayY: node.y,
          targetX: node.x,
          targetY: node.y,
          scale: 1,
          isNew,
        };
      }
    }

    setAnimStates(nextAnim);
    prevNodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      setAnimStates((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          const s = next[id];
          const updates: Partial<NodeAnimState> = {};

          if (s.isNew && s.opacity < 1) {
            updates.opacity = Math.min(1, s.opacity + 1 / 18);
            changed = true;
          }

          const dx = s.targetX - s.displayX;
          const dy = s.targetY - s.displayY;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            updates.displayX = s.displayX + dx * 0.15;
            updates.displayY = s.displayY + dy * 0.15;
            changed = true;
          } else if (dx !== 0 || dy !== 0) {
            updates.displayX = s.targetX;
            updates.displayY = s.targetY;
            changed = true;
          }

          if (Object.keys(updates).length > 0) {
            next[id] = { ...s, ...updates };
          }
        }
        return changed ? next : prev;
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, []);

  useEffect(() => {
    setZoomDisplay(Math.round(zoom * 100) + '%');
  }, [zoom]);

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: sx, y: sy };
    return {
      x: (sx - rect.left - pan.x - rect.width / 2) / zoom,
      y: (sy - rect.top - pan.y - rect.height / 2) / zoom,
    };
  }, [pan, zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.5, Math.min(2.5, prev + delta)));
  }, []);

  const findNodeAt = useCallback((cx: number, cy: number): string | null => {
    for (const id of Object.keys(nodes)) {
      const node = nodes[id];
      const anim = animStates[id];
      const ax = anim ? anim.displayX : node.x;
      const ay = anim ? anim.displayY : node.y;
      if (
        cx >= ax - NODE_WIDTH / 2 &&
        cx <= ax + NODE_WIDTH / 2 &&
        cy >= ay - NODE_HEIGHT / 2 &&
        cy <= ay + NODE_HEIGHT / 2
      ) {
        return id;
      }
    }
    return null;
  }, [nodes, animStates]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isPreview) return;
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanStartOffset({ ...pan });
      return;
    }
    if (e.button === 0) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      const nodeId = findNodeAt(canvasPos.x, canvasPos.y);
      if (nodeId) {
        const node = nodes[nodeId];
        const anim = animStates[nodeId];
        const ax = anim ? anim.displayX : node.x;
        const ay = anim ? anim.displayY : node.y;
        onSelectNode(nodeId);
        setDraggingNodeId(nodeId);
        setDragOffset({ x: canvasPos.x - ax, y: canvasPos.y - ay });
        const descIds = getDescendants(nodes, nodeId);
        const starts: Record<string, { x: number; y: number }> = {};
        starts[nodeId] = { x: node.x, y: node.y };
        for (const did of descIds) {
          if (nodes[did]) starts[did] = { x: nodes[did].x, y: nodes[did].y };
        }
        dragNodeStartRef.current = starts;
        setAnimStates((prev) => ({
          ...prev,
          [nodeId]: prev[nodeId] ? { ...prev[nodeId], scale: 1.05 } : prev[nodeId],
        }));
      } else {
        onSelectNode(null);
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        setPanStartOffset({ ...pan });
      }
    }
  }, [isPreview, pan, screenToCanvas, findNodeAt, nodes, animStates, onSelectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({ x: panStartOffset.x + dx, y: panStartOffset.y + dy });
      return;
    }
    if (draggingNodeId) {
      const canvasPos = screenToCanvas(e.clientX, e.clientY);
      const newX = canvasPos.x - dragOffset.x;
      const newY = canvasPos.y - dragOffset.y;
      const startPositions = dragNodeStartRef.current;
      const startDrag = startPositions[draggingNodeId];
      if (!startDrag) return;
      const deltaX = newX - startDrag.x;
      const deltaY = newY - startDrag.y;

      const movedChildren: { id: string; x: number; y: number }[] = [];
      for (const [id, startPos] of Object.entries(startPositions)) {
        if (id === draggingNodeId) continue;
        movedChildren.push({ id, x: startPos.x + deltaX, y: startPos.y + deltaY });
      }

      setAnimStates((prev) => {
        const next = { ...prev };
        if (next[draggingNodeId]) {
          next[draggingNodeId] = {
            ...next[draggingNodeId],
            displayX: newX,
            displayY: newY,
            targetX: newX,
            targetY: newY,
          };
        }
        for (const child of movedChildren) {
          if (next[child.id]) {
            next[child.id] = {
              ...next[child.id],
              displayX: child.x,
              displayY: child.y,
              targetX: child.x,
              targetY: child.y,
            };
          }
        }
        return next;
      });

      const now = Date.now();
      if (now - moveThrottleRef.current > 33) {
        moveThrottleRef.current = now;
        onMoveNode(draggingNodeId, newX, newY, movedChildren);
      }
    }
  }, [isPanning, panStart, panStartOffset, draggingNodeId, dragOffset, screenToCanvas, onMoveNode]);

  const handleMouseUp = useCallback(() => {
    if (draggingNodeId) {
      const anim = animStates[draggingNodeId];
      if (anim) {
        const startPositions = dragNodeStartRef.current;
        const startDrag = startPositions[draggingNodeId];
        let finalX = anim.displayX;
        let finalY = anim.displayY;
        if (startDrag) {
          const deltaX = finalX - startDrag.x;
          const deltaY = finalY - startDrag.y;
          const movedChildren: { id: string; x: number; y: number }[] = [];
          for (const [id, startPos] of Object.entries(startPositions)) {
            if (id === draggingNodeId) continue;
            movedChildren.push({ id, x: startPos.x + deltaX, y: startPos.y + deltaY });
          }
          onMoveNodeEnd(draggingNodeId, finalX, finalY, movedChildren);
        }
      }
      setAnimStates((prev) => ({
        ...prev,
        [draggingNodeId]: prev[draggingNodeId] ? { ...prev[draggingNodeId], scale: 1 } : prev[draggingNodeId],
      }));
      setDraggingNodeId(null);
    }
    setIsPanning(false);
  }, [draggingNodeId, animStates, onMoveNodeEnd]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (isPreview) return;
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    const nodeId = findNodeAt(canvasPos.x, canvasPos.y);
    if (nodeId) {
      setEditingNodeId(nodeId);
      setEditText(nodes[nodeId]?.text || '');
    }
  }, [isPreview, screenToCanvas, findNodeAt, nodes]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingNodeId && editText.trim()) {
        onUpdateText(editingNodeId, editText.trim());
      }
      setEditingNodeId(null);
    } else if (e.key === 'Escape') {
      setEditingNodeId(null);
    }
  }, [editingNodeId, editText, onUpdateText]);

  const renderConnections = () => {
    const lines: JSX.Element[] = [];
    for (const id of Object.keys(nodes)) {
      const node = nodes[id];
      if (!node || !node.parentId || !nodes[node.parentId]) continue;
      const parentAnim = animStates[node.parentId];
      const childAnim = animStates[id];
      const px = parentAnim ? parentAnim.displayX : nodes[node.parentId].x;
      const py = parentAnim ? parentAnim.displayY : nodes[node.parentId].y;
      const cx = childAnim ? childAnim.displayX : node.x;
      const cy = childAnim ? childAnim.displayY : node.y;

      const midY = (py + cy) / 2;
      lines.push(
        <path
          key={`${node.parentId}-${id}`}
          d={`M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy}`}
          stroke={themeColors.lineColor}
          strokeWidth={2}
          fill="none"
          opacity={childAnim ? childAnim.opacity : 1}
        />
      );
    }
    return lines;
  };

  const renderNodes = () => {
    const elements: JSX.Element[] = [];
    for (const id of Object.keys(nodes)) {
      const node = nodes[id];
      const anim = animStates[id];
      if (!node) continue;
      const ax = anim ? anim.displayX : node.x;
      const ay = anim ? anim.displayY : node.y;
      const opacity = anim ? anim.opacity : 1;
      const scale = anim ? anim.scale : 1;
      const isSelected = id === selectedNodeId;
      const isEditing = id === editingNodeId;
      const isRoot = node.parentId === null;

      const minSize = Math.max(NODE_WIDTH, MIN_TOUCH_SIZE);
      const height = Math.max(NODE_HEIGHT, MIN_TOUCH_SIZE);
      const width = isRoot ? Math.max(NODE_WIDTH + 40, minSize) : Math.max(NODE_WIDTH, minSize);

      elements.push(
        <g
          key={id}
          transform={`translate(${ax}, ${ay}) scale(${scale})`}
          opacity={opacity}
          style={{ cursor: isPreview ? 'default' : 'pointer' }}
        >
          <rect
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            rx={8}
            ry={8}
            fill={themeColors.nodeFill}
            stroke={isSelected ? themeColors.glowColor : themeColors.nodeBorder}
            strokeWidth={isSelected ? 2 : 1}
            style={{
              filter: isSelected ? `drop-shadow(0 0 6px ${themeColors.glowColor})` : 'none',
            }}
          />
          {isEditing ? (
            <foreignObject
              x={-width / 2 + 8}
              y={-height / 2 + 4}
              width={width - 16}
              height={height - 8}
            >
              <input
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={() => {
                  if (editingNodeId && editText.trim()) {
                    onUpdateText(editingNodeId, editText.trim());
                  }
                  setEditingNodeId(null);
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: isRoot ? 16 : 14,
                  fontWeight: isRoot ? 600 : 400,
                  textAlign: 'center',
                }}
              />
            </foreignObject>
          ) : (
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fff"
              fontSize={isRoot ? 16 : 14}
              fontWeight={isRoot ? 600 : 400}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {node.text}
            </text>
          )}
        </g>
      );
    }
    return elements;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingNodeId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && nodes[selectedNodeId]?.parentId) {
          const deleteEvent = new CustomEvent('mindmap-delete');
          window.dispatchEvent(deleteEvent);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, nodes, editingNodeId]);

  const canvasWidth = canvasRef.current?.clientWidth || window.innerWidth;
  const canvasHeight = canvasRef.current?.clientHeight || window.innerHeight;

  return (
    <div
      ref={canvasRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg
        width={canvasWidth}
        height={canvasHeight}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <g transform={`translate(${canvasWidth / 2 + pan.x}, ${canvasHeight / 2 + pan.y}) scale(${zoom})`}>
          {renderConnections()}
          {renderNodes()}
        </g>
      </svg>
      <div style={{
        position: 'absolute', bottom: 12, right: 16, color: '#6A6A8A',
        fontSize: 12, pointerEvents: 'none', userSelect: 'none',
      }}>
        {zoomDisplay}
      </div>
    </div>
  );
}

export default MindMapCanvas;
