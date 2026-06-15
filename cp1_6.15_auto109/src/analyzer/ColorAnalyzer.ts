import type { ColorResult } from '../types';

const HISTOGRAM_BINS = 256;
const KMEANS_CLUSTERS = 3;
const KMEANS_ITERATIONS = 5;

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

function calculateHistogram(data: Uint8ClampedArray): number[] {
  const histogram = new Array(HISTOGRAM_BINS).fill(0);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    histogram[brightness]++;
  }
  
  const maxCount = Math.max(...histogram);
  if (maxCount > 0) {
    for (let i = 0; i < HISTOGRAM_BINS; i++) {
      histogram[i] = histogram[i] / maxCount;
    }
  }
  
  return histogram;
}

function samplePixels(data: Uint8ClampedArray, sampleRate: number): { r: number; g: number; b: number }[] {
  const pixels: { r: number; g: number; b: number }[] = [];
  
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    pixels.push({ r, g, b });
  }
  
  return pixels;
}

function getFrequentColors(pixels: { r: number; g: number; b: number }[], count: number): string[] {
  const colorMap = new Map<string, number>();
  
  for (const pixel of pixels) {
    const quantizedR = Math.floor(pixel.r / 16) * 16;
    const quantizedG = Math.floor(pixel.g / 16) * 16;
    const quantizedB = Math.floor(pixel.b / 16) * 16;
    const key = rgbToHex(quantizedR, quantizedG, quantizedB);
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }
  
  const sorted = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count);
  
  return sorted.map(([color]) => color);
}

function colorDistance(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function kMeans(
  pixels: { r: number; g: number; b: number }[],
  k: number,
  iterations: number
): string[] {
  if (pixels.length === 0) {
    return ['#000000', '#808080', '#ffffff'];
  }
  
  const frequentColors = getFrequentColors(pixels, k);
  let centroids = frequentColors.map(hexToRgb);
  
  if (centroids.length < k) {
    while (centroids.length < k) {
      centroids.push({ r: Math.random() * 255, g: Math.random() * 255, b: Math.random() * 255 });
    }
  }
  
  for (let iter = 0; iter < iterations; iter++) {
    const clusters: { r: number; g: number; b: number }[][] = Array.from({ length: k }, () => []);
    
    for (const pixel of pixels) {
      let minDist = Infinity;
      let closestCluster = 0;
      
      for (let c = 0; c < k; c++) {
        const dist = colorDistance(pixel, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          closestCluster = c;
        }
      }
      
      clusters[closestCluster].push(pixel);
    }
    
    for (let c = 0; c < k; c++) {
      if (clusters[c].length > 0) {
        const sumR = clusters[c].reduce((sum, p) => sum + p.r, 0);
        const sumG = clusters[c].reduce((sum, p) => sum + p.g, 0);
        const sumB = clusters[c].reduce((sum, p) => sum + p.b, 0);
        centroids[c] = {
          r: sumR / clusters[c].length,
          g: sumG / clusters[c].length,
          b: sumB / clusters[c].length,
        };
      }
    }
  }
  
  return centroids.map(c => rgbToHex(c.r, c.g, c.b));
}

export function analyzeColor(imageData: ImageData): ColorResult {
  const { data, width, height } = imageData;
  
  const histogram = calculateHistogram(data);
  
  const pixelCount = width * height;
  const sampleRate = Math.max(1, Math.floor(pixelCount / 10000));
  const sampledPixels = samplePixels(data, sampleRate);
  const palette = kMeans(sampledPixels, KMEANS_CLUSTERS, KMEANS_ITERATIONS);
  
  return {
    histogram,
    palette,
  };
}

export function generateColorAdvice(palette: string[], score: number): string {
  if (palette.length === 0) return '';
  
  const rgbColors = palette.map(hexToRgb);
  
  let totalR = 0, totalG = 0, totalB = 0;
  for (const color of rgbColors) {
    totalR += color.r;
    totalG += color.g;
    totalB += color.b;
  }
  const avgR = totalR / rgbColors.length;
  const avgG = totalG / rgbColors.length;
  const avgB = totalB / rgbColors.length;
  
  const warmth = (avgR * 2 + avgG - avgB * 1.5) / 3;
  
  const adviceParts: string[] = [];
  
  if (warmth < 80) {
    adviceParts.push('主色调偏冷，可增加20%色温#ff9f43来营造温暖氛围');
  } else if (warmth > 150) {
    adviceParts.push('主色调偏暖，可适当降低色温或增加冷色调#4ecdc4来平衡画面');
  } else {
    adviceParts.push('色温适中，色彩氛围舒适');
  }
  
  const saturation = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB);
  if (saturation < 30) {
    adviceParts.push('饱和度偏低，可适当增加色彩饱和度使画面更生动');
  } else if (saturation > 180) {
    adviceParts.push('饱和度较高，注意避免色彩溢出');
  }
  
  if (score < 60) {
    adviceParts.push('建议配合构图调整重新拍摄');
  }
  
  return adviceParts.join('。');
}
