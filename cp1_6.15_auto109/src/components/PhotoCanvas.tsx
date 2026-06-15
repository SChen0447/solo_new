import { useEffect, useRef, useCallback } from 'react';
import { usePhotoStore } from '../store/usePhotoStore';
import type { CompositionResult } from '../types';

const CANVAS_HEIGHT = 540;
const MAX_CANVAS_WIDTH = 960;

interface Props {
  composition: CompositionResult | null;
}

export function PhotoCanvas({ composition }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { imageUrl, imageSize } = usePhotoStore();

  const drawImage = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!imageRef.current || !imageSize) return;

    const { width: imgWidth, height: imgHeight } = imageSize;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const offsetX = (canvasWidth - drawWidth) / 2;
    const offsetY = (canvasHeight - drawHeight) / 2;

    ctx.drawImage(
      imageRef.current,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );

    return { offsetX, offsetY, drawWidth, drawHeight };
  }, [imageSize]);

  const drawGridLines = useCallback((
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    drawWidth: number,
    drawHeight: number
  ) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    const v1 = offsetX + drawWidth / 3;
    const v2 = offsetX + (drawWidth * 2) / 3;
    const h1 = offsetY + drawHeight / 3;
    const h2 = offsetY + (drawHeight * 2) / 3;

    ctx.beginPath();
    ctx.moveTo(v1, offsetY);
    ctx.lineTo(v1, offsetY + drawHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(v2, offsetY);
    ctx.lineTo(v2, offsetY + drawHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offsetX, h1);
    ctx.lineTo(offsetX + drawWidth, h1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offsetX, h2);
    ctx.lineTo(offsetX + drawWidth, h2);
    ctx.stroke();

    ctx.restore();
  }, []);

  const drawSubjectMarker = useCallback((
    ctx: CanvasRenderingContext2D,
    subjectX: number,
    subjectY: number,
    offsetX: number,
    offsetY: number,
    drawWidth: number,
    drawHeight: number
  ) => {
    const markerX = offsetX + subjectX * drawWidth;
    const markerY = offsetY + subjectY * drawHeight;

    ctx.save();

    ctx.beginPath();
    ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3b30';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imageUrl && imageRef.current) {
      const drawResult = drawImage(ctx, canvas);
      if (drawResult && composition) {
        const { offsetX, offsetY, drawWidth, drawHeight } = drawResult;
        
        drawGridLines(ctx, offsetX, offsetY, drawWidth, drawHeight);
        
        if (composition.subjectPosition) {
          drawSubjectMarker(
            ctx,
            composition.subjectPosition.x,
            composition.subjectPosition.y,
            offsetX,
            offsetY,
            drawWidth,
            drawHeight
          );
        }
      }
    }
  }, [imageUrl, composition, drawImage, drawGridLines, drawSubjectMarker]);

  useEffect(() => {
    if (!imageUrl) {
      imageRef.current = null;
      render();
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      render();
    };
    img.src = imageUrl;

    return () => {
      img.onload = null;
    };
  }, [imageUrl, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const containerWidth = canvas.parentElement?.clientWidth || MAX_CANVAS_WIDTH;
      canvas.width = Math.min(containerWidth, MAX_CANVAS_WIDTH);
      canvas.height = CANVAS_HEIGHT;
      render();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [render]);

  useEffect(() => {
    if (composition) {
      render();
    }
  }, [composition, render]);

  return (
    <div className="photo-canvas-container">
      <canvas
        ref={canvasRef}
        className="photo-canvas"
        style={{
          width: '100%',
          maxWidth: `${MAX_CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          backgroundColor: '#222222',
          display: 'block',
          margin: '0 auto',
        }}
      />
    </div>
  );
}
