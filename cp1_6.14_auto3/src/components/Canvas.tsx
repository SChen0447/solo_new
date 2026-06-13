import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore, generateId, ToolType, CanvasElement, Point } from '../store/canvasStore';

interface CanvasProps {
  ws: WebSocket | null;
}

export default function Canvas({ ws }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const currentElementRef = useRef<CanvasElement | null>(null);
  const panVelocityRef = useRef<Point>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const cursorPositionRef = useRef<Point>({ x: 0, y: 0 });

  const {
    elements,
    currentTool,
    currentColor,
    currentLineWidth,
    currentFontSize,
    currentUserId,
    currentUserColor,
    currentUserName,
    offsetX,
    offsetY,
    scale,
    cursors,
    addElement,
    setOffset,
    setScale,
    updateCursor,
  } = useCanvasStore();

  const getCanvasPoint = useCallback((e: MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - offsetX) / scale,
      y: (e.clientY - rect.top - offsetY) / scale,
    };
  }, [offsetX, scale]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gridSize = 50;
    ctx.strokeStyle = '#2b2b3a';
    ctx.lineWidth = 1;

    const startX = Math.floor(-offsetX / scale / gridSize) * gridSize;
    const startY = Math.floor(-offsetY / scale / gridSize) * gridSize;
    const endX = startX + canvas.width / scale + gridSize * 2;
    const endY = startY + canvas.height / scale + gridSize * 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    for (let x = startX; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (let y = startY; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    ctx.restore();
  }, [offsetX, offsetY, scale]);

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (element.type) {
      case 'pen':
        if (element.points.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(element.points[0].x, element.points[0].y);
        for (let i = 1; i < element.points.length; i++) {
          const p1 = element.points[i - 1];
          const p2 = element.points[i];
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
        }
        ctx.stroke();
        break;

      case 'rect':
        ctx.strokeRect(element.x, element.y, element.width, element.height);
        break;

      case 'ellipse':
        ctx.beginPath();
        ctx.ellipse(element.cx, element.cy, element.rx, element.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'text':
        ctx.font = `${element.fontSize}px Arial`;
        ctx.fillText(element.text, element.x, element.y);
        break;
    }

    ctx.restore();
  }, [offsetX, offsetY, scale]);

  const drawCursors = useCallback((ctx: CanvasRenderingContext2D) => {
    const now = Date.now();
    cursors.forEach((cursor) => {
      if (cursor.id === currentUserId) return;
      const age = now - cursor.timestamp;
      if (age > 500) return;

      const opacity = 1 - age / 500;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      ctx.globalAlpha = opacity;
      ctx.fillStyle = cursor.color;
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = opacity * 0.8;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '12px Arial';
      ctx.fillText(cursor.name, cursor.x + 10, cursor.y - 8);

      ctx.restore();
    });
  }, [cursors, currentUserId, offsetX, offsetY, scale]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#22222e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid(ctx);

    elements.forEach((element) => drawElement(ctx, element));

    if (currentElementRef.current && isDrawingRef.current) {
      drawElement(ctx, currentElementRef.current);
    }

    drawCursors(ctx);
  }, [elements, drawGrid, drawElement, drawCursors]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      render();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  useEffect(() => {
    let lastCursorSent = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const point = getCanvasPoint(e);
      cursorPositionRef.current = point;

      const now = Date.now();
      if (ws && ws.readyState === WebSocket.OPEN && now - lastCursorSent > 30) {
        ws.send(JSON.stringify({
          type: 'cursor',
          x: point.x,
          y: point.y,
        }));
        lastCursorSent = now;
      }

      if (currentUserId) {
        updateCursor({
          id: currentUserId,
          color: currentUserColor,
          name: currentUserName,
          x: point.x,
          y: point.y,
          timestamp: now,
        });
      }

      if (isPanningRef.current && lastPointRef.current) {
        const dx = e.clientX - lastPointRef.current.x;
        const dy = e.clientY - lastPointRef.current.y;
        setOffset(offsetX + dx, offsetY + dy);
        panVelocityRef.current = { x: dx, y: dy };
        lastPointRef.current = { x: e.clientX, y: e.clientY };
      }

      if (isDrawingRef.current && currentElementRef.current) {
        const element = currentElementRef.current;
        const startPoint = (element as any).startPoint as Point;

        switch (element.type) {
          case 'pen':
            (element as any).points.push(point);
            break;
          case 'rect':
            (element as any).x = Math.min(startPoint.x, point.x);
            (element as any).y = Math.min(startPoint.y, point.y);
            (element as any).width = Math.abs(point.x - startPoint.x);
            (element as any).height = Math.abs(point.y - startPoint.y);
            break;
          case 'ellipse':
            (element as any).cx = (startPoint.x + point.x) / 2;
            (element as any).cy = (startPoint.y + point.y) / 2;
            (element as any).rx = Math.abs(point.x - startPoint.x) / 2;
            (element as any).ry = Math.abs(point.y - startPoint.y) / 2;
            break;
        }
        render();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [ws, getCanvasPoint, isDrawingRef, isPanningRef, lastPointRef, currentElementRef,
      currentUserId, currentUserColor, currentUserName, updateCursor, offsetX, offsetY,
      setOffset, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCursorStyle = (tool: ToolType): string => {
      switch (tool) {
        case 'pen': return 'crosshair';
        case 'rect': return 'crosshair';
        case 'ellipse': return 'crosshair';
        case 'text': return 'text';
        default: return 'default';
      }
    };

    canvas.style.cursor = getCursorStyle(currentTool);
  }, [currentTool]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      lastPointRef.current = { x: e.clientX, y: e.clientY };
      panVelocityRef.current = { x: 0, y: 0 };
      return;
    }

    if (e.button !== 0) return;

    const point = getCanvasPoint(e.nativeEvent);

    if (currentTool === 'text') {
      const text = prompt('请输入文字：');
      if (text && currentUserId) {
        addElement({
          id: generateId(),
          type: 'text',
          color: currentColor,
          lineWidth: currentLineWidth,
          userId: currentUserId,
          x: point.x,
          y: point.y,
          text,
          fontSize: currentFontSize,
        });
      }
      return;
    }

    isDrawingRef.current = true;

    const baseElement = {
      id: generateId(),
      color: currentColor,
      lineWidth: currentLineWidth,
      userId: currentUserId || '',
    };

    switch (currentTool) {
      case 'pen':
        currentElementRef.current = {
          ...baseElement,
          type: 'pen',
          points: [point],
        };
        break;
      case 'rect':
        currentElementRef.current = {
          ...baseElement,
          type: 'rect',
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          startPoint: point,
        } as any;
        break;
      case 'ellipse':
        currentElementRef.current = {
          ...baseElement,
          type: 'ellipse',
          cx: point.x,
          cy: point.y,
          rx: 0,
          ry: 0,
          startPoint: point,
        } as any;
        break;
    }
  }, [currentTool, currentColor, currentLineWidth, currentFontSize, currentUserId, getCanvasPoint, addElement]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      isPanningRef.current = false;
      const animatePan = () => {
        if (Math.abs(panVelocityRef.current.x) > 0.1 || Math.abs(panVelocityRef.current.y) > 0.1) {
          setOffset(
            offsetX + panVelocityRef.current.x,
            offsetY + panVelocityRef.current.y
          );
          panVelocityRef.current.x *= 0.92;
          panVelocityRef.current.y *= 0.92;
          animationFrameRef.current = requestAnimationFrame(animatePan);
        }
      };
      animationFrameRef.current = requestAnimationFrame(animatePan);
      return;
    }

    if (isDrawingRef.current && currentElementRef.current) {
      const element = { ...currentElementRef.current };
      delete (element as any).startPoint;
      addElement(element, true);
      isDrawingRef.current = false;
      currentElementRef.current = null;
    }
  }, [addElement, offsetX, offsetY, setOffset]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.2, Math.min(5, scale * zoomFactor));

    const newOffsetX = mouseX - (mouseX - offsetX) * (newScale / scale);
    const newOffsetY = mouseY - (mouseY - offsetY) * (newScale / scale);

    setScale(newScale);
    setOffset(newOffsetX, newOffsetY);
  }, [scale, offsetX, offsetY, setScale, setOffset]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#22222e',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
