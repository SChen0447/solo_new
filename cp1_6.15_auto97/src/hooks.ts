import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from './store';
import {
  WARM_COLORS,
  SHAPE_TYPES,
  MIN_RADIUS,
  MAX_RADIUS,
  MIN_INTERVAL,
  MAX_INTERVAL,
  ANIMATION_DURATION,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './types';
import type { Shape } from './types';
import {
  randomItem,
  generateId,
  getComplementaryColor,
  clamp,
  mapRange,
  easeOutCubic,
} from './utils';

export function useKeyboard(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const addShape = useCanvasStore((state) => state.addShape);
  const setBrushSize = useCanvasStore((state) => state.setBrushSize);
  const clearShapes = useCanvasStore((state) => state.clearShapes);
  const brushSize = useCanvasStore((state) => state.brushSize);
  const lastClickTime = useCanvasStore((state) => state.lastClickTime);
  const saveToHistory = useCanvasStore((state) => state.saveToHistory);
  const shapes = useCanvasStore((state) => state.shapes);

  const handleGenerateShape = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      const interval = lastClickTime ? now - lastClickTime : MAX_INTERVAL;
      const clampedInterval = clamp(interval, MIN_INTERVAL, MAX_INTERVAL);
      const radius = mapRange(
        clampedInterval,
        MIN_INTERVAL,
        MAX_INTERVAL,
        MAX_RADIUS,
        MIN_RADIUS
      );
      const color = randomItem(WARM_COLORS);
      const strokeColor = getComplementaryColor(color);
      const type = randomItem(SHAPE_TYPES);

      const shape: Shape = {
        id: generateId(),
        type,
        x,
        y,
        targetRadius: radius,
        currentRadius: 0,
        color,
        strokeColor,
        lineWidth: brushSize,
        createdAt: now,
        animationStart: now,
      };

      addShape(shape);
    },
    [addShape, lastClickTime, brushSize]
  );

  const handleSave = useCallback(() => {
    if (!canvasRef.current || shapes.length === 0) return;
    const canvas = canvasRef.current;
    const offscreen = document.createElement('canvas');
    offscreen.width = 150;
    offscreen.height = 112;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0, 150, 112);
    const thumbnail = offscreen.toDataURL('image/png');
    saveToHistory(thumbnail, shapes);
  }, [canvasRef, saveToHistory, shapes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleGenerateShape(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      if (e.code >= 'Digit1' && e.code <= 'Digit5') {
        const size = parseInt(e.code.replace('Digit', ''), 10);
        setBrushSize(size);
      }

      if (e.code === 'KeyR') {
        clearShapes();
      }

      if (e.code === 'KeyS') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerateShape, setBrushSize, clearShapes, handleSave]);

  return { handleGenerateShape, handleSave };
}

export function useMouse(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  onGenerate: (x: number, y: number) => void
) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      onGenerate(x, y);
    },
    [canvasRef, onGenerate]
  );

  return { handleClick };
}

export function useCanvasAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  draw: (ctx: CanvasRenderingContext2D, time: number) => void
) {
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (time: number) => {
      draw(ctx, time);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [canvasRef, draw]);
}

export function useLongPress(
  onLongPress: () => void,
  onClick: () => void,
  { delay = 800 }: { delay?: number } = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const handleStart = useCallback(() => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const handleEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPressRef.current) {
      onClick();
    }
    isLongPressRef.current = false;
  }, [onClick]);

  return {
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
  };
}

export function useAnimationUpdater() {
  const shapes = useCanvasStore((state) => state.shapes);
  const updateShapeRadius = useCanvasStore((state) => state.updateShapeRadius);
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

  const updateAnimations = useCallback(
    (currentTime: number) => {
      const currentShapes = shapesRef.current;
      for (const shape of currentShapes) {
        const elapsed = currentTime - shape.animationStart;
        if (elapsed < ANIMATION_DURATION) {
          const progress = clamp(elapsed / ANIMATION_DURATION, 0, 1);
          const easedProgress = easeOutCubic(progress);
          const radius = shape.targetRadius * easedProgress;
          updateShapeRadius(shape.id, radius);
        } else if (shape.currentRadius !== shape.targetRadius) {
          updateShapeRadius(shape.id, shape.targetRadius);
        }
      }
    },
    [updateShapeRadius]
  );

  return updateAnimations;
}
