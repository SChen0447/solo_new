import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type {
  ToolType,
  DrawElement,
  DrawPath,
  DrawShape,
  StickyNote,
  CanvasImage,
  UserCursor,
  Point,
} from '../shared/types';
import { v4 as uuidv4 } from 'uuid';
import {
  createDrawPathElement,
  createDrawShapeElement,
  validateDrawElement,
  shouldBroadcastCursorMove,
} from './utils/canvasUtils';

interface CanvasProps {
  tool: ToolType;
  color: string;
  thickness: number;
  userId: string;
  userColor: string;
  drawings: DrawElement[];
  stickies: StickyNote[];
  images: CanvasImage[];
  cursors: Map<string, UserCursor>;
  onDrawStart: (element: DrawElement) => void;
  onDrawUpdate: (element: DrawElement) => void;
  onDrawFinish: (element: DrawElement) => void;
  onStickyAdd: (sticky: StickyNote) => void;
  onStickyUpdate: (sticky: StickyNote) => void;
  onImageAdd: (image: CanvasImage) => void;
  onImageUpdate: (image: CanvasImage) => void;
  onCursorMove: (cursor: UserCursor) => void;
  onAddStickyAt: (x: number, y: number) => void;
  onUploadImageAt: (x: number, y: number, file: File) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  tool,
  color,
  thickness,
  userId,
  userColor,
  drawings,
  stickies,
  images,
  cursors,
  onDrawStart,
  onDrawUpdate,
  onDrawFinish,
  onStickyAdd,
  onStickyUpdate,
  onImageAdd,
  onImageUpdate,
  onCursorMove,
  onAddStickyAt,
  onUploadImageAt,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DrawElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedSticky, setDraggedSticky] = useState<string | null>(null);
  const [stickyDragOffset, setStickyDragOffset] = useState({ x: 0, y: 0 });
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [imageDragOffset, setImageDragOffset] = useState({ x: 0, y: 0 });
  const [resizingImage, setResizingImage] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const lastCursorEmit = useRef(0);
  const currentElementRef = useRef<DrawElement | null>(null);
  const editingStickyIdRef = useRef<string | null>(null);
  const editingContentRef = useRef('');
  const [, forceUpdate] = useState(0);

  const getCanvasPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left - offset.x) / scale,
        y: (clientY - rect.top - offset.y) / scale,
      };
    },
    [offset, scale]
  );

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#d9e2ec';
    ctx.lineWidth = 1 / scale;
    const gridSize = 40;
    const startX = -offset.x / scale;
    const startY = -offset.y / scale;
    const endX = startX + canvas.width / scale;
    const endY = startY + canvas.height / scale;
    for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    drawings.forEach((element) => {
      drawElement(ctx, element);
    });

    if (currentElementRef.current) {
      drawElement(ctx, currentElementRef.current, true);
    }

    ctx.restore();
  }, [drawings, offset, scale]);

  const drawElement = (ctx: CanvasRenderingContext2D, element: DrawElement, isPreview = false) => {
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = element.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (isPreview) {
      ctx.globalAlpha = 0.8;
    }

    if (element.type === 'pen') {
      if (element.points.length < 2) {
        if (element.points.length === 1) {
          ctx.beginPath();
          ctx.arc(element.points[0].x, element.points[0].y, element.thickness / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(element.points[0].x, element.points[0].y);
      for (let i = 1; i < element.points.length; i++) {
        ctx.lineTo(element.points[i].x, element.points[i].y);
      }
      ctx.stroke();
    } else if (element.type === 'rectangle') {
      const x = Math.min(element.start.x, element.end.x);
      const y = Math.min(element.start.y, element.end.y);
      const w = Math.abs(element.end.x - element.start.x);
      const h = Math.abs(element.end.y - element.start.y);
      ctx.strokeRect(x, y, w, h);
    } else if (element.type === 'circle') {
      const cx = (element.start.x + element.end.x) / 2;
      const cy = (element.start.y + element.end.y) / 2;
      const rx = Math.abs(element.end.x - element.start.x) / 2;
      const ry = Math.abs(element.end.y - element.start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (element.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(element.start.x, element.start.y);
      ctx.lineTo(element.end.x, element.end.y);
      ctx.stroke();
    }
    ctx.restore();
  };

  useEffect(() => {
    let animationId: number;
    const loop = () => {
      renderCanvas();
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [renderCanvas]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const point = getCanvasPoint(e.clientX, e.clientY);

    if (tool === 'select' || e.altKey || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    if (tool === 'sticky') {
      onAddStickyAt(point.x, point.y);
      return;
    }

    if (tool === 'image') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/jpg';
      input.onchange = (ev) => {
        const target = ev.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          onUploadImageAt(point.x, point.y, target.files[0]);
        }
      };
      input.click();
      return;
    }

    if (tool === 'pen' || tool === 'rectangle' || tool === 'circle' || tool === 'line') {
      setIsDrawing(true);
      let element: DrawElement;
      if (tool === 'pen') {
        element = createDrawPathElement(uuidv4(), [point], color, thickness, userId);
      } else {
        element = createDrawShapeElement(tool, uuidv4(), point, point, color, thickness, userId);
      }
      if (validateDrawElement(element)) {
        setCurrentElement(element);
        currentElementRef.current = element;
        onDrawStart(element);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e.clientX, e.clientY);

    if (shouldBroadcastCursorMove(lastCursorEmit.current, 50)) {
      lastCursorEmit.current = Date.now();
      const name = cursors.get(userId)?.name || '我';
      onCursorMove({ userId, x: point.x, y: point.y, color: userColor, name });
    }

    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (draggedSticky) {
      const sticky = stickies.find((s) => s.id === draggedSticky);
      if (sticky) {
        const updated = {
          ...sticky,
          x: point.x - stickyDragOffset.x,
          y: point.y - stickyDragOffset.y,
        };
        onStickyUpdate(updated);
      }
      return;
    }

    if (draggedImage) {
      const img = images.find((i) => i.id === draggedImage);
      if (img) {
        const updated = {
          ...img,
          x: point.x - imageDragOffset.x,
          y: point.y - imageDragOffset.y,
        };
        onImageUpdate(updated);
      }
      return;
    }

    if (resizingImage && resizeStart) {
      const img = images.find((i) => i.id === resizingImage);
      if (img) {
        const dx = (e.clientX - resizeStart.x) / scale;
        const dy = (e.clientY - resizeStart.y) / scale;
        const newW = Math.max(40, resizeStart.w + dx);
        const aspect = resizeStart.w / resizeStart.h;
        const newH = newW / aspect;
        const updated = { ...img, width: newW, height: newH };
        onImageUpdate(updated);
      }
      return;
    }

    if (isDrawing && currentElementRef.current) {
      const el = currentElementRef.current;
      if (el.type === 'pen') {
        const updated: DrawPath = {
          id: el.id,
          type: 'pen',
          points: [...el.points, point],
          color: el.color,
          thickness: el.thickness,
          userId: el.userId,
        };
        currentElementRef.current = updated;
        setCurrentElement(updated);
        onDrawUpdate(updated);
      } else {
        const updated: DrawShape = {
          id: el.id,
          type: el.type,
          start: el.start,
          end: point,
          color: el.color,
          thickness: el.thickness,
          userId: el.userId,
        };
        currentElementRef.current = updated;
        setCurrentElement(updated);
        onDrawUpdate(updated);
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (draggedSticky) {
      setDraggedSticky(null);
      return;
    }
    if (draggedImage) {
      setDraggedImage(null);
      return;
    }
    if (resizingImage) {
      setResizingImage(null);
      setResizeStart(null);
      return;
    }
    if (isDrawing && currentElementRef.current) {
      onDrawFinish(currentElementRef.current);
      setIsDrawing(false);
      setCurrentElement(null);
      currentElementRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(4, Math.max(0.2, scale + delta));
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = (mx - offset.x) / scale;
    const worldY = (my - offset.y) / scale;
    setOffset({
      x: mx - worldX * newScale,
      y: my - worldY * newScale,
    });
    setScale(newScale);
  };

  const handleStickyMouseDown = (e: React.MouseEvent, sticky: StickyNote) => {
    e.stopPropagation();
    const point = getCanvasPoint(e.clientX, e.clientY);
    setDraggedSticky(sticky.id);
    setStickyDragOffset({
      x: point.x - sticky.x,
      y: point.y - sticky.y,
    });
  };

  const handleStickyChange = (sticky: StickyNote, content: string) => {
    if (editingStickyIdRef.current === sticky.id) {
      editingContentRef.current = content;
      forceUpdate((n) => n + 1);
    }
  };

  const handleStickyFocus = (sticky: StickyNote) => {
    editingStickyIdRef.current = sticky.id;
    editingContentRef.current = sticky.content;
  };

  const commitStickyUpdate = (sticky: StickyNote) => {
    if (editingStickyIdRef.current === sticky.id) {
      const newContent = editingContentRef.current;
      editingStickyIdRef.current = null;
      editingContentRef.current = '';
      if (newContent !== sticky.content) {
        onStickyUpdate({ ...sticky, content: newContent });
      }
    }
  };

  const handleStickyBlur = (sticky: StickyNote) => {
    commitStickyUpdate(sticky);
  };

  const handleStickyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, sticky: StickyNote) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      commitStickyUpdate(sticky);
      e.currentTarget.blur();
    }
  };

  const handleImageMouseDown = (e: React.MouseEvent, img: CanvasImage) => {
    e.stopPropagation();
    setSelectedImage(img.id);
    const point = getCanvasPoint(e.clientX, e.clientY);
    setDraggedImage(img.id);
    setImageDragOffset({
      x: point.x - img.x,
      y: point.y - img.y,
    });
  };

  const handleResizeStart = (e: React.MouseEvent, img: CanvasImage) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingImage(img.id);
    setResizeStart({ x: e.clientX, y: e.clientY, w: img.width, h: img.height });
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#f0f4f8',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={() => setSelectedImage(null)}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          cursor:
            tool === 'select' || isPanning
              ? 'grab'
              : tool === 'pen'
              ? 'crosshair'
              : tool === 'sticky'
              ? 'copy'
              : 'crosshair',
        }}
      />

      {stickies.map((sticky) => (
        <div
          key={sticky.id}
          className="sticky-note"
          style={{
            left: sticky.x * scale + offset.x,
            top: sticky.y * scale + offset.y,
            width: sticky.width * scale,
            height: sticky.height * scale,
            background: sticky.color,
            border: `2px solid ${sticky.borderColor}`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          onMouseDown={(e) => handleStickyMouseDown(e, sticky)}
        >
          <textarea
            value={editingStickyIdRef.current === sticky.id ? editingContentRef.current : sticky.content}
            onChange={(e) => handleStickyChange(sticky, e.target.value)}
            onFocus={() => handleStickyFocus(sticky)}
            onBlur={() => handleStickyBlur(sticky)}
            onKeyDown={(e) => handleStickyKeyDown(e, sticky)}
            placeholder="输入便签内容..."
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      ))}

      {images.map((img) => (
        <div
          key={img.id}
          className={`canvas-image ${selectedImage === img.id ? 'selected' : ''}`}
          style={{
            left: img.x * scale + offset.x,
            top: img.y * scale + offset.y,
            width: img.width * scale,
            height: img.height * scale,
          }}
          onMouseDown={(e) => handleImageMouseDown(e, img)}
        >
          <img
            src={img.src}
            alt=""
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, pointerEvents: 'none' }}
          />
          {selectedImage === img.id && (
            <div className="resize-handle" onMouseDown={(e) => handleResizeStart(e, img)} />
          )}
        </div>
      ))}

      {Array.from(cursors.values()).map((cursor) => {
        if (cursor.userId === userId) return null;
        return (
          <div
            key={cursor.userId}
            style={{
              position: 'absolute',
              left: cursor.x * scale + offset.x,
              top: cursor.y * scale + offset.y,
              pointerEvents: 'none',
              zIndex: 10000,
            }}
          >
            <div
              className="cursor-dot"
              style={{
                background: cursor.color,
                left: -7,
                top: -7,
                position: 'absolute',
              }}
            />
            <div
              className="cursor-label"
              style={{
                background: cursor.color,
              }}
            >
              {cursor.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Canvas;
