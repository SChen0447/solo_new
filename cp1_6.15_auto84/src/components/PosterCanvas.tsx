import { useRef, useEffect, useCallback } from 'react';
import { usePosterStore } from '../store/posterStore';

interface PosterCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const PosterCanvas = ({ canvasRef }: PosterCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);

  const { scale, offsetX, offsetY, setScale, setOffset } = usePosterStore();

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }
  }, [canvasRef]);

  useEffect(() => {
    const timer = setTimeout(() => {
      resizeCanvas();
      window.dispatchEvent(new Event('poster-resize'));
    }, 50);

    const handleResize = () => {
      resizeCanvas();
      window.dispatchEvent(new Event('poster-resize'));
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [resizeCanvas]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, scale + delta));

    const mouseOffsetX = (mouseX - centerX - offsetX * scale) / scale;
    const mouseOffsetY = (mouseY - centerY - offsetY * scale) / scale;

    const newOffsetX = (mouseX - centerX - mouseOffsetX * newScale) / newScale;
    const newOffsetY = (mouseY - centerY - mouseOffsetY * newScale) / newScale;

    setScale(newScale);
    setOffset(newOffsetX, newOffsetY);
  }, [canvasRef, scale, offsetX, offsetY, setScale, setOffset]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  }, [canvasRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    const newOffsetX = offsetX + dx / scale;
    const newOffsetY = offsetY + dy / scale;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      setOffset(newOffsetX, newOffsetY);
      rafIdRef.current = null;
    });
  }, [offsetX, offsetY, scale, setOffset]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  }, [canvasRef]);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, handleWheel]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        background: '#0f3460',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        minHeight: '400px',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          cursor: 'grab',
          display: 'block',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default PosterCanvas;
