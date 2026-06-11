import React, { useRef, useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Annotation, AnnotationType, MAX_HISTORY, Point, ToolState } from './types';

interface ImageAnnotatorProps {
  imageUrl: string;
  initialAnnotations: Annotation[];
  tool: ToolState;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  readOnly?: boolean;
}

type HandleType = 'nw' | 'ne' | 'sw' | 'se';

type DragMode =
  | { type: 'none' }
  | { type: 'create'; startX: number; startY: number }
  | { type: 'move'; id: string; offsetX: number; offsetY: number }
  | { type: 'resize'; id: string; handle: HandleType }
  | { type: 'brush-draw'; id: string };

const HANDLE_SIZE = 8;
const HIT_TOLERANCE = 6;

const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({
  imageUrl,
  initialAnnotations,
  tool,
  onAnnotationsChange,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>({ type: 'none' });
  const [tempAnnotation, setTempAnnotation] = useState<Annotation | null>(null);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [notePosition, setNotePosition] = useState({ x: 0, y: 0 });

  const historyRef = useRef<Annotation[][]>([initialAnnotations]);
  const historyIndexRef = useRef(0);

  useEffect(() => {
    setAnnotations(initialAnnotations);
    historyRef.current = [initialAnnotations];
    historyIndexRef.current = 0;
  }, [initialAnnotations]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const pushHistory = useCallback((newAnnotations: Annotation[]) => {
    const nextIndex = historyIndexRef.current + 1;
    historyRef.current = historyRef.current.slice(0, nextIndex);
    historyRef.current.push(JSON.parse(JSON.stringify(newAnnotations)));
    if (historyRef.current.length > MAX_HISTORY + 1) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current = nextIndex;
    }
    setAnnotations(newAnnotations);
    onAnnotationsChange(newAnnotations);
  }, [onAnnotationsChange]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const state = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
    setAnnotations(state);
    onAnnotationsChange(state);
  }, [onAnnotationsChange]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const state = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));
    setAnnotations(state);
    onAnnotationsChange(state);
  }, [onAnnotationsChange]);

  useEffect(() => {
    (window as any).__annotatorUndo = undo;
    (window as any).__annotatorRedo = redo;
    (window as any).__annotatorCanUndo = () => canUndo;
    (window as any).__annotatorCanRedo = () => canRedo;
  }, [undo, redo, canUndo, canRedo]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (readOnly) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        const filtered = annotations.filter((a) => a.id !== selectedId);
        pushHistory(filtered);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo, selectedId, annotations, pushHistory, readOnly]);

  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const img = imageRef.current;

    const updateLayout = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const iw = img.width;
      const ih = img.height;
      const s = Math.min(cw / iw, ch / ih);
      const scaledW = iw * s;
      const scaledH = ih * s;
      setScale(s);
      setOffsetX((cw - scaledW) / 2);
      setOffsetY((ch - scaledH) / 2);
    };

    updateLayout();
    const ro = new ResizeObserver(updateLayout);
    ro.observe(container);
    return () => ro.disconnect();
  }, [imageLoaded]);

  const getImageCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - offsetX) / scale;
      const y = (clientY - rect.top - offsetY) / scale;
      return { x, y };
    },
    [offsetX, offsetY, scale]
  );

  const hitTest = useCallback(
    (pt: Point): string | null => {
      for (let i = annotations.length - 1; i >= 0; i--) {
        const a = annotations[i];
        if (a.type === 'brush' && a.points) {
          for (const p of a.points) {
            const dx = p.x - pt.x;
            const dy = p.y - pt.y;
            if (dx * dx + dy * dy <= (a.strokeWidth + HIT_TOLERANCE) ** 2) {
              return a.id;
            }
          }
        } else {
          const x1 = Math.min(a.x, a.x + a.width);
          const y1 = Math.min(a.y, a.y + a.height);
          const x2 = Math.max(a.x, a.x + a.width);
          const y2 = Math.max(a.y, a.y + a.height);
          if (pt.x >= x1 - HIT_TOLERANCE && pt.x <= x2 + HIT_TOLERANCE && pt.y >= y1 - HIT_TOLERANCE && pt.y <= y2 + HIT_TOLERANCE) {
            return a.id;
          }
        }
      }
      return null;
    },
    [annotations]
  );

  const getResizeHandle = useCallback(
    (pt: Point, a: Annotation): HandleType | null => {
      const x1 = Math.min(a.x, a.x + a.width);
      const y1 = Math.min(a.y, a.y + a.height);
      const x2 = Math.max(a.x, a.x + a.width);
      const y2 = Math.max(a.y, a.y + a.height);
      const tol = HANDLE_SIZE + 4;
      if (Math.abs(pt.x - x1) <= tol && Math.abs(pt.y - y1) <= tol) return 'nw';
      if (Math.abs(pt.x - x2) <= tol && Math.abs(pt.y - y1) <= tol) return 'ne';
      if (Math.abs(pt.x - x1) <= tol && Math.abs(pt.y - y2) <= tol) return 'sw';
      if (Math.abs(pt.x - x2) <= tol && Math.abs(pt.y - y2) <= tol) return 'se';
      return null;
    },
    []
  );

  const drawArrowHead = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 12 + ctx.lineWidth * 2;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  const drawAnnotation = useCallback(
    (ctx: CanvasRenderingContext2D, a: Annotation, isSelected: boolean) => {
      ctx.save();
      ctx.strokeStyle = a.color;
      ctx.lineWidth = a.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (a.type === 'rectangle') {
        ctx.strokeRect(a.x, a.y, a.width, a.height);
      } else if (a.type === 'circle') {
        const cx = a.x + a.width / 2;
        const cy = a.y + a.height / 2;
        const rx = Math.abs(a.width) / 2;
        const ry = Math.abs(a.height) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (a.type === 'arrow') {
        const x1 = a.x;
        const y1 = a.y;
        const x2 = a.x + a.width;
        const y2 = a.y + a.height;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        drawArrowHead(ctx, x1, y1, x2, y2);
      } else if (a.type === 'brush' && a.points && a.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(a.points[0].x, a.points[0].y);
        for (let i = 1; i < a.points.length; i++) {
          ctx.lineTo(a.points[i].x, a.points[i].y);
        }
        ctx.stroke();
      }

      if (isSelected && a.type !== 'brush') {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#4a90d9';
        ctx.lineWidth = 1.5;
        const x1 = Math.min(a.x, a.x + a.width);
        const y1 = Math.min(a.y, a.y + a.height);
        const w = Math.abs(a.width);
        const h = Math.abs(a.height);
        ctx.strokeRect(x1 - 4, y1 - 4, w + 8, h + 8);

        ctx.setLineDash([]);
        ctx.fillStyle = '#4a90d9';
        const corners = [
          [x1, y1],
          [x1 + w, y1],
          [x1, y1 + h],
          [x1 + w, y1 + h],
        ];
        for (const [hx, hy] of corners) {
          ctx.fillRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        }
      }

      ctx.restore();
    },
    []
  );

  useEffect(() => {
    if (!canvasRef.current || !imageLoaded || !imageRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    for (const a of annotations) {
      drawAnnotation(ctx, a, a.id === selectedId);
    }
    if (tempAnnotation) {
      drawAnnotation(ctx, tempAnnotation, false);
    }
  }, [annotations, tempAnnotation, selectedId, imageLoaded, drawAnnotation]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    const pt = getImageCoords(e.clientX, e.clientY);

    if (tool.type === 'select') {
      const selected = annotations.find((a) => a.id === selectedId);
      if (selected) {
        const handle = getResizeHandle(pt, selected);
        if (handle) {
          setDragMode({ type: 'resize', id: selectedId!, handle });
          return;
        }
      }
      const hit = hitTest(pt);
      if (hit) {
        const hitAnn = annotations.find((a) => a.id === hit)!;
        setSelectedId(hit);
        setDragMode({
          type: 'move',
          id: hit,
          offsetX: pt.x - hitAnn.x,
          offsetY: pt.y - hitAnn.y,
        });
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (tool.type === 'brush') {
      const newAnn: Annotation = {
        id: uuidv4(),
        type: 'brush',
        x: pt.x,
        y: pt.y,
        width: 0,
        height: 0,
        points: [{ x: pt.x, y: pt.y }],
        color: tool.color,
        strokeWidth: tool.strokeWidth,
      };
      setDragMode({ type: 'brush-draw', id: newAnn.id });
      setTempAnnotation(newAnn);
    } else {
      setDragMode({ type: 'create', startX: pt.x, startY: pt.y });
      setTempAnnotation({
        id: uuidv4(),
        type: tool.type as AnnotationType,
        x: pt.x,
        y: pt.y,
        width: 0,
        height: 0,
        color: tool.color,
        strokeWidth: tool.strokeWidth,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (readOnly) return;
    const pt = getImageCoords(e.clientX, e.clientY);

    if (dragMode.type === 'create' && tempAnnotation) {
      setTempAnnotation({
        ...tempAnnotation,
        width: pt.x - dragMode.startX,
        height: pt.y - dragMode.startY,
      });
    } else if (dragMode.type === 'brush-draw' && tempAnnotation && tempAnnotation.points) {
      const newPoints = [...tempAnnotation.points, { x: pt.x, y: pt.y }];
      const xs = newPoints.map((p) => p.x);
      const ys = newPoints.map((p) => p.y);
      setTempAnnotation({
        ...tempAnnotation,
        points: newPoints,
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      });
    } else if (dragMode.type === 'move') {
      const updated = annotations.map((a) =>
        a.id === dragMode.id
          ? { ...a, x: pt.x - dragMode.offsetX, y: pt.y - dragMode.offsetY }
          : a
      );
      setAnnotations(updated);
    } else if (dragMode.type === 'resize') {
      const updated = annotations.map((a) => {
        if (a.id !== dragMode.id) return a;
        const origX1 = a.x;
        const origY1 = a.y;
        const origX2 = a.x + a.width;
        const origY2 = a.y + a.height;
        let nx1 = origX1, ny1 = origY1, nx2 = origX2, ny2 = origY2;
        if (dragMode.handle === 'nw') { nx1 = pt.x; ny1 = pt.y; }
        if (dragMode.handle === 'ne') { nx2 = pt.x; ny1 = pt.y; }
        if (dragMode.handle === 'sw') { nx1 = pt.x; ny2 = pt.y; }
        if (dragMode.handle === 'se') { nx2 = pt.x; ny2 = pt.y; }
        return { ...a, x: nx1, y: ny1, width: nx2 - nx1, height: ny2 - ny1 };
      });
      setAnnotations(updated);
    }

    if (tool.type === 'select') {
      const hit = hitTest(pt);
      const selected = annotations.find((a) => a.id === selectedId);
      let cursor = 'crosshair';
      if (selected) {
        const handle = getResizeHandle(pt, selected);
        if (handle === 'nw' || handle === 'se') cursor = 'nwse-resize';
        else if (handle === 'ne' || handle === 'sw') cursor = 'nesw-resize';
        else if (hit) cursor = 'move';
      } else if (hit) {
        cursor = 'move';
      }
      if (canvasRef.current) canvasRef.current.style.cursor = cursor;
    }
  };

  const handleMouseUp = () => {
    if (readOnly) return;
    if (dragMode.type === 'create' || dragMode.type === 'brush-draw') {
      if (tempAnnotation) {
        const isValid =
          tempAnnotation.type === 'brush'
            ? (tempAnnotation.points?.length || 0) > 1
            : Math.abs(tempAnnotation.width) > 2 || Math.abs(tempAnnotation.height) > 2;
        if (isValid) {
          pushHistory([...annotations, tempAnnotation]);
          setSelectedId(tempAnnotation.id);
        }
      }
      setTempAnnotation(null);
    } else if (dragMode.type === 'move' || dragMode.type === 'resize') {
      pushHistory(annotations);
    }
    setDragMode({ type: 'none' });
  };

  const lastClickRef = useRef<{ id: string; time: number } | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    const pt = getImageCoords(e.clientX, e.clientY);
    const hit = hitTest(pt);
    const now = Date.now();

    if (hit) {
      if (lastClickRef.current && lastClickRef.current.id === hit && now - lastClickRef.current.time < 400) {
        const ann = annotations.find((a) => a.id === hit);
        if (ann) {
          setEditingNoteId(hit);
          setNoteInput(ann.note || '');
          setNotePosition({
            x: offsetX + (ann.x + ann.width / 2) * scale,
            y: offsetY + Math.min(ann.y, ann.y + ann.height) * scale - 10,
          });
        }
        lastClickRef.current = null;
      } else {
        lastClickRef.current = { id: hit, time: now };
      }
    } else {
      lastClickRef.current = null;
    }
  };

  const saveNote = () => {
    if (!editingNoteId) return;
    const updated = annotations.map((a) =>
      a.id === editingNoteId ? { ...a, note: noteInput.slice(0, 100) } : a
    );
    pushHistory(updated);
    setEditingNoteId(null);
  };

  return (
    <div className="annotator-container" ref={containerRef}>
      {imageLoaded && (
        <canvas
          ref={canvasRef}
          className="annotator-canvas"
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            transformOrigin: '0 0',
            cursor: readOnly ? 'default' : tool.type === 'select' ? 'crosshair' : 'crosshair',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
        />
      )}
      {!imageLoaded && <div className="loading-spinner">加载中...</div>}

      {annotations.map((a) =>
        a.note ? (
          <div
            key={`note-${a.id}`}
            className="note-badge"
            style={{
              left: offsetX + (a.x + a.width / 2) * scale,
              top: offsetY + Math.min(a.y, a.y + a.height) * scale - 14,
              backgroundColor: a.color,
            }}
            title={a.note}
          >
            💬
          </div>
        ) : null
      )}

      {editingNoteId && (
        <div
          className="note-editor glass"
          style={{
            left: Math.max(10, notePosition.x - 120),
            top: Math.max(10, notePosition.y - 80),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value.slice(0, 100))}
            placeholder="添加备注（最多100字）"
            maxLength={100}
            autoFocus
            className="note-input"
          />
          <div className="note-footer">
            <span className="note-counter">{noteInput.length}/100</span>
            <div>
              <button className="note-btn cancel" onClick={() => setEditingNoteId(null)}>
                取消
              </button>
              <button className="note-btn confirm" onClick={saveNote}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageAnnotator;
