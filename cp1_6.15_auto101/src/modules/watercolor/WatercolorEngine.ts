import { WatercolorParams } from '../../store/useStore';

export interface ProcessOptions {
  intensity: number;
  colorSpread: number;
  brushSize: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const preprocessImage = (imageData: ImageData): ImageData => {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  let sumL = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sumL += 0.299 * r + 0.587 * g + 0.114 * b;
  }
  const avgL = sumL / (width * height);
  const targetAvg = 128;
  const brightnessAdjust = targetAvg - avgL;

  let sumVariance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    sumVariance += Math.pow(l - avgL, 2);
  }
  const stdDev = Math.sqrt(sumVariance / (width * height));
  const targetStd = 60;
  const contrastFactor = stdDev > 0 ? targetStd / stdDev : 1;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + brightnessAdjust;
    let g = data[i + 1] + brightnessAdjust;
    let b = data[i + 2] + brightnessAdjust;

    r = clamp((r - 128) * contrastFactor + 128, 0, 255);
    g = clamp((g - 128) * contrastFactor + 128, 0, 255);
    b = clamp((b - 128) * contrastFactor + 128, 0, 255);

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  return new ImageData(data, width, height);
};

const generateNoise = (width: number, height: number, alpha: number): Uint8ClampedArray => {
  const noise = new Uint8ClampedArray(width * height);
  for (let i = 0; i < noise.length; i++) {
    const n = (Math.random() - 0.5) * 255 * alpha;
    noise[i] = n;
  }
  return noise;
};

const gaussianBlur = (imageData: ImageData, radius: number): ImageData => {
  const src = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const dst = new Uint8ClampedArray(src);

  if (radius < 1) return imageData;

  const temp = new Uint8ClampedArray(src);
  const kernelSize = radius * 2 + 1;
  const kernel: number[] = [];
  let kernelSum = 0;

  for (let i = 0; i < kernelSize; i++) {
    const d = i - radius;
    const val = Math.exp(-(d * d) / (2 * radius * radius));
    kernel.push(val);
    kernelSum += val;
  }
  for (let i = 0; i < kernelSize; i++) kernel[i] /= kernelSum;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const xx = clamp(x + k, 0, width - 1);
          sum += temp[(y * width + xx) * 4 + c] * kernel[k + radius];
        }
        dst[(y * width + x) * 4 + c] = sum;
      }
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const yy = clamp(y + k, 0, height - 1);
          sum += dst[(yy * width + x) * 4 + c] * kernel[k + radius];
        }
        temp[(y * width + x) * 4 + c] = sum;
      }
    }
  }

  return new ImageData(temp, width, height);
};

const quantizeColors = (imageData: ImageData, numColors: number): ImageData => {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  const step = Math.floor(256 / Math.ceil(Math.pow(numColors, 1 / 3)));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / step) * step;
    data[i + 1] = Math.round(data[i + 1] / step) * step;
    data[i + 2] = Math.round(data[i + 2] / step) * step;
  }

  return new ImageData(data, width, height);
};

const applyColorSpread = (
  imageData: ImageData,
  spreadAmount: number
): ImageData => {
  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src);

  const radius = Math.floor(spreadAmount / 20);
  if (radius < 1) return imageData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = clamp(x + dx, 0, width - 1);
          const ny = clamp(y + dy, 0, height - 1);
          const nIdx = (ny * width + nx) * 4;

          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const weight = 1 - dist / radius;
            rSum += src[nIdx] * weight;
            gSum += src[nIdx + 1] * weight;
            bSum += src[nIdx + 2] * weight;
            count += weight;
          }
        }
      }

      if (count > 0) {
        dst[idx] = rSum / count;
        dst[idx + 1] = gSum / count;
        dst[idx + 2] = bSum / count;
      }
    }
  }

  return new ImageData(dst, width, height);
};

const applyTexture = (
  imageData: ImageData,
  alpha: number
): ImageData => {
  const width = imageData.width;
  const height = imageData.height;
  const data = new Uint8ClampedArray(imageData.data);
  const noise = generateNoise(width, height, alpha);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const n = noise[j];
    data[i] = clamp(data[i] + n, 0, 255);
    data[i + 1] = clamp(data[i + 1] + n, 0, 255);
    data[i + 2] = clamp(data[i + 2] + n, 0, 255);
  }

  return new ImageData(data, width, height);
};

const sobelEdgeDetect = (imageData: ImageData): { mag: Float32Array; dir: Float32Array } => {
  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;
  const mag = new Float32Array(width * height);
  const dir = new Float32Array(width * height);

  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < src.length; i += 4, j++) {
    gray[j] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
  }

  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sx = 0;
      let sy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const gi = (ky + 1) * 3 + (kx + 1);
          const pi = (y + ky) * width + (x + kx);
          sx += gx[gi] * gray[pi];
          sy += gy[gi] * gray[pi];
        }
      }
      const idx = y * width + x;
      mag[idx] = Math.sqrt(sx * sx + sy * sy);
      dir[idx] = Math.atan2(sy, sx);
    }
  }

  return { mag, dir };
};

