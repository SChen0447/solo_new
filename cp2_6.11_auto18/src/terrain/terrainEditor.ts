import { HeightMap, ToolType, TerrainModifiedPayload } from '../types';
import { eventBus } from '../eventBus';

const LOW_AREA_THRESHOLD = 0.2;

export class TerrainEditor {
  private heightMap: HeightMap;
  private brushRadius: number = 3;
  private brushStrength: number = 0.02;
  private lastEditTime: number = 0;
  private modifiedCells: Set<number> = new Set();
  private flowFieldDirty: boolean = true;
  private gaussianKernel: number[] = [];
  private gaussianRadius: number = 0;

  constructor(cols: number = 100, rows: number = 60) {
    this.heightMap = {
      cols,
      rows,
      data: new Float32Array(cols * rows),
      flowFieldX: new Float32Array(cols * rows),
      flowFieldY: new Float32Array(cols * rows),
      flowFieldComputed: false,
    };
    this.buildGaussianKernel(this.brushRadius);
    this.generateDefaultTerrain();
  }

  private buildGaussianKernel(radius: number): void {
    const size = radius * 2 + 1;
    this.gaussianKernel = new Array(size * size);
    this.gaussianRadius = radius;
    const sigma = radius / 2.0;
    let sum = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist2 = dx * dx + dy * dy;
        const v = Math.exp(-dist2 / (2 * sigma * sigma));
        this.gaussianKernel[(dy + radius) * size + (dx + radius)] = v;
        sum += v;
      }
    }
    for (let i = 0; i < this.gaussianKernel.length; i++) {
      this.gaussianKernel[i] /= sum;
    }
  }

  private generateDefaultTerrain(): void {
    const { cols, rows, data } = this.heightMap;
    const cx = cols / 2;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        let h = 0.35;

        h += 0.15 * Math.sin(x * 0.08) * Math.cos(y * 0.1);
        h += 0.08 * Math.sin(x * 0.15 + 1.0) * Math.sin(y * 0.12 + 0.5);
        h += 0.05 * Math.cos(x * 0.25) * Math.cos(y * 0.2);

        const ridgeX = x - cols * 0.3;
        const ridgeDist = Math.abs(ridgeX) / (cols * 0.15);
        if (ridgeDist < 1.0) {
          h += 0.25 * (1.0 - ridgeDist * ridgeDist);
        }

        const hillCx = cols * 0.7;
        const hillCy = rows * 0.3;
        const hillDist = Math.sqrt((x - hillCx) ** 2 + (y - hillCy) ** 2) / (rows * 0.25);
        if (hillDist < 1.0) {
          h += 0.2 * (1.0 - hillDist * hillDist);
        }

        const riverX = cx + 8 * Math.sin(y * 0.15);
        const riverDist = Math.abs(x - riverX);
        if (riverDist < 5) {
          h -= 0.18 * (1.0 - riverDist / 5);
        }

        const lakeCx = cols * 0.65;
        const lakeCy = rows * 0.7;
        const lakeDist = Math.sqrt((x - lakeCx) ** 2 + (y - lakeCy) ** 2) / (rows * 0.18);
        if (lakeDist < 1.0) {
          h -= 0.22 * (1.0 - lakeDist * lakeDist);
        }

        const cliffY = rows * 0.45;
        if (y > cliffY - 1 && y < cliffY + 3 && x > cols * 0.25 && x < cols * 0.48) {
          if (y < cliffY) {
            h += 0.12 * (1 - (cliffY - y) / 2);
          } else {
            h -= 0.15 * (1 - (y - cliffY) / 3);
          }
        }

        data[idx] = Math.max(0.0, Math.min(1.0, h));
      }
    }
    this.flowFieldDirty = true;
  }

  getHeightMap(): HeightMap {
    if (this.flowFieldDirty) {
      this.computeGlobalFlowField();
    }
    return this.heightMap;
  }

  getHeight(gridX: number, gridY: number): number {
    const { cols, rows, data } = this.heightMap;
    const gx = Math.floor(gridX);
    const gy = Math.floor(gridY);
    if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) return 0.5;
    return data[gy * cols + gx];
  }

  getInterpolatedHeight(wx: number, wy: number): number {
    const { cols, rows, data } = this.heightMap;
    const gx = Math.max(0, Math.min(cols - 1.001, wx));
    const gy = Math.max(0, Math.min(rows - 1.001, wy));
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const ix1 = Math.min(ix + 1, cols - 1);
    const iy1 = Math.min(iy + 1, rows - 1);

    const h00 = data[iy * cols + ix];
    const h10 = data[iy * cols + ix1];
    const h01 = data[iy1 * cols + ix];
    const h11 = data[iy1 * cols + ix1];

    return h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
  }

  getGradient(gridX: number, gridY: number): { dx: number; dy: number } {
    const { cols, rows } = this.heightMap;
    const h = this.getHeight(gridX, gridY);
    const hRight = this.getHeight(Math.min(gridX + 1, cols - 1), gridY);
    const hDown = this.getHeight(gridX, Math.min(gridY + 1, rows - 1));
    return { dx: hRight - h, dy: hDown - h };
  }

  getFlowDirection(gridX: number, gridY: number): { dx: number; dy: number } {
    if (this.flowFieldDirty) {
      this.computeGlobalFlowField();
    }
    const { cols, rows, flowFieldX, flowFieldY } = this.heightMap;
    const gx = Math.max(0, Math.min(cols - 1, Math.floor(gridX)));
    const gy = Math.max(0, Math.min(rows - 1, Math.floor(gridY)));
    const idx = gy * cols + gx;
    return {
      dx: flowFieldX ? flowFieldX[idx] : 0,
      dy: flowFieldY ? flowFieldY[idx] : 0,
    };
  }

  private computeGlobalFlowField(): void {
    const { cols, rows, data, flowFieldX, flowFieldY } = this.heightMap;
    if (!flowFieldX || !flowFieldY) {
      this.heightMap.flowFieldX = new Float32Array(cols * rows);
      this.heightMap.flowFieldY = new Float32Array(cols * rows);
      this.computeGlobalFlowField();
      return;
    }

    const exitPoints: { x: number; y: number }[] = [];
    for (let x = 0; x < cols; x++) {
      if (data[x] < LOW_AREA_THRESHOLD) exitPoints.push({ x, y: 0 });
      const bottomIdx = (rows - 1) * cols + x;
      if (data[bottomIdx] < LOW_AREA_THRESHOLD + 0.05) exitPoints.push({ x, y: rows - 1 });
    }
    for (let y = 0; y < rows; y++) {
      if (data[y * cols] < LOW_AREA_THRESHOLD) exitPoints.push({ x: 0, y });
      const rightIdx = y * cols + (cols - 1);
      if (data[rightIdx] < LOW_AREA_THRESHOLD) exitPoints.push({ x: cols - 1, y });
    }

    const dist = new Float32Array(cols * rows);
    dist.fill(Infinity);
    const visited = new Uint8Array(cols * rows);
    const queue: number[] = [];

    for (const ep of exitPoints) {
      const idx = ep.y * cols + ep.x;
      dist[idx] = data[idx];
      queue.push(idx);
      visited[idx] = 1;
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        if (data[idx] < LOW_AREA_THRESHOLD) {
          dist[idx] = Math.min(dist[idx], data[idx]);
          if (!visited[idx]) {
            queue.push(idx);
            visited[idx] = 1;
          }
        }
      }
    }

    while (queue.length > 0) {
      const idx = queue.shift()!;
      const cx = idx % cols;
      const cy = Math.floor(idx / cols);
      const neighbors = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const nidx = ny * cols + nx;
        const newDist = Math.max(dist[idx], data[nidx]);
        if (newDist < dist[nidx]) {
          dist[nidx] = newDist;
          if (!visited[nidx]) {
            queue.push(nidx);
            visited[nidx] = 1;
          }
        }
      }
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const cx = x;
        const cy = y;

        let bestIdx = -1;
        let bestDist = dist[idx];
        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
          [cx - 1, cy - 1],
          [cx + 1, cy - 1],
          [cx - 1, cy + 1],
          [cx + 1, cy + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          const nidx = ny * cols + nx;
          if (dist[nidx] < bestDist) {
            bestDist = dist[nidx];
            bestIdx = nidx;
          }
        }

        if (bestIdx >= 0) {
          const bx = bestIdx % cols;
          const by = Math.floor(bestIdx / cols);
          let ddx = bx - cx;
          let ddy = by - cy;
          const len = Math.sqrt(ddx * ddx + ddy * ddy);
          if (len > 0) {
            ddx /= len;
            ddy /= len;
          }

          const localGrad = this.getGradient(cx, cy);
          const localLen = Math.sqrt(localGrad.dx * localGrad.dx + localGrad.dy * localGrad.dy);
          if (localLen > 0.001) {
            const blend = Math.min(1.0, localLen * 10);
            ddx = ddx * (1 - blend) + (localGrad.dx / localLen) * blend;
            ddy = ddy * (1 - blend) + (localGrad.dy / localLen) * blend;
            const bl = Math.sqrt(ddx * ddx + ddy * ddy);
            if (bl > 0) {
              ddx /= bl;
              ddy /= bl;
            }
          }

          flowFieldX[idx] = ddx;
          flowFieldY[idx] = ddy;
        } else {
          const g = this.getGradient(cx, cy);
          const gl = Math.sqrt(g.dx * g.dx + g.dy * g.dy);
          if (gl > 0) {
            flowFieldX[idx] = g.dx / gl;
            flowFieldY[idx] = g.dy / gl;
          } else {
            flowFieldX[idx] = 0;
            flowFieldY[idx] = 0.3;
          }
        }
      }
    }

    this.heightMap.flowFieldComputed = true;
    this.flowFieldDirty = false;
  }

  isLowArea(gridX: number, gridY: number, threshold: number = LOW_AREA_THRESHOLD): boolean {
    return this.getHeight(gridX, gridY) < threshold;
  }

  isCliff(gridX: number, gridY: number, threshold: number = 0.12): boolean {
    const grad = this.getGradient(gridX, gridY);
    return Math.sqrt(grad.dx * grad.dx + grad.dy * grad.dy) > threshold;
  }

  applyTool(gridX: number, gridY: number, tool: ToolType): number {
    const startTime = performance.now();
    const { cols, rows, data } = this.heightMap;
    const r = this.brushRadius;
    this.modifiedCells.clear();
    const size = r * 2 + 1;

    let minX = cols, minY = rows, maxX = -1, maxY = -1;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = gridX + dx;
        const ny = gridY + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) continue;

        const kernelV = this.gaussianKernel[(dy + r) * size + (dx + r)];
        const falloff = kernelV * ((r + 1) * (r + 1) * 3.14159);

        const idx = ny * cols + nx;

        switch (tool) {
          case 'raise':
            data[idx] = Math.min(1.0, data[idx] + this.brushStrength * falloff);
            break;
          case 'lower':
            data[idx] = Math.max(0.0, data[idx] - this.brushStrength * falloff);
            break;
          case 'smooth': {
            let sum = 0;
            let count = 0;
            for (let sy = -1; sy <= 1; sy++) {
              for (let sx = -1; sx <= 1; sx++) {
                const sxn = nx + sx;
                const syn = ny + sy;
                if (sxn >= 0 && sxn < cols && syn >= 0 && syn < rows) {
                  sum += data[syn * cols + sxn];
                  count++;
                }
              }
            }
            const avg = sum / count;
            data[idx] += (avg - data[idx]) * 0.35 * falloff;
            break;
          }
        }
        this.modifiedCells.add(idx);
        if (nx < minX) minX = nx;
        if (ny < minY) minY = ny;
        if (nx > maxX) maxX = nx;
        if (ny > maxY) maxY = ny;
      }
    }

    this.lastEditTime = performance.now();
    this.flowFieldDirty = true;

    const payload: TerrainModifiedPayload = {
      heightMap: this.heightMap,
      modifiedCells: this.modifiedCells,
      modifiedBounds:
        minX <= maxX && minY <= maxY
          ? { minX: minX - r, minY: minY - r, maxX: maxX + r, maxY: maxY + r }
          : null,
    };
    eventBus.emit('terrain:modified', payload);
    eventBus.emit('terrain:heights:changed', this.heightMap);

    return performance.now() - startTime;
  }

  getLastEditTime(): number {
    return this.lastEditTime;
  }

  getModifiedCells(): Set<number> {
    return this.modifiedCells;
  }

  setBrushRadius(r: number): void {
    this.brushRadius = Math.max(1, Math.min(12, r));
    this.buildGaussianKernel(this.brushRadius);
  }

  setBrushStrength(s: number): void {
    this.brushStrength = Math.max(0.005, Math.min(0.15, s));
  }

  loadHeightMap(data: Float32Array, cols: number, rows: number): void {
    this.heightMap = {
      cols,
      rows,
      data: new Float32Array(data),
      flowFieldX: new Float32Array(cols * rows),
      flowFieldY: new Float32Array(cols * rows),
      flowFieldComputed: false,
    };
    this.flowFieldDirty = true;
    eventBus.emit('terrain:heights:changed', this.heightMap);
    eventBus.emit('terrain:modified', {
      heightMap: this.heightMap,
      modifiedCells: new Set<number>(),
      modifiedBounds: null,
    } as TerrainModifiedPayload);
  }

  exportData(): { heightMap: number[]; cols: number; rows: number } {
    return {
      heightMap: Array.from(this.heightMap.data),
      cols: this.heightMap.cols,
      rows: this.heightMap.rows,
    };
  }
}
