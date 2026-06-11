import * as THREE from 'three';

export type ColorMode = 'rainbow' | 'warm' | 'cool' | 'neon';
export type ParticleShape = 'circle' | 'triangle' | 'square';
export type MotionMode = 'rotate' | 'wave' | 'cluster' | 'diffuse' | 'random';

export interface ParticleParams {
  count: number;
  speed: number;
  size: number;
  colorMode: ColorMode;
  shape: ParticleShape;
  motionMode: MotionMode;
  trailEnabled: boolean;
}

interface ParticleData {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  baseSizes: Float32Array;
  phases: Float32Array;
  trailPositions: Float32Array[];
}

export class ParticleSystem {
  public points: THREE.Points;
  public trailMeshes: THREE.Points[] = [];
  public params: ParticleParams;
  public paused = false;

  private geometry: THREE.BufferGeometry;
  private data!: ParticleData;
  private time = 0;
  private trailLength = 8;

  constructor(params: Partial<ParticleParams> = {}) {
    this.params = {
      count: 5000,
      speed: 1.0,
      size: 0.15,
      colorMode: 'rainbow',
      shape: 'circle',
      motionMode: 'rotate',
      trailEnabled: false,
      ...params
    };

    this.geometry = new THREE.BufferGeometry();
    const material = this.createMaterial();

    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;

    this.initParticles();
  }

