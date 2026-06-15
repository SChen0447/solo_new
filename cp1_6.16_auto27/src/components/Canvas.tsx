import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import type { CanvasElement, Point } from '../store/useCanvasStore';
import { v4 as uuidv4 } from 'uuid';

type DraggingState =
  | { mode: 'none' }
  | { mode: 'brush'; points: Point[] }
  | { mode: 'rectangle'; startX: number; startY: number; curX: number; curY: number }
  | { mode: 'circle'; startX: number; startY: number; curX: number; curY: number }
  | { mode: 'pan'; startX: number; startY: number; originX: number; originY: number }
  | { mode: 'note-drag'; noteId: string; offsetX: number; offsetY: number }
  | { mode: 'erase' };

export const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dpr, setDpr] = useState(1);
  const dragRef = useRef<DraggingState>({ mode: 'none' });
  const [, forceRender] = useState(0);

  const elements = useCanvasStore((s) => s.elements);
  const zoom = useCanvasStore((s) => s.zoom);
  const panOffset = useCanvasStore((s) => s.panOffset);
  const targetZoom = useCanvasStore((s) => s.targetZoom);
  const targetPanOffset = useCanvasStore((s) => s.targetPanOffset);
  const currentTool = useCanvasStore((s) => s.currentTool);
  const brushSize = useCanvasStore((s) => s.brushSize);
  const brushColor = useCanvasStore((s) => s.brushColor);
  const userId = useCanvasStore((s) => s.userId);
  const userName = useCanvasStore((s) => s.userName);
  const userColor = useCanvasStore((s) => s.userColor);
  const selectedNoteId = useCanvasStore((s) => s.selectedNoteId);
  const tempNoteInput = useCanvasStore((s) => s.tempNoteInput);

  const addElement = useCanvasStore((s) => s.addElement);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const deleteElement = useCanvasStore((s) => s.deleteElement);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const setPanOffset = useCanvasStore((s) => s.setPanOffset);
  const animateStep = useCanvasStore((s) => s.animateStep);
  const setSelectedNoteId = useCanvasStore((s) => s.setSelectedNoteId);
  const setTempNoteInput = useCanvasStore((s) => s.setTempNoteInput);
  const commitNote = useCanvasStore((s) => s.commitNote);

  const [noteText, setNoteText] = useState('');
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  const screenToWorld = useCallback(
    (sx: number, sy: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const x = (sx - rect.left - panOffset.x) / zoom;
      const y = (sy - rect.top - panOffset.y) / zoom;
      return { x, y };
    },
    [panOffset, zoom]
  );

  useEffect(() => {
    const handleResize = () => {
      const ratio = window.devicePixelRatio || 1;
      setDpr(ratio);
      forceRender((n) => n + 1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let frameId: number;
    const loop = () => {
      const changed = animateStep();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawAll(ctx);
        }
      }
      if (changed) {
        forceRender((n) => n + 1);
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    elements,
    zoom,
    panOffset,
    brushSize,
    brushColor,
    selectedNoteId,
    dpr,
  ]);

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, w, h);

    const gridSize = 50 * zoom;
    const offsetX = panOffset.x % gridSize;
    const offsetY = panOffset.y % gridSize;

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = offsetX; x < w; x += gridSize) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawElement = (ctx: CanvasRenderingContext2D, el: CanvasElement) => {
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    if (el.type === 'brush') {
      if (el.points.length === 0) {
        ctx.restore();
        return;
      }
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const first = el.points[0];
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < el.points.length; i++) {
        const p = el.points[i];
        ctx.lineTo(p.x, p.y);
      }
      if (el.points.length === 1) {
        ctx.arc(first.x, first.y, el.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = el.color;
        ctx.fill();
      } else {
        ctx.stroke();
      }
    } else if (el.type === 'rectangle') {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.strokeRect(el.x, el.y, el.width, el.height);
    } else if (el.type === 'circle') {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.beginPath();
      ctx.arc(el.x, el.y, el.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (el.type === 'note') {
      const radius = 8;
      const isSelected = selectedNoteId === el.id;

      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = el.bgColor;
      ctx.beginPath();
      ctx.roundRect(el.x, el.y, el.width, el.height, radius);
      ctx.fill();

      ctx.shadowColor = 'transparent';

      if (isSelected) {
        ctx.strokeStyle = '#4fc3f7';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = '#333';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textBaseline = 'top';

      const padding = 10;
      const wrapWidth = el.width - padding * 2;
      const maxHeight = el.height - padding * 2;
      const lines = wrapText(ctx, el.text, wrapWidth);
      let y = el.y + padding;
      for (let i = 0; i < lines.length; i++) {
        if (y + 20 > el.y + padding + maxHeight) {
          break;
        }
        ctx.fillText(lines[i], el.x + padding, y);
        y += 20;
      }

      ctx.fillStyle = el.userColor;
      ctx.font = '10px sans-serif';
      ctx.fillText(el.userName || '匿名', el.x + padding, el.y + el.height - 16);
    }

    ctx.restore();
  };

  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const lines: string[] = [];
    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
      if (para === '') {
        lines.push('');
        continue;
      }
      let cur = '';
      for (const ch of para) {
        const test = cur + ch;
        if (ctx.measureText(test).width > maxWidth && cur) {
          lines.push(cur);
          cur = ch;
        } else {
          cur = test;
        }
      }
      if (cur) lines.push(cur);
    }
    return lines;
  };

  const drawPreview = (ctx: CanvasRenderingContext2D) => {
    const drag = dragRef.current;
    if (drag.mode === 'none') return;

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    if (drag.mode === 'brush' && drag.points.length > 0) {
      ctx.strokeStyle = userColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const first = drag.points[0];
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < drag.points.length; i++) {
        ctx.lineTo(drag.points[i].x, drag.points[i].y);
      }
      ctx.stroke();
    } else if (drag.mode === 'rectangle') {
      const x = Math.min(drag.startX, drag.curX);
      const y = Math.min(drag.startY, drag.curY);
      const w = Math.abs(drag.curX - drag.startX);
      const h = Math.abs(drag.curY - drag.startY);
      ctx.strokeStyle = userColor;
      ctx.lineWidth = brushSize;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(x, y, w, h);
    } else if (drag.mode === 'circle') {
      const dx = drag.curX - drag.startX;
      const dy = drag.curY - drag.startY;
      const r = Math.sqrt(dx * dx + dy * dy);
      ctx.strokeStyle = userColor;
      ctx.lineWidth = brushSize;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(drag.startX, drag.startY, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (drag.mode === 'erase') {
      // erase preview handled on mouseup
    }

    ctx.restore();
  };

  const drawAll = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h);

    const sorted = [...elements].sort((a, b) => a.createdAt - b.createdAt);
    for (const el of sorted) {
      drawElement(ctx, el);
    }
    drawPreview(ctx);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, [dpr]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const updateSize = () => {
      const rect = wrapper.getBoundingClientRect();
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [dpr]);

  const findNoteAt = (wx: number, wy: number) => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type !== 'note') continue;
      if (
        wx >= el.x &&
        wx <= el.x + el.width &&
        wy >= el.y &&
        wy <= el.y + el.height
      ) {
        return el;
      }
    }
    return null;
  };

  const eraseAt = (wx: number, wy: number) => {
    const threshold = 8;
    const toDelete: string[] = [];

    for (const el of elements) {
      if (el.type === 'note') continue;
      let hit = false;
      if (el.type === 'brush') {
        for (const p of el.points) {
          const d = Math.hypot(p.x - wx, p.y - wy);
          if (d < threshold + el.size / 2) {
            hit = true;
            break;
          }
        }
      } else if (el.type === 'rectangle') {
        const rx = el.x;
        const ry = el.y;
        const rw = el.width;
        const rh = el.height;
        const onEdge =
          (Math.abs(wx - rx) < threshold && wy >= ry - threshold && wy <= ry + rh + threshold) ||
          (Math.abs(wx - (rx + rw)) < threshold && wy >= ry - threshold && wy <= ry + rh + threshold) ||
          (Math.abs(wy - ry) < threshold && wx >= rx - threshold && wx <= rx + rw + threshold) ||
          (Math.abs(wy - (ry + rh)) < threshold && wx >= rx - threshold && wx <= rx + rw + threshold);
        hit = onEdge;
      } else if (el.type === 'circle') {
        const d = Math.hypot(wx - el.x, wy - el.y);
        hit = Math.abs(d - el.radius) < threshold;
      }
      if (hit) toDelete.push(el.id);
    }
    for (const id of toDelete) deleteElement(id);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x: wx, y: wy } = screenToWorld(e.clientX, e.clientY);

    if (tempNoteInput) return;

    if (e.button === 1 || (e.button === 0 && e.altKey) || currentTool === undefined) {
      dragRef.current = {
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        originX: targetPanOffset.x,
        originY: targetPanOffset.y,
      };
      return;
    }

    if (currentTool === 'note') {
      const hit = findNoteAt(wx, wy);
      if (hit) {
        dragRef.current = {
          mode: 'note-drag',
          noteId: hit.id,
          offsetX: wx - hit.x,
          offsetY: wy - hit.y,
        };
        setSelectedNoteId(hit.id);
      } else {
        setSelectedNoteId(null);
        setTempNoteInput({ x: wx, y: wy });
        setNoteText('');
        setTimeout(() => noteTextareaRef.current?.focus(), 30);
      }
      return;
    }

    if (currentTool === 'brush') {
      const hit = findNoteAt(wx, wy);
      if (hit) {
        dragRef.current = {
          mode: 'note-drag',
          noteId: hit.id,
          offsetX: wx - hit.x,
          offsetY: wy - hit.y,
        };
        setSelectedNoteId(hit.id);
        return;
      }
      setSelectedNoteId(null);
      dragRef.current = {
        mode: 'brush',
        points: [{ x: wx, y: wy }],
      };
    } else if (currentTool === 'rectangle') {
      setSelectedNoteId(null);
      dragRef.current = {
        mode: 'rectangle',
        startX: wx,
        startY: wy,
        curX: wx,
        curY: wy,
      };
    } else if (currentTool === 'circle') {
      setSelectedNoteId(null);
      dragRef.current = {
        mode: 'circle',
        startX: wx,
        startY: wy,
        curX: wx,
        curY: wy,
      };
    } else if (currentTool === 'eraser') {
      setSelectedNoteId(null);
      dragRef.current = { mode: 'erase' };
      eraseAt(wx, wy);
    } else {
      dragRef.current = {
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        originX: targetPanOffset.x,
        originY: targetPanOffset.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x: wx, y: wy } = screenToWorld(e.clientX, e.clientY);
    const drag = dragRef.current;

    if (drag.mode === 'pan') {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setPanOffset({
        x: drag.originX + dx,
        y: drag.originY + dy,
      });
    } else if (drag.mode === 'brush') {
      drag.points.push({ x: wx, y: wy });
    } else if (drag.mode === 'rectangle') {
      drag.curX = wx;
      drag.curY = wy;
    } else if (drag.mode === 'circle') {
      drag.curX = wx;
      drag.curY = wy;
    } else if (drag.mode === 'note-drag') {
      updateElement(drag.noteId, {
        x: wx - drag.offsetX,
        y: wy - drag.offsetY,
      } as Partial<CanvasElement>);
    } else if (drag.mode === 'erase') {
      eraseAt(wx, wy);
    }
  };

  const handleMouseUp = () => {
    const drag = dragRef.current;

    if (drag.mode === 'brush' && drag.points.length > 0) {
      addElement({
        id: uuidv4(),
        type: 'brush',
        userId,
        userName,
        userColor,
        createdAt: Date.now(),
        points: drag.points,
        color: userColor,
        size: brushSize,
      });
    } else if (drag.mode === 'rectangle') {
      const w = Math.abs(drag.curX - drag.startX);
      const h = Math.abs(drag.curY - drag.startY);
      if (w > 2 && h > 2) {
        addElement({
          id: uuidv4(),
          type: 'rectangle',
          userId,
          userName,
          userColor,
          createdAt: Date.now(),
          x: Math.min(drag.startX, drag.curX),
          y: Math.min(drag.startY, drag.curY),
          width: w,
          height: h,
          strokeColor: userColor,
          strokeWidth: brushSize,
        });
      }
    } else if (drag.mode === 'circle') {
      const dx = drag.curX - drag.startX;
      const dy = drag.curY - drag.startY;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > 2) {
        addElement({
          id: uuidv4(),
          type: 'circle',
          userId,
          userName,
          userColor,
          createdAt: Date.now(),
          x: drag.startX,
          y: drag.startY,
          radius: r,
          strokeColor: userColor,
          strokeWidth: brushSize,
        });
      }
    }

    dragRef.current = { mode: 'none' };
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.1 : 0.9;
    const newZoom = Math.max(0.5, Math.min(2, targetZoom * factor));

    const worldX = (mouseX - targetPanOffset.x) / targetZoom;
    const worldY = (mouseY - targetPanOffset.y) / targetZoom;
    const newPanX = mouseX - worldX * newZoom;
    const newPanY = mouseY - worldY * newZoom;

    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useCanvasStore.getState().undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        useCanvasStore.getState().redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'TEXTAREA' || tag === 'INPUT') return;
        const sid = useCanvasStore.getState().selectedNoteId;
        if (sid) {
          e.preventDefault();
          useCanvasStore.getState().deleteElement(sid);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prevent = (e: Event) => e.preventDefault();
    canvas.addEventListener('wheel', prevent, { passive: false });
    return () => canvas.removeEventListener('wheel', prevent);
  }, []);

  const handleNoteSubmit = () => {
    if (tempNoteInput) {
      commitNote(tempNoteInput.x, tempNoteInput.y, noteText);
      setTempNoteInput(null);
      setNoteText('');
    }
  };

  const handleNoteCancel = () => {
    setTempNoteInput(null);
    setNoteText('');
  };

  const cursorStyle = (() => {
    const drag = dragRef.current;
    if (drag.mode === 'pan') return 'grabbing';
    if (tempNoteInput) return 'default';
    if (currentTool === 'note') return 'pointer';
    if (currentTool === 'eraser') return 'crosshair';
    return 'crosshair';
  })();

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 60,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          display: 'block',
          cursor: cursorStyle,
        }}
      />

      {tempNoteInput && (
        <div
          style={{
            position: 'absolute',
            left: panOffset.x + tempNoteInput.x * zoom,
            top: panOffset.y + tempNoteInput.y * zoom,
            width: 180 * zoom,
            height: 100 * zoom,
            background: '#fff9c4',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '2px solid #4fc3f7',
            padding: 8 * zoom,
            transformOrigin: 'top left',
            zIndex: 10,
          }}
        >
          <textarea
            ref={noteTextareaRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={handleNoteSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleNoteCancel();
              } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleNoteSubmit();
              }
            }}
            placeholder="输入便签内容&#10;Ctrl+Enter 提交&#10;Esc 取消"
            style={{
              width: '100%',
              height: '100%',
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14 * zoom,
              fontFamily: 'inherit',
              color: '#333',
              lineHeight: 1.4,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Canvas;
