import * as THREE from 'three';

export interface ParticleParams {
  emissionSpeed: number;
  particleSize: number;
  colorGradient: number;
  rotationSpeed: number;
  gravityStrength: number;
}

const PARTICLE_COUNT = 2200;
const SPHERE_RADIUS = 15;
const LINE_DISTANCE_THRESHOLD = 2.5;
const MAX_LINES = 12000;
const PARAM_LERP_SPEED = 6;

export class ParticleUniverse {
  private scene: THREE.Scene;
  private particleCount: number;

  private positions: Float32Array;
  private velocities: Float32Array;
  private baseHues: Float32Array;
  private sizes: Float32Array;
  private colors: Float32Array;

  private currentParams: ParticleParams;
  private targetParams: ParticleParams;

  private points: THREE.Points;
  private pointsGeometry: THREE.BufferGeometry;
  private pointsMaterial: THREE.PointsMaterial;

  private linesGeometry: THREE.BufferGeometry;
  private linesMaterial: THREE.LineBasicMaterial;
  private lines: THREE.LineSegments;
  private linePositions: Float32Array;
  private lineColors: Float32Array;
  private lineCount = 0;

  private explosionVelocity: Float32Array | null = null;
  private explosionIntensity = 0;

  private tempColor = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleCount = PARTICLE_COUNT;

    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.baseHues = new Float32Array(this.particleCount);
    this.sizes = new Float32Array(this.particleCount);
    this.colors = new Float32Array(this.particleCount * 3);

    this.currentParams = {
      emissionSpeed: 1.0,
      particleSize: 0.5,
      colorGradient: 0.3,
      rotationSpeed: 0.3,
      gravityStrength: 0.1
    };

    this.targetParams = { ...this.currentParams };