  private createShapeTexture(shape: ParticleShape): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.95)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;

    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(64, 64, 60, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(64, 8);
        ctx.lineTo(120, 112);
        ctx.lineTo(8, 112);
        ctx.closePath();
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(12, 12, 104, 104);
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createMaterial(): THREE.PointsMaterial {
    const texture = this.createShapeTexture(this.params.shape);
    return new THREE.PointsMaterial({
      size: this.params.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture,
      sizeAttenuation: true
    });
  }

  private getColorForIndex(i: number, total: number): THREE.Color {
    const color = new THREE.Color();
    const t = i / total;

    switch (this.params.colorMode) {
      case 'rainbow':
        color.setHSL(t, 0.85, 0.6);
        break;
      case 'warm':
        color.setHSL(0.02 + t * 0.12, 0.9, 0.5 + t * 0.15);
        break;
      case 'cool':
        color.setHSL(0.5 + t * 0.2, 0.85, 0.5 + t * 0.15);
        break;
      case 'neon':
        color.setHSL(0.7 + t * 0.15, 0.95, 0.55 + t * 0.1);
        break;
    }

    return color;
  }

  private initParticles(): void {
    const { count } = this.params;

    this.data = {
      positions: new Float32Array(count * 3),
      velocities: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      sizes: new Float32Array(count),
      baseSizes: new Float32Array(count),
      phases: new Float32Array(count),
      trailPositions: []
    };

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const radius = 2 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      this.data.positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      this.data.positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      this.data.positions[i3 + 2] = radius * Math.cos(phi);

      const speed = 0.2 + Math.random() * 0.6;
      this.data.velocities[i3] = (Math.random() - 0.5) * speed;
      this.data.velocities[i3 + 1] = (Math.random() - 0.5) * speed;
      this.data.velocities[i3 + 2] = (Math.random() - 0.5) * speed;

      const color = this.getColorForIndex(i, count);
      this.data.colors[i3] = color.r;
      this.data.colors[i3 + 1] = color.g;
      this.data.colors[i3 + 2] = color.b;

      const size = this.params.size * (0.6 + Math.random() * 0.8);
      this.data.sizes[i] = size;
      this.data.baseSizes[i] = size;
      this.data.phases[i] = Math.random() * Math.PI * 2;
    }

    this.data.trailPositions = [];
    for (let t = 0; t < this.trailLength; t++) {
      this.data.trailPositions.push(new Float32Array(this.data.positions));
    }

    this.updateGeometry();
    this.createTrailMeshes();
  }

  private createTrailMeshes(): void {
    this.trailMeshes.forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.trailMeshes = [];

    if (!this.params.trailEnabled) return;

    for (let t = 0; t < this.trailLength; t++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(this.data.trailPositions[t], 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.data.colors), 3));

      const mat = new THREE.PointsMaterial({
        size: this.params.size * (0.3 + (1 - t / this.trailLength) * 0.5),
        vertexColors: true,
        transparent: true,
        opacity: (1 - t / this.trailLength) * 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: (this.points.material as THREE.PointsMaterial).map,
        sizeAttenuation: true
      });

      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      this.trailMeshes.push(points);
    }
  }

  private updateGeometry(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.data.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.data.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.data.sizes, 1));
  }

  public update(deltaTime: number): void {
    if (this.paused) return;

    this.time += deltaTime;
    const { count, speed, motionMode } = this.params;
    const dt = deltaTime * speed;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = this.data.positions[i3];
      const y = this.data.positions[i3 + 1];
      const z = this.data.positions[i3 + 2];

      switch (motionMode) {
        case 'rotate': {
          const rotSpeed = 0.8 + this.data.phases[i] * 0.3;
          const cosR = Math.cos(dt * rotSpeed);
          const sinR = Math.sin(dt * rotSpeed);
          this.data.positions[i3] = x * cosR - z * sinR;
          this.data.positions[i3 + 2] = x * sinR + z * cosR;
          this.data.positions[i3 + 1] += Math.sin(this.time * 1.5 + this.data.phases[i]) * dt * 0.3;
          this.data.positions[i3 + 1] = Math.max(-8, Math.min(8, this.data.positions[i3 + 1]));
          break;
        }
        case 'wave': {
          this.data.positions[i3] += this.data.velocities[i3] * dt * 2;
          this.data.positions[i3 + 1] = Math.sin(this.time * 2 + this.data.phases[i] + x * 0.5) * 3;
          this.data.positions[i3 + 2] += this.data.velocities[i3 + 2] * dt * 2;

          if (Math.abs(this.data.positions[i3]) > 10) this.data.velocities[i3] *= -1;
          if (Math.abs(this.data.positions[i3 + 2]) > 10) this.data.velocities[i3 + 2] *= -1;
          break;
        }
        case 'cluster': {
          const dist = Math.sqrt(x * x + y * y + z * z);
          if (dist > 0.1) {
            const pullStrength = 1.5 / (dist + 0.5);
            this.data.velocities[i3] -= (x / dist) * pullStrength * dt;
            this.data.velocities[i3 + 1] -= (y / dist) * pullStrength * dt;
            this.data.velocities[i3 + 2] -= (z / dist) * pullStrength * dt;
          }
          this.data.velocities[i3] += (Math.random() - 0.5) * dt * 0.5;
          this.data.velocities[i3 + 1] += (Math.random() - 0.5) * dt * 0.5;
          this.data.velocities[i3 + 2] += (Math.random() - 0.5) * dt * 0.5;

          this.data.positions[i3] += this.data.velocities[i3] * dt;
          this.data.positions[i3 + 1] += this.data.velocities[i3 + 1] * dt;
          this.data.positions[i3 + 2] += this.data.velocities[i3 + 2] * dt;

          this.data.velocities[i3] *= 0.98;
          this.data.velocities[i3 + 1] *= 0.98;
          this.data.velocities[i3 + 2] *= 0.98;
          break;
        }
        case 'diffuse': {
          const dist = Math.sqrt(x * x + y * y + z * z);
          if (dist < 8) {
            const pushStrength = 0.8;
            this.data.velocities[i3] += (x / (dist + 0.1)) * pushStrength * dt;
            this.data.velocities[i3 + 1] += (y / (dist + 0.1)) * pushStrength * dt;
            this.data.velocities[i3 + 2] += (z / (dist + 0.1)) * pushStrength * dt;
          }
          this.data.positions[i3] += this.data.velocities[i3] * dt;
          this.data.positions[i3 + 1] += this.data.velocities[i3 + 1] * dt;
          this.data.positions[i3 + 2] += this.data.velocities[i3 + 2] * dt;

          if (dist > 12) {
            this.data.positions[i3] *= 0.95;
            this.data.positions[i3 + 1] *= 0.95;
            this.data.positions[i3 + 2] *= 0.95;
            this.data.velocities[i3] *= 0.5;
            this.data.velocities[i3 + 1] *= 0.5;
            this.data.velocities[i3 + 2] *= 0.5;
          }
          break;
        }
        case 'random': {
          this.data.velocities[i3] += (Math.random() - 0.5) * dt * 2;
          this.data.velocities[i3 + 1] += (Math.random() - 0.5) * dt * 2;
          this.data.velocities[i3 + 2] += (Math.random() - 0.5) * dt * 2;

          this.data.velocities[i3] *= 0.96;
          this.data.velocities[i3 + 1] *= 0.96;
          this.data.velocities[i3 + 2] *= 0.96;

          this.data.positions[i3] += this.data.velocities[i3] * dt;
          this.data.positions[i3 + 1] += this.data.velocities[i3 + 1] * dt;
          this.data.positions[i3 + 2] += this.data.velocities[i3 + 2] * dt;

          const d = Math.sqrt(
            this.data.positions[i3] ** 2 +
            this.data.positions[i3 + 1] ** 2 +
            this.data.positions[i3 + 2] ** 2
          );
          if (d > 10) {
            this.data.positions[i3] *= 0.9;
            this.data.positions[i3 + 1] *= 0.9;
            this.data.positions[i3 + 2] *= 0.9;
          }
          break;
        }
      }

      const breath = 1 + Math.sin(this.time * 2 + this.data.phases[i]) * 0.25;
      this.data.sizes[i] = this.data.baseSizes[i] * breath;
    }

    if (this.params.trailEnabled && this.trailMeshes.length > 0) {
      for (let t = this.trailLength - 1; t > 0; t--) {
        this.data.trailPositions[t].set(this.data.trailPositions[t - 1]);
      }
      this.data.trailPositions[0].set(this.data.positions);

      this.trailMeshes.forEach(mesh => {
        (mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      });
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  public setCount(count: number): void {
    this.params.count = count;
    this.initParticles();
  }

  public setSpeed(speed: number): void {
    this.params.speed = speed;
  }

  public setSize(size: number): void {
    this.params.size = size;
    for (let i = 0; i < this.params.count; i++) {
      const s = size * (0.6 + (this.data.baseSizes[i] / this.params.size) * 0.4);
      this.data.baseSizes[i] = s;
      this.data.sizes[i] = s;
    }
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.points.material as THREE.PointsMaterial).size = size;

    this.trailMeshes.forEach((mesh, idx) => {
      (mesh.material as THREE.PointsMaterial).size = size * (0.3 + (1 - idx / this.trailLength) * 0.5);
    });
  }

  public setColorMode(mode: ColorMode): void {
    this.params.colorMode = mode;
    for (let i = 0; i < this.params.count; i++) {
      const i3 = i * 3;
      const color = this.getColorForIndex(i, this.params.count);
      this.data.colors[i3] = color.r;
      this.data.colors[i3 + 1] = color.g;
      this.data.colors[i3 + 2] = color.b;
    }
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    this.trailMeshes.forEach(mesh => {
      const colors = (mesh.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
      colors.set(this.data.colors);
      (mesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    });
  }

  public setShape(shape: ParticleShape): void {
    this.params.shape = shape;
    const texture = this.createShapeTexture(shape);
    (this.points.material as THREE.PointsMaterial).map?.dispose();
    (this.points.material as THREE.PointsMaterial).map = texture;
    (this.points.material as THREE.PointsMaterial).needsUpdate = true;

    this.trailMeshes.forEach(mesh => {
      const mat = mesh.material as THREE.PointsMaterial;
      mat.map?.dispose();
      mat.map = texture;
      mat.needsUpdate = true;
    });
  }

  public setMotionMode(mode: MotionMode): void {
    this.params.motionMode = mode;
  }

  public setTrailEnabled(enabled: boolean): void {
    if (this.params.trailEnabled === enabled) return;
    this.params.trailEnabled = enabled;
    this.createTrailMeshes();
  }

  public togglePause(): void {
    this.paused = !this.paused;
  }

  public reset(): void {
    this.initParticles();
    this.time = 0;
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.trailMeshes.forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  }
}
