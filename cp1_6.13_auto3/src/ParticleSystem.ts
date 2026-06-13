import * as THREE from 'three';
import {
  createParticleMaterial,
  colorFromSpeed,
  rainbowColor,
  ParticleUniforms,
} from './ParticleShader';
import type { MouseState } from './MouseTracker';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  color: THREE.Color;
  life: number;
  maxLife: number;
  speedFactor: number;
  active: boolean;
  hasGravity: boolean;
  isBurst: boolean;
}

interface TrailPoint {
  position: THREE.Vector3;
  timestamp: number;
}

export class ParticleSystem {
  private readonly MAX_PARTICLES: number = 3000;
  private readonly MAX_DRAG_PER_FRAME: number = 20;
  private readonly PARTICLE_LIFETIME: number = 3.0;
  private readonly DRAG_MIN_SIZE: number = 2;
  private readonly DRAG_MAX_SIZE: number = 8;
  private readonly BURST_COUNT: number = 100;
  private readonly BURST_MIN_RADIUS: number = 2;
  private readonly BURST_MAX_RADIUS: number = 8;
  private readonly TRAIL_DURATION: number = 30;
  private readonly TRAIL_SAMPLE_INTERVAL: number = 0.1;
  private readonly GRAVITY: THREE.Vector3 = new THREE.Vector3(0, -0.8, 0);
  private readonly SPEED_REFERENCE: number = 3000;

  private scene: THREE.Scene;

  private particlePool: Particle[] = [];
  private activeCount: number = 0;

  private geometry!: THREE.BufferGeometry;
  private material!: THREE.ShaderMaterial;
  private points!: THREE.Points;

  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private lives!: Float32Array;
  private maxLives!: Float32Array;
  private speedFactors!: Float32Array;

  private trailPoints: TrailPoint[] = [];
  private lastTrailSampleTime: number = 0;
  private trailGroup!: THREE.Group;
  private trailMeshes: THREE.Mesh[] = [];
  private readonly TRAIL_MAX_POINTS: number;

  private tmpVec3: THREE.Vector3 = new THREE.Vector3();
  private tmpColor: THREE.Color = new THREE.Color();

