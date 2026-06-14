import { FaceLandmarks, Point } from '@/types';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rgbToYCbCr(r: number, g: number, b: number): { Y: number; Cb: number; Cr: number } {
  const Y = 0.299 * r + 0.587 * g + 0.114 * b;
  const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return { Y, Cb, Cr };
}

function isSkinColor(r: number, g: number, b: number): boolean {
  const { Cb, Cr } = rgbToYCbCr(r, g, b);
  return Cb >= 77 && Cb <= 127 && Cr >= 133 && Cr <= 173;
}

function createSkinMask(imageData: ImageData): Uint8Array {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    mask[i] = isSkinColor(r, g, b) ? 1 : 0;
  }
  return mask;
}

function findLargestConnectedRegion(mask: Uint8Array, width: number, height: number): BoundingBox {
  const visited = new Uint8Array(width * height);
  let maxArea = 0;
  let bestBox: BoundingBox = { x: 0, y: 0, width: 0, height: 0 };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] === 1 && visited[idx] === 0) {
        const stack: Point[] = [{ x, y }];
        let minX = x, maxX = x, minY = y, maxY = y;
        let area = 0;
        visited[idx] = 1;
        while (stack.length > 0) {
          const p = stack.pop()!;
          area++;
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
          const neighbors = [
            { x: p.x - 1, y: p.y },
            { x: p.x + 1, y: p.y },
            { x: p.x, y: p.y - 1 },
            { x: p.x, y: p.y + 1 },
          ];
          for (const n of neighbors) {
            if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
              const nIdx = n.y * width + n.x;
              if (mask[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                stack.push(n);
              }
            }
          }
        }
        if (area > maxArea) {
          maxArea = area;
          bestBox = {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          };
        }
      }
    }
  }
  return bestBox;
}

function computeHorizontalProjection(
  mask: Uint8Array,
  width: number,
  height: number,
  box: BoundingBox,
): number[] {
  const proj: number[] = new Array(box.height).fill(0);
  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const absX = box.x + x;
      const absY = box.y + y;
      if (absX >= 0 && absX < width && absY >= 0 && absY < height) {
        proj[y] += mask[absY * width + absX];
      }
    }
  }
  return proj;
}

function computeVerticalProjection(
  mask: Uint8Array,
  width: number,
  height: number,
  box: BoundingBox,
): number[] {
  const proj: number[] = new Array(box.width).fill(0);
  for (let x = 0; x < box.width; x++) {
    for (let y = 0; y < box.height; y++) {
      const absX = box.x + x;
      const absY = box.y + y;
      if (absX >= 0 && absX < width && absY >= 0 && absY < height) {
        proj[x] += mask[absY * width + absX];
      }
    }
  }
  return proj;
}

function findMouthContour(
  imageData: ImageData,
  faceBox: BoundingBox,
  mouthCenter: Point,
  mouthWidth: number,
  mouthHeight: number,
): Point[] {
  const points: Point[] = [];
  const steps = 20;
  const halfW = mouthWidth / 2;
  const halfH = mouthHeight / 2;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = mouthCenter.x + Math.cos(t) * halfW * (0.9 + 0.1 * Math.sin(t * 2));
    const y = mouthCenter.y + Math.sin(t) * halfH * (0.8 + 0.2 * Math.cos(t * 3));
    points.push({ x, y });
  }
  return points;
}

export function detectFace(imageData: ImageData): FaceLandmarks {
  const { width, height } = imageData;
  const mask = createSkinMask(imageData);
  const faceBox = findLargestConnectedRegion(mask, width, height);

  if (faceBox.width < 20 || faceBox.height < 20) {
    const cx = width / 2;
    const cy = height / 2;
    const fw = width * 0.4;
    const fh = height * 0.5;
    return generateDefaultLandmarks(cx, cy, fw, fh);
  }

  const faceCenterX = faceBox.x + faceBox.width / 2;
  const faceCenterY = faceBox.y + faceBox.height / 2;
  const faceWidth = faceBox.width;
  const faceHeight = faceBox.height;

  const eyeY = faceBox.y + faceHeight * 0.35;
  const mouthY = faceBox.y + faceHeight * 0.72;
  const eyeSpacing = faceWidth * 0.38;

  const leftEye: Point = {
    x: faceCenterX - eyeSpacing / 2,
    y: eyeY,
  };
  const rightEye: Point = {
    x: faceCenterX + eyeSpacing / 2,
    y: eyeY,
  };

  const mouthCenter: Point = {
    x: faceCenterX,
    y: mouthY,
  };

  const mouthWidth = faceWidth * 0.38;
  const mouthHeight = faceHeight * 0.08;
  const mouth = findMouthContour(imageData, faceBox, mouthCenter, mouthWidth, mouthHeight);

  const cheekY = faceBox.y + faceHeight * 0.55;
  const cheekOffset = faceWidth * 0.32;
  const leftCheek: Point = {
    x: faceCenterX - cheekOffset,
    y: cheekY,
  };
  const rightCheek: Point = {
    x: faceCenterX + cheekOffset,
    y: cheekY,
  };

  return {
    leftEye,
    rightEye,
    mouth,
    leftCheek,
    rightCheek,
  };
}

function generateDefaultLandmarks(cx: number, cy: number, fw: number, fh: number): FaceLandmarks {
  const eyeY = cy - fh * 0.15;
  const mouthY = cy + fh * 0.22;
  const eyeSpacing = fw * 0.38;
  const mouthWidth = fw * 0.38;
  const mouthHeight = fh * 0.08;
  const cheekY = cy + fh * 0.05;
  const cheekOffset = fw * 0.32;

  const mouth: Point[] = [];
  const steps = 20;
  const halfW = mouthWidth / 2;
  const halfH = mouthHeight / 2;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    mouth.push({
      x: cx + Math.cos(t) * halfW * (0.9 + 0.1 * Math.sin(t * 2)),
      y: mouthY + Math.sin(t) * halfH * (0.8 + 0.2 * Math.cos(t * 3)),
    });
  }

  return {
    leftEye: { x: cx - eyeSpacing / 2, y: eyeY },
    rightEye: { x: cx + eyeSpacing / 2, y: eyeY },
    mouth,
    leftCheek: { x: cx - cheekOffset, y: cheekY },
    rightCheek: { x: cx + cheekOffset, y: cheekY },
  };
}
