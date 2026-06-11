import { HeightMap, ToolType } from '../types';

export class TerrainEditor {
  private heightMap: HeightMap;
  private onChangeCallback: ((hm: HeightMap) => void) | null = null;
  private modifiedCells: Set<number> = new Set();
  private brushRadius: number = 3;
  private brushStrength: number = 0.02;
  private lastEditTime: number = 0;

  constructor(cols: number = 100, rows: number = 60) {
    this.heightMap = {
      cols,
      rows,
      data: new Float32Array(cols * rows),
    };
    this.generateDefaultTerrain();
  }

  private generateDefaultTerrain(): void {
    const { cols, rows, data } = this.heightMap;
    const cx = cols / 2;
    const cy = rows / 2;

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
        if (riverDist < 4) {
          h -= 0.15 * (1.0 - riverDist / 4);
        }

        const lakeCx = cols * 0.65;
        const lakeCy = rows * 0.65;
        const lakeDist = Math.sqrt((x - lakeCx) ** 2 + (y - lakeCy) ** 2) / (rows * 0.18);
        if (lakeDist < 1.0) {
          h -= 0.2 * (1.0 - lakeDist * lakeDist);
        }

        const cliffY = rows * 0.45;
        if (y > cliffY && y < cliffY + 2 && x > cols * 0.25 && x < cols * 0.45) {
          h += 0.25;
        }

        data[idx] = Math.max(0.0, Math.min(1.0, h));
      }
    }
  }

  onChange(cb: (hm: HeightMap) => void): void {
    this.onChangeCallback = cb;
  }

  getHeightMap(): HeightMap {
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
    const gx = Math.floor(gridX);
    const gy = Math.floor(gridY);
    const h = this.getHeight(gx, gy);
    const hRight = this.getHeight(Math.min(gx + 1, cols - 1), gy);
    const hDown = this.getHeight(gx, Math.min(gy + 1, rows - 1));
    return {
      dx: hRight - h,
      dy: hDown - h,
    };
  }

  isLowArea(gridX: number, gridY: number, threshold: number = 0.2): boolean {
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

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = gridX + dx;
        const ny = gridY + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > r) continue;
        const falloff = 1.0 - dist / r;
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
            data[idx] += (avg - data[idx]) * 0.3 * falloff;
            break;
          }
        }
        this.modifiedCells.add(idx);
      }
    }

    this.lastEditTime = performance.now();
    if (this.onChangeCallback) {
      this.onChangeCallback(this.heightMap);
    }

    return performance.now() - startTime;
  }

  getLastEditTime(): number {
    return this.lastEditTime;
  }

  getModifiedCells(): Set<number> {
    return this.modifiedCells;
  }

  setBrushRadius(r: number): void {
    this.brushRadius = Math.max(1, Math.min(10, r));
  }

  setBrushStrength(s: number): void {
    this.brushStrength = Math.max(0.005, Math.min(0.1, s));
  }

  loadHeightMap(data: Float32Array, cols: number, rows: number): void {
    this.heightMap = { cols, rows, data: new Float32Array(data) };
    if (this.onChangeCallback) {
      this.onChangeCallback(this.heightMap);
    }
  }

  exportData(): { heightMap: number[]; cols: number; rows: number } {
    return {
      heightMap: Array.from(this.heightMap.data),
      cols: this.heightMap.cols,
      rows: this.heightMap.rows,
    };
  }
}
