import { EdgeDetectionResult } from './imageProcessing';

export type StyleType = 'hiphop' | 'pop' | 'watercolor' | 'neon';

export interface StyleOptions {
  type: StyleType;
  seed?: number;
}

const HIPHOP_COLORS = ['#ff3366', '#ff9f00', '#00e5ff', '#a855f7'];
const POP_COLORS = ['#ff1744', '#00e676', '#2979ff', '#ffd600', '#d500f9', '#ff6d00'];
const NEON_COLORS = ['#00fff0', '#ff00ff', '#ffff00', '#00ff00', '#ff0080'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function getEdgePoints(edges: EdgeDetectionResult): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let y = 0; y < edges.height; y++) {
    for (let x = 0; x < edges.width; x++) {
      if (edges.edgePixels[y][x]) {
        points.push({ x, y });
      }
    }
  }
  return points;
}

function renderHipHop(ctx: CanvasRenderingContext2D, edges: EdgeDetectionResult, seed: number): void {
  const rand = seededRandom(seed);
  const edgePoints = getEdgePoints(edges);

  for (let i = 0; i < edgePoints.length; i += 8) {
    const point = edgePoints[i];
    if (!point) continue;

    for (let j = 0; j < 3; j++) {
      const radius = 6 + rand() * 9;
      const offsetX = (rand() - 0.5) * 30;
      const offsetY = (rand() - 0.5) * 30;
      const color = HIPHOP_COLORS[Math.floor(rand() * HIPHOP_COLORS.length)];

      const gradient = ctx.createRadialGradient(
        point.x + offsetX, point.y + offsetY, 0,
        point.x + offsetX, point.y + offsetY, radius
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.7, color + 'aa');
      gradient.addColorStop(1, color + '00');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x + offsetX, point.y + offsetY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  drawOutline(ctx, edges);
}

function renderPop(ctx: CanvasRenderingContext2D, edges: EdgeDetectionResult, seed: number): void {
  const rand = seededRandom(seed);
  const { width, height } = edges;

  const cellSize = 20;
  for (let cy = 0; cy < height; cy += cellSize) {
    for (let cx = 0; cx < width; cx += cellSize) {
      let hasEdge = false;
      for (let y = cy; y < Math.min(cy + cellSize, height) && !hasEdge; y++) {
        for (let x = cx; x < Math.min(cx + cellSize, width) && !hasEdge; x++) {
          if (edges.edgePixels[y]?.[x]) hasEdge = true;
        }
      }

      if (hasEdge && rand() > 0.3) {
        const color = POP_COLORS[Math.floor(rand() * POP_COLORS.length)];
        const padding = 2;
        ctx.fillStyle = color;
        ctx.fillRect(cx + padding, cy + padding, cellSize - padding * 2, cellSize - padding * 2);
      }
    }
  }

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  drawOutline(ctx, edges);
}

function renderWatercolor(ctx: CanvasRenderingContext2D, edges: EdgeDetectionResult, seed: number): void {
  const rand = seededRandom(seed);
  const edgePoints = getEdgePoints(edges);

  const waterColors = [
    'rgba(255, 99, 132, 0.25)',
    'rgba(54, 162, 235, 0.25)',
    'rgba(255, 206, 86, 0.25)',
    'rgba(75, 192, 192, 0.25)',
    'rgba(153, 102, 255, 0.25)',
    'rgba(255, 159, 64, 0.25)'
  ];

  for (let i = 0; i < edgePoints.length; i += 15) {
    const point = edgePoints[i];
    if (!point) continue;

    const radius = 20 + rand() * 40;
    const color = waterColors[Math.floor(rand() * waterColors.length)];

    const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.6, color.replace('0.25', '0.1'));
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(44, 62, 80, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  drawOutline(ctx, edges);
}

function renderNeon(ctx: CanvasRenderingContext2D, edges: EdgeDetectionResult, seed: number): void {
  const rand = seededRandom(seed);

  for (let pass = 4; pass >= 1; pass--) {
    const color = NEON_COLORS[Math.floor(rand() * NEON_COLORS.length)];
    ctx.shadowColor = color;
    ctx.shadowBlur = pass * 8;
    ctx.strokeStyle = color;
    ctx.lineWidth = pass;
    ctx.lineCap = 'round';
    drawOutline(ctx, edges);
  }
  ctx.shadowBlur = 0;

  const edgePoints = getEdgePoints(edges);
  for (let i = 0; i < edgePoints.length; i += 50) {
    const point = edgePoints[i];
    if (!point) continue;

    const color = NEON_COLORS[Math.floor(rand() * NEON_COLORS.length)];
    const pulseRadius = 3 + rand() * 5;

    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawOutline(ctx: CanvasRenderingContext2D, edges: EdgeDetectionResult): void {
  const { width, height, edgePixels } = edges;
  const visited = Array.from({ length: height }, () => new Array(width).fill(false));

  for (let startY = 0; startY < height; startY++) {
    for (let startX = 0; startX < width; startX++) {
      if (!edgePixels[startY][startX] || visited[startY][startX]) continue;

      const path: { x: number; y: number }[] = [];
      let x = startX, y = startY;

      while (x >= 0 && x < width && y >= 0 && y < height && edgePixels[y][x] && !visited[y][x]) {
        visited[y][x] = true;
        path.push({ x, y });

        let nextX = -1, nextY = -1;
        const directions = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
        for (const [dx, dy] of directions) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && edgePixels[ny][nx] && !visited[ny][nx]) {
            nextX = nx;
            nextY = ny;
            break;
          }
        }
        if (nextX === -1) break;
        x = nextX;
        y = nextY;
      }

      if (path.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length - 1; i++) {
          const xc = (path[i].x + path[i + 1].x) / 2;
          const yc = (path[i].y + path[i + 1].y) / 2;
          ctx.quadraticCurveTo(path[i].x, path[i].y, xc, yc);
        }
        ctx.stroke();
      } else if (path.length === 2) {
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        ctx.lineTo(path[1].x, path[1].y);
        ctx.stroke();
      } else if (path.length === 1) {
        ctx.beginPath();
        ctx.arc(path[0].x, path[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle as string;
        ctx.fill();
      }
    }
  }
}

export function renderStyle(
  ctx: CanvasRenderingContext2D,
  edges: EdgeDetectionResult,
  options: StyleOptions
): void {
  const seed = options.seed ?? Date.now();
  ctx.save();

  switch (options.type) {
    case 'hiphop':
      renderHipHop(ctx, edges, seed);
      break;
    case 'pop':
      renderPop(ctx, edges, seed);
      break;
    case 'watercolor':
      renderWatercolor(ctx, edges, seed);
      break;
    case 'neon':
      renderNeon(ctx, edges, seed);
      break;
  }

  ctx.restore();
}

export async function animateStyleTransition(
  ctx: CanvasRenderingContext2D,
  oldImageData: ImageData | null,
  edges: EdgeDetectionResult,
  newStyle: StyleType,
  seed: number,
  onProgress?: (progress: number) => void
): Promise<void> {
  const { width, height } = edges;
  const duration = 500;
  const startTime = performance.now();

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  renderStyle(tempCtx, edges, { type: newStyle, seed });
  const newImageData = tempCtx.getImageData(0, 0, width, height);

  return new Promise((resolve) => {
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const combined = ctx.createImageData(width, height);
      const srcOld = oldImageData?.data;
      const srcNew = newImageData.data;
      const dst = combined.data;

      const centerX = width / 2;
      const centerY = height / 2;
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const distProgress = (dist / maxDist) * 0.5;
          const localProgress = Math.max(0, Math.min(1, (easeProgress - distProgress) / (1 - distProgress || 1)));

          if (srcOld && progress < 1) {
            const dissolve = 1 - (localProgress * 0.8 + 0.2);
            for (let c = 0; c < 4; c++) {
              dst[i + c] = Math.round((srcOld[i + c] * dissolve + srcNew[i + c] * localProgress));
            }
          } else {
            for (let c = 0; c < 4; c++) {
              dst[i + c] = srcNew[i + c];
            }
          }
        }
      }

      ctx.putImageData(combined, 0, 0);
      onProgress?.(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(animate);
  });
}
