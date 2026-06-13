import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Point, Stroke } from '@/types';

interface CanvasProps {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 800;
const SAMPLE_INTERVAL = 100;

export default function Canvas({ onCanvasReady }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentPointsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const lastSampleTimeRef = useRef(0);
  const lastRenderedIndexRef = useRef(0);
  const [transitioning, setTransitioning] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: CANVAS_WIDTH, h: CANVAS_HEIGHT });

  const strokes = useAppStore((s) => s.strokes);
  const currentColor = useAppStore((s) => s.currentColor);
  const currentWidth = useAppStore((s) => s.currentWidth);
  const isEraser = useAppStore((s) => s.isEraser);
  const eraserSize = useAppStore((s) => s.eraserSize);
  const addStroke = useAppStore((s) => s.addStroke);
  const setIsDrawing = useAppStore((s) => s.setIsDrawing);

  useEffect(() => {
    function updateSize() {
      if (window.innerWidth < 768) {
        setCanvasSize({
          w: window.innerWidth,
          h: window.innerHeight - 60,
        });
      } else {
        setCanvasSize({ w: CANVAS_WIDTH, h: CANVAS_HEIGHT });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    setTransitioning(true);
    const t = setTimeout(() => setTransitioning(false), 300);
    return () => clearTimeout(t);
  }, [strokes.length]);

  const renderAllStrokes = useCallback((ctx: CanvasRenderingContext2D, strokeList: Stroke[], clearFirst = true) => {
    if (clearFirst) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokeList) {
      drawBezierStroke(ctx, stroke);
    }
  }, []);

  const drawBezierStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const pts = stroke.points;
    if (pts.length === 0) return;

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = (stroke.eraserSize ?? 20) * 2;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = stroke.width;
      ctx.strokeStyle = stroke.color;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    if (pts.length === 1) {
      ctx.lineTo(pts[0].x + 0.01, pts[0].y + 0.01);
    } else if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
    } else {
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderAllStrokes(ctx, strokes);
    if (onCanvasReady) onCanvasReady(canvas);
  }, [strokes, renderAllStrokes, onCanvasReady, canvasSize.w, canvasSize.h]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    renderAllStrokes(ctx, strokes);
  }, [canvasSize, renderAllStrokes, strokes]);

  const getPointFromEvent = useCallback((e: MouseEvent | TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      timestamp: Date.now(),
    };
  }, []);

  const renderIncremental = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pts = currentPointsRef.current;
    if (pts.length - lastRenderedIndexRef.current < 2) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize * 2;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = currentWidth;
      ctx.strokeStyle = currentColor;
    }

    const startIdx = Math.max(0, lastRenderedIndexRef.current - 1);
    const segment = pts.slice(startIdx);
    if (segment.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(segment[0].x, segment[0].y);
      for (let i = 1; i < segment.length - 1; i++) {
        const midX = (segment[i].x + segment[i + 1].x) / 2;
        const midY = (segment[i].y + segment[i + 1].y) / 2;
        ctx.quadraticCurveTo(segment[i].x, segment[i].y, midX, midY);
      }
      const last = segment[segment.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    lastRenderedIndexRef.current = pts.length - 1;
  }, [isEraser, eraserSize, currentWidth, currentColor]);

  const handleStart = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const point = getPointFromEvent(e);
    if (!point) return;
    isDrawingRef.current = true;
    currentPointsRef.current = [point];
    lastRenderedIndexRef.current = 0;
    lastSampleTimeRef.current = point.timestamp;
    setIsDrawing(true);
  }, [getPointFromEvent, setIsDrawing]);

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const point = getPointFromEvent(e);
    if (!point) return;
    const now = point.timestamp;
    const pts = currentPointsRef.current;

    if (now - lastSampleTimeRef.current >= SAMPLE_INTERVAL || pts.length < 2) {
      pts.push(point);
      lastSampleTimeRef.current = now;
    } else {
      pts[pts.length - 1] = point;
    }
    renderIncremental();
  }, [getPointFromEvent, renderIncremental]);

  const handleEnd = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);

    const pts = currentPointsRef.current;
    if (pts.length === 0) return;

    if (isEraser) {
      applyEraserToStrokes(pts);
    } else {
      const stroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        color: currentColor,
        width: currentWidth,
        isEraser: false,
        points: pts,
      };
      addStroke(stroke);
    }

    currentPointsRef.current = [];
    lastRenderedIndexRef.current = 0;
  }, [isEraser, currentColor, currentWidth, addStroke, setIsDrawing, strokes]);

  const applyEraserToStrokes = useCallback((eraserPts: Point[]) => {
    const currentStrokes = useAppStore.getState().strokes;
    const size = eraserSize;
    const newStrokes: Stroke[] = [];

    for (const stroke of currentStrokes) {
      if (stroke.isEraser) continue;
      const segments: Point[][] = splitStrokeByEraser(stroke.points, eraserPts, size);
      for (const seg of segments) {
        if (seg.length > 0) {
          newStrokes.push({
            ...stroke,
            id: seg.length === stroke.points.length
              ? stroke.id
              : `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            points: seg,
          });
        }
      }
    }

    const undoStack = useAppStore.getState().undoStack;
    const newUndoStack = [...undoStack, currentStrokes].slice(-50);
    useAppStore.setState({
      strokes: newStrokes,
      undoStack: newUndoStack,
      redoStack: [],
    });
  }, [eraserSize]);

  const splitStrokeByEraser = (strokePts: Point[], eraserPts: Point[], eraserSize: number): Point[][] => {
    const segments: Point[][] = [];
    let currentSeg: Point[] = [];
    const radius = eraserSize;

    const isInEraser = (x: number, y: number): boolean => {
      for (const ep of eraserPts) {
        const dx = x - ep.x;
        const dy = y - ep.y;
        if (dx * dx + dy * dy <= radius * radius) return true;
      }
      return false;
    };

    const lineIntersectsCircle = (x1: number, y1: number, x2: number, y2: number): boolean => {
      if (isInEraser(x1, y1) || isInEraser(x2, y2)) return true;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return false;
      for (const ep of eraserPts) {
        const t = Math.max(0, Math.min(1, ((ep.x - x1) * dx + (ep.y - y1) * dy) / lenSq));
        const px = x1 + t * dx;
        const py = y1 + t * dy;
        const ddx = px - ep.x;
        const ddy = py - ep.y;
        if (ddx * ddx + ddy * ddy <= radius * radius) return true;
      }
      return false;
    };

    if (strokePts.length === 0) return segments;

    let inSegment = !isInEraser(strokePts[0].x, strokePts[0].y);
    if (inSegment) currentSeg.push(strokePts[0]);

    for (let i = 1; i < strokePts.length; i++) {
      const p = strokePts[i];
      const prev = strokePts[i - 1];
      const intersects = lineIntersectsCircle(prev.x, prev.y, p.x, p.y);
      const pInside = isInEraser(p.x, p.y);

      if (intersects && !pInside) {
        if (!inSegment) {
          inSegment = true;
          currentSeg = [p];
        } else {
          currentSeg.push(p);
        }
      } else if (intersects && pInside) {
        if (inSegment) {
          if (currentSeg.length > 0) segments.push(currentSeg);
          currentSeg = [];
          inSegment = false;
        }
      } else if (!intersects && !pInside) {
        if (inSegment) currentSeg.push(p);
      }
    }

    if (currentSeg.length > 0) segments.push(currentSeg);
    return segments;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => handleStart(e);
    const onMouseMove = (e: MouseEvent) => handleMove(e);
    const onMouseUp = () => handleEnd();
    const onMouseLeave = () => handleEnd();
    const onTouchStart = (e: TouchEvent) => handleStart(e);
    const onTouchMove = (e: TouchEvent) => handleMove(e);
    const onTouchEnd = (e: TouchEvent) => { e.preventDefault(); handleEnd(); };
    const onTouchCancel = (e: TouchEvent) => { e.preventDefault(); handleEnd(); };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchCancel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [handleStart, handleMove, handleEnd]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full overflow-auto p-4"
    >
      <div
        className="relative shadow-lg"
        style={{
          border: '10px solid #e5e5e5',
          borderRadius: '4px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="block touch-none"
          style={{
            width: canvasSize.w,
            height: canvasSize.h,
            background: '#FDF5E6',
            opacity: transitioning ? 0.6 : 1,
            transition: 'opacity 0.3s ease',
            cursor: isEraser ? 'crosshair' : 'crosshair',
          }}
        />
      </div>
    </div>
  );
}