  constructor(scene: THREE.Scene, _camera: THREE.PerspectiveCamera) {
    this.scene = scene;

    this.TRAIL_MAX_POINTS = Math.floor(this.TRAIL_DURATION / this.TRAIL_SAMPLE_INTERVAL);

    this.initParticlePool();
    this.initBufferGeometry();
    this.initTrailSystem();

    this.material = createParticleMaterial(this.MAX_PARTICLES);
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private initParticlePool(): void {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particlePool.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        size: 0,
        color: new THREE.Color(),
        life: 0,
        maxLife: this.PARTICLE_LIFETIME,
        speedFactor: 0,
        active: false,
        hasGravity: false,
        isBurst: false,
      });
    }
  }

  private initBufferGeometry(): void {
    const count = this.MAX_PARTICLES;

    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.lives = new Float32Array(count);
    this.maxLives = new Float32Array(count);
    this.speedFactors = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = 0;
      this.positions[i * 3 + 2] = -10000;
      this.colors[i * 3] = 0;
      this.colors[i * 3 + 1] = 0;
      this.colors[i * 3 + 2] = 0;
      this.sizes[i] = 0;
      this.lives[i] = 1;
      this.maxLives[i] = 1;
      this.speedFactors[i] = 0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aLife', new THREE.BufferAttribute(this.lives, 1));
    this.geometry.setAttribute('aMaxLife', new THREE.BufferAttribute(this.maxLives, 1));
    this.geometry.setAttribute(
      'aSpeedFactor',
      new THREE.BufferAttribute(this.speedFactors, 1)
    );

    this.geometry.setDrawRange(0, 0);
  }

  private initTrailSystem(): void {
    this.trailGroup = new THREE.Group();
    this.scene.add(this.trailGroup);

    const trailGeo = new THREE.SphereGeometry(1.5, 8, 6);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x4466ff,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < this.TRAIL_MAX_POINTS; i++) {
      const mesh = new THREE.Mesh(trailGeo, trailMat.clone());
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.trailGroup.add(mesh);
      this.trailMeshes.push(mesh);
    }
  }

  public emitDragParticles(mouseState: MouseState): void {
    const speedNormalized = Math.min(1, mouseState.speed / this.SPEED_REFERENCE);
    const count = Math.max(1, Math.floor(this.MAX_DRAG_PER_FRAME * (0.4 + speedNormalized * 0.6)));
    const actualCount = Math.min(count, this.MAX_PARTICLES - this.activeCount);

    if (actualCount <= 0) return;

    const baseColor = colorFromSpeed(speedNormalized);

    for (let i = 0; i < actualCount; i++) {
      const p = this.acquireParticle();
      if (!p) break;

      const spread = (Math.random() - 0.5) * 0.5;
      p.position.copy(mouseState.worldPosition).add(
        this.tmpVec3.set(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread
        )
      );

      const angleOffset = (Math.random() - 0.5) * Math.PI / 3;
      const cos = Math.cos(angleOffset);
      const sin = Math.sin(angleOffset);
      const dirX = mouseState.direction.x * cos - mouseState.direction.y * sin;
      const dirY = mouseState.direction.x * sin + mouseState.direction.y * cos;

      const velocityScale = 0.0008 + speedNormalized * 0.002;
      p.velocity.set(
        dirX * mouseState.speed * velocityScale + (Math.random() - 0.5) * 0.3,
        -dirY * mouseState.speed * velocityScale + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.4
      );

      p.size = this.DRAG_MIN_SIZE + Math.random() * (this.DRAG_MAX_SIZE - this.DRAG_MIN_SIZE);

      const colorJitter = 0.1;
      p.color.setRGB(
        Math.max(0, Math.min(1, baseColor.r + (Math.random() - 0.5) * colorJitter)),
        Math.max(0, Math.min(1, baseColor.g + (Math.random() - 0.5) * colorJitter)),
        Math.max(0, Math.min(1, baseColor.b + (Math.random() - 0.5) * colorJitter))
      );

      p.life = 0;
      p.maxLife = this.PARTICLE_LIFETIME * (0.85 + Math.random() * 0.3);
      p.speedFactor = speedNormalized;
      p.hasGravity = false;
      p.isBurst = false;
    }
  }

  public emitBurst(worldPos: THREE.Vector3): void {
    const actualCount = Math.min(this.BURST_COUNT, this.MAX_PARTICLES - this.activeCount);
    if (actualCount <= 0) return;

    for (let i = 0; i < actualCount; i++) {
      const p = this.acquireParticle();
      if (!p) break;

      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const radius =
        this.BURST_MIN_RADIUS + Math.random() * (this.BURST_MAX_RADIUS - this.BURST_MIN_RADIUS);

      const sinPhi = Math.sin(phi);
      const dirX = sinPhi * Math.cos(theta);
      const dirY = sinPhi * Math.sin(theta);
      const dirZ = Math.cos(phi);

      p.position.copy(worldPos).add(
        this.tmpVec3.set(dirX, dirY, dirZ).multiplyScalar(0.2)
      );

      const speed = radius * (0.5 + Math.random() * 0.5);
      p.velocity.set(dirX * speed, dirY * speed, dirZ * speed);

      p.size = 3 + Math.random() * 5;
      p.color.copy(rainbowColor(i, this.BURST_COUNT));
      p.life = 0;
      p.maxLife = this.PARTICLE_LIFETIME * (0.9 + Math.random() * 0.4);
      p.speedFactor = 1.0;
      p.hasGravity = true;
      p.isBurst = true;
    }
  }

  public sampleTrailPoint(worldPos: THREE.Vector3, currentTime: number): void {
    const elapsed = currentTime - this.lastTrailSampleTime;
    if (elapsed < this.TRAIL_SAMPLE_INTERVAL) return;

    this.lastTrailSampleTime = currentTime;

    if (this.trailPoints.length >= this.TRAIL_MAX_POINTS) {
      this.trailPoints.shift();
    }

    this.trailPoints.push({
      position: worldPos.clone(),
      timestamp: currentTime,
    });
  }

  private acquireParticle(): Particle | null {
    if (this.activeCount >= this.MAX_PARTICLES) {
      for (let i = 0; i < this.MAX_PARTICLES; i++) {
        if (this.particlePool[i].active) {
          this.particlePool[i].active = false;
          this.activeCount--;
          break;
        }
      }
    }

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (!this.particlePool[i].active) {
        this.particlePool[i].active = true;
        this.activeCount++;
        return this.particlePool[i];
      }
    }
    return null;
  }

  public update(dt: number, elapsedTime: number): void {
    ParticleUniforms.uTime.value = elapsedTime;

    this.updateParticles(dt);
    this.updateTrail(elapsedTime);
    this.updateBufferGeometry();
  }

  private updateParticles(dt: number): void {
    const dragFactor = Math.pow(0.01, dt / this.PARTICLE_LIFETIME);

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.particlePool[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.activeCount--;
        continue;
      }

      if (p.hasGravity) {
        p.velocity.addScaledVector(this.GRAVITY, dt * 0.3);
      }

      p.velocity.multiplyScalar(dragFactor);
      p.position.addScaledVector(p.velocity, dt * 60);
    }
  }

  private updateTrail(elapsedTime: number): void {
    const cutoff = elapsedTime - this.TRAIL_DURATION;

    while (this.trailPoints.length > 0 && this.trailPoints[0].timestamp < cutoff) {
      this.trailPoints.shift();
    }

    const count = this.trailPoints.length;
    for (let i = 0; i < this.TRAIL_MAX_POINTS; i++) {
      const mesh = this.trailMeshes[i];
      if (i < count) {
        const point = this.trailPoints[i];
        mesh.position.copy(point.position);
        mesh.visible = true;

        const age = elapsedTime - point.timestamp;
        const lifeRatio = age / this.TRAIL_DURATION;

        this.tmpColor.copy(this.getTrailColor(lifeRatio));
        (mesh.material as THREE.MeshBasicMaterial).color.copy(this.tmpColor);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.25 * (1 - lifeRatio * 0.7);

        const scale = 0.4 + (1 - lifeRatio) * 0.8;
        mesh.scale.setScalar(scale);
      } else {
        mesh.visible = false;
      }
    }
  }

  private getTrailColor(lifeRatio: number): THREE.Color {
    const t = lifeRatio;
    const blue = new THREE.Color(0.3, 0.5, 1.0);
    const purple = new THREE.Color(0.7, 0.3, 1.0);
    const pink = new THREE.Color(1.0, 0.4, 0.7);

    if (t < 0.5) {
      return blue.clone().lerp(purple, t * 2);
    } else {
      return purple.clone().lerp(pink, (t - 0.5) * 2);
    }
  }

  private updateBufferGeometry(): void {
    let writeIndex = 0;

    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.particlePool[i];
      if (!p.active) continue;

      const wi = writeIndex * 3;

      this.positions[wi] = p.position.x;
      this.positions[wi + 1] = p.position.y;
      this.positions[wi + 2] = p.position.z;

      this.colors[wi] = p.color.r;
      this.colors[wi + 1] = p.color.g;
      this.colors[wi + 2] = p.color.b;

      this.sizes[writeIndex] = p.size;
      this.lives[writeIndex] = p.life;
      this.maxLives[writeIndex] = p.maxLife;
      this.speedFactors[writeIndex] = p.speedFactor;

      writeIndex++;
    }

    for (let i = writeIndex; i < this.MAX_PARTICLES; i++) {
      const wi = i * 3;
      this.positions[wi] = 0;
      this.positions[wi + 1] = 0;
      this.positions[wi + 2] = -10000;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aLife.needsUpdate = true;
    this.geometry.attributes.aMaxLife.needsUpdate = true;
    this.geometry.attributes.aSpeedFactor.needsUpdate = true;

    this.geometry.setDrawRange(0, writeIndex);
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.scene.remove(this.trailGroup);
    this.geometry.dispose();
    this.material.dispose();
    this.trailMeshes.forEach((mesh) => {
      (mesh.material as THREE.Material).dispose();
    });
    this.trailGroup.clear();
  }
}
