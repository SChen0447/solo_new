import type { ColorData } from '../types';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  clamp,
} from './colorUtils';
import { getClosestColorName } from './colorNames';

interface Cluster {
  center: [number, number, number];
  pixels: Array<[number, number, number]>;
}

function euclideanDistance(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return (
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2)
  );
}

function initializeCentersKmeansPlusPlus(
  pixels: Array<[number, number, number]>,
  k: number
): Array<[number, number, number]> {
  const centers: Array<[number, number, number]> = [];
  const n = pixels.length;
  if (n === 0) return centers;

  centers.push(pixels[Math.floor(Math.random() * n)]);

  while (centers.length < k) {
    const distances = pixels.map((pixel) => {
      let minDist = Infinity;
      for (const c of centers) {
        const d = euclideanDistance(pixel, c);
        if (d < minDist) minDist = d;
      }
      return minDist;
    });

    const sum = distances.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      centers.push(pixels[Math.floor(Math.random() * n)]);
      continue;
    }

    let threshold = Math.random() * sum;
    let idx = 0;
    for (let i = 0; i < distances.length; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        idx = i;
        break;
      }
    }
    centers.push(pixels[idx]);
  }

  return centers;
}

function samplePixels(imageData: ImageData, targetSamples = 3000): Array<[number, number, number]> {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const step = Math.max(1, Math.floor(totalPixels / targetSamples));
  const pixels: Array<[number, number, number]> = [];

  for (let i = 0; i < totalPixels; i += step) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (a < 125) continue;

    if (r > 245 && g > 245 && b > 245) continue;

    pixels.push([r, g, b]);
  }

  if (pixels.length < 50) {
    for (let i = 0; i < totalPixels; i += Math.max(1, Math.floor(totalPixels / 1000))) {
      const idx = i * 4;
      pixels.push([data[idx], data[idx + 1], data[idx + 2]]);
    }
  }

  return pixels;
}

export function kmeansExtractColors(
  imageData: ImageData,
  k = 5,
  maxIterations = 20
): ColorData[] {
  const pixels = samplePixels(imageData, 4000);

  if (pixels.length === 0) {
    return [];
  }

  let centers = initializeCentersKmeansPlusPlus(pixels, k);
  if (centers.length < k) {
    for (let i = centers.length; i < k; i++) {
      centers.push(pixels[Math.floor(Math.random() * pixels.length)]);
    }
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters: Cluster[] = centers.map((c) => ({
      center: [...c],
      pixels: [],
    }));

    for (const pixel of pixels) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < clusters.length; i++) {
        const d = euclideanDistance(pixel, clusters[i].center);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      clusters[bestIdx].pixels.push(pixel);
    }

    let maxShift = 0;
    const newCenters: Array<[number, number, number]> = [];

    for (const cluster of clusters) {
      if (cluster.pixels.length === 0) {
        newCenters.push(cluster.center);
        continue;
      }
      const sumR = cluster.pixels.reduce((s, p) => s + p[0], 0);
      const sumG = cluster.pixels.reduce((s, p) => s + p[1], 0);
      const sumB = cluster.pixels.reduce((s, p) => s + p[2], 0);
      const len = cluster.pixels.length;
      const nc: [number, number, number] = [sumR / len, sumG / len, sumB / len];
      maxShift = Math.max(maxShift, euclideanDistance(nc, cluster.center));
      newCenters.push(nc);
    }

    centers = newCenters;

    if (maxShift < 1) break;
  }

  const finalClusters: Cluster[] = centers.map((c) => ({
    center: c,
    pixels: [],
  }));

  for (const pixel of pixels) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < finalClusters.length; i++) {
      const d = euclideanDistance(pixel, finalClusters[i].center);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    finalClusters[bestIdx].pixels.push(pixel);
  }

  const validClusters = finalClusters
    .map((c, idx) => ({ ...c, idx }))
    .filter((c) => c.pixels.length > 0);

  validClusters.sort((a, b) => b.pixels.length - a.pixels.length);

  const totalPixels = validClusters.reduce(
    (sum, c) => sum + c.pixels.length,
    0
  );

  const result: ColorData[] = validClusters.map((c) => {
    const [r, g, b] = c.center;
    const rgb = {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b),
    };
    const hex = rgbToHex(rgb);
    const hsl = rgbToHsl(rgb);
    const name = getClosestColorName(hsl);
    const percentage = totalPixels > 0
      ? Math.round((c.pixels.length / totalPixels) * 100)
      : 0;
    return { hex, rgb, hsl, name, percentage };
  });

  while (result.length < k) {
    const fallback = { r: 200 + result.length * 10, g: 200, b: 200 };
    const rgb = fallback;
    const hex = rgbToHex(rgb);
    const hsl = rgbToHsl(rgb);
    result.push({
      hex,
      rgb,
      hsl,
      name: getClosestColorName(hsl),
      percentage: 0,
    });
  }

  return result.slice(0, k);
}

export function createImageDataFromFile(
  file: File,
  maxSize = 100
): Promise<{ imageData: ImageData; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);

        const thumbCanvas = document.createElement('canvas');
        const tw = 80;
        const th = 80;
        thumbCanvas.width = tw;
        thumbCanvas.height = th;
        const tctx = thumbCanvas.getContext('2d')!;
        tctx.fillStyle = '#f8f4e8';
        tctx.fillRect(0, 0, tw, th);
        const scale = Math.max(tw / img.width, th / img.height);
        const sx = (tw - img.width * scale) / 2;
        const sy = (th - img.height * scale) / 2;
        tctx.drawImage(
          img,
          sx,
          sy,
          img.width * scale,
          img.height * scale
        );
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.8);

        resolve({ imageData, thumbnail });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
