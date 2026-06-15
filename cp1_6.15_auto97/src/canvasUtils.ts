import type { Shape } from './types';

export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  const { x, y, currentRadius, color, strokeColor, lineWidth, type } = shape;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;

  ctx.beginPath();

  switch (type) {
    case 'circle':
      drawCircle(ctx, x, y, currentRadius);
      break;
    case 'triangle':
      drawTriangle(ctx, x, y, currentRadius);
      break;
    case 'hexagon':
      drawHexagon(ctx, x, y, currentRadius);
      break;
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  ctx.arc(x, y, radius, 0, Math.PI * 2);
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  const angle = -Math.PI / 2;
  for (let i = 0; i < 3; i++) {
    const a = angle + (i * Math.PI * 2) / 3;
    const px = x + radius * Math.cos(a);
    const py = y + radius * Math.sin(a);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
}

function drawHexagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void {
  const angle = -Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = angle + (i * Math.PI) / 3;
    const px = x + radius * Math.cos(a);
    const py = y + radius * Math.sin(a);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bgColor: string
): void {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
}

export function createThumbnail(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): string {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(canvas, 0, 0, width, height);
  return offscreen.toDataURL('image/png');
}

export function drawShapesOnCanvas(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  width: number,
  height: number,
  bgColor: string
): void {
  clearCanvas(ctx, width, height, bgColor);
  for (const shape of shapes) {
    drawShape(ctx, shape);
  }
}
