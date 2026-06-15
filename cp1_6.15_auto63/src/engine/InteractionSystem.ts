import * as THREE from 'three';
import { ChunkManager, VoxelType, CHUNK_SIZE, WORLD_HEIGHT } from './ChunkManager';

export type ToolMode = 'place' | 'remove' | 'inspect';

export interface HitResult {
  voxelPosition: THREE.Vector3;
  faceNormal: THREE.Vector3;
  faceIndex: number;
  distance: number;
}

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

export class InteractionSystem {
  private chunkManager: ChunkManager;
  private raycaster: THREE.Raycaster;
  private particles: Particle[] = [];
  private placeAnimations: Map<string, { startTime: number; position: THREE.Vector3 }> = new Map();
  private shakeAnimation: { voxelKey: string; startTime: number; amplitude: number } | null = null;
  private maxReach: number = 20;

  constructor(chunkManager: ChunkManager) {
    this.chunkManager = chunkManager;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.maxReach;
  }

  raycast(origin: THREE.Vector3, direction: THREE.Vector3): HitResult | null {
    direction.normalize();

    let closestHit: HitResult | null = null;
    let closestDist = this.maxReach;

    const step = 0.1;
    for (let t = 0; t < this.maxReach; t += step) {
      const point = origin.clone().add(direction.clone().multiplyScalar(t));
      const voxelX = Math.floor(point.x);
      const voxelY = Math.floor(point.y);
      const voxelZ = Math.floor(point.z);

      if (voxelY < 0 || voxelY >= WORLD_HEIGHT) continue;

      const voxel = this.chunkManager.getVoxel(voxelX, voxelY, voxelZ);
      if (voxel !== VoxelType.AIR) {
        const faceNormal = this.getFaceNormal(point, voxelX, voxelY, voxelZ);
        if (faceNormal && t < closestDist) {
          closestDist = t;
          closestHit = {
            voxelPosition: new THREE.Vector3(voxelX, voxelY, voxelZ),
            faceNormal: faceNormal,
            faceIndex: this.normalToFaceIndex(faceNormal),
            distance: t
          };
        }
      }
    }

    return closestHit;
  }

  private getFaceNormal(point: THREE.Vector3, vx: number, vy: number, vz: number): THREE.Vector3 | null {
    const cx = vx + 0.5;
    const cy = vy + 0.5;
    const cz = vz + 0.5;

    const dx = point.x - cx;
    const dy = point.y - cy;
    const dz = point.z - cz;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const absDz = Math.abs(dz);

    if (absDx >= absDy && absDx >= absDz) {
      return new THREE.Vector3(dx > 0 ? 1 : -1, 0, 0);
    } else if (absDy >= absDx && absDy >= absDz) {
      return new THREE.Vector3(0, dy > 0 ? 1 : -1, 0);
    } else {
      return new THREE.Vector3(0, 0, dz > 0 ? 1 : -1);
    }
  }

  private normalToFaceIndex(normal: THREE.Vector3): number {
    if (normal.x > 0) return 0;
    if (normal.x < 0) return 1;
    if (normal.y > 0) return 2;
    if (normal.y < 0) return 3;
    if (normal.z > 0) return 4;
    return 5;
  }

  placeVoxel(hit: HitResult, type: VoxelType = VoxelType.BRICK): boolean {
    const placePos = hit.voxelPosition.clone().add(hit.faceNormal);

    if (placePos.y < 0 || placePos.y >= WORLD_HEIGHT) return false;

    const success = this.chunkManager.setVoxel(
      Math.floor(placePos.x),
      Math.floor(placePos.y),
      Math.floor(placePos.z),
      type
    );

    if (success) {
      const key = `${Math.floor(placePos.x)},${Math.floor(placePos.y)},${Math.floor(placePos.z)}`;
      this.placeAnimations.set(key, {
        startTime: performance.now(),
        position: placePos.clone()
      });

      this.triggerShake(hit.voxelPosition);
    }

    return success;
  }

  removeVoxel(hit: HitResult): boolean {
    const voxelType = this.chunkManager.getVoxel(
      Math.floor(hit.voxelPosition.x),
      Math.floor(hit.voxelPosition.y),
      Math.floor(hit.voxelPosition.z)
    );

    if (voxelType === VoxelType.AIR) return false;

    const success = this.chunkManager.removeVoxel(
      Math.floor(hit.voxelPosition.x),
      Math.floor(hit.voxelPosition.y),
      Math.floor(hit.voxelPosition.z)
    );

    if (success) {
      this.spawnBreakParticles(hit.voxelPosition, voxelType);
      this.triggerShake(hit.voxelPosition);
    }

    return success;
  }

  private spawnBreakParticles(position: THREE.Vector3, voxelType: VoxelType): void {
    const colors: Record<number, number> = {
      [VoxelType.GRASS]: 0x4CAF50,
      [VoxelType.DIRT]: 0x8B4513,
      [VoxelType.STONE]: 0x808080,
      [VoxelType.BRICK]: 0x7B7B7B
    };

    const color = new THREE.Color(colors[voxelType] || 0x888888);
    const center = position.clone().addScalar(0.5);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 2;

      this.particles.push({
        position: center.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          2 + Math.random() * 2,
          Math.sin(angle) * speed
        ),
        color: color.clone(),
        life: 0.6,
        maxLife: 0.6,
        size: 0.15 + Math.random() * 0.1
      });
    }
  }

  private triggerShake(voxelPosition: THREE.Vector3): void {
    const key = `${Math.floor(voxelPosition.x)},${Math.floor(voxelPosition.y)},${Math.floor(voxelPosition.z)}`;
    this.shakeAnimation = {
      voxelKey: key,
      startTime: performance.now(),
      amplitude: 2
    };
  }

  updateParticles(delta: number): void {
    const gravity = -15;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y += gravity * delta;
      p.position.add(p.velocity.clone().multiplyScalar(delta));
    }

    const now = performance.now();
    for (const [key, anim] of this.placeAnimations) {
      if (now - anim.startTime > 150) {
        this.placeAnimations.delete(key);
      }
    }

    if (this.shakeAnimation && now - this.shakeAnimation.startTime > 100) {
      this.shakeAnimation = null;
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getPlaceAnimations(): Map<string, { startTime: number; position: THREE.Vector3 }> {
    return this.placeAnimations;
  }

  getShakeAnimation(): { voxelKey: string; startTime: number; amplitude: number } | null {
    return this.shakeAnimation;
  }

  getPlaceAnimationScale(key: string): number {
    const anim = this.placeAnimations.get(key);
    if (!anim) return 1;

    const elapsed = (performance.now() - anim.startTime) / 1000;
    const duration = 0.15;

    if (elapsed >= duration) return 1;

    const t = elapsed / duration;
    return this.easeOutElastic(t);
  }

  private easeOutElastic(t: number): number {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }

  getShakeOffset(voxelKey: string): THREE.Vector3 {
    if (!this.shakeAnimation || this.shakeAnimation.voxelKey !== voxelKey) {
      return new THREE.Vector3(0, 0, 0);
    }

    const elapsed = (performance.now() - this.shakeAnimation.startTime) / 1000;
    const duration = 0.1;

    if (elapsed >= duration) return new THREE.Vector3(0, 0, 0);

    const intensity = 1 - elapsed / duration;
    const amp = this.shakeAnimation.amplitude * intensity * 0.02;

    return new THREE.Vector3(
      (Math.random() - 0.5) * amp * 2,
      (Math.random() - 0.5) * amp * 2,
      (Math.random() - 0.5) * amp * 2
    );
  }
}
