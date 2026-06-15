import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { useAppStore } from './store';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PALETTE_COLORS,
} from './types';

export interface CanvasDrawingHandle {
  clear: () => void;
  getCanvas: () => HTMLCanvasElement | null;
  loadSnapshot: (dataUrl: string) => void;
}

export const CanvasDrawing = forwardRef<CanvasDrawingHandle>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  const currentColor = useAppStore((s) => s.currentColor);
  const brushSize = useAppStore((s) => s.brushSize);
  const convertCanvasToPixels = useAppStore((s) => s.convertCanvasToPixels);
  const setCurrentColor = useAppStore((s) => s.setCurrentColor);
  const [isConverting, setIsConverting] = useState(false);

  // 初始化canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    // 设置HiDPI支持
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    // 白背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 线条设置
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // 更新画笔画笔颜色/粗细
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = brushSize;
  }, [currentColor, brushSize]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH * dpr, CANVAS_HEIGHT * dpr);
      ctx.restore();
    },
    getCanvas: () => canvasRef.current,
    loadSnapshot: (dataUrl: string) => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dpr = window.devicePixelRatio || 1;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_WIDTH * dpr, CANVAS_HEIGHT * dpr);
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH * dpr, CANVAS_HEIGHT * dpr);
        ctx.restore();
      };
      img.src = dataUrl;
    },
  }));

  const getPt = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    let cx: number, cy: number;
    if ('touches' in e) {
      if (e.touches.length === 0) {
        const t = e.changedTouches[0];
        cx = t.clientX;
        cy = t.clientY;
      } else {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      }
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    return {
      x: cx - rect.left,
      y: cy - rect.top,
    };
  }, []);

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      isDrawingRef.current = true;
      const pt = getPt(e);
      lastPtRef.current = pt;
      // 点一下也画一个点
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      if ('preventDefault' in e) e.preventDefault();
    },
    [getPt, brushSize],
  );

  const moveDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current) return;
      const ctx = ctxRef.current;
      if (!ctx) return;
      const pt = getPt(e);
      const last = lastPtRef.current;
      if (last) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
      lastPtRef.current = pt;
      if ('preventDefault' in e) e.preventDefault();
    },
    [getPt],
  );

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    lastPtRef.current = null;
  }, []);

  const handleConvert = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsConverting(true);
    // 用setTimeout让UI先渲染loading状态
    setTimeout(() => {
      convertCanvasToPixels(canvas);
      setIsConverting(false);
      useAppStore.getState().showToast('已转换为像素动画！', 'success');
    }, 16);
  }, [convertCanvasToPixels]);

  const handleClear = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH * dpr, CANVAS_HEIGHT * dpr);
    ctx.restore();
  }, []);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="color-picker-grid">
            {PALETTE_COLORS.map((c) => (
              <div
                key={c}
                className={`color-swatch ${currentColor === c ? 'selected' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setCurrentColor(c)}
                title={c}
              />
            ))}
          </div>
          <button className="clear-btn" onClick={handleClear}>
            清空画布
          </button>
        </div>
        <button
          className="convert-btn"
          onClick={handleConvert}
          disabled={isConverting}
        >
          {isConverting ? (
            <>
              <span className="loading-dots" style={{ color: '#fff' }}>
                <span />
                <span />
                <span />
              </span>
              转换中
            </>
          ) : (
            '▶ 转换为像素动画'
          )}
        </button>
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
        />
      </div>
    </>
  );
});

CanvasDrawing.displayName = 'CanvasDrawing';
