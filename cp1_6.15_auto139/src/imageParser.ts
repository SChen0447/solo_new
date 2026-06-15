import type { CelestialBody, ParsedImageData } from './types';

interface Blob {
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  brightness: number;
  color: { r: number; g: number; b: number };
  size: number;
  count: number;
}

function generateId(): string {
  return `cb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function clamp<T extends number>(value: T, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

function getThumbnailDataUrl(
  img: HTMLImageElement,
  centerX: number,
  centerY: number,
  radius: number = 40,
  scale: number = 2
): string {
  const size = radius * 2 * scale;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  const srcSize = radius * 2;
  const sx = Math.max(0, centerX - radius);
  const sy = Math.max(0, centerY - radius);
  const sw = Math.min(srcSize, img.naturalWidth - sx);
  const sh = Math.min(srcSize, img.naturalHeight - sy);

  const dx = (size - sw * scale) / 2;
  const dy = (size - sh * scale) / 2;

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, sw * scale, sh * scale);

  return canvas.toDataURL('image/png');
}

export async function parseImage(file: File): Promise<ParsedImageData> {
  const img = await loadImage(file);
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  const MAX_SAMPLE_SIZE = 600;
  const scale = Math.min(1, MAX_SAMPLE_SIZE / Math.max(originalWidth, originalHeight));
  const sampleWidth = Math.max(1, Math.round(originalWidth * scale));
  const sampleHeight = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('无法创建Canvas上下文');
  }

  ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imageData.data;

  const brightnessData = new Float32Array(sampleWidth * sampleHeight);
  const rgbData: Array<{ r: number; g: number; b: number }> = new Array(sampleWidth * sampleHeight);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    brightnessData[j] = 0.299 * r + 0.587 * g + 0.114 * b;
    rgbData[j] = { r, g, b };
  }

  let brightnessSum = 0;
  let brightnessMax = 0;
  for (let i = 0; i < brightnessData.length; i++) {
    brightnessSum += brightnessData[i];
    if (brightnessData[i] > brightnessMax) brightnessMax = brightnessData[i];
  }
  const brightnessMean = brightnessSum / brightnessData.length;
  const brightnessStd = Math.sqrt(
    brightnessData.reduce((acc, b) => acc + (b - brightnessMean) ** 2, 0) / brightnessData.length
  );
  const threshold = clamp(brightnessMean + brightnessStd * 1.2, brightnessMean * 1.3, 200);

  const visited = new Uint8Array(sampleWidth * sampleHeight);
  const blobs: Blob[] = [];
  const queue: number[] = [];
  const dx8 = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dy8 = [-1, -1, -1, 0, 0, 1, 1, 1];

  for (let py = 0; py < sampleHeight; py++) {
    for (let px = 0; px < sampleWidth; px++) {
      const idx = py * sampleWidth + px;
      if (visited[idx] || brightnessData[idx] < threshold) continue;

      queue.length = 0;
      queue.push(idx);
      visited[idx] = 1;

      let sumX = 0;
      let sumY = 0;
      let sumB = 0;
      let sumR = 0;
      let sumG = 0;
      let sumBBright = 0;
      let count = 0;
      let maxLocalBrightness = 0;

      while (queue.length > 0) {
        const cidx = queue.pop()!;
        const cx = cidx % sampleWidth;
        const cy = Math.floor(cidx / sampleWidth);
        const cb = brightnessData[cidx];
        const crgb = rgbData[cidx];
        const weight = cb / 255;

        sumX += cx * weight;
        sumY += cy * weight;
        sumB += cb;
        sumR += crgb.r * cb;
        sumG += crgb.g * cb;
        sumBBright += crgb.b * cb;
        count++;
        if (cb > maxLocalBrightness) maxLocalBrightness = cb;

        for (let k = 0; k < 8; k++) {
          const nx = cx + dx8[k];
          const ny = cy + dy8[k];
          if (nx < 0 || nx >= sampleWidth || ny < 0 || ny >= sampleHeight) continue;
          const nidx = ny * sampleWidth + nx;
          if (visited[nidx] || brightnessData[nidx] < threshold) continue;
          visited[nidx] = 1;
          queue.push(nidx);
        }
      }

      if (count < 2) continue;

      const totalWeight = sumB > 0 ? sumB : count;
      const blobSize = Math.sqrt(count);
      blobs.push({
        x: sumX / totalWeight,
        y: sumY / totalWeight,
        pixelX: 0,
        pixelY: 0,
        brightness: clamp(maxLocalBrightness / 255 * 100, 5, 100),
        color: {
          r: clamp(sumR / totalWeight, 0, 255),
          g: clamp(sumG / totalWeight, 0, 255),
          b: clamp(sumBBright / totalWeight, 0, 255)
        },
        size: blobSize,
        count
      });
    }
  }

  if (blobs.length < 10) {
    const seededBlobs = generateSeededBlobs(brightnessData, rgbData, sampleWidth, sampleHeight, 12 - blobs.length);
    blobs.push(...seededBlobs);
  }

  blobs.sort((a, b) => b.brightness - a.brightness);

  const bodies: CelestialBody[] = blobs.map((blob, i) => {
    const pixelX = (blob.x / sampleWidth) * originalWidth;
    const pixelY = (blob.y / sampleHeight) * originalHeight;

    const normX = clamp(blob.x / sampleWidth, 0, 1);
    const normY = clamp(blob.y / sampleHeight, 0, 1);

    const size = mapRange(blob.brightness, 5, 100, 0.3, 2.0);
    const radius = clamp(size, 0.3, 2.0);

    const posRange = 8;
    const zOffset = ((Math.sin(i * 1.37) + 1) * 0.5) * 4 - 2;

    return {
      id: generateId(),
      index: i + 1,
      name: `天体 #${i + 1}`,
      x: normX,
      y: normY,
      position3D: {
        x: (normX - 0.5) * posRange * 2,
        y: (0.5 - normY) * posRange,
        z: zOffset
      },
      brightness: Math.round(blob.brightness),
      color: rgbToHex(blob.color.r, blob.color.g, blob.color.b),
      size: Number(size.toFixed(2)),
      radius: Number(radius.toFixed(2)),
      thumbnailDataUrl: undefined,
      pixelX: Math.round(pixelX),
      pixelY: Math.round(pixelY),
      originalWidth,
      originalHeight
    };
  });

  for (const body of bodies) {
    body.thumbnailDataUrl = getThumbnailDataUrl(img, body.pixelX, body.pixelY, Math.max(30, Math.round(body.size * 40)));
  }

  try {
    URL.revokeObjectURL(img.src);
  } catch (_) {
    // ignore
  }

  return {
    bodies,
    imageWidth: originalWidth,
    imageHeight: originalHeight,
    originalImage: img
  };
}

