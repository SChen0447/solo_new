import type { CompositionResult } from '../types';

const ONE_THIRD = 1 / 3;
const TWO_THIRDS = 2 / 3;
const INTERSECTION_THRESHOLD = 0.1;
const EDGE_THRESHOLD = 0.1;

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): number[][] {
  const gray: number[][] = [];
  for (let y = 0; y < height; y++) {
    gray[y] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      gray[y][x] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }
  return gray;
}

function sobelEdgeDetection(gray: number[][], width: number, height: number): number[][] {
  const gradient: number[][] = [];
  const gx = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const gy = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  for (let y = 0; y < height; y++) {
    gradient[y] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        gradient[y][x] = 0;
        continue;
      }
      let sumX = 0;
      let sumY = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sumX += gray[y + ky][x + kx] * gx[ky + 1][kx + 1];
          sumY += gray[y + ky][x + kx] * gy[ky + 1][kx + 1];
        }
      }
      gradient[y][x] = Math.sqrt(sumX * sumX + sumY * sumY);
    }
  }
  return gradient;
}

function findSubjectCenter(
  gradient: number[][],
  width: number,
  height: number
): { x: number; y: number } {
  let maxGradient = 0;
  let sumX = 0;
  let sumY = 0;
  let totalWeight = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const g = gradient[y][x];
      if (g > maxGradient) {
        maxGradient = g;
      }
    }
  }

  const threshold = maxGradient * 0.3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const g = gradient[y][x];
      if (g > threshold) {
        sumX += x * g;
        sumY += y * g;
        totalWeight += g;
      }
    }
  }

  if (totalWeight === 0) {
    return { x: 0.5, y: 0.5 };
  }

  return {
    x: sumX / totalWeight / width,
    y: sumY / totalWeight / height,
  };
}

function calculateScoreAndAdvice(
  subjectX: number,
  subjectY: number
): { score: number; advice: string } {
  let score = 60;
  const adviceParts: string[] = [];

  const intersections = [
    { x: ONE_THIRD, y: ONE_THIRD },
    { x: TWO_THIRDS, y: ONE_THIRD },
    { x: ONE_THIRD, y: TWO_THIRDS },
    { x: TWO_THIRDS, y: TWO_THIRDS },
  ];

  let nearIntersection = false;
  for (const point of intersections) {
    const dx = Math.abs(subjectX - point.x);
    const dy = Math.abs(subjectY - point.y);
    if (dx < INTERSECTION_THRESHOLD && dy < INTERSECTION_THRESHOLD) {
      score += 20;
      nearIntersection = true;
    }
  }

  if (nearIntersection) {
    adviceParts.push('主体位于黄金分割点附近，构图均衡');
  }

  const centerX = subjectX > ONE_THIRD && subjectX < TWO_THIRDS;
  const centerY = subjectY > ONE_THIRD && subjectY < TWO_THIRDS;
  if (centerX && centerY) {
    score -= 10;
    const moveX = subjectX < 0.5 ? '左' : '右';
    const moveY = subjectY < 0.5 ? '上' : '下';
    adviceParts.push(`主体偏向中央，建议向${moveX}${moveY}移动至1/3构图线位置以增加动感`);
  }

  const onEdgeX = subjectX < EDGE_THRESHOLD || subjectX > 1 - EDGE_THRESHOLD;
  const onEdgeY = subjectY < EDGE_THRESHOLD || subjectY > 1 - EDGE_THRESHOLD;
  if (onEdgeX || onEdgeY) {
    score -= 20;
    adviceParts.push('主体过于靠近画面边缘，建议向内移动避免切割感');
  }

  if (!nearIntersection && !centerX && !centerY && !onEdgeX && !onEdgeY) {
    adviceParts.push('可尝试将主体移至九宫格交点处以提升构图层次感');
  }

  score = Math.max(0, Math.min(100, score));

  const advice = adviceParts.length > 0 ? adviceParts.join('。') : '构图均衡，继续保持';

  return { score, advice };
}

export function analyzeComposition(imageData: ImageData): CompositionResult {
  const { data, width, height } = imageData;

  const sampleRate = Math.max(1, Math.floor(Math.min(width, height) / 200));
  const sampleWidth = Math.floor(width / sampleRate);
  const sampleHeight = Math.floor(height / sampleRate);

  const sampledData = new Uint8ClampedArray(sampleWidth * sampleHeight * 4);
  for (let y = 0; y < sampleHeight; y++) {
    for (let x = 0; x < sampleWidth; x++) {
      const srcIdx = (y * sampleRate * width + x * sampleRate) * 4;
      const dstIdx = (y * sampleWidth + x) * 4;
      sampledData[dstIdx] = data[srcIdx];
      sampledData[dstIdx + 1] = data[srcIdx + 1];
      sampledData[dstIdx + 2] = data[srcIdx + 2];
      sampledData[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  const gray = toGrayscale(sampledData, sampleWidth, sampleHeight);
  const gradient = sobelEdgeDetection(gray, sampleWidth, sampleHeight);
  const subjectPosition = findSubjectCenter(gradient, sampleWidth, sampleHeight);

  const { score, advice } = calculateScoreAndAdvice(
    subjectPosition.x,
    subjectPosition.y
  );

  return {
    score,
    advice,
    subjectPosition,
    gridLines: {
      vertical: [ONE_THIRD, TWO_THIRDS],
      horizontal: [ONE_THIRD, TWO_THIRDS],
    },
  };
}
