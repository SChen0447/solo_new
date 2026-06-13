// =============================================================================
// ParticleSystem.ts - 粒子系统核心模块
// -----------------------------------------------------------------------------
// 职责:
//   1. 管理粒子对象池（空闲链表模式，避免GC，上限3000个）
//   2. 粒子物理模拟（速度衰减、重力、生命周期）
//   3. 拖拽轨迹粒子生成（接收MouseTracker的鼠标状态）
//   4. 双击爆发粒子效果（HSL彩虹色均匀分布）
//   5. 历史轨迹光带回放（30秒小球体光带，蓝紫粉渐变）
//   6. 每帧将粒子数据同步到BufferGeometry供Shader渲染
//
// 数据流向:
//   输入: MouseTracker → emitDragParticles / emitBurst / sampleTrailPoint
//   处理: 对象池分配 → 物理更新 → 生命周期管理
//   输出: BufferGeometry属性数组 → THREE.Points → 场景渲染
//   输出: 轨迹小球体组 → THREE.Group → 场景渲染
//
// 被调用: main.ts 中实例化并每帧调用 update()
// 依赖:   ParticleShader.ts (材质和颜色工具)
//         MouseTracker.ts  (输入的鼠标状态类型)
// =============================================================================

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
  private readonly GRAVITY: THREE.Vector3 = new THREE.Vector3(0, -1.5, 0);
  private readonly SPEED_REFERENCE: number = 2500;

  private scene: THREE.Scene;

  private particlePool: Particle[] = [];
  private freeIndices: number[] = [];
  private activeIndices: number[] = [];
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
      this.freeIndices.push(i);
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

    const trailGeo = new THREE.SphereGeometry(1.5, 12, 8);
    const trailMat = new THREE.MeshBasicMaterial({
      color: 0x6688ff,
      transparent: true,
      opacity: 0.3,
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
    const actualCount = Math.min(count, this.freeIndices.length);

    if (actualCount <= 0) return;

    const baseColor = colorFromSpeed(speedNormalized);

    for (let i = 0; i < actualCount; i++) {
      const idx = this.acquireParticleIndex();
      if (idx === -1) break;
      const p = this.particlePool[idx];

      const spread = 0.3 + speedNormalized * 0.5;
      p.position.copy(mouseState.worldPosition).add(
        this.tmpVec3.set(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread * 0.5
        )
      );

      const angleOffset = (Math.random() - 0.5) * Math.PI / 3;
      const cos = Math.cos(angleOffset);
      const sin = Math.sin(angleOffset);
      const dirX = mouseState.direction.x * cos - mouseState.direction.y * sin;
      const dirY = mouseState.direction.x * sin + mouseState.direction.y * cos;

      const velocityScale = 0.0006 + speedNormalized * 0.0018;
      const baseSpeed = mouseState.speed * velocityScale;
      p.velocity.set(
        dirX * baseSpeed + (Math.random() - 0.5) * 0.2,
        -dirY * baseSpeed + (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.3
      );

      p.size = this.DRAG_MIN_SIZE + Math.random() * (this.DRAG_MAX_SIZE - this.DRAG_MIN_SIZE);

      const colorJitter = 0.08;
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
    const actualCount = Math.min(this.BURST_COUNT, this.freeIndices.length);
    if (actualCount <= 0) return;

    for (let i = 0; i < actualCount; i++) {
      const idx = this.acquireParticleIndex();
      if (idx === -1) break;
      const p = this.particlePool[idx];

      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const radius =
        this.BURST_MIN_RADIUS + Math.random() * (this.BURST_MAX_RADIUS - this.BURST_MIN_RADIUS);

      const sinPhi = Math.sin(phi);
      const dirX = sinPhi * Math.cos(theta);
      const dirY = sinPhi * Math.sin(theta);
      const dirZ = Math.cos(phi);

      p.position.copy(worldPos).add(
        this.tmpVec3.set(dirX, dirY, dirZ).multiplyScalar(0.3)
      );

      const speed = radius * (0.6 + Math.random() * 0.6);
      p.velocity.set(
        dirX * speed,
        dirY * speed + 0.5,
        dirZ * speed
      );

      p.size = 4 + Math.random() * 6;
      p.color.copy(rainbowColor(i, this.BURST_COUNT));
      p.life = 0;
      p.maxLife = this.PARTICLE_LIFETIME * (1.0 + Math.random() * 0.5);
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

  private acquireParticleIndex(): number {
    if (this.freeIndices.length === 0) {
      if (this.activeIndices.length > 0) {
        const oldestIdx = this.activeIndices.shift()!;
        this.particlePool[oldestIdx].active = false;
        this.activeCount--;
        this.freeIndices.push(oldestIdx);
      } else {
        return -1;
      }
    }

    const idx = this.freeIndices.pop()!;
    this.particlePool[idx].active = true;
    this.activeIndices.push(idx);
    this.activeCount++;
    return idx;
  }

  private releaseParticleIndex(idx: number): void {
    if (!this.particlePool[idx].active) return;
    this.particlePool[idx].active = false;
    this.freeIndices.push(idx);
    this.activeCount--;

    const activeIdx = this.activeIndices.indexOf(idx);
    if (activeIdx !== -1) {
      this.activeIndices.splice(activeIdx, 1);
    }
  }

  public update(dt: number, elapsedTime: number): void {
    ParticleUniforms.uTime.value = elapsedTime;

    this.updateParticles(dt);
    this.updateTrail(elapsedTime);
    this.updateBufferGeometry();
  }

  private updateParticles(dt: number): void {
    const dragFactor = Math.pow(0.02, dt / this.PARTICLE_LIFETIME);
    const indicesToRemove: number[] = [];

    for (let i = 0; i < this.activeIndices.length; i++) {
      const idx = this.activeIndices[i];
      const p = this.particlePool[idx];

      p.life += dt;
      if (p.life >= p.maxLife) {
        indicesToRemove.push(idx);
        continue;
      }

      if (p.hasGravity) {
        p.velocity.addScaledVector(this.GRAVITY, dt * 0.5);
      }

      p.velocity.multiplyScalar(dragFactor);
      p.position.addScaledVector(p.velocity, dt * 60);
    }

    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      this.releaseParticleIndex(indicesToRemove[i]);
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
        const alphaRatio = 1 - lifeRatio;

        this.tmpColor.copy(this.getTrailColor(lifeRatio));
        (mesh.material as THREE.MeshBasicMaterial).color.copy(this.tmpColor);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 * alphaRatio;

        const scale = 0.5 + alphaRatio * 0.9;
        mesh.scale.setScalar(scale);
      } else {
        mesh.visible = false;
      }
    }
  }

  private getTrailColor(lifeRatio: number): THREE.Color {
    const t = lifeRatio;
    const blue = new THREE.Color(0.3, 0.5, 1.0);
    const purple = new THREE.Color(0.75, 0.3, 1.0);
    const pink = new THREE.Color(1.0, 0.45, 0.75);

    if (t < 0.5) {
      return blue.clone().lerp(purple, t * 2);
    } else {
      return purple.clone().lerp(pink, (t - 0.5) * 2);
    }
  }

  private updateBufferGeometry(): void {
    const count = this.activeIndices.length;

    for (let i = 0; i < count; i++) {
      const idx = this.activeIndices[i];
      const p = this.particlePool[idx];

      const wi = i * 3;
      this.positions[wi] = p.position.x;
      this.positions[wi + 1] = p.position.y;
      this.positions[wi + 2] = p.position.z;

      this.colors[wi] = p.color.r;
      this.colors[wi + 1] = p.color.g;
      this.colors[wi + 2] = p.color.b;

      this.sizes[i] = p.size;
      this.lives[i] = p.life;
      this.maxLives[i] = p.maxLife;
      this.speedFactors[i] = p.speedFactor;
    }

    for (let i = count; i < this.MAX_PARTICLES; i++) {
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

    this.geometry.setDrawRange(0, count);
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
