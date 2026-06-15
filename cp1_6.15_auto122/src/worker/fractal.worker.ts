/// <reference lib="webworker" />

interface WorkerInput {
  size: number;
  iterations: number;
  scale: number;
  heightDecay: number;
  seed: number;
}

interface WorkerMessage {
  type: 'generate';
  requestId: string;
  payload: WorkerInput;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

const bilinearInterpolate = (
  h00: number,
  h10: number,
  h01: number,
  h11: number,
  tx: number,
  ty: number
): number => {
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const a = h00 + (h10 - h00) * sx;
  const b = h01 + (h11 - h01) * sx;
  return a + (b - a) * sy;
};

const generateDiamondSquare = (
  size: number,
  iterations: number,
  scale: number,
  heightDecay: number,
  seed: number
): Float32Array => {
  const resolution = 256;
  const heightMap = new Float32Array(resolution * resolution);
  const rand = new SeededRandom(seed);

  const actualIterations = Math.min(Math.max(iterations, 4), 10);
  const step = Math.max(1, Math.floor(resolution / Math.pow(2, actualIterations)));

  heightMap[0] = rand.range(0.3, 0.7);
  heightMap[resolution - 1] = rand.range(0.3, 0.7);
  heightMap[(resolution - 1) * resolution] = rand.range(0.3, 0.7);
  heightMap[(resolution - 1) * resolution + (resolution - 1)] = rand.range(0.3, 0.7);

  let roughness = 0.5 * scale;
  const decay = Math.max(0.3, Math.min(0.8, heightDecay));

  for (let s = step; s >= 1; s = Math.floor(s / 2)) {
    for (let y = 0; y < resolution; y += s * 2) {
      for (let x = 0; x < resolution; x += s * 2) {
        const x1 = Math.min(x + s * 2, resolution - 1);
        const y1 = Math.min(y + s * 2, resolution - 1);
        const cx = x + s;
        const cy = y + s;

        if (cx < resolution && cy < resolution) {
          const h00 = heightMap[y * resolution + x];
          const h10 = heightMap[y * resolution + x1];
          const h01 = heightMap[y1 * resolution + x];
          const h11 = heightMap[y1 * resolution + x1];
          const avg = (h00 + h10 + h01 + h11) / 4;
          heightMap[cy * resolution + cx] = Math.max(
            0,
            Math.min(1, avg + (rand.next() - 0.5) * roughness)
          );
        }
      }
    }

    for (let y = 0; y < resolution; y += s * 2) {
      for (let x = 0; x < resolution; x += s * 2) {
        const x1 = Math.min(x + s * 2, resolution - 1);
        const y1 = Math.min(y + s * 2, resolution - 1);
        const cx = x + s;
        const cy = y + s;

        if (cx < resolution) {
          const top = heightMap[y * resolution + cx] ?? 0;
          const bottom = heightMap[y1 * resolution + cx] ?? 0;
          const center =
            cy < resolution ? heightMap[cy * resolution + cx] : 0;
          const left = heightMap[cy * resolution + x] ?? 0;
          const right = heightMap[cy * resolution + x1] ?? 0;
          const avg = (top + bottom + center + left + right) / 5;
          heightMap[cy * resolution + cx] = Math.max(
            0,
            Math.min(1, avg + (rand.next() - 0.5) * roughness * 0.7)
          );
        }

        if (cy < resolution && cx < resolution) {
          if (x !== 0 || y + s < resolution) {
            const idx = (y + s) * resolution + x;
            if (heightMap[idx] === 0) {
              const l = heightMap[(y + s) * resolution + Math.max(0, x - s)] ?? 0;
              const r = heightMap[(y + s) * resolution + cx] ?? 0;
              const t = heightMap[y * resolution + x] ?? 0;
              const b = heightMap[y1 * resolution + x] ?? 0;
              const avg = (l + r + t + b) / 4;
              heightMap[idx] = Math.max(
                0,
                Math.min(1, avg + (rand.next() - 0.5) * roughness * 0.7)
              );
            }
          }

          if (cx < resolution) {
            const idx = y * resolution + cx;
            if (heightMap[idx] === 0) {
              const l = heightMap[y * resolution + x] ?? 0;
              const r = heightMap[y * resolution + x1] ?? 0;
              const t = heightMap[Math.max(0, y - s) * resolution + cx] ?? 0;
              const b = heightMap[cy * resolution + cx] ?? 0;
              const avg = (l + r + t + b) / 4;
              heightMap[idx] = Math.max(
                0,
                Math.min(1, avg + (rand.next() - 0.5) * roughness * 0.7)
              );
            }
          }
        }
      }
    }

    roughness *= decay;
  }

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < heightMap.length; i++) {
    if (heightMap[i] < min) min = heightMap[i];
    if (heightMap[i] > max) max = heightMap[i];
  }

  const range = max - min || 1;
  for (let i = 0; i < heightMap.length; i++) {
    heightMap[i] = (heightMap[i] - min) / range;
  }

  return heightMap;
};

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, requestId, payload } = e.data;

  if (type === 'generate') {
    const { size, iterations, scale, heightDecay, seed } = payload;
    try {
      const heightMap = generateDiamondSquare(
        size,
        iterations,
        scale,
        heightDecay,
        seed
      );
      self.postMessage(
        {
          type: 'result',
          requestId,
          payload: { heightMap },
        },
        [heightMap.buffer]
      );
    } catch (error) {
      self.postMessage({
        type: 'error',
        requestId,
        payload: { message: (error as Error).message },
      });
    }
  }
};

export {};
