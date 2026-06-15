export interface Color {
  r: number;
  g: number;
  b: number;
  hex: string;
  ratio: number;
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const getDistance = (p1: number[], p2: number[]): number => {
  return Math.sqrt(
    Math.pow(p1[0] - p2[0], 2) +
    Math.pow(p1[1] - p2[1], 2) +
    Math.pow(p1[2] - p2[2], 2)
  );
};

const kMeans = (pixels: number[][], k: number, maxIterations: number = 20): { centroids: number[][]; counts: number[] } => {
  if (pixels.length === 0) {
    return { centroids: [], counts: [] };
  }

  const centroids: number[][] = [];
  const shuffled = [...pixels].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(k, shuffled.length); i++) {
    centroids.push([...shuffled[i]]);
  }

  let counts = new Array(k).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters: number[][][] = new Array(k).fill(null).map(() => []);
    counts = new Array(k).fill(0);

    for (const pixel of pixels) {
      let minDist = Infinity;
      let minIndex = 0;
      for (let i = 0; i < centroids.length; i++) {
        const dist = getDistance(pixel, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          minIndex = i;
        }
      }
      clusters[minIndex].push(pixel);
      counts[minIndex]++;
    }

    let changed = false;
    for (let i = 0; i < centroids.length; i++) {
      if (clusters[i].length === 0) continue;
      const newCentroid = [0, 0, 0];
      for (const p of clusters[i]) {
        newCentroid[0] += p[0];
        newCentroid[1] += p[1];
        newCentroid[2] += p[2];
      }
      newCentroid[0] /= clusters[i].length;
      newCentroid[1] /= clusters[i].length;
      newCentroid[2] /= clusters[i].length;

      if (getDistance(newCentroid, centroids[i]) > 1) {
        changed = true;
        centroids[i] = newCentroid;
      }
    }

    if (!changed) break;
  }

  return { centroids, counts };
};

export const extractColors = (file: File): Promise<Color[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法创建Canvas上下文'));
      return;
    }

    img.onload = () => {
      const maxSize = 200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels: number[][] = [];

      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        if (a > 128) {
          pixels.push([r, g, b]);
        }
      }

      const k = 5;
      const { centroids, counts } = kMeans(pixels, k);
      const total = counts.reduce((a, b) => a + b, 0);

      const colors: Color[] = centroids.map((centroid, index) => {
        const r = Math.round(centroid[0]);
        const g = Math.round(centroid[1]);
        const b = Math.round(centroid[2]);
        return {
          r,
          g,
          b,
          hex: rgbToHex(r, g, b),
          ratio: total > 0 ? counts[index] / total : 0
        };
      });

      colors.sort((a, b) => b.ratio - a.ratio);
      resolve(colors);
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(file);
  });
};
