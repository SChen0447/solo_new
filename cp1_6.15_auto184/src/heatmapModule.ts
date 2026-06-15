import * as THREE from 'three';
import * as d3 from 'd3';
import EventEmitter from 'eventemitter3';
import type { Station, WindParams, PollutantType, Events } from './types';
import { POLLUTANT_MAX } from './types';

const HEATMAP_WIDTH = 512;
const HEATMAP_HEIGHT = 256;
const GRID_SIZE = 128;
const DIFFUSION_RATE = 0.05;
const DECAY_RATE = 0.995;

function getColorForValue(t: number): string {
  if (t < 0.5) {
    const localT = t * 2;
    const r = Math.round(0 + (0xff - 0) * localT);
    const g = Math.round(0xe6 + (0xeb - 0xe6) * localT);
    const b = Math.round(0x76 + (0x3b - 0x76) * localT);
    return `rgba(${r}, ${g}, ${b}, 0.4)`;
  } else {
    const localT = (t - 0.5) * 2;
    const r = Math.round(0xff + (0xff - 0xff) * localT);
    const g = Math.round(0xeb + (0x17 - 0xeb) * localT);
    const b = Math.round(0x3b + (0x44 - 0x3b) * localT);
    return `rgba(${r}, ${g}, ${b}, 0.4)`;
  }
}

function getColorRGB(t: number): [number, number, number] {
  if (t < 0.5) {
    const localT = t * 2;
    return [
      Math.round(0 + (0xff - 0) * localT),
      Math.round(0xe6 + (0xeb - 0xe6) * localT),
      Math.round(0x76 + (0x3b - 0x76) * localT),
    ];
  } else {
    const localT = (t - 0.5) * 2;
    return [
      Math.round(0xff + (0xff - 0xff) * localT),
      Math.round(0xeb + (0x17 - 0xeb) * localT),
      Math.round(0x3b + (0x44 - 0x3b) * localT),
    ];
  }
}

export class HeatmapModule {
  private emitter: EventEmitter<Events>;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture | null = null;
  private stations: Station[] = [];
  private wind: WindParams = { direction: 90, speed: 5 };
  private currentPollutant: PollutantType = 'pm25';
  private concentrationGrid: Float32Array;
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;
  private isRunning: boolean = false;

  constructor(emitter: EventEmitter<Events>) {
    this.emitter = emitter;
    this.canvas = document.createElement('canvas');
    this.canvas.width = HEATMAP_WIDTH;
    this.canvas.height = HEATMAP_HEIGHT;
    this.ctx = this.canvas.getContext('2d')!;
    this.concentrationGrid = new Float32Array(GRID_SIZE * GRID_SIZE);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.emitter.on('DATA_UPDATE', this.handleDataUpdate.bind(this));
    this.emitter.on('WIND_CHANGE', this.handleWindChange.bind(this));
    this.emitter.on('POLLUTANT_SWITCH', this.handlePollutantSwitch.bind(this));
  }

  private handleDataUpdate(data: { stations: Station[]; wind: WindParams; timestamp: number }): void {
    this.stations = data.stations;
    this.wind = data.wind;
    this.updateConcentrationGrid();
  }

  private handleWindChange(wind: WindParams): void {
    this.wind = wind;
  }

  private handlePollutantSwitch(pollutant: PollutantType): void {
    this.currentPollutant = pollutant;
    this.updateConcentrationGrid();
    this.renderHeatmap();
    this.emitTextureUpdate();
  }

  private latLonToGrid(lat: number, lon: number): [number, number] {
    const x = Math.floor(((lon + 180) / 360) * GRID_SIZE);
    const y = Math.floor(((90 - lat) / 180) * GRID_SIZE);
    return [Math.max(0, Math.min(GRID_SIZE - 1, x)), Math.max(0, Math.min(GRID_SIZE - 1, y))];
  }

  private gridToTexCoord(gx: number, gy: number): [number, number] {
    return [(gx / GRID_SIZE) * HEATMAP_WIDTH, (gy / GRID_SIZE) * HEATMAP_HEIGHT];
  }

