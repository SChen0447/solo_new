import { useRef, useEffect, useCallback } from 'react';
import { useAppStore, type Point } from '@/store/useAppStore';
import { recognizeShape } from '@/utils/shapeRecognizer';

const CANVAS_W = 800;
const CANVAS_H = 600;
const GRID_COLOR = '#ddd';
const BG_COLOR = '#f5f5f5';
const STROKE_COLOR = '#2c3e50';
const STROKE_WIDTH = 3;

const SHAPE_OVERLAYS: Record<string, string> = {
  rectangle: 'rgba(52,152,219,0.3)',
  circle: 'rgba(46,204,113,0.3)',
  text: 'rgba(243,156,18,0.3)',
};

const SHAPE_BORDERS: Record<string, string> = {
  rectangle: 'rgba(52,152,219,0.8)',
  circle: 'rgba(46,204,113,0.8)',
  text: 'rgba(243,156,18,0.8)',
};

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  for (let x = 0; x <= CANVAS_W; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, CANVAS_H);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_H; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(CANVAS_W, y + 0.5);
    ctx.stroke();
  }
}

function drawShapeOverlay(ctx: CanvasRenderingContext2D, shape: { type: string; x: number; y: number; width: number; height: number }, isSelected: boolean) {
  const fillColor = SHAPE_OVERLAYS[shape.type] ?? 'rgba(0,0,0,0.2)';
  const borderColor = SHAPE_BORDERS[shape.type] ?? 'rgba(0,0,0,0.5)';

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = isSelected ? '#e74c3c' : borderColor;
  ctx.lineWidth = isSelected ? 2 : 1.5;

  if (isSelected) {
    ctx.setLineDash([6, 4]);
  } else {
    ctx.setLineDash([]);
  }

  if (shape.type === 'circle') {
    const rx = shape.width / 2;
    const ry = shape.height / 2;
    const cx = shape.x + rx;
    const cy = shape.y + ry;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.rect(shape.x, shape.y, shape.width, shape.height);
    ctx.fill();
    ctx.stroke();
  }

  if (shape.type === 'text') {
    ctx.fillStyle = 'rgba(243,156,18,0.9)';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('T', shape.x + 6, shape.y + 16);
  }

  ctx.setLineDash([]);
}

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const recognitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shapes = useAppStore((s) => s.shapes);
  const selectedShapeId = useAppStore((s) => s.selectedShapeId);
  const addShape = useAppStore((s) => s.addShape);
  const selectShape = useAppStore((s) => s.selectShape);
  const setIsDrawing = useAppStore((s) => s.setIsDrawing);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGrid(ctx);

    for (const shape of shapes) {
      drawShapeOverlay(ctx, shape, shape.id === selectedShapeId);
    }

    const stroke = currentStrokeRef.current;
    if (stroke.length > 1) {
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = STROKE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }, [shapes, selectedShapeId]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleRecognition = useCallback(() => {
    const stroke = currentStrokeRef.current;
    if (stroke.length < 3) {
      currentStrokeRef.current = [];
      redraw();
      return;
    }

    const result = recognizeShape(stroke);
    addShape({
      type: result.type,
      x: result.x,
      y: result.y,
      width: result.width,
      height: result.height,
      points: [...stroke],
      style: {
        backgroundColor: result.type === 'text' ? '#ffffff' : '#e8e8e8',
        borderRadius: result.type === 'circle' ? 50 : result.type === 'text' ? 4 : 0,
      },
      text: result.text,
    });
    currentStrokeRef.current = [];
  }, [addShape, redraw]);

  const handlePointerDown = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      e.preventDefault();
    }

    if (recognitionTimerRef.current) {
      clearTimeout(recognitionTimerRef.current);
      recognitionTimerRef.current = null;
    }

    const pt = getCanvasPoint(e);
    const clickedShape = [...shapes].reverse().find((s) =>
      pt.x >= s.x && pt.x <= s.x + s.width && pt.y >= s.y && pt.y <= s.y + s.height
    );

    if (clickedShape && !('touches' in e ? e.touches.length > 0 : (e as React.MouseEvent).buttons > 0)) {
      selectShape(clickedShape.id === selectedShapeId ? null : clickedShape.id);
      return;
    }

    isDrawingRef.current = true;
    setIsDrawing(true);
    currentStrokeRef.current = [pt];
    selectShape(null);
  }, [getCanvasPoint, shapes, selectedShapeId, selectShape, setIsDrawing]);

  const handlePointerMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if ('touches' in e) {
      e.preventDefault();
    }
    const pt = getCanvasPoint(e);
    currentStrokeRef.current.push(pt);
    redraw();
  }, [getCanvasPoint, redraw]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);

    if (recognitionTimerRef.current) {
      clearTimeout(recognitionTimerRef.current);
    }
    recognitionTimerRef.current = setTimeout(() => {
      handleRecognition();
    }, 500);
  }, [handleRecognition, setIsDrawing]);

  useEffect(() => {
    return () => {
      if (recognitionTimerRef.current) {
        clearTimeout(recognitionTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex items-center justify-center p-4 h-full">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="border border-gray-200 rounded-lg shadow-sm cursor-crosshair max-w-full max-h-full"
        style={{ touchAction: 'none' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
    </div>
  );
}
