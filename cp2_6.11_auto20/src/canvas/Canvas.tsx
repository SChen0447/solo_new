import { forwardRef, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DrawCommand, Point, User, drawEngine } from './drawEngine';
import { v4 as uuidv4 } from 'uuid';

interface CanvasProps {
  commands: DrawCommand[];
  currentTool: string;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDrawCommand: (command: DrawCommand) => void;
  onUpdateCommand: (command: DrawCommand) => void;
  onCursorMove: (position: Point) => void;
  userColor: string;
  users: User[];
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  originalCommand?: DrawCommand;
  handleType?: 'move' | 'resize' | 'rotate' | 'nw' | 'ne' | 'sw' | 'se';
}

const Canvas = forwardRef<SVGSVGElement, CanvasProps>((props, ref) => {
  const {
    commands,
    currentTool,
    strokeColor,
    fillColor,
    strokeWidth,
    selectedId,
    onSelect,
    onDrawCommand,
    onUpdateCommand,
    onCursorMove,
    userColor,
    users
  } = props;

  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [previewCommand, setPreviewCommand] = useState<DrawCommand | null>(null);
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, startX: 0, startY: 0 });
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [cursorPositions, setCursorPositions] = useState<Map<string, Point>>(new Map());
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = drawEngine.subscribe(() => {
      setCursorPositions(new Map(drawEngine.getCursorPositions()));
    });
    return unsubscribe;
  }, []);

  const getSVGPoint = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (1920 / rect.width);
    const y = (e.clientY - rect.top) * (1080 / rect.height);
    
    return { x, y };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = getSVGPoint(e);
    
    if (currentTool === 'select') {
      const target = e.target as SVGElement;
      const commandId = target.closest('[data-command-id]')?.getAttribute('data-command-id');
      onSelect(commandId);
      
      if (commandId) {
        const command = commands.find(c => c.id === commandId);
        if (command) {
          setDragState({
            isDragging: true,
            startX: point.x,
            startY: point.y,
            originalCommand: { ...command },
            handleType: 'move'
          });
        }
      }
      return;
    }
    
    if (currentTool === 'pen') {
      setIsDrawing(true);
      setCurrentPoints([point]);
    } else if (currentTool === 'rectangle') {
      setIsDrawing(true);
      setPreviewCommand({
        id: uuidv4(),
        type: 'rectangle',
        userId: drawEngine.getCurrentUserId(),
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        color: strokeColor,
        fillColor,
        strokeWidth,
        timestamp: Date.now()
      });
    } else if (currentTool === 'circle') {
      setIsDrawing(true);
      setPreviewCommand({
        id: uuidv4(),
        type: 'circle',
        userId: drawEngine.getCurrentUserId(),
        x: point.x,
        y: point.y,
        radius: 0,
        color: strokeColor,
        fillColor,
        strokeWidth,
        timestamp: Date.now()
      });
    } else if (currentTool === 'sticky') {
      const command = drawEngine.createCommand('sticky', {
        x: point.x,
        y: point.y,
        width: 200,
        height: 150,
        color: '#fff3cd',
        fillColor: '#fff3cd',
        strokeWidth: 1,
        text: '',
        collapsed: false
      });
      onDrawCommand(command);
      setEditingStickyId(command.id);
    }
  }, [currentTool, strokeColor, fillColor, strokeWidth, commands, onSelect, onDrawCommand, getSVGPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const point = getSVGPoint(e);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      onCursorMove(point);
    });
    
    if (!isDrawing && !dragState.isDragging) return;
    
    if (currentTool === 'pen' && currentPoints.length > 0) {
      setCurrentPoints(prev => [...prev, point]);
    } else if (currentTool === 'rectangle' && previewCommand) {
      const startX = previewCommand.x || 0;
      const startY = previewCommand.y || 0;
      setPreviewCommand({
        ...previewCommand,
        width: point.x - startX,
        height: point.y - startY
      });
    } else if (currentTool === 'circle' && previewCommand) {
      const startX = previewCommand.x || 0;
      const startY = previewCommand.y || 0;
      const radius = Math.sqrt(Math.pow(point.x - startX, 2) + Math.pow(point.y - startY, 2));
      setPreviewCommand({
        ...previewCommand,
        radius
      });
    } else if (dragState.isDragging && dragState.originalCommand && selectedId) {
      const dx = point.x - dragState.startX;
      const dy = point.y - dragState.startY;
      const original = dragState.originalCommand;
      
      if (dragState.handleType === 'move') {
        const updated: DrawCommand = {
          ...original,
          x: (original.x || 0) + dx,
          y: (original.y || 0) + dy
        };
        onUpdateCommand(updated);
      } else if (dragState.handleType === 'se' || dragState.handleType === 'resize') {
        if (original.type === 'image' || original.type === 'sticky') {
          const aspectRatio = (original.width || 100) / (original.height || 100);
          const newWidth = Math.max(50, (original.width || 100) + dx);
          const newHeight = newWidth / aspectRatio;
          const updated: DrawCommand = {
            ...original,
            width: newWidth,
            height: newHeight
          };
          onUpdateCommand(updated);
        }
      }
    }
  }, [isDrawing, dragState, currentTool, currentPoints, previewCommand, selectedId, onUpdateCommand, onCursorMove, getSVGPoint]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) {
      if (dragState.isDragging) {
        setDragState({ isDragging: false, startX: 0, startY: 0 });
      }
      return;
    }
    
    setIsDrawing(false);
    
    if (currentTool === 'pen' && currentPoints.length > 1) {
      const command = drawEngine.createCommand('pen', {
        points: currentPoints,
        color: strokeColor,
        fillColor: 'transparent',
        strokeWidth
      });
      onDrawCommand(command);
    } else if (currentTool === 'rectangle' && previewCommand) {
      const width = Math.abs(previewCommand.width || 0);
      const height = Math.abs(previewCommand.height || 0);
      if (width > 5 && height > 5) {
        const command = {
          ...previewCommand,
          x: (previewCommand.width || 0) < 0 ? (previewCommand.x || 0) + (previewCommand.width || 0) : previewCommand.x,
          y: (previewCommand.height || 0) < 0 ? (previewCommand.y || 0) + (previewCommand.height || 0) : previewCommand.y,
          width,
          height
        };
        onDrawCommand(command);
      }
    } else if (currentTool === 'circle' && previewCommand && (previewCommand.radius || 0) > 5) {
      onDrawCommand(previewCommand);
    }
    
    setCurrentPoints([]);
    setPreviewCommand(null);
  }, [isDrawing, dragState, currentTool, currentPoints, previewCommand, strokeColor, strokeWidth, onDrawCommand]);

  const handleStickyTextChange = useCallback((id: string, text: string) => {
    const command = commands.find(c => c.id === id);
    if (command) {
      onUpdateCommand({ ...command, text });
    }
  }, [commands, onUpdateCommand]);

  const handleStickyDelete = useCallback((id: string) => {
    drawEngine.removeCommand(id);
    onSelect(null);
  }, [onSelect]);

  const handleStickyToggle = useCallback((id: string) => {
    const command = commands.find(c => c.id === id);
    if (command) {
      onUpdateCommand({ ...command, collapsed: !command.collapsed });
    }
  }, [commands, onUpdateCommand]);

  const handleResizeHandleMouseDown = useCallback((e: React.MouseEvent, handleType: string) => {
    e.stopPropagation();
    if (!selectedId) return;
    
    const command = commands.find(c => c.id === selectedId);
    if (!command) return;
    
    const point = getSVGPoint(e);
    setDragState({
      isDragging: true,
      startX: point.x,
      startY: point.y,
      originalCommand: { ...command },
      handleType: handleType as DragState['handleType']
    });
  }, [selectedId, commands, getSVGPoint]);

  const renderPen = useCallback((command: DrawCommand) => {
    if (!command.points || command.points.length < 2) return null;
    
    const pathData = drawEngine.generatePenPath(command.points);
    
    return (
      <path
        key={command.id}
        data-command-id={command.id}
        d={pathData}
        stroke={command.color}
        strokeWidth={command.strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ cursor: currentTool === 'select' ? 'pointer' : 'default' }}
      />
    );
  }, [currentTool]);

  const renderRectangle = useCallback((command: DrawCommand) => {
    const isSelected = selectedId === command.id;
    const x = command.x || 0;
    const y = command.y || 0;
    const width = Math.abs(command.width || 0);
    const height = Math.abs(command.height || 0);
    
    return (
      <g key={command.id} data-command-id={command.id}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={command.color}
          fill={command.fillColor || 'transparent'}
          strokeWidth={command.strokeWidth}
          style={{ cursor: currentTool === 'select' ? 'move' : 'default' }}
        />
        {isSelected && (
          <>
            <rect
              x={x - 4}
              y={y - 4}
              width={width + 8}
              height={height + 8}
              fill="none"
              stroke="#4a90d9"
              strokeWidth={2}
              strokeDasharray="8,4"
              pointerEvents="none"
            />
            {['nw', 'ne', 'sw', 'se'].map((corner) => {
              let cx = x, cy = y;
              if (corner.includes('e')) cx = x + width;
              if (corner.includes('s')) cy = y + height;
              return (
                <circle
                  key={corner}
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill="white"
                  stroke="#4a90d9"
                  strokeWidth={2}
                  style={{ cursor: `${corner}-resize`, pointerEvents: 'auto' }}
                  onMouseDown={(e) => handleResizeHandleMouseDown(e, corner)}
                />
              );
            })}
          </>
        )}
      </g>
    );
  }, [selectedId, currentTool, handleResizeHandleMouseDown]);

  const renderCircle = useCallback((command: DrawCommand) => {
    const isSelected = selectedId === command.id;
    const cx = command.x || 0;
    const cy = command.y || 0;
    const r = command.radius || 0;
    
    return (
      <g key={command.id} data-command-id={command.id}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={command.color}
          fill={command.fillColor || 'transparent'}
          strokeWidth={command.strokeWidth}
          style={{ cursor: currentTool === 'select' ? 'move' : 'default' }}
        />
        {isSelected && (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={r + 4}
              fill="none"
              stroke="#4a90d9"
              strokeWidth={2}
              strokeDasharray="8,4"
              pointerEvents="none"
            />
            <circle
              cx={cx + r}
              cy={cy}
              r={6}
              fill="white"
              stroke="#4a90d9"
              strokeWidth={2}
              style={{ cursor: 'ew-resize', pointerEvents: 'auto' }}
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se')}
            />
          </>
        )}
      </g>
    );
  }, [selectedId, currentTool, handleResizeHandleMouseDown]);

  const renderSticky = useCallback((command: DrawCommand) => {
    const isSelected = selectedId === command.id;
    const x = command.x || 0;
    const y = command.y || 0;
    const width = command.width || 200;
    const height = command.collapsed ? 30 : (command.height || 150);
    
    return (
      <g key={command.id} data-command-id={command.id}
        style={{ cursor: currentTool === 'select' ? 'move' : 'default' }}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#fff3cd"
          stroke="#ffc107"
          strokeWidth={1}
          rx={4}
          style={{
            filter: isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' : 'drop-shadow(0 2px 3px rgba(0,0,0,0.1))',
            transition: 'filter 0.2s ease-out'
          }}
        />
        <rect
          x={x}
          y={y}
          width={width}
          height={24}
          fill="#ffc107"
          rx={4}
          style={{ opacity: 0.3 }}
        />
        
        {!command.collapsed && (
          <foreignObject x={x + 8} y={y + 28} width={width - 16} height={height - 36}>
            {editingStickyId === command.id ? (
              <textarea
                defaultValue={command.text || ''}
                autoFocus
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: 'transparent',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  color: '#333',
                  lineHeight: '1.4'
                }}
                onChange={(e) => handleStickyTextChange(command.id, e.target.value)}
                onBlur={() => setEditingStickyId(null)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                style={{
                  fontSize: '13px',
                  color: '#333',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  cursor: 'text'
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingStickyId(command.id);
                }}
              >
                {command.text || '双击编辑...'}
              </div>
            )}
          </foreignObject>
        )}
        
        {isSelected && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStickyDelete(command.id);
              }}
              style={{
                position: 'absolute',
                left: x + width - 16,
                top: y + 4,
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: 'none',
                background: '#dc3545',
                color: 'white',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
            >
              ×
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStickyToggle(command.id);
              }}
              style={{
                position: 'absolute',
                left: x + width - 36,
                top: y + 4,
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: 'none',
                background: '#6c757d',
                color: 'white',
                fontSize: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
            >
              {command.collapsed ? '+' : '−'}
            </button>
          </>
        )}
        
        {isSelected && !command.collapsed && (
          <circle
            cx={x + width}
            cy={y + height}
            r={6}
            fill="white"
            stroke="#4a90d9"
            strokeWidth={2}
            style={{ cursor: 'se-resize', pointerEvents: 'auto' }}
            onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se')}
          />
        )}
      </g>
    );
  }, [selectedId, currentTool, editingStickyId, handleStickyTextChange, handleStickyDelete, handleStickyToggle, handleResizeHandleMouseDown]);

  const renderImage = useCallback((command: DrawCommand) => {
    const isSelected = selectedId === command.id;
    const x = command.x || 0;
    const y = command.y || 0;
    const width = command.width || 100;
    const height = command.height || 100;
    const rotation = command.rotation || 0;
    
    return (
      <g key={command.id} data-command-id={command.id}
        transform={`rotate(${rotation} ${x + width/2} ${y + height/2})`}
        style={{ cursor: currentTool === 'select' ? 'move' : 'default' }}>
        <image
          href={command.imageData}
          x={x}
          y={y}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
          style={{
            opacity: 0,
            animation: 'fadeIn 0.3s ease-out forwards'
          }}
        />
        {isSelected && (
          <>
            <rect
              x={x - 4}
              y={y - 4}
              width={width + 8}
              height={height + 8}
              fill="none"
              stroke="#4a90d9"
              strokeWidth={2}
              strokeDasharray="8,4"
              pointerEvents="none"
            />
            
            <circle
              cx={x + width}
              cy={y + height}
              r={6}
              fill="white"
              stroke="#4a90d9"
              strokeWidth={2}
              style={{ cursor: 'se-resize', pointerEvents: 'auto' }}
              onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se')}
            />
            
            <circle
              cx={x + width / 2}
              cy={y - 20}
              r={8}
              fill="white"
              stroke="#4a90d9"
              strokeWidth={2}
              style={{ cursor: 'grab', pointerEvents: 'auto' }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            />
            <line
              x1={x + width / 2}
              y1={y - 12}
              x2={x + width / 2}
              y2={y}
              stroke="#4a90d9"
              strokeWidth={1}
              pointerEvents="none"
            />
          </>
        )}
      </g>
    );
  }, [selectedId, currentTool, handleResizeHandleMouseDown]);

  const renderCommand = useCallback((command: DrawCommand) => {
    switch (command.type) {
      case 'pen': return renderPen(command);
      case 'rectangle': return renderRectangle(command);
      case 'circle': return renderCircle(command);
      case 'sticky': return renderSticky(command);
      case 'image': return renderImage(command);
      default: return null;
    }
  }, [renderPen, renderRectangle, renderCircle, renderSticky, renderImage]);

  const renderCursors = useMemo(() => {
    return users.map(user => {
      if (user.id === drawEngine.getCurrentUserId()) return null;
      const pos = cursorPositions.get(user.id);
      if (!pos) return null;
      
      return (
        <g key={`cursor-${user.id}`}>
          <circle cx={pos.x} cy={pos.y} r={4} fill={user.color} opacity={0.8} />
          <text x={pos.x + 8} y={pos.y + 4} fill={user.color} fontSize="12" fontWeight="bold">
            {user.name.charAt(0)}
          </text>
        </g>
      );
    });
  }, [users, cursorPositions]);

  const renderPreview = useCallback(() => {
    if (!isDrawing) return null;
    
    if (currentTool === 'pen' && currentPoints.length > 1) {
      const pathData = drawEngine.generatePenPath(currentPoints);
      return (
        <path
          d={pathData}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
        />
      );
    }
    
    if (previewCommand) {
      if (previewCommand.type === 'rectangle') {
        return (
          <rect
            x={previewCommand.x}
            y={previewCommand.y}
            width={previewCommand.width}
            height={previewCommand.height}
            stroke={previewCommand.color}
            fill={previewCommand.fillColor || 'transparent'}
            strokeWidth={previewCommand.strokeWidth}
            opacity={0.7}
          />
        );
      }
      if (previewCommand.type === 'circle') {
        return (
          <circle
            cx={previewCommand.x}
            cy={previewCommand.y}
            r={previewCommand.radius}
            stroke={previewCommand.color}
            fill={previewCommand.fillColor || 'transparent'}
            strokeWidth={previewCommand.strokeWidth}
            opacity={0.7}
          />
        );
      }
    }
    
    return null;
  }, [isDrawing, currentTool, currentPoints, previewCommand, strokeColor, strokeWidth]);

  const setRefs = useCallback((node: SVGSVGElement | null) => {
    (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<SVGSVGElement | null>).current = node;
    }
  }, [ref]);

  const cursorStyle = useMemo(() => {
    switch (currentTool) {
      case 'pen': return 'crosshair';
      case 'rectangle': return 'crosshair';
      case 'circle': return 'crosshair';
      case 'sticky': return 'pointer';
      case 'select': return 'default';
      default: return 'default';
    }
  }, [currentTool]);

  return (
    <svg
      ref={setRefs}
      className="canvas-svg"
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid meet"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: cursorStyle }}
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e0e0" strokeWidth="0.5" />
        </pattern>
      </defs>
      
      <rect width="1920" height="1080" fill="white" />
      <rect width="1920" height="1080" fill="url(#grid)" />
      
      <g className="commands-layer">
        {commands.map(renderCommand)}
      </g>
      
      <g className="preview-layer">
        {renderPreview()}
      </g>
      
      <g className="cursors-layer">
        {renderCursors}
      </g>
    </svg>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
