import * as THREE from 'three';
import { scaleLinear } from 'd3-scale';
import {
  HEATMAP_TEXTURE_SIZE,
  HEATMAP_GAUSSIAN_RADIUS,
  HEATMAP_GAUSSIAN_SIGMA,
  WORLD_MIN,
  WORLD_SIZE,
  COLORS,
} from '../shared/constants';

const TEX_SIZE = HEATMAP_TEXTURE_SIZE;

export class HeatmapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private densityGrid: Float32Array;
  private texture: THREE.CanvasTexture;
  private colorScale: (t: number) => string;
  private maxDensity = 1;
  private noiseSeed = Math.random() * 1000;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = TEX_SIZE;
    this.canvas.height = TEX_SIZE;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.imageData = this.ctx.createImageData(TEX_SIZE, TEX_SIZE);
    this.densityGrid = new Float32Array(TEX_SIZE * TEX_SIZE);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.needsUpdate = true;

    this.colorScale = scaleLinear<string>()
      .domain([0, 0.5, 1])
      .range([COLORS.HEAT_LOW, COLORS.HEAT_MID, COLORS.HEAT_HIGH])
      .clamp(true);

    this.clearGrid();
  }

  getTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getAverageDensity(): number {
    let sum = 0;
    for (let i = 0; i < this.densityGrid.length; i++) {
      sum += this.densityGrid[i];
    }
    const avg = sum / this.densityGrid.length;
    return Math.min(1, avg / Math.max(0.5, this.maxDensity * 0.3));
  }

  private clearGrid() {
    for (let i = 0; i < this.densityGrid.length; i++) {
      this.densityGrid[i] = 0;
    }
  }

  private worldToTex(wx: number, wz: number): { tx: number; tz: number } {
    const tx = ((wx - WORLD_MIN) / WORLD_SIZE) * TEX_SIZE;
    const tz = ((wz - WORLD_MIN) / WORLD_SIZE) * TEX_SIZE;
    return { tx, tz };
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  update(positions: Float32Array, count: number, time: number) {
    this.clearGrid();

    const twoSigmaSq = 2 * HEATMAP_GAUSSIAN_SIGMA * HEATMAP_GAUSSIAN_SIGMA;
    const radius = HEATMAP_GAUSSIAN_RADIUS;
    const cellsPerUnit = TEX_SIZE / WORLD_SIZE;

    const noiseAmp = 0.02;
    const noisePeriod = 0.8;
    const noisePhase = (time % noisePeriod) / noisePeriod;
    const noiseVal = Math.sin(noisePhase * Math.PI * 2) * noiseAmp;

    let peak = 0;

    for (let i = 0; i < count; i++) {
      const px = positions[i * 3];
      const pz = positions[i * 3 + 2];
      const { tx, tz } = this.worldToTex(px, pz);

      const rCells = radius * cellsPerUnit;
      const minX = Math.max(0, Math.floor(tx - rCells));
      const maxX = Math.min(TEX_SIZE - 1, Math.ceil(tx + rCells));
      const minZ = Math.max(0, Math.floor(tz - rCells));
      const maxZ = Math.min(TEX_SIZE - 1, Math.ceil(tz + rCells));

      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = (x - tx) / cellsPerUnit;
          const dz = (z - tz) / cellsPerUnit;
          const dSq = dx * dx + dz * dz;
          if (dSq > radius * radius) continue;
          const w = Math.exp(-dSq / twoSigmaSq);
          const idx = z * TEX_SIZE + x;
          this.densityGrid[idx] += w;
          if (this.densityGrid[idx] > peak) peak = this.densityGrid[idx];
        }
      }
    }

    this.maxDensity = Math.max(1, peak);
    const data = this.imageData.data;
    const cLow = this.hexToRgb(COLORS.HEAT_LOW);
    const cMid = this.hexToRgb(COLORS.HEAT_MID);
    const cHigh = this.hexToRgb(COLORS.HEAT_HIGH);

    for (let i = 0; i < TEX_SIZE * TEX_SIZE; i++) {
      let norm = this.densityGrid[i] / this.maxDensity;
      norm = Math.min(1, Math.max(0, norm + noiseVal));

      let r: number, g: number, b: number;
      if (norm < 0.5) {
        const t = norm * 2;
        r = Math.round(cLow[0] + (cMid[0] - cLow[0]) * t);
        g = Math.round(cLow[1] + (cMid[1] - cLow[1]) * t);
        b = Math.round(cLow[2] + (cMid[2] - cLow[2]) * t);
      } else {
        const t = (norm - 0.5) * 2;
        r = Math.round(cMid[0] + (cHigh[0] - cMid[0]) * t);
        g = Math.round(cMid[1] + (cHigh[1] - cMid[1]) * t);
        b = Math.round(cMid[2] + (cHigh[2] - cMid[2]) * t);
      }

      const alpha = norm > 0.02 ? Math.round(255 * 0.7 * Math.min(1, norm * 2)) : 0;
      const idx = i * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = alpha;
    }

    this.ctx.putImageData(this.imageData, 0, 0);
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}
