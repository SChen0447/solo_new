import * as THREE from 'three';
import { interpolateViridis, interpolatePlasma, interpolateInferno } from 'd3-scale-chromatic';
import { eventBus } from './eventBus';
import { FlowFieldData, getVelocityAt } from './dataParser';

type ColorSchemeName = 'Viridis' | 'Plasma' | 'Inferno';

const COLOR_INTERPOLATORS: Record<ColorSchemeName, (t: number) => string> = {
  Viridis: interpolateViridis,
  Plasma: interpolatePlasma,
  Inferno: interpolateInferno,
};

const COLOR_SCHEME_KEYS: ColorSchemeName[] = ['Viridis', 'Plasma', 'Inferno'];
const LUT_SIZE = 256;

interface ColorLUT {
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
}

function buildColorLUT(interpolator: (t: number) => string): ColorLUT {
  const r = new Float32Array(LUT_SIZE);
  const g = new Float32Array(LUT_SIZE);
  const b = new Float32Array(LUT_SIZE);
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    const hex = interpolator(t);
    r[i] = parseInt(hex.slice(1, 3), 16) / 255;
    g[i] = parseInt(hex.slice(3, 5), 16) / 255;
    b[i] = parseInt(hex.slice(5, 7), 16) / 255;
  }
  return { r, g, b };
}

const PARTICLE_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 32.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    float edgeFade = 1.0 - smoothstep(0.2, 0.5, dist);
    float alpha = vAlpha * edgeFade;

    gl_FragColor = vec4(vColor, alpha);
  }
