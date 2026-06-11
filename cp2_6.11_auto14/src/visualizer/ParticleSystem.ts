import * as THREE from 'three';
import { ParticleMode, DEFAULT_CONFIG } from '../types';
import type { ParticleSystemConfig } from '../types';

const HUE_MIN = 0;
const HUE_MAX = 280 / 360;
const SATURATION = 1.0;
const LIGHTNESS_MIN = 0.4;
const LIGHTNESS_MAX = 0.7;

export class ParticleSystem {
  private config: ParticleSystemConfig;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;

  private baseSphereX: Float32Array;
  private baseSphereY: Float32Array;
  private baseSphereZ: Float32Array;
  private sphereNormalX: Float32Array;
  private sphereNormalY: Float32Array;
  private sphereNormalZ: Float32Array;

  private baseBarX: Float32Array;
  private baseBarY: Float32Array;
  private baseBarZ: Float32Array;

  private freqIndex: Float32Array;
  private barColumn: Int32Array;

  private currentMode: ParticleMode;
  private targetMode: ParticleMode;
  private transitionStart: number = 0;
  private transitioning: boolean = false;

  private tempColor: THREE.Color;

  constructor(customConfig?: Partial<ParticleSystemConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
    this.currentMode = ParticleMode.SPHERE;
    this.targetMode = ParticleMode.SPHERE;
    this.tempColor = new THREE.Color();

    const N = this.config.particleCount;
    this.baseSphereX = new Float32Array(N);
    this.baseSphereY = new Float32Array(N);
    this.baseSphereZ = new Float32Array(N);
    this.sphereNormalX = new Float32Array(N);
    this.sphereNormalY = new Float32Array(N);
    this.sphereNormalZ = new Float32Array(N);
    this.baseBarX = new Float32Array(N);
    this.baseBarY = new Float32Array(N);
    this.baseBarZ = new Float32Array(N);
    this.freqIndex = new Float32Array(N);
    this.barColumn = new Int32Array(N);

    this.generateSpherePositions();
    this.generateBarPositions();
  }

  private generateSpherePositions(): void {
    const N = this.config.particleCount;
    const R = this.config.sphereRadius;
    for (let i = 0; i < N; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const sinPhi = Math.sin(phi);
      const nx = sinPhi * Math.cos(theta);
      const ny = sinPhi * Math.sin(theta);
      const nz = Math.cos(phi);
      this.sphereNormalX[i] = nx;
      this.sphereNormalY[i] = ny;
      this.sphereNormalZ[i] = nz;
      this.baseSphereX[i] = nx * R;
      this.baseSphereY[i] = ny * R;
      this.baseSphereZ[i] = nz * R;
    }
  }

  private generateBarPositions(): void {
    const N = this.config.particleCount;
    const cols = this.config.barColumns;
    const rows = this.config.barRows;
    const spacing = this.config.barSpacing;
    const freqBins = this.config.fftSize / 2;
    const binsPerCol = Math.max(1, Math.floor(freqBins / cols));
    const rowSpacing = 0.15;
    const yCenter = (rows - 1) * rowSpacing / 2;

    for (let i = 0; i < N; i++) {
      this.freqIndex[i] = (i / (N - 1)) * (freqBins - 1);
      const col = Math.min(cols - 1, Math.floor(this.freqIndex[i] / binsPerCol));
      const row = i % rows;
      this.barColumn[i] = col;
      this.baseBarX[i] = (col - (cols - 1) / 2) * spacing;
      this.baseBarY[i] = row * rowSpacing - yCenter;
      this.baseBarZ[i] = 0;
    }
  }

  init(scene: THREE.Scene): void {
    const N = this.config.particleCount;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);

    for (let i = 0; i < N; i++) {
      positions[i * 3] = this.baseSphereX[i];
      positions[i * 3 + 1] = this.baseSphereY[i];
      positions[i * 3 + 2] = this.baseSphereZ[i];
      const t = i / (N - 1);
      this.tempColor.setHSL(HUE_MIN + t * (HUE_MAX - HUE_MIN), SATURATION, (LIGHTNESS_MIN + LIGHTNESS_MAX) / 2);
      colors[i * 3] = this.tempColor.r;
      colors[i * 3 + 1] = this.tempColor.g;
      colors[i * 3 + 2] = this.tempColor.b;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }

