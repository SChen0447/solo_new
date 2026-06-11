import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import useStore from '../store/useStore';
import { useSocket } from '../hooks/useSocket';
import { DrawAction } from '../types';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  isPanning: boolean;
  isDrawing: boolean;
  spaceHeld: boolean;
  lastPanX: number;
  lastPanY: number;
  currentAction: DrawAction | null;
}

export interface CanvasHandle {
  getTransform: () => { zoom: number; panX: number; panY: number };
  screenToCanvas: (sx: number, sy: number) => { x: number; y: number };
}

export default forwardRef<CanvasHandle>(function Canvas(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<CanvasState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    isDrawing: false,
    spaceHeld: false,
    lastPanX: 0,
    lastPanY: 0,
    currentAction: null,
  });
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const rafRef = useRef<number>(0);
  const lastEmitRef = useRef<number>(0);

  const drawActions = useStore((s) => s.drawActions);
  const currentTool = useStore((s) => s.currentTool);
  const currentColor = useStore((s) => s.currentColor);
  const strokeWidth = useStore((s) => s.strokeWidth);
  const fontSize = useStore((s) => s.fontSize);
  const userId = useStore((s) => s.userId);
  const isReplaying = useStore((s) => s.isReplaying);
  const remoteCursors = useStore((s) => s.remoteCursors);
  const addDrawAction = useStore((s) => s.addDrawAction);
  const textInput = useStore((s) => s.textInput);
  const setTextInput = useStore((s) => s.setTextInput);

  const { emitCursorMove } = useSocket();

  const [zoomLevel, setZoomLevel] = useState(1);

  useImperativeHandle(ref, () => ({
    getTransform: () => ({
      zoom: stateRef.current.zoom,
      panX: stateRef.current.panX,
      panY: stateRef.current.panY,
    }),
    screenToCanvas: (sx: number, sy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const st = stateRef.current;
      return {
        x: (sx - rect.left - st.panX) / st.zoom,
        y: (sy - rect.top - st.panY) / st.zoom,
      };
    },
  }));

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const st = stateRef.current;
    const x = (screenX - rect.left - st.panX) / st.zoom;
    const y = (screenY - rect.top - st.panY) / st.zoom;
    return { x, y };
  }, []);

  const canvasToScreen = useCallback((cx: number, cy: number) => {
    const st = stateRef.current;
    return {
      x: cx * st.zoom + st.panX,
      y: cy * st.zoom + st.panY,
    };
  }, []);

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      zoom: number,
      panX: number,
      panY: number
    ) => {
      const spacing = 20 * zoom;
      const dotRadius = Math.max(0.5, 1 * zoom);
      const offsetX = panX % spacing;
      const offsetY = panY % spacing;

      ctx.fillStyle = 'rgba(200, 200, 255, 0.08)';
      for (let x = offsetX; x < width; x += spacing) {
        for (let y = offsetY; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    []
  );

  const drawAction = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      action: DrawAction,
      zoom: number,
      panX: number,
      panY: number
    ) => {
      const points = action.points;
      if (!points || points.length === 0) return;

      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      switch (action.type) {
        case 'pencil': {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
          break;
        }
        case 'highlighter': {
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'line': {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.strokeWidth;
          ctx.lineCap = 'round';
          const start = points[0];
          const end = points[points.length - 1];
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          break;
        }
        case 'rect': {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.strokeWidth;
          const p0 = points[0];
          const p1 = points[points.length - 1];
          const rx = Math.min(p0.x, p1.x);
          const ry = Math.min(p0.y, p1.y);
          const rw = Math.abs(p1.x - p0.x);
          const rh = Math.abs(p1.y - p0.y);
          ctx.strokeRect(rx, ry, rw, rh);
          break;
        }
        case 'circle': {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.strokeWidth;
          const center = points[0];
          const edge = points[points.length - 1];
          const radius = Math.sqrt(
            (edge.x - center.x) ** 2 + (edge.y - center.y) ** 2
          );
          ctx.beginPath();
          ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'text': {
          ctx.globalAlpha = 1;
          ctx.fillStyle = action.color;
          ctx.font = `${action.fontSize || 16}px 'DM Sans', sans-serif`;
          ctx.textBaseline = 'top';
          if (action.text) {
            ctx.fillText(action.text, points[0].x, points[0].y);
          }
          break;
        }
      }

      ctx.restore();
    },
    []
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const st = stateRef.current;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#312e81');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx, width, height, st.zoom, st.panX, st.panY);

    for (const action of drawActions) {
      drawAction(ctx, action, st.zoom, st.panX, st.panY);
    }

    if (st.currentAction) {
      drawAction(ctx, st.currentAction, st.zoom, st.panX, st.panY);
    }

    const entries = Array.from(remoteCursors.entries());
    for (const [, cursor] of entries) {
      if (!cursor) continue;
      ctx.save();
      ctx.translate(st.panX, st.panY);
      ctx.scale(st.zoom, st.zoom);

      ctx.fillStyle = cursor.color;
      ctx.shadowColor = cursor.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, 4 / st.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = `${12 / st.zoom}px 'DM Sans', sans-serif`;
      ctx.fillStyle = cursor.color;
      ctx.textBaseline = 'bottom';
      ctx.fillText(cursor.name, cursor.x + 8 / st.zoom, cursor.y - 4 / st.zoom);

      ctx.restore();
    }
  }, [drawActions, remoteCursors, drawGrid, drawAction]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        stateRef.current.spaceHeld = true;
      }
      if (e.key === 'Escape' && textInput.active) {
        setTextInput({ ...textInput, active: false });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        stateRef.current.spaceHeld = false;
        if (stateRef.current.isPanning) {
          stateRef.current.isPanning = false;
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [textInput, setTextInput]);

  useEffect(() => {
    if (textInput.active && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInput.active]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isReplaying) return;
      const st = stateRef.current;

      if (textInput.active) {
        setTextInput({ ...textInput, active: false });
      }

      if (e.button === 1 || st.spaceHeld) {
        st.isPanning = true;
        st.lastPanX = e.clientX;
        st.lastPanY = e.clientY;
        return;
      }

      if (e.button !== 0) return;

      const canvasPoint = screenToCanvas(e.clientX, e.clientY);
      const effectiveStrokeWidth =
        currentTool === 'highlighter' ? strokeWidth * 3 : strokeWidth;

      if (currentTool === 'text') {
        setTextInput({
          active: true,
          x: canvasPoint.x,
          y: canvasPoint.y,
          color: currentColor,
          fontSize: fontSize,
          value: '',
        });
        return;
      }

      st.isDrawing = true;
      st.currentAction = {
        id: generateId(),
        type: currentTool,
        points: [canvasPoint],
        color: currentColor,
        strokeWidth: effectiveStrokeWidth,
        fontSize: fontSize,
        userId: userId || '',
        timestamp: Date.now(),
      };
    },
    [
      isReplaying,
      currentTool,
      currentColor,
      strokeWidth,
      fontSize,
      userId,
      screenToCanvas,
      textInput,
      setTextInput,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const st = stateRef.current;
      const now = Date.now();

      if (now - lastEmitRef.current >= 200) {
        const canvasPoint = screenToCanvas(e.clientX, e.clientY);
        emitCursorMove(canvasPoint.x, canvasPoint.y);
        lastEmitRef.current = now;
      }

      if (st.isPanning) {
        const dx = e.clientX - st.lastPanX;
        const dy = e.clientY - st.lastPanY;
        st.panX += dx;
        st.panY += dy;
        st.lastPanX = e.clientX;
        st.lastPanY = e.clientY;
        return;
      }

      if (st.isDrawing && st.currentAction && st.currentAction.type !== 'text') {
        const canvasPoint = screenToCanvas(e.clientX, e.clientY);
        st.currentAction.points.push(canvasPoint);
      }
    },
    [screenToCanvas, emitCursorMove]
  );

  const handleMouseUp = useCallback(() => {
    const st = stateRef.current;

    if (st.isPanning) {
      st.isPanning = false;
      return;
    }

    if (st.isDrawing && st.currentAction && st.currentAction.type !== 'text') {
      st.isDrawing = false;
      addDrawAction(st.currentAction);
      st.currentAction = null;
    }
  }, [addDrawAction]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const st = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(10, Math.max(0.1, st.zoom * zoomFactor));

    st.panX = mouseX - (mouseX - st.panX) * (newZoom / st.zoom);
    st.panY = mouseY - (mouseY - st.panY) * (newZoom / st.zoom);
    st.zoom = newZoom;
    setZoomLevel(newZoom);
  }, []);

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (textInput.value.trim()) {
        const action: DrawAction = {
          id: generateId(),
          type: 'text',
          points: [{ x: textInput.x, y: textInput.y }],
          color: textInput.color,
          strokeWidth: 1,
          fontSize: textInput.fontSize,
          text: textInput.value,
          userId: userId || '',
          timestamp: Date.now(),
        };
        addDrawAction(action);
      }
      setTextInput({ ...textInput, active: false });
    } else if (e.key === 'Escape') {
      setTextInput({ ...textInput, active: false });
    }
  };

  const handleTextBlur = () => {
    if (textInput.value.trim()) {
      const action: DrawAction = {
        id: generateId(),
        type: 'text',
        points: [{ x: textInput.x, y: textInput.y }],
        color: textInput.color,
        strokeWidth: 1,
        fontSize: textInput.fontSize,
        text: textInput.value,
        userId: userId || '',
        timestamp: Date.now(),
      };
      addDrawAction(action);
    }
    setTextInput({ ...textInput, active: false });
  };

  const textScreenPos = textInput.active ? canvasToScreen(textInput.x, textInput.y) : null;

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor:
            stateRef.current.isPanning || stateRef.current.spaceHeld
              ? 'grab'
              : currentTool === 'text'
              ? 'text'
              : 'crosshair',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {textInput.active && textScreenPos && (
        <input
          ref={textInputRef}
          type="text"
          autoFocus
          value={textInput.value}
          onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
          onKeyDown={handleTextKeyDown}
          onBlur={handleTextBlur}
          placeholder="输入文本..."
          style={{
            position: 'absolute',
            left: textScreenPos.x,
            top: textScreenPos.y,
            fontSize: textInput.fontSize,
            color: textInput.color,
            background: 'rgba(0,0,0,0.4)',
            border: `1px solid ${textInput.color}`,
            borderRadius: 4,
            padding: '4px 8px',
            outline: 'none',
            minWidth: 120,
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: `0 0 12px ${textInput.color}44`,
            zIndex: 50,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          background: 'rgba(0,0,0,0.6)',
          color: '#ccc',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontFamily: 'monospace',
          pointerEvents: 'none',
          userSelect: 'none',
          backdropFilter: 'blur(4px)',
        }}
      >
        {Math.round(zoomLevel * 100)}%
      </div>
    </div>
  );
});