`;

export interface ParticleSystemConfig {
  particleCount: number;
  speedScale: number;
  colorScheme: ColorSchemeName;
  sliceEnabled: boolean;
  sliceAxis: 'x' | 'y' | 'z';
  slicePosition: number;
  sliceThreshold: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private fieldData: FlowFieldData | null = null;
  private points: THREE.Points | null = null;
  private positions: Float32Array;
  private colors: Float32Array;
  private alphas: Float32Array;
  private sizes: Float32Array;
  private config: ParticleSystemConfig;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private boundsMin: THREE.Vector3;
  private boundsMax: THREE.Vector3;
  private colorLUT: ColorLUT;
  private prevColorLUT: ColorLUT | null = null;
  private colorTransitionProgress = 1;
  private raycaster: THREE.Raycaster;
  private rayOrigin: THREE.Vector2;

  constructor(scene: THREE.Scene, config?: Partial<ParticleSystemConfig>) {
    this.scene = scene;
    this.config = {
      particleCount: 8000,
      speedScale: 1.0,
      colorScheme: 'Viridis',
      sliceEnabled: false,
      sliceAxis: 'z',
      slicePosition: 8,
      sliceThreshold: 2,
      ...config,
    };

    const count = this.config.particleCount;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.alphas = new Float32Array(count);
    this.sizes = new Float32Array(count);

    this.boundsMin = new THREE.Vector3(0, 0, 0);
    this.boundsMax = new THREE.Vector3(64, 64, 16);

    this.colorLUT = buildColorLUT(COLOR_INTERPOLATORS[this.config.colorScheme]);
    this.raycaster = new THREE.Raycaster();
    this.rayOrigin = new THREE.Vector2();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    this.initParticleSizes();

    eventBus.on('event:dataReady', (data) => this.onDataReady(data as FlowFieldData));
  }

  private onDataReady(data: FlowFieldData): void {
    this.fieldData = data;
    const [nx, ny, nz] = data.dimensions;
    const [ox, oy, oz] = data.origin;
    const [sx, sy, sz] = data.spacing;

    this.boundsMin.set(ox, oy, oz);
    this.boundsMax.set(ox + (nx - 1) * sx, oy + (ny - 1) * sy, oz + (nz - 1) * sz);

    this.config.slicePosition = Math.floor(nz / 2);
    this.scatterParticles();
  }

  private scatterParticles(): void {
    if (!this.fieldData) return;

    const count = this.config.particleCount;
    const [nx, ny, nz] = this.fieldData.dimensions;
    const [ox, oy, oz] = this.fieldData.origin;
    const [sx, sy, sz] = this.fieldData.spacing;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      this.positions[i3] = ox + Math.random() * (nx - 1) * sx;
      this.positions[i3 + 1] = oy + Math.random() * (ny - 1) * sy;
      this.positions[i3 + 2] = oz + Math.random() * (nz - 1) * sz;
      this.alphas[i] = 0.6 + Math.random() * 0.4;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
  }

  private initParticleSizes(): void {
    const count = this.config.particleCount;
    for (let i = 0; i < count; i++) {
      this.sizes[i] = 1 + Math.random() * 4;
    }
    this.geometry.attributes.aSize.needsUpdate = true;
  }

  private speedToLUTIndex(speed: number): number {
    if (!this.fieldData) return 128;
    const range = this.fieldData.maxSpeed - this.fieldData.minSpeed;
    const t = range > 0 ? (speed - this.fieldData.minSpeed) / range : 0.5;
    return Math.max(0, Math.min(LUT_SIZE - 1, Math.round(t * (LUT_SIZE - 1))));
  }

  update(deltaTime: number): void {
    if (!this.fieldData) return;

    const dt = Math.min(deltaTime, 0.05);
    const count = this.config.particleCount;
    const speedScale = this.config.speedScale;
    const lut = this.colorLUT;
    const prevLut = this.prevColorLUT;
    const isTransitioning = this.colorTransitionProgress < 1 && prevLut !== null;
    let smoothT = 1;

    if (isTransitioning) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + dt / 0.3);
      const t = this.colorTransitionProgress;
      smoothT = t * t * (3 - 2 * t);
    }

    const invSmoothT = 1 - smoothT;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];

      const vel = getVelocityAt(this.fieldData, px, py, pz);

      this.positions[i3] += vel[0] * dt * speedScale;
      this.positions[i3 + 1] += vel[1] * dt * speedScale;
      this.positions[i3 + 2] += vel[2] * dt * speedScale;

      const outOfBounds =
        this.positions[i3] < this.boundsMin.x || this.positions[i3] > this.boundsMax.x ||
        this.positions[i3 + 1] < this.boundsMin.y || this.positions[i3 + 1] > this.boundsMax.y ||
        this.positions[i3 + 2] < this.boundsMin.z || this.positions[i3 + 2] > this.boundsMax.z;

      if (outOfBounds) {
        this.positions[i3] = this.boundsMin.x + Math.random() * (this.boundsMax.x - this.boundsMin.x);
        this.positions[i3 + 1] = this.boundsMin.y + Math.random() * (this.boundsMax.y - this.boundsMin.y);
        this.positions[i3 + 2] = this.boundsMin.z + Math.random() * (this.boundsMax.z - this.boundsMin.z);
      }

      const speed = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
      const li = this.speedToLUTIndex(speed);

      if (isTransitioning) {
        this.colors[i3] = prevLut.r[li] * invSmoothT + lut.r[li] * smoothT;
        this.colors[i3 + 1] = prevLut.g[li] * invSmoothT + lut.g[li] * smoothT;
        this.colors[i3 + 2] = prevLut.b[li] * invSmoothT + lut.b[li] * smoothT;
      } else {
        this.colors[i3] = lut.r[li];
        this.colors[i3 + 1] = lut.g[li];
        this.colors[i3 + 2] = lut.b[li];
      }
    }

    if (this.colorTransitionProgress >= 1) {
      this.prevColorLUT = null;
    }

    this.updateSliceVisibility();

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
  }

  private updateSliceVisibility(): void {
    const count = this.config.particleCount;

    if (!this.config.sliceEnabled) {
      for (let i = 0; i < count; i++) {
        this.alphas[i] = 0.6 + Math.random() * 0.4;
      }
      return;
    }

    const axis = this.config.sliceAxis;
    const pos = this.config.slicePosition;
    const threshold = this.config.sliceThreshold;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let coord: number;

      if (axis === 'x') {
        coord = this.positions[i3];
      } else if (axis === 'y') {
        coord = this.positions[i3 + 1];
      } else {
        coord = this.positions[i3 + 2];
      }

      const dist = Math.abs(coord - pos);
      if (dist <= threshold) {
        const fadeFactor = 1.0 - (dist / threshold) * 0.5;
        this.alphas[i] = fadeFactor * (0.6 + Math.random() * 0.4);
      } else {
        this.alphas[i] = 0.04;
      }
    }
  }

  setParticleCount(count: number): void {
    if (count === this.config.particleCount) return;

    this.config.particleCount = count;

    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.alphas = new Float32Array(count);
    this.sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.sizes[i] = 1 + Math.random() * 4;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));

    this.scatterParticles();
  }

  setSpeedScale(scale: number): void {
    this.config.speedScale = scale;
  }

  setColorScheme(scheme: ColorSchemeName): void {
    if (scheme === this.config.colorScheme) return;
    this.prevColorLUT = {
      r: new Float32Array(this.colorLUT.r),
      g: new Float32Array(this.colorLUT.g),
      b: new Float32Array(this.colorLUT.b),
    };
    this.config.colorScheme = scheme;
    this.colorLUT = buildColorLUT(COLOR_INTERPOLATORS[scheme]);
    this.colorTransitionProgress = 0;
  }

  setSliceEnabled(enabled: boolean): void {
    this.config.sliceEnabled = enabled;
  }

  setSliceAxis(axis: 'x' | 'y' | 'z'): void {
    this.config.sliceAxis = axis;
  }

  setSlicePosition(pos: number): void {
    this.config.slicePosition = pos;
  }

  setSliceThreshold(threshold: number): void {
    this.config.sliceThreshold = threshold;
  }

  getConfig(): ParticleSystemConfig {
    return { ...this.config };
  }

  getColorSchemeKeys(): ColorSchemeName[] {
    return [...COLOR_SCHEME_KEYS];
  }

  getFieldData(): FlowFieldData | null {
    return this.fieldData;
  }

  getBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
    return { min: this.boundsMin.clone(), max: this.boundsMax.clone() };
  }

  getHoverInfo(mouseX: number, mouseY: number, camera: THREE.Camera): { speed: number; position: THREE.Vector3 } | null {
    if (!this.fieldData) return null;

    this.rayOrigin.set(mouseX, mouseY);
    this.raycaster.setFromCamera(this.rayOrigin, camera);
    this.raycaster.params.Points.threshold = 1.5;

    const intersects = this.raycaster.intersectObject(this.points!);
    if (intersects.length === 0) return null;

    const point = intersects[0].point;
    const vel = getVelocityAt(this.fieldData, point.x, point.y, point.z);
    const speed = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);

    return { speed, position: point };
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.points) {
      this.scene.remove(this.points);
    }
  }
}
