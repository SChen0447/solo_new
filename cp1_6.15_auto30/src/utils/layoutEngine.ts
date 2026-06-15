import type { CollageImage, LayoutStyle } from '../stores/appStore';

interface LayoutConfig {
  canvasWidth: number;
  canvasHeight: number;
}

function getImageSize(
  img: { originalWidth: number; originalHeight: number },
  baseSize: number
): { width: number; height: number } {
  const aspect = img.originalWidth / img.originalHeight;
  if (aspect > 1) {
    return { width: baseSize, height: baseSize / aspect };
  } else {
    return { width: baseSize * aspect, height: baseSize };
  }
}

function checkOverlap(
  x: number,
  y: number,
  w: number,
  h: number,
  placed: { x: number; y: number; w: number; h: number }[],
  padding = 10
): boolean {
  for (const p of placed) {
    if (
      x < p.x + p.w + padding &&
      x + w + padding > p.x &&
      y < p.y + p.h + padding &&
      y + h + padding > p.y
    ) {
      return true;
    }
  }
  return false;
}

export function layoutBalanced(
  images: CollageImage[],
  config: LayoutConfig
): CollageImage[] {
  const { canvasWidth, canvasHeight } = config;
  const count = images.length;
  if (count === 0) return [];

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellWidth = canvasWidth / cols;
  const cellHeight = canvasHeight / rows;
  const baseSize = Math.min(cellWidth, cellHeight) * 0.8;

  const result: CollageImage[] = [];
  images.forEach((img, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const size = getImageSize(img, baseSize);
    const x = col * cellWidth + (cellWidth - size.width) / 2;
    const y = row * cellHeight + (cellHeight - size.height) / 2;

    result.push({
      ...img,
      x,
      y,
      width: size.width,
      height: size.height,
      rotation: 0,
      zIndex: index,
    });
  });

  return result;
}

export function layoutFocus(
  images: CollageImage[],
  config: LayoutConfig
): CollageImage[] {
  const { canvasWidth, canvasHeight } = config;
  const count = images.length;
  if (count === 0) return [];

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const result: CollageImage[] = [];

  const mainSize = Math.min(canvasWidth, canvasHeight) * 0.45;
  const mainImg = images[0];
  const mainSizeResult = getImageSize(mainImg, mainSize);
  result.push({
    ...mainImg,
    x: centerX - mainSizeResult.width / 2,
    y: centerY - mainSizeResult.height / 2,
    width: mainSizeResult.width,
    height: mainSizeResult.height,
    rotation: 0,
    zIndex: count - 1,
  });

  const smallSize = Math.min(canvasWidth, canvasHeight) * 0.2;
  const angles = [
    -Math.PI / 2,
    Math.PI / 2,
    -Math.PI / 4,
    Math.PI / 4,
    -Math.PI * 0.75,
    Math.PI * 0.75,
    0,
    Math.PI,
    -Math.PI / 6,
    Math.PI / 6,
  ];

  for (let i = 1; i < count; i++) {
    const angle = angles[(i - 1) % angles.length];
    const radius = Math.min(canvasWidth, canvasHeight) * (0.3 + (i % 2) * 0.08);
    const size = getImageSize(images[i], smallSize * (0.85 + (i % 3) * 0.1));
    const x = centerX + Math.cos(angle) * radius - size.width / 2;
    const y = centerY + Math.sin(angle) * radius - size.height / 2;
    const rotation = (Math.random() - 0.5) * 20;

    result.push({
      ...images[i],
      x,
      y,
      width: size.width,
      height: size.height,
      rotation,
      zIndex: count - 1 - i,
    });
  }

  return result;
}

export function layoutDiagonal(
  images: CollageImage[],
  config: LayoutConfig
): CollageImage[] {
  const { canvasWidth, canvasHeight } = config;
  const count = images.length;
  if (count === 0) return [];

  const result: CollageImage[] = [];
  const baseSize = Math.min(canvasWidth, canvasHeight) / Math.max(3, count * 0.7);

  for (let i = 0; i < count; i++) {
    const progress = count === 1 ? 0.5 : i / (count - 1);
    const size = getImageSize(images[i], baseSize * (0.8 + progress * 0.6));
    const x = progress * (canvasWidth - size.width) * 0.85 + (canvasWidth * 0.05);
    const y = (1 - progress) * (canvasHeight - size.height) * 0.85 + (canvasHeight * 0.05);
    const rotation = (progress - 0.5) * 30;

    result.push({
      ...images[i],
      x,
      y,
      width: size.width,
      height: size.height,
      rotation,
      zIndex: i,
    });
  }

  return result;
}

