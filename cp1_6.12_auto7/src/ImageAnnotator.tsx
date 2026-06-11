import React, { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Annotation, AnnotationType, MAX_HISTORY, Point, ToolState } from './types';

interface ImageAnnotatorProps {
  imageUrl: string;
  initialAnnotations: Annotation[];
  tool: ToolState;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  readOnly?: boolean;
}

export interface ImageAnnotatorHandle {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getAnnotations: () => Annotation[];
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

const cloneAnnotations = (anns: Annotation[]): Annotation[] =>
  anns.map((a) => ({
    ...a,
    points: a.points ? a.points.map((p) => ({ ...p })) : undefined,
  }));

const ImageAnnotatorInner = forwardRef<ImageAnnotatorHandle, ImageAnnotatorProps>(
  ({ imageUrl, initialAnnotations, tool, onAnnotationsChange, readOnly = false }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const [imageLoaded, setImageLoaded] = useState(false);
    const [scale, setScale] = useState(1);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteInput, setNoteInput] = useState('');
    const [notePosition, setNotePosition] = useState({ x: 0, y: 0 });

    const annotationsRef = useRef<Annotation[]>(cloneAnnotations(initialAnnotations));
    const tempAnnotationRef = useRef<Annotation | null>(null);
    const dragModeRef = useRef<DragMode>({ type: 'none' });
    const historyRef = useRef<Annotation[][]>([cloneAnnotations(initialAnnotations)]);
    const historyIndexRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const dirtyRef = useRef(true);

    const lastClickRef = useRef<{ id: string; time: number } | null>(null);

    useEffect(() => {
      annotationsRef.current = cloneAnnotations(initialAnnotations);
      historyRef.current = [cloneAnnotations(initialAnnotations)];
      historyIndexRef.current = 0;
      dirtyRef.current = true;
    }, [initialAnnotations]);

    const pushHistory = useCallback(() => {
      const nextIndex = historyIndexRef.current + 1;
      historyRef.current = historyRef.current.slice(0, nextIndex);
      historyRef.current.push(cloneAnnotations(annotationsRef.current));
      if (historyRef.current.length > MAX_HISTORY + 1) {
        historyRef.current.shift();
      } else {
        historyIndexRef.current = nextIndex;
      }
      onAnnotationsChange(cloneAnnotations(annotationsRef.current));
      dirtyRef.current = true;
    }, [onAnnotationsChange]);

    const setAnnotations = useCallback((anns: Annotation[], pushToHistory = false) => {
      annotationsRef.current = anns;
      if (pushToHistory) {
        pushHistory();
      } else {
        onAnnotationsChange(cloneAnnotations(anns));
        dirtyRef.current = true;
      }
    }, [onAnnotationsChange, pushHistory]);

    const canUndo = useCallback(() => historyIndexRef.current > 0, []);
    const canRedo = useCallback(() => historyIndexRef.current < historyRef.current.length - 1, []);

    const undo = useCallback(() => {
      if (historyIndexRef.current <= 0) return;
      historyIndexRef.current--;
      annotationsRef.current = cloneAnnotations(historyRef.current[historyIndexRef.current]);
      onAnnotationsChange(cloneAnnotations(annotationsRef.current));
      setSelectedId(null);
      dirtyRef.current = true;
    }, [onAnnotationsChange]);

    const redo = useCallback(() => {
      if (historyIndexRef.current >= historyRef.current.length - 1) return;
      historyIndexRef.current++;
      annotationsRef.current = cloneAnnotations(historyRef.current[historyIndexRef.current]);
      onAnnotationsChange(cloneAnnotations(annotationsRef.current));
      setSelectedId(null);
      dirtyRef.current = true;
    }, [onAnnotationsChange]);

    useImperativeHandle(ref, () => ({
      undo,
      redo,
      canUndo,
      canRedo,
      getAnnotations: () => cloneAnnotations(annotationsRef.current),
    }), [undo, redo, canUndo, canRedo]);

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
          const filtered = annotationsRef.current.filter((a) => a.id !== selectedId);
          setAnnotations(filtered, true);
          setSelectedId(null);
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }, [undo, redo, selectedId, setAnnotations, readOnly]);

    useEffect(() => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }
        offscreenCanvasRef.current.width = img.width;
        offscreenCanvasRef.current.height = img.height;
        const octx = offscreenCanvasRef.current.getContext('2d');
        if (octx) octx.drawImage(img, 0, 0);
        setImageLoaded(true);
      };
      img.src = imageUrl;
    }, [imageUrl]);

    useEffect(() => {
      if (!imageLoaded || !imageRef.current || !containerRef.current) return;
      const container = containerRef.current;
      const img = imageRef.current;

      const updateLayout = () => {
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const iw = img.width;
        const ih = img.height;
        const s = Math.min(cw / iw, ch / ih, 1);
        const scaledW = iw * s;
        const scaledH = ih * s;
        setScale(s);
        setOffsetX(Math.max(0, (cw - scaledW) / 2));
        setOffsetY(Math.max(0, (ch - scaledH) / 2));
        dirtyRef.current = true;
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

    const hitTest = useCallback((pt: Point): string | null => {
      const anns = annotationsRef.current;
      for (let i = anns.length - 1; i >= 0; i--) {
        const a = anns[i];
        if (a.type === 'brush' && a.points) {
          const tol = (a.strokeWidth + HIT_TOLERANCE) ** 2;
          for (const p of a.points) {
            const dx = p.x - pt.x;
            const dy = p.y - pt.y;
            if (dx * dx + dy * dy <= tol) return a.id;
          }
        } else {
          const x1 = Math.min(a.x, a.x + a.width);
          const y1 = Math.min(a.y, a.y + a.height);
          const x2 = Math.max(a.x, a.x + a.width);
          const y2 = Math.max(a.y, a.y + a.height);
          if (pt.x >= x1 - HIT_TOLERANCE && pt.x <= x2 + HIT_TOLERANCE &&
              pt.y >= y1 - HIT_TOLERANCE && pt.y <= y2 + HIT_TOLERANCE) {
            return a.id;
          }
        }
      }
      return null;
    }, []);

    const getResizeHandle = useCallback((pt: Point, a: Annotation): HandleType | null => {
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
    }, []);

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

    const render = useCallback(() => {
      if (!canvasRef.current || !imageRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = imageRef.current;
      if (canvas.width !== img.width) canvas.width = img.width;
      if (canvas.height !== img.height) canvas.height = img.height;

      if (offscreenCanvasRef.current) {
        ctx.drawImage(offscreenCanvasRef.current, 0, 0);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }

      const anns = annotationsRef.current;
      for (let i = 0; i < anns.length; i++) {
        const a = anns[i];
        const isSelected = a.id === selectedId;
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
          for (let j = 1; j < a.points.length; j++) {
            ctx.lineTo(a.points[j].x, a.points[j].y);
          }
          ctx.stroke();
        }

        if (isSelected && !readOnly) {
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
          const corners: [number, number][] = [
            [x1, y1], [x1 + w, y1], [x1, y1 + h], [x1 + w, y1 + h],
          ];
          for (const [hx, hy] of corners) {
            ctx.fillRect(hx - HANDLE_SIZE / 2, hy - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
          }
        }
        ctx.restore();
      }

      const temp = tempAnnotationRef.current;
      if (temp) {
        ctx.save();
        ctx.strokeStyle = temp.color;
        ctx.lineWidth = temp.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (temp.type === 'rectangle') {
          ctx.strokeRect(temp.x, temp.y, temp.width, temp.height);
        } else if (temp.type === 'circle') {
          const cx = temp.x + temp.width / 2;
          const cy = temp.y + temp.height / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.abs(temp.width) / 2, Math.abs(temp.height) / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (temp.type === 'arrow') {
          ctx.beginPath();
          ctx.moveTo(temp.x, temp.y);
          ctx.lineTo(temp.x + temp.width, temp.y + temp.height);
          ctx.stroke();
          drawArrowHead(ctx, temp.x, temp.y, temp.x + temp.width, temp.y + temp.height);
        } else if (temp.type === 'brush' && temp.points && temp.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(temp.points[0].x, temp.points[0].y);
          for (let j = 1; j < temp.points.length; j++) {
            ctx.lineTo(temp.points[j].x, temp.points[j].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      dirtyRef.current = false;
    }, [selectedId, readOnly]);

    useEffect(() => {
      if (!imageLoaded) return;
      const tick = () => {
        if (dirtyRef.current) render();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    }, [imageLoaded, render]);

    useEffect(() => {
      dirtyRef.current = true;
    }, [selectedId]);

    const handleMouseDown = (e: React.MouseEvent) => {
      if (readOnly) return;
      const pt = getImageCoords(e.clientX, e.clientY);

      if (tool.type === 'select') {
        const selected = annotationsRef.current.find((a) => a.id === selectedId);
        if (selected) {
          const handle = getResizeHandle(pt, selected);
          if (handle) {
            dragModeRef.current = { type: 'resize', id: selectedId!, handle };
            return;
          }
        }
        const hit = hitTest(pt);
        if (hit) {
          const hitAnn = annotationsRef.current.find((a) => a.id === hit)!;
          setSelectedId(hit);
          dragModeRef.current = {
            type: 'move',
            id: hit,
            offsetX: pt.x - hitAnn.x,
            offsetY: pt.y - hitAnn.y,
          };
        } else {
          setSelectedId(null);
        }
        return;
      }

      if (tool.type === 'brush') {
        tempAnnotationRef.current = {
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
        dragModeRef.current = { type: 'brush-draw', id: tempAnnotationRef.current.id };
      } else {
        tempAnnotationRef.current = {
          id: uuidv4(),
          type: tool.type as AnnotationType,
          x: pt.x,
          y: pt.y,
          width: 0,
          height: 0,
          color: tool.color,
          strokeWidth: tool.strokeWidth,
        };
        dragModeRef.current = { type: 'create', startX: pt.x, startY: pt.y };
      }
      dirtyRef.current = true;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (readOnly) return;
      const pt = getImageCoords(e.clientX, e.clientY);
      const dm = dragModeRef.current;

      if (dm.type === 'create' && tempAnnotationRef.current) {
        tempAnnotationRef.current.width = pt.x - dm.startX;
        tempAnnotationRef.current.height = pt.y - dm.startY;
        dirtyRef.current = true;
      } else if (dm.type === 'brush-draw' && tempAnnotationRef.current && tempAnnotationRef.current.points) {
        tempAnnotationRef.current.points.push({ x: pt.x, y: pt.y });
        const xs = tempAnnotationRef.current.points.map((p) => p.x);
        const ys = tempAnnotationRef.current.points.map((p) => p.y);
        tempAnnotationRef.current.x = Math.min(...xs);
        tempAnnotationRef.current.y = Math.min(...ys);
        tempAnnotationRef.current.width = Math.max(...xs) - Math.min(...xs);
        tempAnnotationRef.current.height = Math.max(...ys) - Math.min(...ys);
        dirtyRef.current = true;
      } else if (dm.type === 'move') {
        annotationsRef.current = annotationsRef.current.map((a) =>
          a.id === dm.id ? { ...a, x: pt.x - dm.offsetX, y: pt.y - dm.offsetY } : a
        );
        dirtyRef.current = true;
      } else if (dm.type === 'resize') {
        annotationsRef.current = annotationsRef.current.map((a) => {
          if (a.id !== dm.id) return a;
          const origX1 = a.x;
          const origY1 = a.y;
          const origX2 = a.x + a.width;
          const origY2 = a.y + a.height;
          let nx1 = origX1, ny1 = origY1, nx2 = origX2, ny2 = origY2;
          if (dm.handle === 'nw') { nx1 = pt.x; ny1 = pt.y; }
          if (dm.handle === 'ne') { nx2 = pt.x; ny1 = pt.y; }
          if (dm.handle === 'sw') { nx1 = pt.x; ny2 = pt.y; }
          if (dm.handle === 'se') { nx2 = pt.x; ny2 = pt.y; }
          return { ...a, x: nx1, y: ny1, width: nx2 - nx1, height: ny2 - ny1 };
        });
        dirtyRef.current = true;
      }

      if (tool.type === 'select' && dm.type === 'none') {
        const hit = hitTest(pt);
        const selected = annotationsRef.current.find((a) => a.id === selectedId);
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
      const dm = dragModeRef.current;
      if (dm.type === 'create' || dm.type === 'brush-draw') {
        const temp = tempAnnotationRef.current;
        if (temp) {
          const isValid =
            temp.type === 'brush'
              ? (temp.points?.length || 0) > 1
              : Math.abs(temp.width) > 2 || Math.abs(temp.height) > 2;
          if (isValid) {
            annotationsRef.current.push({ ...temp });
            pushHistory();
            setSelectedId(temp.id);
          }
        }
        tempAnnotationRef.current = null;
      } else if (dm.type === 'move' || dm.type === 'resize') {
        pushHistory();
      }
      dragModeRef.current = { type: 'none' };
      dirtyRef.current = true;
    };

    const handleClick = (e: React.MouseEvent) => {
      if (readOnly) return;
      const pt = getImageCoords(e.clientX, e.clientY);
      const hit = hitTest(pt);
      const now = Date.now();

      if (hit) {
        if (lastClickRef.current && lastClickRef.current.id === hit && now - lastClickRef.current.time < 400) {
          const ann = annotationsRef.current.find((a) => a.id === hit);
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
      annotationsRef.current = annotationsRef.current.map((a) =>
        a.id === editingNoteId ? { ...a, note: noteInput.slice(0, 100) } : a
      );
      pushHistory();
      setEditingNoteId(null);
    };

    const noteBadges = useMemo(() => {
      return annotationsRef.current
        .filter((a) => a.note)
        .map((a) => ({
          id: a.id,
          x: offsetX + (a.x + a.width / 2) * scale,
          y: offsetY + Math.min(a.y, a.y + a.height) * scale - 14,
          color: a.color,
          note: a.note!,
        }));
    }, [offsetX, offsetY, scale, selectedId, imageLoaded]);

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

        {noteBadges.map((n) => (
          <div
            key={`note-${n.id}`}
            className="note-badge"
            style={{ left: n.x, top: n.y, backgroundColor: n.color }}
            title={n.note}
          >
            💬
          </div>
        ))}

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
  }
);

ImageAnnotatorInner.displayName = 'ImageAnnotator';
const ImageAnnotator = ImageAnnotatorInner;
export default ImageAnnotator;