const applyBrushStrokes = (
  imageData: ImageData,
  strokeSize: number
): ImageData => {
  const width = imageData.width;
  const height = imageData.height;
  const dst = new Uint8ClampedArray(imageData.data);

  const { mag, dir } = sobelEdgeDetect(imageData);
  const maxMag = Math.max(...mag);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(new ImageData(dst, width, height), 0, 0);

  const spacing = Math.max(strokeSize, 8);
  for (let y = spacing / 2; y < height; y += spacing) {
    for (let x = spacing / 2; x < width; x += spacing) {
      const idx = Math.floor(y) * width + Math.floor(x);
      const edgeStrength = mag[idx] / maxMag;

      if (edgeStrength > 0.1) {
        const strokeLen = 10 + Math.random() * 20;
        const angle = dir[idx];

        const pxIdx = idx * 4;
        const r = imageData.data[pxIdx];
        const g = imageData.data[pxIdx + 1];
        const b = imageData.data[pxIdx + 2];

        const x1 = x - Math.cos(angle) * strokeLen / 2;
        const y1 = y - Math.sin(angle) * strokeLen / 2;
        const x2 = x + Math.cos(angle) * strokeLen / 2;
        const y2 = y + Math.sin(angle) * strokeLen / 2;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${0.3 * edgeStrength})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = strokeSize;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  return ctx.getImageData(0, 0, width, height);
};

export const applyWatercolorEffect = (
  originalImageData: ImageData,
  params: WatercolorParams
): ImageData => {
  const { intensity, colorSpread, brushSize } = params;

  const preprocessed = preprocessImage(originalImageData);

  const blurRadius = Math.max(1, Math.floor(intensity / 25));
  let result = gaussianBlur(preprocessed, blurRadius);

  const numColors = Math.floor(12 + (100 - intensity) / 100 * 8);
  result = quantizeColors(result, numColors);

  if (colorSpread > 0) {
    result = applyColorSpread(result, colorSpread);
  }

  result = applyBrushStrokes(result, brushSize);

  const textureAlpha = 0.15 + intensity / 100 * 0.2;
  result = applyTexture(result, textureAlpha);

  const srcData = preprocessed.data;
  const dstData = result.data;
  const blendAlpha = intensity / 100;

  for (let i = 0; i < srcData.length; i += 4) {
    dstData[i] = srcData[i] * (1 - blendAlpha) + dstData[i] * blendAlpha;
    dstData[i + 1] = srcData[i + 1] * (1 - blendAlpha) + dstData[i + 1] * blendAlpha;
    dstData[i + 2] = srcData[i + 2] * (1 - blendAlpha) + dstData[i + 2] * blendAlpha;
  }

  return result;
};

export const applyLocalBrushEffect = (
  processedData: ImageData,
  originalData: ImageData,
  x: number,
  y: number,
  brushSize: number,
  mode: 'enhance' | 'reduce'
): ImageData => {
  const width = processedData.width;
  const height = processedData.height;
  const result = new Uint8ClampedArray(processedData.data);
  const radius = brushSize;

  const extraSpread = mode === 'enhance' ? 15 : 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = Math.floor(x) + dx;
      const ny = Math.floor(y) + dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;

      const idx = (ny * width + nx) * 4;
      const feather = 1 - dist / radius;
      const strength = feather * feather;

      if (mode === 'enhance') {
        for (let c = 0; c < 3; c++) {
          const val = result[idx + c];
          const boosted = val + (128 - val) * 0.1 * strength;
          result[idx + c] = clamp(boosted, 0, 255);
        }
        if (extraSpread > 0 && Math.random() < 0.3 * strength) {
          const spreadDx = (Math.random() - 0.5) * extraSpread;
          const spreadDy = (Math.random() - 0.5) * extraSpread;
          const sx = clamp(Math.floor(nx + spreadDx), 0, width - 1);
          const sy = clamp(Math.floor(ny + spreadDy), 0, height - 1);
          const sIdx = (sy * width + sx) * 4;
          for (let c = 0; c < 3; c++) {
            result[sIdx + c] = (result[sIdx + c] + result[idx + c]) / 2;
          }
        }
      } else {
        for (let c = 0; c < 3; c++) {
          result[idx + c] =
            result[idx + c] * (1 - strength * 0.8) +
            originalData[idx + c] * strength * 0.8;
        }
      }
    }
  }

  return new ImageData(result, width, height);
};