export function layoutRadial(
  images: CollageImage[],
  config: LayoutConfig
): CollageImage[] {
  const { canvasWidth, canvasHeight } = config;
  const count = images.length;
  if (count === 0) return [];

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const result: CollageImage[] = [];

  if (count === 1) {
    const size = getImageSize(images[0], Math.min(canvasWidth, canvasHeight) * 0.5);
    result.push({
      ...images[0],
      x: centerX - size.width / 2,
      y: centerY - size.height / 2,
      width: size.width,
      height: size.height,
      rotation: 0,
      zIndex: 0,
    });
    return result;
  }

  const maxRadius = Math.min(canvasWidth, canvasHeight) * 0.38;
  const imgSize = maxRadius * 0.6;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const size = getImageSize(images[i], imgSize * (0.85 + (i % 3) * 0.1));
    const x = centerX + Math.cos(angle) * maxRadius - size.width / 2;
    const y = centerY + Math.sin(angle) * maxRadius - size.height / 2;
    const rotation = (angle * 180) / Math.PI + 90;

    result.push({
      ...images[i],
      x,
      y,
      width: size.width,
      height: size.height,
      rotation: rotation + (Math.random() - 0.5) * 10,
      zIndex: i,
    });
  }

  return result;
}

export function layoutStacked(
  images: CollageImage[],
  config: LayoutConfig
): CollageImage[] {
  const { canvasWidth, canvasHeight } = config;
  const count = images.length;
  if (count === 0) return [];

  const result: CollageImage[] = [];
  const baseSize = Math.min(canvasWidth, canvasHeight) * 0.5;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  for (let i = 0; i < count; i++) {
    const size = getImageSize(images[i], baseSize * (0.7 + (i % 5) * 0.08));
    const offsetX = (Math.sin(i * 2.3) - 0.5) * 40;
    const offsetY = (Math.cos(i * 1.7) - 0.5) * 40;

    result.push({
      ...images[i],
      x: centerX - size.width / 2 + offsetX,
      y: centerY - size.height / 2 + offsetY,
      width: size.width,
      height: size.height,
      rotation: (i - count / 2) * 6,
      zIndex: i,
    });
  }

  return result;
}

export function layoutScattered(
  images: CollageImage[],
  config: LayoutConfig
): CollageImage[] {
  const { canvasWidth, canvasHeight } = config;
  const count = images.length;
  if (count === 0) return [];

  const result: CollageImage[] = [];
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const baseSize = Math.min(canvasWidth, canvasHeight) * 0.3;

  for (let i = 0; i < count; i++) {
    const size = getImageSize(images[i], baseSize * (0.7 + Math.random() * 0.5));
    let x = 0;
    let y = 0;
    let attempts = 0;
    const maxAttempts = 50;

    do {
      x = Math.random() * (canvasWidth - size.width - 40) + 20;
      y = Math.random() * (canvasHeight - size.height - 40) + 20;
      attempts++;
    } while (checkOverlap(x, y, size.width, size.height, placed, 15) && attempts < maxAttempts);

    placed.push({ x, y, w: size.width, h: size.height });

    result.push({
      ...images[i],
      x,
      y,
      width: size.width,
      height: size.height,
      rotation: (Math.random() - 0.5) * 25,
      zIndex: i,
    });
  }

  return result.sort((a, b) => a.zIndex - b.zIndex);
}

export function applyLayout(
  images: CollageImage[],
  style: LayoutStyle,
  config: LayoutConfig
): CollageImage[] {
  switch (style) {
    case 'balanced':
      return layoutBalanced(images, config);
    case 'focus':
      return layoutFocus(images, config);
    case 'diagonal':
      return layoutDiagonal(images, config);
    case 'radial':
      return layoutRadial(images, config);
    case 'stacked':
      return layoutStacked(images, config);
    case 'scattered':
      return layoutScattered(images, config);
    default:
      return layoutBalanced(images, config);
  }
}

export function lerpImages(
  fromImages: CollageImage[],
  toImages: CollageImage[],
  progress: number
): CollageImage[] {
  const easeProgress = cubicBezier(0.34, 1.56, 0.64, 1, progress);

  return toImages.map((toImg) => {
    const fromImg = fromImages.find((f) => f.id === toImg.id);
    if (!fromImg) return toImg;

    return {
      ...toImg,
      x: fromImg.x + (toImg.x - fromImg.x) * easeProgress,
      y: fromImg.y + (toImg.y - fromImg.y) * easeProgress,
      width: fromImg.width + (toImg.width - fromImg.width) * easeProgress,
      height: fromImg.height + (toImg.height - fromImg.height) * easeProgress,
      rotation: fromImg.rotation + (toImg.rotation - fromImg.rotation) * easeProgress,
    };
  });
}

function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number
): number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t: number): number {
    return ((ax * t + bx) * t + cx) * t;
  }

  function sampleCurveY(t: number): number {
    return ((ay * t + by) * t + cy) * t;
  }

  function sampleCurveDerivativeX(t: number): number {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  function solveCurveX(x: number, epsilon = 1e-6): number {
    let t2 = x;
    let x2: number;
    let d2: number;

    for (let i = 0; i < 8; i++) {
      x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < epsilon) return t2;
      d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 -= x2 / d2;
    }

    let t0 = 0;
    let t1 = 1;
    t2 = x;

    if (t2 < t0) return t0;
    if (t2 > t1) return t1;

    while (t0 < t1) {
      x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) return t2;
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }

    return t2;
  }

  return sampleCurveY(solveCurveX(t));
}
