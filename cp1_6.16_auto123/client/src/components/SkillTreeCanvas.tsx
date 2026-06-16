import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SkillNode, SKILL_COLORS, SkillType, EffectType } from '../types';

interface SkillTreeCanvasProps {
  nodes: SkillNode[];
  selectedNodeId: string | null;
  totalPoints: number;
  usedPoints: number;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeAdd: (node: SkillNode) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<SkillNode>) => void;
  onAddPoint: (nodeId: string) => void;
}

const NODE_RADIUS = 15;
const HOVER_RADIUS = 20;
const LINE_WIDTH = 2;
const LINE_COLOR = '#607D8B';
const LINE_HOVER_COLOR = '#64B5F6';
const LOCKED_COLOR = '#B0BEC5';

function SkillTreeCanvas({
  nodes,
  selectedNodeId,
  totalPoints,
  usedPoints,
  onNodeSelect,
  onNodeAdd,
  onNodeMove,
  onNodeDelete,
  onNodeUpdate,
  onAddPoint,
}: SkillTreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [pulseNodes, setPulseNodes] = useState<Set<string>>(new Set());
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const lastMousePos = useRef({ x: 0, y: 0 });

  const isNodeUnlocked = useCallback((node: SkillNode): boolean => {
    if (node.parentId === null) return true;
    const parent = nodes.find(n => n.id === node.parentId);
    if (!parent) return false;
    return parent.currentLevel > 0;
  }, [nodes]);

  const unlockedNodes = useMemo(() => {
    const unlocked = new Set<string>();
    const checkNode = (nodeId: string) => {
      if (unlocked.has(nodeId)) return;
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      if (node.parentId === null) {
        unlocked.add(nodeId);
        return;
      }
      const parent = nodes.find(n => n.id === node.parentId);
      if (parent && parent.currentLevel > 0) {
        unlocked.add(nodeId);
      }
    };
    nodes.forEach(n => checkNode(n.id));
    return unlocked;
  }, [nodes]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = Date.now();

    const render = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvasOffset.x, canvasOffset.y);

      // 绘制连线
      nodes.forEach(node => {
        if (!node.parentId) return;
        const parent = nodes.find(n => n.id === node.parentId);
        if (!parent) return;

        const lineKey = `${node.id}-${parent.id}`;
        const isHovered = hoveredLine === lineKey;
        const unlocked = unlockedNodes.has(node.id);

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(parent.x, parent.y);
        ctx.lineWidth = LINE_WIDTH;
        ctx.strokeStyle = unlocked
          ? (isHovered ? LINE_HOVER_COLOR : LINE_COLOR)
          : LOCKED_COLOR;
        ctx.globalAlpha = unlocked ? 1 : 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // 绘制节点
      nodes.forEach(node => {
        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredNode;
        const isDragging = node.id === draggingNode;
        const unlocked = unlockedNodes.has(node.id);
        const isPulsing = pulseNodes.has(node.id);
        const color = SKILL_COLORS[node.type];

        const pulseScale = isPulsing ? 1 + Math.sin(elapsed / 100) * 0.1 : 1;
        const radius = NODE_RADIUS * pulseScale;

        // 拖拽阴影
        if (isDragging) {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 4;
        }

        // 外圈 - 选中动画
        if (isSelected) {
          ctx.beginPath();
          const dashOffset = (elapsed / 2000) * 100;
          ctx.setLineDash([8, 4]);
          ctx.lineDashOffset = dashOffset;
          ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);
          ctx.lineWidth = 2;
          ctx.strokeStyle = color;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 主体圆
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        
        if (node.currentLevel > 0 && unlocked) {
          ctx.fillStyle = color;
        } else {
          ctx.fillStyle = unlocked ? '#2A2A3C' : LOCKED_COLOR;
        }
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = unlocked ? color : LOCKED_COLOR;
        ctx.stroke();

        if (isDragging) {
          ctx.restore();
        }

        // 等级进度环
        if (node.maxLevel > 1 && unlocked) {
          const progress = node.currentLevel / node.maxLevel;
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + Math.PI * 2 * progress;

          // 进度颜色渐变（蓝到紫）
          const hue = 210 + progress * 90; // 210是蓝，300是紫
          const progressColor = `hsl(${hue}, 70%, 60%)`;

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 4, startAngle, endAngle);
          ctx.lineWidth = 3;
          ctx.strokeStyle = progressColor;
          ctx.stroke();
        }

        // 类型图标（简化）
        if (unlocked) {
          ctx.fillStyle = node.currentLevel > 0 ? '#fff' : color;
          ctx.font = 'bold 10px Courier New';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let icon = '';
          if (node.type === 'passive') icon = 'P';
          else if (node.type === 'active') icon = 'A';
          else if (node.type === 'ultimate') icon = 'U';
          ctx.fillText(icon, node.x, node.y);
        }

        // 节点名称
        if (isHovered || isSelected) {
          ctx.fillStyle = '#E0E0E0';
          ctx.font = '11px Courier New';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(node.name, node.x, node.y + radius + 8);
          
          if (node.maxLevel > 1) {
            ctx.fillStyle = '#9E9E9E';
            ctx.fillText(`Lv.${node.currentLevel}/${node.maxLevel}`, node.x, node.y + radius + 22);
          }
        }
      });

      ctx.restore();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [nodes, selectedNodeId, hoveredNode, hoveredLine, draggingNode, pulseNodes, unlockedNodes, canvasOffset]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - canvasOffset.x,
      y: e.clientY - rect.top - canvasOffset.y,
    };
  }, [canvasOffset]);

  const findNodeAtPos = useCallback((x: number, y: number): SkillNode | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = x - node.x;
      const dy = y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= HOVER_RADIUS) {
        return node;
      }
    }
    return null;
  }, [nodes]);

  const findLineAtPos = useCallback((x: number, y: number): string | null => {
    for (const node of nodes) {
      if (!node.parentId) continue;
      const parent = nodes.find(n => n.id === node.parentId);
      if (!parent) continue;

      // 点到线段的距离
      const lineLen = Math.sqrt(
        Math.pow(parent.x - node.x, 2) + Math.pow(parent.y - node.y, 2)
      );
      if (lineLen === 0) continue;

      const t = Math.max(0, Math.min(1,
        ((x - node.x) * (parent.x - node.x) + (y - node.y) * (parent.y - node.y)) / (lineLen * lineLen)
      ));
      const projX = node.x + t * (parent.x - node.x);
      const projY = node.y + t * (parent.y - node.y);
      const dist = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));

      if (dist <= 6) {
        return `${node.id}-${parent.id}`;
      }
    }
    return null;
  }, [nodes]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const node = findNodeAtPos(pos.x, pos.y);

    if (e.button === 0) {
      if (node) {
        setDraggingNode(node.id);
        setDragOffset({ x: pos.x - node.x, y: pos.y - node.y });
        onNodeSelect(node.id);
      } else {
        setIsDraggingCanvas(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
      setContextMenu(null);
    }
  }, [getMousePos, findNodeAtPos, onNodeSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (draggingNode) {
      const newX = pos.x - dragOffset.x;
      const newY = pos.y - dragOffset.y;
      onNodeMove(draggingNode, newX, newY);
    } else if (isDraggingCanvas) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setCanvasOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    } else {
      const node = findNodeAtPos(pos.x, pos.y);
      setHoveredNode(node ? node.id : null);
      if (!node) {
        const line = findLineAtPos(pos.x, pos.y);
        setHoveredLine(line);
      } else {
        setHoveredLine(null);
      }
    }
  }, [draggingNode, dragOffset, isDraggingCanvas, getMousePos, findNodeAtPos, findLineAtPos, onNodeMove]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
    setIsDraggingCanvas(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingCanvas) return;
    
    const pos = getMousePos(e);
    const node = findNodeAtPos(pos.x, pos.y);

    if (node) {
      const unlocked = unlockedNodes.has(node.id);
      if (unlocked && node.currentLevel < node.maxLevel) {
        const remainingPoints = totalPoints - usedPoints;
        if (remainingPoints >= node.costPerLevel) {
          onAddPoint(node.id);
          setPulseNodes(prev => {
            const next = new Set(prev);
            next.add(node.id);
            return next;
          });
          setTimeout(() => {
            setPulseNodes(prev => {
              const next = new Set(prev);
              next.delete(node.id);
              return next;
            });
          }, 300);
        }
      }
      onNodeSelect(node.id);
    } else {
      onNodeSelect(null);
    }
  }, [getMousePos, findNodeAtPos, onNodeSelect, onAddPoint, unlockedNodes, totalPoints, usedPoints, isDraggingCanvas]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const node = findNodeAtPos(pos.x, pos.y);

    if (!node) {
      const newNode: SkillNode = {
        id: uuidv4(),
        name: '新技能',
        description: '',
        type: 'passive',
        x: pos.x,
        y: pos.y,
        parentId: null,
        maxLevel: 5,
        currentLevel: 0,
        costPerLevel: 1,
        effectType: 'damage',
        baseEffect: 10,
        growthPerLevel: 5,
      };
      onNodeAdd(newNode);
      onNodeSelect(newNode.id);
    }
  }, [getMousePos, findNodeAtPos, onNodeAdd, onNodeSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getMousePos(e);
    const node = findNodeAtPos(pos.x, pos.y);

    if (node) {
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
      onNodeSelect(node.id);
    } else {
      setContextMenu(null);
    }
  }, [getMousePos, findNodeAtPos, onNodeSelect]);

  const handleSetParent = useCallback((parentId: string) => {
    if (!selectedNodeId || selectedNodeId === parentId) return;
    onNodeUpdate(selectedNodeId, { parentId });
    setContextMenu(null);
  }, [selectedNodeId, onNodeUpdate]);

  const handleDeleteNode = useCallback(() => {
    if (contextMenu) {
      onNodeDelete(contextMenu.nodeId);
      setContextMenu(null);
    }
  }, [contextMenu, onNodeDelete]);

  const handleChangeType = useCallback((type: SkillType) => {
    if (contextMenu) {
      onNodeUpdate(contextMenu.nodeId, { type });
      setContextMenu(null);
    }
  }, [contextMenu, onNodeUpdate]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`skill-canvas ${draggingNode || isDraggingCanvas ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={() => handleChangeType('passive')}>
            转为被动技能
          </div>
          <div className="context-menu-item" onClick={() => handleChangeType('active')}>
            转为主动技能
          </div>
          <div className="context-menu-item" onClick={() => handleChangeType('ultimate')}>
            转为终极天赋
          </div>
          <div className="context-menu-item" onClick={() => handleSetParent(selectedNodeId || '')}>
            设为子节点...
          </div>
          <div className="context-menu-item danger" onClick={handleDeleteNode}>
            删除节点
          </div>
        </div>
      )}
    </div>
  );
}

export default SkillTreeCanvas;
