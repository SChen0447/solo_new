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
const MAX_LINES = 15000;
const PARAM_LERP_SPEED = 8;

export class ParticleUniverse {
  private scene: THREE.Scene;
  private particleCount: number;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

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

  private rotationAngle = 0;
  private explosionVelocity: Float32Array | null = null;
  private explosionIntensity = 0;

  private tempColor = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleCount = PARTICLE_COUNT;

    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);

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

      const radius = SPHERE_RADIUS * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      const speed = 0.5 + Math.random() * 0.5;
      const tangentY = -x;
      const tangentX = z;
      const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
      
      this.velocities[i3] = (tangentX / tangentLen) * speed * 0.3 + (Math.random() - 0.5) * 0.1;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
      this.velocities[i3 + 2] = (tangentY / tangentLen) * speed * 0.3 + (Math.random() - 0.5) * 0.1;

      this.updateParticleColor(i);

      this.sizes[i] = 0.8 + Math.random() * 0.4;
    }
  }

  private updateParticleColor(i: number): void {
    const i3 = i * 3;
    const gradient = this.currentParams.colorGradient;

    const hue = 0.6 + gradient * 0.4;
    const saturation = 0.8 + Math.random() * 0.2;
    const lightness = 0.5 + Math.random() * 0.3;

    this.tempColor.setHSL(hue, saturation, lightness);
    this.colors[i3] = this.tempColor.r;
    this.colors[i3 + 1] = this.tempColor.g;
    this.colors[i3 + 2] = this.tempColor.b;
  }

  private createPoints(): void {
    this.pointsGeometry = new THREE.BufferGeometry();
    this.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.pointsGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.pointsMaterial = new THREE.PointsMaterial({
      size: this.currentParams.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
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
      opacity: 0.6,
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
    this.rotationAngle = 0;

    const posAttr = this.pointsGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.pointsGeometry.getAttribute('color') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
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

      const force = 8 + Math.random() * 6;
      this.explosionVelocity[i3] = (x / len) * force;
      this.explosionVelocity[i3 + 1] = (y / len) * force;
      this.explosionVelocity[i3 + 2] = (z / len) * force;
    }
  }

  public update(deltaTime: number): void {
    this.lerpParams(deltaTime);
    this.updateParticles(deltaTime);
    this.updateLines();

    const posAttr = this.pointsGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = this.pointsGeometry.getAttribute('color') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

    this.pointsMaterial.size = this.currentParams.particleSize;
  }

  private lerpParams(deltaTime: number): void {
    const speed = PARAM_LERP_SPEED * deltaTime;
    const t = Math.min(1, speed);

    this.currentParams.emissionSpeed += (this.targetParams.emissionSpeed - this.currentParams.emissionSpeed) * t;
    this.currentParams.particleSize += (this.targetParams.particleSize - this.currentParams.particleSize) * t;
    this.currentParams.colorGradient += (this.targetParams.colorGradient - this.currentParams.colorGradient) * t;
    this.currentParams.rotationSpeed += (this.targetParams.rotationSpeed - this.currentParams.rotationSpeed) * t;
    this.currentParams.gravityStrength += (this.targetParams.gravityStrength - this.currentParams.gravityStrength) * t;
  }

  private updateParticles(deltaTime: number): void {
    const dt = deltaTime;
    const speed = this.currentParams.emissionSpeed;
    const gravity = this.currentParams.gravityStrength;
    const rotSpeed = this.currentParams.rotationSpeed;

    this.rotationAngle += rotSpeed * dt * 0.2;
    const cosR = Math.cos(this.rotationAngle);
    const sinR = Math.sin(this.rotationAngle);

    if (this.explosionVelocity) {
      this.explosionIntensity *= 0.98;
      if (this.explosionIntensity < 0.01) {
        this.explosionVelocity = null;
        this.explosionIntensity = 0;
      }
    }

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      let vx = this.velocities[i3] * speed;
      let vy = this.velocities[i3 + 1] * speed;
      let vz = this.velocities[i3 + 2] * speed;

      if (gravity !== 0) {
        const x = this.positions[i3];
        const y = this.positions[i3 + 1];
        const z = this.positions[i3 + 2];
        const dist = Math.sqrt(x * x + y * y + z * z) || 1;
        vx += (-x / dist) * gravity * 2 * dt;
        vy += (-y / dist) * gravity * 2 * dt;
        vz += (-z / dist) * gravity * 2 * dt;
      }

      if (this.explosionVelocity && this.explosionIntensity > 0) {
        vx += this.explosionVelocity[i3] * this.explosionIntensity * dt * 2;
        vy += this.explosionVelocity[i3 + 1] * this.explosionIntensity * dt * 2;
        vz += this.explosionVelocity[i3 + 2] * this.explosionIntensity * dt * 2;
      }

      this.positions[i3] += vx * dt;
      this.positions[i3 + 1] += vy * dt;
      this.positions[i3 + 2] += vz * dt;

      const px = this.positions[i3];
      const pz = this.positions[i3 + 2];
      this.positions[i3] = px * cosR - pz * sinR;
      this.positions[i3 + 2] = px * sinR + pz * cosR;

      const distFromCenter = Math.sqrt(
        this.positions[i3] * this.positions[i3] +
        this.positions[i3 + 1] * this.positions[i3 + 1] +
        this.positions[i3 + 2] * this.positions[i3 + 2]
      );

      if (distFromCenter > SPHERE_RADIUS * 1.5) {
        const scale = SPHERE_RADIUS * 1.5 / distFromCenter;
        this.positions[i3] *= scale;
        this.positions[i3 + 1] *= scale;
        this.positions[i3 + 2] *= scale;
      }
    }

    const colorAttr = this.pointsGeometry.getAttribute('color') as THREE.BufferAttribute;
    const colorArray = colorAttr.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const hue = 0.6 + this.currentParams.colorGradient * 0.4 + Math.sin(i * 0.01) * 0.02;
      this.tempColor.setHSL(hue, 0.85, 0.55 + Math.random() * 0.1);
      colorArray[i3] = this.tempColor.r;
      colorArray[i3 + 1] = this.tempColor.g;
      colorArray[i3 + 2] = this.tempColor.b;
    }
    colorAttr.needsUpdate = true;
  }

  private updateLines(): void {
    this.lineCount = 0;
    const threshold = LINE_DISTANCE_THRESHOLD;
    const thresholdSq = threshold * threshold;
    const maxLines = MAX_LINES;

    const cellSize = threshold;
    const grid: Map<string, number[]> = new Map();

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const gx = Math.floor(this.positions[i3] / cellSize);
      const gy = Math.floor(this.positions[i3 + 1] / cellSize);
      const gz = Math.floor(this.positions[i3 + 2] / cellSize);
      const key = `${gx},${gy},${gz}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(i);
    }

    const checked = new Set<string>();

    for (let i = 0; i < this.particleCount && this.lineCount < maxLines; i++) {
      const i3 = i * 3;
      const gx = Math.floor(this.positions[i3] / cellSize);
      const gy = Math.floor(this.positions[i3 + 1] / cellSize);
      const gz = Math.floor(this.positions[i3 + 2] / cellSize);

      for (let dx = -1; dx <= 1 && this.lineCount < maxLines; dx++) {
        for (let dy = -1; dy <= 1 && this.lineCount < maxLines; dy++) {
          for (let dz = -1; dz <= 1 && this.lineCount < maxLines; dz++) {
            const key = `${gx + dx},${gy + dy},${gz + dz}`;
            const cell = grid.get(key);
            if (!cell) continue;

            for (let k = 0; k < cell.length && this.lineCount < maxLines; k++) {
              const j = cell[k];
              if (j <= i) continue;

              const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);

              const j3 = j * 3;
              const ddx = this.positions[i3] - this.positions[j3];
              const ddy = this.positions[i3 + 1] - this.positions[j3 + 1];
              const ddz = this.positions[i3 + 2] - this.positions[j3 + 2];
              const distSq = ddx * ddx + ddy * ddy + ddz * ddz;

              if (distSq < thresholdSq) {
                const dist = Math.sqrt(distSq);
                const alpha = 1 - dist / threshold;
                const lineAlpha = alpha * 0.6;

                const li6 = this.lineCount * 6;

                this.linePositions[li6] = this.positions[i3];
                this.linePositions[li6 + 1] = this.positions[i3 + 1];
                this.linePositions[li6 + 2] = this.positions[i3 + 2];
                this.linePositions[li6 + 3] = this.positions[j3];
                this.linePositions[li6 + 4] = this.positions[j3 + 1];
                this.linePositions[li6 + 5] = this.positions[j3 + 2];

                const cr = (this.colors[i3] + this.colors[j3]) * 0.5;
                const cg = (this.colors[i3 + 1] + this.colors[j3 + 1]) * 0.5;
                const cb = (this.colors[i3 + 2] + this.colors[j3 + 2]) * 0.5;

                this.lineColors[li6] = cr * lineAlpha;
                this.lineColors[li6 + 1] = cg * lineAlpha;
                this.lineColors[li6 + 2] = cb * lineAlpha;
                this.lineColors[li6 + 3] = cr * lineAlpha;
                this.lineColors[li6 + 4] = cg * lineAlpha;
                this.lineColors[li6 + 5] = cb * lineAlpha;

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
