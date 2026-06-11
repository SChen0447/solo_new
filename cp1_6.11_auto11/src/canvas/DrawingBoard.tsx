import React, { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Point,
  Stroke,
  TextLabel,
  StickyNote,
  DrawObject,
  DrawCommand,
  StrokeStartCommand,
  StrokePointCommand,
  StrokeEndCommand,
  TextAddCommand,
  StickyAddCommand,
  StickyMoveCommand,
  ObjectDeleteCommand,
  CursorMoveCommand,
  ToolType,
  PenSettings,
  TextSettings,
  Viewport,
  User
} from '../types';
import { SocketManager } from '../connection/SocketManager';
import {
  screenToWorld,
  worldToScreen,
  clamp,
  hexToRgba,
  throttle
} from '../utils';

export interface DrawingBoardHandle {
  getCanvas: () => HTMLCanvasElement | null;
  clearCanvas: () => void;
}

interface DrawingBoardProps {
  userId: string;
  userName: string;
  userColor: string;
  activeTool: ToolType;
  penSettings: PenSettings;
  textSettings: TextSettings;
  socketManager: SocketManager | null;
  onViewportChange?: (viewport: Viewport) => void;
  onObjectsChange?: (objects: DrawObject[]) => void;
  onUsersChange?: (users: User[]) => void;
}

interface PendingStroke {
  id: string;
  points: Point[];
  color: string;
  lineWidth: number;
  opacity: number;
}