  private updateConcentrationGrid(): void {
    const newGrid = new Float32Array(GRID_SIZE * GRID_SIZE);
    const maxValue = POLLUTANT_MAX[this.currentPollutant];

    this.stations.forEach((station) => {
      const value = station.current[this.currentPollutant];
      const t = Math.min(value / maxValue, 1);
      const [gx, gy] = this.latLonToGrid(station.lat, station.lon);

      const radius = 8 + t * 12;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
              const falloff = 1 - dist / radius;
              const contribution = t * falloff * falloff;
              const idx = ny * GRID_SIZE + nx;
              newGrid[idx] = Math.min(1, newGrid[idx] + contribution);
            }
          }
        }
      }
    });

    for (let i = 0; i < this.concentrationGrid.length; i++) {
      this.concentrationGrid[i] = Math.max(this.concentrationGrid[i] * 0.7, newGrid[i]);
    }
  }

  private diffuse(dt: number): void {
    const result = new Float32Array(this.concentrationGrid.length);
    const windRad = (this.wind.direction * Math.PI) / 180;
    const windX = Math.sin(windRad) * this.wind.speed * 0.01 * dt;
    const windY = -Math.cos(windRad) * this.wind.speed * 0.01 * dt;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const idx = y * GRID_SIZE + x;
        const current = this.concentrationGrid[idx];

        const srcX = x - windX;
        const srcY = y - windY;

        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;
        const fx = srcX - x0;
        const fy = srcY - y0;

        let advected = 0;
        if (x0 >= 0 && x1 < GRID_SIZE && y0 >= 0 && y1 < GRID_SIZE) {
          const v00 = this.concentrationGrid[y0 * GRID_SIZE + x0];
          const v10 = this.concentrationGrid[y0 * GRID_SIZE + x1];
          const v01 = this.concentrationGrid[y1 * GRID_SIZE + x0];
          const v11 = this.concentrationGrid[y1 * GRID_SIZE + x1];
          advected = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
        } else {
          advected = current;
        }

        let diffused = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
              diffused += this.concentrationGrid[ny * GRID_SIZE + nx];
              count++;
            }
          }
        }
        diffused = count > 0 ? diffused / count : current;

        result[idx] = (advected * (1 - DIFFUSION_RATE) + diffused * DIFFUSION_RATE) * DECAY_RATE;
      }
    }

    this.concentrationGrid = result;
  }

  private renderHeatmap(): void {
    this.ctx.clearRect(0, 0, HEATMAP_WIDTH, HEATMAP_HEIGHT);

    const imageData = this.ctx.createImageData(HEATMAP_WIDTH, HEATMAP_HEIGHT);
    const data = imageData.data;

    for (let ty = 0; ty < HEATMAP_HEIGHT; ty++) {
      for (let tx = 0; tx < HEATMAP_WIDTH; tx++) {
        const gx = Math.floor((tx / HEATMAP_WIDTH) * GRID_SIZE);
        const gy = Math.floor((ty / HEATMAP_HEIGHT) * GRID_SIZE);
        const gIdx = gy * GRID_SIZE + gx;
        const value = this.concentrationGrid[gIdx];

        const pixelIdx = (ty * HEATMAP_WIDTH + tx) * 4;
        if (value > 0.01) {
          const [r, g, b] = getColorRGB(value);
          data[pixelIdx] = r;
          data[pixelIdx + 1] = g;
          data[pixelIdx + 2] = b;
          data[pixelIdx + 3] = Math.min(255, Math.floor(value * 255 * 0.6));
        } else {
          data[pixelIdx + 3] = 0;
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);

    const contourData: [number, number][] = [];
    this.stations.forEach((station) => {
      const value = station.current[this.currentPollutant];
      const max = POLLUTANT_MAX[this.currentPollutant];
      const t = Math.min(value / max, 1);
      const [gx, gy] = this.latLonToGrid(station.lat, station.lon);
      const weight = Math.floor(t * 10) + 1;
      for (let i = 0; i < weight; i++) {
        contourData.push([gx + (Math.random() - 0.5) * 3, gy + (Math.random() - 0.5) * 3]);
      }
    });

    if (contourData.length > 0) {
      const contours = d3.contourDensity<[number, number]>()
        .x((d) => (d[0] / GRID_SIZE) * HEATMAP_WIDTH)
        .y((d) => (d[1] / GRID_SIZE) * HEATMAP_HEIGHT)
        .size([HEATMAP_WIDTH, HEATMAP_HEIGHT])
        .bandwidth(15)
        .thresholds([0.05, 0.15, 0.3, 0.5, 0.7])(contourData);

      contours.forEach((contour, i) => {
        const t = (i + 1) / contours.length;
        this.ctx.beginPath();
        contour.coordinates.forEach((ring) => {
          ring.forEach((point, j) => {
            if (j === 0) this.ctx.moveTo(point[0], point[1]);
            else this.ctx.lineTo(point[0], point[1]);
          });
        });
        this.ctx.closePath();
        this.ctx.fillStyle = getColorForValue(t);
        this.ctx.fill();
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + t * 0.2})`;
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();
      });
    }

    this.stations.forEach((station) => {
      const value = station.current[this.currentPollutant];
      const max = POLLUTANT_MAX[this.currentPollutant];
      const t = Math.min(value / max, 1);
      const [gx, gy] = this.latLonToGrid(station.lat, station.lon);
      const [tx, ty] = this.gridToTexCoord(gx, gy);
      const radius = 2 + t * 4;

      const gradient = this.ctx.createRadialGradient(tx, ty, 0, tx, ty, radius * 2);
      const [r, g, b] = getColorRGB(t);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(tx, ty, radius * 2, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private emitTextureUpdate(): void {
    if (this.texture) {
      this.texture.dispose();
    }
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.needsUpdate = true;
    this.emitter.emit('HEATMAP_UPDATED', { texture: this.texture });
  }

  start(): void {
    this.isRunning = true;
    this.lastUpdateTime = performance.now();

    const animate = (time: number) => {
      if (!this.isRunning) return;

      const dt = Math.min((time - this.lastUpdateTime) / 1000, 0.1);
      this.lastUpdateTime = time;

      if (this.stations.length > 0) {
        this.diffuse(dt);
        this.renderHeatmap();
        this.emitTextureUpdate();
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.texture) {
      this.texture.dispose();
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getTexture(): THREE.CanvasTexture | null {
    return this.texture;
  }
}