  setMode(mode: ParticleMode): void {
    if (mode === this.targetMode) return;
    this.targetMode = mode;
    this.transitionStart = performance.now();
    this.transitioning = true;
  }

  setStatic(): void {
    if (!this.geometry) return;
    const N = this.config.particleCount;
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;
    const R = this.config.sphereRadius;

    for (let i = 0; i < N; i++) {
      positions[i * 3] = this.sphereNormalX[i] * R;
      positions[i * 3 + 1] = this.sphereNormalY[i] * R;
      positions[i * 3 + 2] = this.sphereNormalZ[i] * R;
      const t = i / (N - 1);
      this.tempColor.setHSL(HUE_MIN + t * (HUE_MAX - HUE_MIN), SATURATION, (LIGHTNESS_MIN + LIGHTNESS_MAX) / 2);
      colors[i * 3] = this.tempColor.r;
      colors[i * 3 + 1] = this.tempColor.g;
      colors[i * 3 + 2] = this.tempColor.b;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  update(freqData: Uint8Array, _dt: number): void {
    if (!this.geometry) return;

    const N = this.config.particleCount;
    const freqBins = this.config.fftSize / 2;
    const R = this.config.sphereRadius;
    const maxDisp = this.config.maxDisplacement;
    const cols = this.config.barColumns;
    const binsPerCol = Math.max(1, Math.floor(freqBins / cols));
    const rows = this.config.barRows;

    let t = 1;
    if (this.transitioning) {
      const now = performance.now();
      const raw = (now - this.transitionStart) / this.config.transitionDuration;
      t = Math.max(0, Math.min(1, raw));
      t = t * t * (3 - 2 * t);
      if (raw >= 1) {
        this.transitioning = false;
        this.currentMode = this.targetMode;
      }
    }

    const fromSphere = this.currentMode === ParticleMode.SPHERE;
    const toBar = this.targetMode === ParticleMode.BAR;
    const lerpFactor = this.transitioning ? (toBar ? t : 1 - t) : (this.currentMode === ParticleMode.BAR ? 1 : 0);

    const columnAvg: number[] = new Array(cols).fill(0);
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      const start = c * binsPerCol;
      const end = Math.min(freqBins, start + binsPerCol);
      for (let j = start; j < end; j++) sum += freqData[j];
      columnAvg[c] = (sum / (end - start)) / 255;
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    for (let i = 0; i < N; i++) {
      const fi = this.freqIndex[i];
      const low = Math.floor(fi);
      const high = Math.min(freqBins - 1, low + 1);
      const frac = fi - low;
      const ampByte = freqData[low] * (1 - frac) + freqData[high] * frac;
      const amp = ampByte / 255;

      const sphereR = R + amp * maxDisp;
      const sx = this.sphereNormalX[i] * sphereR;
      const sy = this.sphereNormalY[i] * sphereR;
      const sz = this.sphereNormalZ[i] * sphereR;

      const col = this.barColumn[i];
      const row = i % rows;
      const rowSpacing = 0.15;
      const yCenter = (rows - 1) * rowSpacing / 2;
      const colAmp = columnAvg[col];
      const bx = this.baseBarX[i];
      const by = (row * rowSpacing - yCenter) + colAmp * 5.0;
      const bz = this.baseBarZ[i];

      let px: number, py: number, pz: number;
      if (fromSphere && toBar) {
        px = sx + (bx - sx) * t;
        py = sy + (by - sy) * t;
        pz = sz + (bz - sz) * t;
      } else if (!fromSphere && !toBar) {
        px = bx + (sx - bx) * t;
        py = by + (sy - by) * t;
        pz = bz + (sz - bz) * t;
      } else {
        if (lerpFactor < 0.5) {
          px = sx; py = sy; pz = sz;
        } else {
          px = bx; py = by; pz = bz;
        }
      }

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      const freqT = fi / (freqBins - 1);
      const hue = HUE_MIN + freqT * (HUE_MAX - HUE_MIN);
      const light = LIGHTNESS_MIN + amp * (LIGHTNESS_MAX - LIGHTNESS_MIN);
      this.tempColor.setHSL(hue, SATURATION, light);
      colors[i * 3] = this.tempColor.r;
      colors[i * 3 + 1] = this.tempColor.g;
      colors[i * 3 + 2] = this.tempColor.b;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  dispose(): void {
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    this.points = null;
    this.geometry = null;
    this.material = null;
  }
}
