import * as THREE from 'three';
import {
  ParticleConfig,
  COLOR_GRADIENTS,
  sampleGradient,
  createSeededRandom,
  validateConfig,
  DEFAULT_CONFIG,
} from './universeConfig';

const MAX_CONNECTIONS = 2000;
const CONNECTION_SEGMENTS = 1;

export class ParticleSystem {
  private config: ParticleConfig;
  private points: THREE.Points | null = null;
  private connectionLines: THREE.LineSegments | null = null;
  private positions: Float32Array = new Float32Array(0);
  private colors: Float32Array = new Float32Array(0);
  private velocities: Float32Array = new Float32Array(0);
  private basePositions: Float32Array = new Float32Array(0);
  private radii: Float32Array = new Float32Array(0);
  private group: THREE.Group;

  constructor(config: ParticleConfig = DEFAULT_CONFIG) {
    this.config = validateConfig(config);
    this.group = new THREE.Group();
    this.buildSystem();
  }

  private buildSystem(): void {
    this.dispose();
    this.initParticles();
    this.initConnections();
  }

  private initParticles(): void {
    const { count, seed, radius, colorPreset } = this.config;
    const rng = createSeededRandom(seed);
    const gradient = COLOR_GRADIENTS[colorPreset];

    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.basePositions = new Float32Array(count * 3);
    this.radii = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const r = radius * Math.cbrt(rng());
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.basePositions[i3] = x;
      this.basePositions[i3 + 1] = y;
      this.basePositions[i3 + 2] = z;

      this.radii[i] = Math.sqrt(x * x + y * y + z * z);

      const speedFactor = 0.5 + rng() * 0.5;
      this.velocities[i3] = (rng() - 0.5) * speedFactor;
      this.velocities[i3 + 1] = (rng() - 0.5) * speedFactor;
      this.velocities[i3 + 2] = (rng() - 0.5) * speedFactor;

      const normalizedR = this.radii[i] / radius;
      const color = sampleGradient(gradient, normalizedR);
      this.colors[i3] = color[0];
      this.colors[i3 + 1] = color[1];
      this.colors[i3 + 2] = color[2];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, material);
    this.group.add(this.points);
  }

  private initConnections(): void {
    const maxVertices = MAX_CONNECTIONS * 2 * 3;
    const linePositions = new Float32Array(maxVertices);
    const lineColors = new Float32Array(maxVertices);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.connectionLines = new THREE.LineSegments(geometry, material);
    this.group.add(this.connectionLines);
  }

  update(delta: number): void {
    const { motionMode, speed, decayFactor, radius, rotationAxis, brownianIntensity } = this.config;

    if (motionMode === 'VORTEX') {
      this.updateVortex(delta, speed, decayFactor, radius, rotationAxis);
    } else {
      this.updateBrownian(delta, speed, brownianIntensity, radius);
    }

    if (this.points) {
      const posAttr = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
    }

    this.updateConnections();
  }

  private updateVortex(
    delta: number,
    speed: number,
    decayFactor: number,
    radius: number,
    rotationAxis: string,
  ): void {
    const count = this.config.count;
    const dt = delta * speed * 0.3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let x = this.positions[i3];
      let y = this.positions[i3 + 1];
      let z = this.positions[i3 + 2];

      const r = Math.max(0.001, Math.sqrt(x * x + y * y + z * z));
      const angularSpeed = dt * decayFactor / (1 + r * 0.15);
      const angle = angularSpeed;

      let axis = rotationAxis;
      if (axis === 'RANDOM') {
        axis = ['X', 'Y', 'Z'][i % 3] as 'X' | 'Y' | 'Z';
      }

      if (axis === 'Y') {
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const nx = x * cosA - z * sinA;
        const nz = x * sinA + z * cosA;
        x = nx;
        z = nz;
      } else if (axis === 'X') {
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const ny = y * cosA - z * sinA;
        const nz = y * sinA + z * cosA;
        y = ny;
        z = nz;
      } else {
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const nx = x * cosA - y * sinA;
        const ny = x * sinA + y * cosA;
        x = nx;
        y = ny;
      }

      const spiralDrift = speed * 0.002 * dt;
      const rad = Math.sqrt(x * x + y * y + z * z);
      if (rad > 0.01) {
        x += (x / rad) * spiralDrift;
        y += (y / rad) * spiralDrift;
        z += (z / rad) * spiralDrift;
      }

      const currentR = Math.sqrt(x * x + y * y + z * z);
      const maxR = radius * 1.2;
      if (currentR > maxR) {
        const scale = maxR / currentR;
        x *= scale;
        y *= scale;
        z *= scale;
      }

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;
    }
  }

  private updateBrownian(
    delta: number,
    speed: number,
    intensity: number,
    radius: number,
  ): void {
    const count = this.config.count;
    const dt = delta * speed * 0.5;
    const jitter = intensity * 0.05;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      this.velocities[i3] += (Math.random() - 0.5) * jitter * dt;
      this.velocities[i3 + 1] += (Math.random() - 0.5) * jitter * dt;
      this.velocities[i3 + 2] += (Math.random() - 0.5) * jitter * dt;

      this.velocities[i3] *= 0.98;
      this.velocities[i3 + 1] *= 0.98;
      this.velocities[i3 + 2] *= 0.98;

      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      const x = this.positions[i3];
      const y = this.positions[i3 + 1];
      const z = this.positions[i3 + 2];
      const currentR = Math.sqrt(x * x + y * y + z * z);
      const maxR = radius * 1.2;

      if (currentR > maxR) {
        const scale = maxR / currentR;
        this.positions[i3] *= scale;
        this.positions[i3 + 1] *= scale;
        this.positions[i3 + 2] *= scale;
        this.velocities[i3] *= -0.5;
        this.velocities[i3 + 1] *= -0.5;
        this.velocities[i3 + 2] *= -0.5;
      }
    }
  }

  private updateConnections(): void {
    if (!this.connectionLines) return;

    const { connectionThreshold, count } = this.config;
    const posAttr = this.connectionLines.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.connectionLines.geometry.getAttribute('color') as THREE.BufferAttribute;
    const linePositions = posAttr.array as Float32Array;
    const lineColors = colAttr.array as Float32Array;

    let lineIndex = 0;
    const thresholdSq = connectionThreshold * connectionThreshold;
    const step = Math.max(1, Math.floor(count / 3000));

    outer:
    for (let i = 0; i < count; i += step) {
      const i3 = i * 3;
      const ax = this.positions[i3];
      const ay = this.positions[i3 + 1];
      const az = this.positions[i3 + 2];

      for (let j = i + step; j < count; j += step) {
        if (lineIndex >= MAX_CONNECTIONS) break outer;

        const j3 = j * 3;
        const dx = ax - this.positions[j3];
        const dy = ay - this.positions[j3 + 1];
        const dz = az - this.positions[j3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < thresholdSq && distSq > 0.001) {
          const vIdx = lineIndex * 6;

          linePositions[vIdx] = ax;
          linePositions[vIdx + 1] = ay;
          linePositions[vIdx + 2] = az;
          linePositions[vIdx + 3] = this.positions[j3];
          linePositions[vIdx + 4] = this.positions[j3 + 1];
          linePositions[vIdx + 5] = this.positions[j3 + 2];

          const alpha = 1.0 - Math.sqrt(distSq) / connectionThreshold;
          lineColors[vIdx] = this.colors[i3] * alpha;
          lineColors[vIdx + 1] = this.colors[i3 + 1] * alpha;
          lineColors[vIdx + 2] = this.colors[i3 + 2] * alpha;
          lineColors[vIdx + 3] = this.colors[j3] * alpha;
          lineColors[vIdx + 4] = this.colors[j3 + 1] * alpha;
          lineColors[vIdx + 5] = this.colors[j3 + 2] * alpha;

          lineIndex++;
        }
      }
    }

    this.connectionLines.geometry.setDrawRange(0, lineIndex * 2);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  updateConfig(newConfig: Partial<ParticleConfig>): void {
    const oldConfig = { ...this.config };
    this.config = validateConfig({ ...this.config, ...newConfig });

    const needsRebuild =
      oldConfig.count !== this.config.count ||
      oldConfig.seed !== this.config.seed ||
      oldConfig.colorPreset !== this.config.colorPreset ||
      oldConfig.radius !== this.config.radius;

    if (needsRebuild) {
      this.buildSystem();
    }
  }

  getObject(): THREE.Group {
    return this.group;
  }

  getConfig(): ParticleConfig {
    return { ...this.config };
  }

  getPositionData(): Float32Array {
    return this.positions;
  }

  getColorData(): Float32Array {
    return this.colors;
  }

  dispose(): void {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.group.remove(this.points);
      this.points = null;
    }
    if (this.connectionLines) {
      this.connectionLines.geometry.dispose();
      (this.connectionLines.material as THREE.Material).dispose();
      this.group.remove(this.connectionLines);
      this.connectionLines = null;
    }
  }
}