function generateSeededBlobs(
  brightnessData: Float32Array,
  rgbData: Array<{ r: number; g: number; b: number }>,
  width: number,
  height: number,
  count: number
): Blob[] {
  const blobs: Blob[] = [];
  const candidates: Array<{ idx: number; b: number }> = [];

  for (let i = 0; i < brightnessData.length; i++) {
    candidates.push({ idx: i, b: brightnessData[i] });
  }
  candidates.sort((a, b) => b.b - a.b);

  const takenRows = new Set<number>();
  const takenCols = new Set<number>();
  const step = Math.max(1, Math.floor(candidates.length / 500));

  for (let c = 0, picked = 0; c < candidates.length && picked < count * 3; c += step) {
    if (picked >= count) break;
    const { idx, b } = candidates[c];
    const x = idx % width;
    const y = Math.floor(idx / width);

    const rowBucket = Math.floor(y / Math.max(1, height / 8));
    const colBucket = Math.floor(x / Math.max(1, width / 8));
    if (takenRows.has(rowBucket) && takenCols.has(colBucket)) continue;

    takenRows.add(rowBucket);
    takenCols.add(colBucket);

    const color = rgbData[idx] || { r: 200, g: 200, b: 200 };
    const variation = (picked * 37) % 40;

    blobs.push({
      x,
      y,
      pixelX: x,
      pixelY: y,
      brightness: clamp(b / 255 * 100 + variation * 0.3, 20, 95),
      color: {
        r: clamp(color.r + variation * 0.5, 80, 255),
        g: clamp(color.g + variation * 0.3, 80, 255),
        b: clamp(color.b + variation * 0.8, 100, 255)
      },
      size: 3 + picked % 4,
      count: 5 + picked * 2
    });
    picked++;
  }

  return blobs;
}