    this.generateParticles();
    this.createPoints();
    this.createLines();
  }

  private generateParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = SPHERE_RADIUS * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      const tangent = new THREE.Vector3(-z, 0, x);
      tangent.normalize();

      const speed = 0.8 + Math.random() * 0.4;
      const upJitter = (Math.random() - 0.5) * 0.3;

      this.velocities[i3] = tangent.x * speed;
      this.velocities[i3 + 1] = upJitter;
      this.velocities[i3 + 2] = tangent.z * speed;

      this.baseHues[i] = Math.random();

      this.sizes[i] = 0.7 + Math.random() * 0.6;
    }

    this.updateAllColors();
  }

  private updateAllColors(): void {
    const gradient = this.currentParams.colorGradient;
    const colorAttr = this.pointsGeometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const hue = 0.6 + gradient * 0.4 + this.baseHues[i] * 0.08 - 0.04;
      const saturation = 0.8 + this.baseHues[i] * 0.15;
      const lightness = 0.55 + this.baseHues[i] * 0.15;

      this.tempColor.setHSL(hue, saturation, lightness);
      colors[i3] = this.tempColor.r;
      colors[i3 + 1] = this.tempColor.g;
      colors[i3 + 2] = this.tempColor.b;
    }

    colorAttr.needsUpdate = true;
  }

  private createPoints(): void {
    const colors = new Float32Array(this.particleCount * 3);

    this.pointsGeometry = new THREE.BufferGeometry();
    this.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.pointsMaterial = new THREE.PointsMaterial({
      size: this.currentParams.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
    this.scene.add(this.points);
  }

  private createLines(): void {
    this.linePositions = new Float32Array(MAX_LINES * 6);
    this.lineColors = new Float32Array(MAX_LINES * 6);

    this.linesGeometry = new THREE.BufferGeometry();
    this.linesGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.linesGeometry.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));
    this.linesGeometry.setDrawRange(0, 0);

    this.linesMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.lines = new THREE.LineSegments(this.linesGeometry, this.linesMaterial);
    this.scene.add(this.lines);
  }

  public setParams(params: Partial<ParticleParams>): void {
    this.targetParams = { ...this.targetParams, ...params };
  }

  public reset(): void {
    this.generateParticles();
    this.explosionVelocity = null;
    this.explosionIntensity = 0;

    const posAttr = this.pointsGeometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  }

  public explode(): void {
    this.explosionVelocity = new Float32Array(this.particleCount * 3);
    this.explosionIntensity = 1;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const x = this.positions[i3];
      const y = this.positions[i3 + 1];
      const z = this.positions[i3 + 2];
      const len = Math.sqrt(x * x + y * y + z * z) || 1;

      const force = 10 + Math.random() * 8;
      this.explosionVelocity[i3] = (x / len) * force;
      this.explosionVelocity[i3 + 1] = (y / len) * force;
      this.explosionVelocity[i3 + 2] = (z / len) * force;
    }
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.05);

    this.lerpParams(dt);
    this.updateParticles(dt);
    this.updateLines();

    const posAttr = this.pointsGeometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;

    this.pointsMaterial.size = this.currentParams.particleSize;
  }

  private lerpParams(dt: number): void {
    const t = 1 - Math.exp(-PARAM_LERP_SPEED * dt);

    let colorChanged = false;

    if (this.currentParams.emissionSpeed !== this.targetParams.emissionSpeed) {
      this.currentParams.emissionSpeed += (this.targetParams.emissionSpeed - this.currentParams.emissionSpeed) * t;
    }
    if (this.currentParams.particleSize !== this.targetParams.particleSize) {
      this.currentParams.particleSize += (this.targetParams.particleSize - this.currentParams.particleSize) * t;
    }
    if (Math.abs(this.currentParams.colorGradient - this.targetParams.colorGradient) > 0.001) {
      this.currentParams.colorGradient += (this.targetParams.colorGradient - this.currentParams.colorGradient) * t;
      colorChanged = true;
    }
    if (this.currentParams.rotationSpeed !== this.targetParams.rotationSpeed) {
      this.currentParams.rotationSpeed += (this.targetParams.rotationSpeed - this.currentParams.rotationSpeed) * t;
    }
    if (this.currentParams.gravityStrength !== this.targetParams.gravityStrength) {
      this.currentParams.gravityStrength += (this.targetParams.gravityStrength - this.currentParams.gravityStrength) * t;
    }

    if (colorChanged) {
      this.updateAllColors();
    }
  }

  private updateParticles(dt: number): void {
    const speedMul = this.currentParams.emissionSpeed;
    const gravity = this.currentParams.gravityStrength;
    const rotSpeed = this.currentParams.rotationSpeed;

    if (this.explosionVelocity) {
      this.explosionIntensity *= Math.pow(0.96, dt * 60);
      if (this.explosionIntensity < 0.005) {
        this.explosionVelocity = null;
        this.explosionIntensity = 0;
      }
    }

    const colorAttr = this.pointsGeometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      let vx = this.velocities[i3] * speedMul * rotSpeed;
      let vy = this.velocities[i3 + 1] * speedMul * 0.3;
      let vz = this.velocities[i3 + 2] * speedMul * rotSpeed;

      if (gravity !== 0) {
        const x = this.positions[i3];
        const y = this.positions[i3 + 1];
        const z = this.positions[i3 + 2];
        const distSq = x * x + y * y + z * z;
        const dist = Math.sqrt(distSq) || 1;
        const gForce = gravity * 1.5;
        vx += (-x / dist) * gForce * dt;
        vy += (-y / dist) * gForce * dt;
        vz += (-z / dist) * gForce * dt;
      }

      if (this.explosionVelocity && this.explosionIntensity > 0) {
        const exp = this.explosionIntensity;
        vx += this.explosionVelocity[i3] * exp * dt * 3;
        vy += this.explosionVelocity[i3 + 1] * exp * dt * 3;
        vz += this.explosionVelocity[i3 + 2] * exp * dt * 3;
      }

      this.positions[i3] += vx * dt;
      this.positions[i3 + 1] += vy * dt;
      this.positions[i3 + 2] += vz * dt;

      const px = this.positions[i3];
      const py = this.positions[i3 + 1];
      const pz = this.positions[i3 + 2];
      const distFromCenter = Math.sqrt(px * px + py * py + pz * pz);

      const maxRadius = SPHERE_RADIUS * 1.8;
      if (distFromCenter > maxRadius) {
        const scale = maxRadius / distFromCenter;
        this.positions[i3] *= scale;
        this.positions[i3 + 1] *= scale;
        this.positions[i3 + 2] *= scale;

        const nx = px / distFromCenter;
        const ny = py / distFromCenter;
        const nz = pz / distFromCenter;
        const dot = this.velocities[i3] * nx + this.velocities[i3 + 1] * ny + this.velocities[i3 + 2] * nz;
        if (dot > 0) {
          this.velocities[i3] -= 2 * dot * nx;
          this.velocities[i3 + 1] -= 2 * dot * ny;
          this.velocities[i3 + 2] -= 2 * dot * nz;
        }
      }
    }
  }

  private updateLines(): void {
    this.lineCount = 0;
    const threshold = LINE_DISTANCE_THRESHOLD;
    const thresholdSq = threshold * threshold;
    const maxLines = MAX_LINES;
    const cellSize = threshold;

    const grid: Map<string, number[]> = new Map();
    const pos = this.positions;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const gx = (pos[i3] / cellSize) | 0;
      const gy = (pos[i3 + 1] / cellSize) | 0;
      const gz = (pos[i3 + 2] / cellSize) | 0;
      const key = gx + ',' + gy + ',' + gz;

      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }
      cell.push(i);
    }

    const colorAttr = this.pointsGeometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;
    const linePos = this.linePositions;
    const lineCol = this.lineColors;

    for (let i = 0; i < this.particleCount && this.lineCount < maxLines; i++) {
      const i3 = i * 3;
      const gx = (pos[i3] / cellSize) | 0;
      const gy = (pos[i3 + 1] / cellSize) | 0;
      const gz = (pos[i3 + 2] / cellSize) | 0;

      for (let cx = -1; cx <= 1 && this.lineCount < maxLines; cx++) {
        for (let cy = -1; cy <= 1 && this.lineCount < maxLines; cy++) {
          for (let cz = -1; cz <= 1 && this.lineCount < maxLines; cz++) {
            const key = (gx + cx) + ',' + (gy + cy) + ',' + (gz + cz);
            const cell = grid.get(key);
            if (!cell) continue;

            for (let k = 0; k < cell.length && this.lineCount < maxLines; k++) {
              const j = cell[k];
              if (j <= i) continue;

              const j3 = j * 3;
              const dx = pos[i3] - pos[j3];
              const dy = pos[i3 + 1] - pos[j3 + 1];
              const dz = pos[i3 + 2] - pos[j3 + 2];
              const distSq = dx * dx + dy * dy + dz * dz;

              if (distSq < thresholdSq) {
                const dist = Math.sqrt(distSq);
                const alpha = (1 - dist / threshold) * 0.5;

                const li6 = this.lineCount * 6;

                linePos[li6] = pos[i3];
                linePos[li6 + 1] = pos[i3 + 1];
                linePos[li6 + 2] = pos[i3 + 2];
                linePos[li6 + 3] = pos[j3];
                linePos[li6 + 4] = pos[j3 + 1];
                linePos[li6 + 5] = pos[j3 + 2];

                const cr = (colors[i3] + colors[j3]) * 0.5;
                const cg = (colors[i3 + 1] + colors[j3 + 1]) * 0.5;
                const cb = (colors[i3 + 2] + colors[j3 + 2]) * 0.5;

                lineCol[li6] = cr * alpha;
                lineCol[li6 + 1] = cg * alpha;
                lineCol[li6 + 2] = cb * alpha;
                lineCol[li6 + 3] = cr * alpha;
                lineCol[li6 + 4] = cg * alpha;
                lineCol[li6 + 5] = cb * alpha;

                this.lineCount++;
              }
            }
          }
        }
      }
    }

    this.linesGeometry.setDrawRange(0, this.lineCount * 2);
    const linePosAttr = this.linesGeometry.getAttribute('position') as THREE.BufferAttribute;
    const lineColAttr = this.linesGeometry.getAttribute('color') as THREE.BufferAttribute;
    linePosAttr.needsUpdate = true;
    lineColAttr.needsUpdate = true;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public getLineCount(): number {
    return this.lineCount;
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.scene.remove(this.lines);
    this.pointsGeometry.dispose();
    this.pointsMaterial.dispose();
    this.linesGeometry.dispose();
    this.linesMaterial.dispose();
  }
}