interface TextInputState {
  type: 'text' | 'sticky';
  x: number;
  y: number;
  value: string;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const WHEEL_ZOOM_SPEED = 0.001;

export const DrawingBoard = forwardRef<DrawingBoardHandle, DrawingBoardProps>(({
  userId,
  userColor,
  activeTool,
  penSettings,
  textSettings,
  socketManager,
  onViewportChange,
  onObjectsChange,
  onUsersChange
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const viewportRef = useRef<Viewport>({ x: 0, y: 0, scale: 1 });
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });

  const objectsRef = useRef<DrawObject[]>([]);
  const objectsMapRef = useRef<Map<string, DrawObject>>(new Map());

  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const remoteCursorsRef = useRef<Map<string, { point: Point; lastSeen: number }>>(new Map());
  const [, forceUpdate] = useState({});

  const pendingStrokeRef = useRef<PendingStroke | null>(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef<Point | null>(null);

  const [textInput, setTextInput] = useState<TextInputState | null>(null);
  const textInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const draggingStickyRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const needsRenderRef = useRef(true);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    clearCanvas: () => {
      objectsRef.current = [];
      objectsMapRef.current.clear();
      needsRenderRef.current = true;
      onObjectsChange?.([]);
    }
  }));

  const updateViewport = useCallback((newViewport: Partial<Viewport>) => {
    viewportRef.current = { ...viewportRef.current, ...newViewport };
    setViewport({ ...viewportRef.current });
    needsRenderRef.current = true;
    onViewportChange?.(viewportRef.current);
  }, [onViewportChange]);

  const updateObjects = useCallback((newObjects: DrawObject[]) => {
    objectsRef.current = newObjects;
    objectsMapRef.current = new Map(newObjects.map(obj => [obj.id, obj]));
    needsRenderRef.current = true;
    onObjectsChange?.(newObjects);
  }, [onObjectsChange]);

  const addObject = useCallback((obj: DrawObject) => {
    const newObjects = [...objectsRef.current, obj];
    updateObjects(newObjects);
  }, [updateObjects]);

  const updateObject = useCallback((id: string, updates: Partial<DrawObject>) => {
    const newObjects = objectsRef.current.map(obj =>
      obj.id === id ? { ...obj, ...updates } : obj
    );
    updateObjects(newObjects);
  }, [updateObjects]);

  const removeObject = useCallback((id: string) => {
    const newObjects = objectsRef.current.filter(obj => obj.id !== id);
    updateObjects(newObjects);
  }, [updateObjects]);

  const clearAll = useCallback(() => {
    updateObjects([]);
  }, [updateObjects]);

  const processCommand = useCallback((command: DrawCommand) => {
    switch (command.type) {
      case 'stroke:start': {
        const stroke: Stroke = {
          id: command.strokeId,
          userId: command.userId,
          points: [command.point],
          color: command.color,
          lineWidth: command.lineWidth,
          opacity: command.opacity,
          createdAt: command.timestamp
        };
        addObject(stroke);
        break;
      }
      case 'stroke:point': {
        const obj = objectsMapRef.current.get(command.strokeId);
        if (obj && 'points' in obj) {
          obj.points.push(command.point);
          needsRenderRef.current = true;
        }
        break;
      }
      case 'stroke:end': {
        break;
      }
      case 'text:add': {
        addObject(command.textLabel);
        break;
      }
      case 'text:update': {
        updateObject(command.textLabel.id, command.textLabel);
        break;
      }
      case 'sticky:add': {
        addObject(command.stickyNote);
        break;
      }
      case 'sticky:update': {
        updateObject(command.stickyNote.id, command.stickyNote);
        break;
      }
      case 'sticky:move': {
        updateObject(command.id, { x: command.x, y: command.y } as Partial<StickyNote>);
        break;
      }
      case 'object:delete': {
        removeObject(command.id);
        break;
      }
      case 'canvas:clear': {
        clearAll();
        break;
      }
      case 'cursor:move': {
        if (command.userId !== userId) {
          remoteCursorsRef.current.set(command.userId, {
            point: command.point,
            lastSeen: Date.now()
          });
          forceUpdate({});
        }
        break;
      }
    }
  }, [addObject, updateObject, removeObject, clearAll, userId]);

  const sendCommand = useCallback((command: DrawCommand) => {
    socketManager?.sendCommand(command);
    processCommand(command);
  }, [socketManager, processCommand]);

  const renderMinimap = useCallback(() => {
    const minimap = minimapCanvasRef.current;
    if (!minimap) return;

    const ctx = minimap.getContext('2d');
    if (!ctx) return;

    const vp = viewportRef.current;
    const objects = objectsRef.current;

    const bounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    let hasObjects = false;
    for (const obj of objects) {
      if ('points' in obj) {
        for (const p of (obj as Stroke).points) {
          if (!hasObjects) {
            bounds.minX = bounds.maxX = p.x;
            bounds.minY = bounds.maxY = p.y;
            hasObjects = true;
          } else {
            bounds.minX = Math.min(bounds.minX, p.x);
            bounds.maxX = Math.max(bounds.maxX, p.x);
            bounds.minY = Math.min(bounds.minY, p.y);
            bounds.maxY = Math.max(bounds.maxY, p.y);
          }
        }
      } else if ('textAlign' in obj) {
        const t = obj as TextLabel;
        if (!hasObjects) {
          bounds.minX = t.x;
          bounds.maxX = t.x + 200;
          bounds.minY = t.y;
          bounds.maxY = t.y + 50;
          hasObjects = true;
        } else {
          bounds.minX = Math.min(bounds.minX, t.x);
          bounds.maxX = Math.max(bounds.maxX, t.x + 200);
          bounds.minY = Math.min(bounds.minY, t.y);
          bounds.maxY = Math.max(bounds.maxY, t.y + 50);
        }
      } else {
        const s = obj as StickyNote;
        if (!hasObjects) {
          bounds.minX = s.x;
          bounds.maxX = s.x + s.width;
          bounds.minY = s.y;
          bounds.maxY = s.y + s.height;
          hasObjects = true;
        } else {
          bounds.minX = Math.min(bounds.minX, s.x);
          bounds.maxX = Math.max(bounds.maxX, s.x + s.width);
          bounds.minY = Math.min(bounds.minY, s.y);
          bounds.maxY = Math.max(bounds.maxY, s.y + s.height);
        }
      }
    }

    if (!hasObjects) {
      bounds.minX = -500;
      bounds.maxX = 500;
      bounds.minY = -500;
      bounds.maxY = 500;
    }

    const padding = 100;
    bounds.minX -= padding;
    bounds.maxX += padding;
    bounds.minY -= padding;
    bounds.maxY += padding;

    const worldWidth = bounds.maxX - bounds.minX;
    const worldHeight = bounds.maxY - bounds.minY;
    const scale = Math.min(minimap.width / worldWidth, minimap.height / worldHeight, 1);

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, minimap.width, minimap.height);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-bounds.minX, -bounds.minY);

    for (const obj of objects) {
      if ('points' in obj) {
        const stroke = obj as Stroke;
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = 2 / scale;
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if ('textAlign' in obj) {
        const text = obj as TextLabel;
        ctx.fillStyle = text.color;
        ctx.fillRect(text.x, text.y, 8 / scale, 8 / scale);
      } else {
        const sticky = obj as StickyNote;
        ctx.fillStyle = sticky.color;
        ctx.fillRect(sticky.x, sticky.y, sticky.width, sticky.height);
      }
    }

    ctx.restore();

    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.width / dpr;
      const cssHeight = canvas.height / dpr;
      const viewportRect = {
        x: (vp.x - bounds.minX) * scale,
        y: (vp.y - bounds.minY) * scale,
        width: (cssWidth / vp.scale) * scale,
        height: (cssHeight / vp.scale) * scale
      };
      ctx.strokeStyle = '#4a90d9';
      ctx.lineWidth = 2;
      ctx.strokeRect(viewportRect.x, viewportRect.y, viewportRect.width, viewportRect.height);
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vp = viewportRef.current;
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    let offscreen = offscreenCanvasRef.current;
    if (!offscreen || offscreen.width !== canvas.width || offscreen.height !== canvas.height) {
      offscreen = document.createElement('canvas');
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      offscreenCanvasRef.current = offscreen;
    }
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    offCtx.save();
    offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
    offCtx.scale(dpr, dpr);

    offCtx.fillStyle = '#f5f5f5';
    offCtx.fillRect(0, 0, cssWidth, cssHeight);

    const gridSize = 50 * vp.scale;
    offCtx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    offCtx.lineWidth = 1;

    const offsetX = (vp.x % gridSize + gridSize) % gridSize;
    const offsetY = (vp.y % gridSize + gridSize) % gridSize;

    offCtx.beginPath();
    for (let x = offsetX; x < cssWidth; x += gridSize) {
      offCtx.moveTo(x, 0);
      offCtx.lineTo(x, cssHeight);
    }
    for (let y = offsetY; y < cssHeight; y += gridSize) {
      offCtx.moveTo(0, y);
      offCtx.lineTo(cssWidth, y);
    }
    offCtx.stroke();

    offCtx.translate(vp.x, vp.y);
    offCtx.scale(vp.scale, vp.scale);

    const objects = objectsRef.current;
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if ('points' in obj) {
        const stroke = obj as Stroke;
        if (stroke.points.length < 2) continue;

        offCtx.beginPath();
        offCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
        offCtx.lineCap = 'round';
        offCtx.lineJoin = 'round';
        offCtx.strokeStyle = hexToRgba(stroke.color, stroke.opacity);
        offCtx.lineWidth = stroke.lineWidth;

        const pts = stroke.points;
        for (let j = 1; j < pts.length; j++) {
          offCtx.lineTo(pts[j].x, pts[j].y);
        }
        offCtx.stroke();
      } else if ('textAlign' in obj) {
        const text = obj as TextLabel;
        offCtx.font = `${text.fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        offCtx.fillStyle = text.color;
        offCtx.textAlign = text.textAlign;
        offCtx.textBaseline = 'top';
        offCtx.fillText(text.text, text.x, text.y);
      } else {
        const sticky = obj as StickyNote;
        const cornerSize = 12;

        offCtx.fillStyle = sticky.color;
        offCtx.beginPath();
        offCtx.moveTo(sticky.x, sticky.y);
        offCtx.lineTo(sticky.x + sticky.width, sticky.y);
        offCtx.lineTo(sticky.x + sticky.width, sticky.y + sticky.height - cornerSize);
        offCtx.lineTo(sticky.x + sticky.width - cornerSize, sticky.y + sticky.height);
        offCtx.lineTo(sticky.x, sticky.y + sticky.height);
        offCtx.closePath();
        offCtx.fill();

        offCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        offCtx.beginPath();
        offCtx.moveTo(sticky.x + sticky.width - cornerSize, sticky.y + sticky.height - cornerSize);
        offCtx.lineTo(sticky.x + sticky.width, sticky.y + sticky.height - cornerSize);
        offCtx.lineTo(sticky.x + sticky.width - cornerSize, sticky.y + sticky.height);
        offCtx.closePath();
        offCtx.fill();

        offCtx.fillStyle = '#333';
        offCtx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
        offCtx.textAlign = 'left';
        offCtx.textBaseline = 'top';

        const padding = 10;
        const maxWidth = sticky.width - padding * 2;
        const lineHeight = 18;
        const maxLines = Math.floor((sticky.height - padding * 2) / lineHeight);
        const chars = sticky.text.split('');
        let line = '';
        const lines: string[] = [];
        const y = sticky.y + padding;

        for (let ci = 0; ci < chars.length; ci++) {
          const testLine = line + chars[ci];
          const metrics = offCtx.measureText(testLine);
          if (metrics.width > maxWidth && line !== '') {
            lines.push(line);
            line = chars[ci];
          } else {
            line = testLine;
          }
        }
        if (line) lines.push(line);

        const displayLines = lines.slice(0, maxLines);
        for (let li = 0; li < displayLines.length; li++) {
          offCtx.fillText(displayLines[li], sticky.x + padding, y + li * lineHeight);
        }
      }
    }

    const pending = pendingStrokeRef.current;
    if (pending && pending.points.length > 1) {
      offCtx.beginPath();
      offCtx.moveTo(pending.points[0].x, pending.points[0].y);
      offCtx.lineCap = 'round';
      offCtx.lineJoin = 'round';
      offCtx.strokeStyle = hexToRgba(pending.color, pending.opacity);
      offCtx.lineWidth = pending.lineWidth;

      for (let pi = 1; pi < pending.points.length; pi++) {
        offCtx.lineTo(pending.points[pi].x, pending.points[pi].y);
      }
      offCtx.stroke();
    }

    offCtx.restore();

    ctx.drawImage(offscreen, 0, 0);

    renderMinimap();
  }, [renderMinimap]);

  useEffect(() => {
    const animate = () => {
      if (needsRenderRef.current) {
        render();
        needsRenderRef.current = false;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !wrapperRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = wrapperRef.current.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      needsRenderRef.current = true;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!socketManager) return;
    const unsubCommand = socketManager.onCommand(processCommand);
    const unsubUsers = socketManager.onUsersUpdate((users) => {
      setOnlineUsers(users);
      onUsersChange?.(users);
    });
    socketManager.connect();
    socketManager.requestHistory();
    return () => {
      unsubCommand();
      unsubUsers();
    };
  }, [socketManager, processCommand, onUsersChange]);

  const getWorldPoint = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    if (!wrapperRef.current) return { x: 0, y: 0 };
    const rect = wrapperRef.current.getBoundingClientRect();
    return screenToWorld(e.clientX, e.clientY, viewportRef.current, rect);
  }, []);

  const findStickyAt = useCallback((point: Point): StickyNote | null => {
    for (let i = objectsRef.current.length - 1; i >= 0; i--) {
      const obj = objectsRef.current[i];
      if ('width' in obj && 'height' in obj && !('textAlign' in obj)) {
        const sticky = obj as StickyNote;
        if (
          point.x >= sticky.x &&
          point.x <= sticky.x + sticky.width &&
          point.y >= sticky.y &&
          point.y <= sticky.y + sticky.height
        ) {
          return sticky;
        }
      }
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const currentPoint = getWorldPoint(e);

    if (activeTool === 'pan' || e.button === 1 || e.buttons === 4) {
      isPanningRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (activeTool === 'sticky') {
      const sticky = findStickyAt(currentPoint);
      if (sticky && sticky.userId === userId) {
        draggingStickyRef.current = {
          id: sticky.id,
          offsetX: currentPoint.x - sticky.x,
          offsetY: currentPoint.y - sticky.y
        };
        return;
      }
    }

    if (activeTool === 'pen' || activeTool === 'eraser') {
      isDrawingRef.current = true;
      const strokeId = uuidv4();
      pendingStrokeRef.current = {
        id: strokeId,
        points: [currentPoint],
        color: activeTool === 'eraser' ? '#f5f5f5' : penSettings.color,
        lineWidth: activeTool === 'eraser' ? penSettings.lineWidth * 3 : penSettings.lineWidth,
        opacity: activeTool === 'eraser' ? 1 : penSettings.opacity
      };

      const command: StrokeStartCommand = {
        type: 'stroke:start',
        userId,
        timestamp: Date.now(),
        strokeId,
        point: currentPoint,
        color: pendingStrokeRef.current.color,
        lineWidth: pendingStrokeRef.current.lineWidth,
        opacity: pendingStrokeRef.current.opacity
      };
      sendCommand(command);
    }
  }, [activeTool, userId, penSettings, getWorldPoint, findStickyAt, sendCommand]);

  const throttledSendPoint = useMemo(
    () => throttle((strokeId: string, point: Point) => {
      const command: StrokePointCommand = {
        type: 'stroke:point',
        userId,
        timestamp: Date.now(),
        strokeId,
        point
      };
      socketManager?.sendCommand(command);
    }, 16),
    [userId, socketManager]
  );

  const throttledSendCursor = useMemo(
    () => throttle((point: Point) => {
      const command: CursorMoveCommand = {
        type: 'cursor:move',
        userId,
        timestamp: Date.now(),
        point
      };
      socketManager?.sendCommand(command);
    }, 50),
    [userId, socketManager]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const currentPoint = getWorldPoint(e);
    throttledSendCursor(currentPoint);

    if (isPanningRef.current && lastMousePosRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      updateViewport({
        x: viewportRef.current.x + dx,
        y: viewportRef.current.y + dy
      });
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (draggingStickyRef.current) {
      const newX = currentPoint.x - draggingStickyRef.current.offsetX;
      const newY = currentPoint.y - draggingStickyRef.current.offsetY;
      updateObject(draggingStickyRef.current.id, { x: newX, y: newY } as Partial<StickyNote>);
      const command: StickyMoveCommand = {
        type: 'sticky:move',
        userId,
        timestamp: Date.now(),
        id: draggingStickyRef.current.id,
        x: newX,
        y: newY
      };
      socketManager?.sendCommand(command);
      return;
    }

    if (isDrawingRef.current && pendingStrokeRef.current) {
      pendingStrokeRef.current.points.push(currentPoint);
      throttledSendPoint(pendingStrokeRef.current.id, currentPoint);
      needsRenderRef.current = true;
    }
  }, [getWorldPoint, updateViewport, updateObject, userId, socketManager, throttledSendPoint, throttledSendCursor]);

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      lastMousePosRef.current = null;
      return;
    }

    if (draggingStickyRef.current) {
      draggingStickyRef.current = null;
      return;
    }

    if (isDrawingRef.current && pendingStrokeRef.current) {
      const command: StrokeEndCommand = {
        type: 'stroke:end',
        userId,
        timestamp: Date.now(),
        strokeId: pendingStrokeRef.current.id
      };
      sendCommand(command);
      isDrawingRef.current = false;
      pendingStrokeRef.current = null;
    }
  }, [userId, sendCommand]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !wrapperRef.current) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrapperRef.current.getBoundingClientRect();

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const worldX = (centerX - viewportRef.current.x) / viewportRef.current.scale;
    const worldY = (centerY - viewportRef.current.y) / viewportRef.current.scale;

    const scaleFactor = Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED);
    const newScale = clamp(viewportRef.current.scale * scaleFactor, MIN_SCALE, MAX_SCALE);

    const newX = centerX - worldX * newScale;
    const newY = centerY - worldY * newScale;

    updateViewport({
      x: newX,
      y: newY,
      scale: newScale
    });
  }, [updateViewport]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'text') {
      const worldPoint = getWorldPoint(e);
      setTextInput({
        type: 'text',
        x: worldPoint.x,
        y: worldPoint.y,
        value: ''
      });
    } else if (activeTool === 'sticky') {
      const worldPoint = getWorldPoint(e);
      const sticky = findStickyAt(worldPoint);
      if (!sticky) {
        setTextInput({
          type: 'sticky',
          x: worldPoint.x,
          y: worldPoint.y,
          value: ''
        });
      }
    }
  }, [activeTool, getWorldPoint, findStickyAt]);

  const handleTextInputSubmit = useCallback(() => {
    if (!textInput) return;

    if (textInput.type === 'text' && textInput.value.trim()) {
      const textLabel: TextLabel = {
        id: uuidv4(),
        userId,
        x: textInput.x,
        y: textInput.y,
        text: textInput.value,
        fontSize: textSettings.fontSize,
        color: textSettings.color,
        textAlign: textSettings.textAlign,
        createdAt: Date.now()
      };
      const command: TextAddCommand = {
        type: 'text:add',
        userId,
        timestamp: Date.now(),
        textLabel
      };
      sendCommand(command);
    } else if (textInput.type === 'sticky' && textInput.value.trim()) {
      const stickyNote: StickyNote = {
        id: uuidv4(),
        userId,
        x: textInput.x,
        y: textInput.y,
        width: 180,
        height: 140,
        text: textInput.value,
        color: userColor + '33',
        createdAt: Date.now()
      };
      const command: StickyAddCommand = {
        type: 'sticky:add',
        userId,
        timestamp: Date.now(),
        stickyNote
      };
      sendCommand(command);
    }

    setTextInput(null);
  }, [textInput, userId, textSettings, userColor, sendCommand]);

  useEffect(() => {
    if (textInput && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInput]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const worldPoint = getWorldPoint(e);
    for (let i = objectsRef.current.length - 1; i >= 0; i--) {
      const obj = objectsRef.current[i];
      if ('textAlign' in obj && obj.userId === userId) {
        const text = obj as TextLabel;
        if (
          worldPoint.x >= text.x - 10 &&
          worldPoint.x <= text.x + 200 &&
          worldPoint.y >= text.y - 10 &&
          worldPoint.y <= text.y + 50
        ) {
          setTextInput({
            type: 'text',
            x: text.x,
            y: text.y,
            value: text.text
          });
          removeObject(text.id);
          const command: ObjectDeleteCommand = {
            type: 'object:delete',
            userId,
            timestamp: Date.now(),
            id: text.id
          };
          socketManager?.sendCommand(command);
          break;
        }
      }
    }
  }, [getWorldPoint, userId, removeObject, socketManager]);

  const handleMinimapClick = useCallback((e: React.MouseEvent) => {
    const minimap = minimapCanvasRef.current;
    if (!minimap) return;

    const rect = minimap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const objects = objectsRef.current;
    const bounds = { minX: -500, maxX: 500, minY: -500, maxY: 500 };
    let hasObjects = false;
    for (const obj of objects) {
      if ('points' in obj) {
        for (const p of (obj as Stroke).points) {
          if (!hasObjects) {
            bounds.minX = bounds.maxX = p.x;
            bounds.minY = bounds.maxY = p.y;
            hasObjects = true;
          } else {
            bounds.minX = Math.min(bounds.minX, p.x);
            bounds.maxX = Math.max(bounds.maxX, p.x);
            bounds.minY = Math.min(bounds.minY, p.y);
            bounds.maxY = Math.max(bounds.maxY, p.y);
          }
        }
      }
    }
    const padding = 100;
    bounds.minX -= padding;
    bounds.maxX += padding;
    bounds.minY -= padding;
    bounds.maxY += padding;

    const worldWidth = bounds.maxX - bounds.minX;
    const worldHeight = bounds.maxY - bounds.minY;
    const scale = Math.min(minimap.width / worldWidth, minimap.height / worldHeight, 1);

    const worldX = bounds.minX + x / scale;
    const worldY = bounds.minY + y / scale;

    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.width / dpr;
      const cssHeight = canvas.height / dpr;
      updateViewport({
        x: -(worldX * viewportRef.current.scale) + cssWidth / 2,
        y: -(worldY * viewportRef.current.scale) + cssHeight / 2
      });
    }
  }, [updateViewport]);

  const handleZoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldX = (centerX - viewportRef.current.x) / viewportRef.current.scale;
    const worldY = (centerY - viewportRef.current.y) / viewportRef.current.scale;
    const newScale = clamp(viewportRef.current.scale * 1.2, MIN_SCALE, MAX_SCALE);
    updateViewport({
      x: centerX - worldX * newScale,
      y: centerY - worldY * newScale,
      scale: newScale
    });
  }, [updateViewport]);

  const handleZoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldX = (centerX - viewportRef.current.x) / viewportRef.current.scale;
    const worldY = (centerY - viewportRef.current.y) / viewportRef.current.scale;
    const newScale = clamp(viewportRef.current.scale / 1.2, MIN_SCALE, MAX_SCALE);
    updateViewport({
      x: centerX - worldX * newScale,
      y: centerY - worldY * newScale,
      scale: newScale
    });
  }, [updateViewport]);

  const getTextInputScreenPosition = () => {
    if (!textInput) return { left: 0, top: 0 };
    const screenPos = worldToScreen(textInput.x, textInput.y, viewportRef.current);
    return {
      left: screenPos.x,
      top: screenPos.y
    };
  };

  const textInputPos = textInput ? getTextInputScreenPosition() : null;

  const getCursorStatusClass = () => {
    if (activeTool === 'pan') return 'tool-pan';
    if (activeTool === 'text') return 'tool-text';
    if (activeTool === 'sticky') return 'tool-sticky';
    return '';
  };

  const cursorEntries = Array.from(remoteCursorsRef.current.entries());
  const remoteCursors = cursorEntries
    .filter(([id]) => id !== userId)
    .map(([id, data]) => {
      const user = onlineUsers.find(u => u.id === id);
      if (!user) return null;
      const screenPos = worldToScreen(data.point.x, data.point.y, viewportRef.current);
      return {
        id,
        name: user.name,
        color: user.color,
        x: screenPos.x,
        y: screenPos.y
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div
      ref={wrapperRef}
      className={`canvas-wrapper ${getCursorStatusClass()}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <canvas ref={canvasRef} className="main-canvas" />

      {textInput && textInputPos && (
        <div
          className="text-input-overlay"
          style={{ left: textInputPos.left, top: textInputPos.top }}
        >
          {textInput.type === 'text' ? (
            <input
              ref={textInputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onBlur={handleTextInputSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextInputSubmit();
                if (e.key === 'Escape') setTextInput(null);
              }}
              style={{
                fontSize: `${textSettings.fontSize}px`,
                color: textSettings.color,
                textAlign: textSettings.textAlign,
                width: '300px'
              }}
              placeholder="输入文字..."
            />
          ) : (
            <textarea
              ref={textInputRef as React.RefObject<HTMLTextAreaElement>}
              className="sticky-note-input"
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onBlur={handleTextInputSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setTextInput(null);
              }}
              style={{ backgroundColor: userColor + '33' }}
              placeholder="输入便签内容..."
            />
          )}
        </div>
      )}

      {remoteCursors.map((cursor) => (
        <div
          key={cursor.id}
          className="cursor-indicator"
          style={{ left: cursor.x, top: cursor.y }}
        >
          <div className="cursor-dot" style={{ backgroundColor: cursor.color }} />
          <div className="cursor-label">{cursor.name}</div>
        </div>
      ))}

      <div className="zoom-controls">
        <button
          className="zoom-btn"
          onClick={handleZoomIn}
          title="放大"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <div className="zoom-level">{Math.round(viewport.scale * 100)}%</div>
        <button
          className="zoom-btn"
          onClick={handleZoomOut}
          title="缩小"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button
          className="zoom-btn"
          onClick={() => updateViewport({ x: 0, y: 0, scale: 1 })}
          title="重置视图"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      </div>

      <div className="minimap" onClick={handleMinimapClick}>
        <canvas ref={minimapCanvasRef} className="minimap-canvas" width={184} height={134} />
      </div>
    </div>
  );
});

DrawingBoard.displayName = 'DrawingBoard';
