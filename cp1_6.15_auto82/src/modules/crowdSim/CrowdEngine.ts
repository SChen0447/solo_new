import * as THREE from 'three';
import { Particle } from './types';
import { PathFinder, nodeToWorld } from './PathFinder';
import {
  PARTICLE_MIN_SPEED,
  PARTICLE_MAX_SPEED,
  PARTICLE_RADIUS,
} from '../shared/constants';
import {
  BuildingBlock,
  MarkerPoint,
  SimulationParams,
} from '../shared/types';

export class CrowdEngine {
  private particles: Particle[] = [];
  private pathCache: Map<string, THREE.Vector3[]> = new Map();
  private pathFinder: PathFinder = new PathFinder();
  private params: SimulationParams = {
    particleCount: 500,
    speedMultiplier: 1,
    arrivalDelay: 1,
  };
  private startPoints: MarkerPoint[] = [];
  private endPoints: MarkerPoint[] = [];
  private positionsBuffer: Float32Array = new Float32Array(0);
  private speedsBuffer: Float32Array = new Float32Array(0);
  private colorsBuffer: Float32Array = new Float32Array(0);
  private trailBuffer: Float32Array = new Float32Array(0);
  private dirtyFlags = { layout: true, params: true };

  private tmpVec = new THREE.Vector3();

  getParticleCount(): number {
    return this.particles.length;
  }

  getPositions(): Float32Array {
    return this.positionsBuffer;
  }

  getSpeeds(): Float32Array {
    return this.speedsBuffer;
  }

  getColors(): Float32Array {
    return this.colorsBuffer;
  }

  getTrailBuffer(): Float32Array {
    return this.trailBuffer;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  markLayoutDirty() {
    this.dirtyFlags.layout = true;
  }

  markParamsDirty() {
    this.dirtyFlags.params = true;
  }

  updateLayout(
    buildings: BuildingBlock[],
    starts: MarkerPoint[],
    ends: MarkerPoint[]
  ) {
    this.startPoints = starts;
    this.endPoints = ends;
    this.pathFinder.setObstaclesFromBuildings(buildings);
    this.recomputePaths();
    this.dirtyFlags.layout = false;
  }

  updateParams(params: SimulationParams) {
    const countChanged = params.particleCount !== this.params.particleCount;
    this.params = { ...params };
    if (countChanged) {
      this.rebuildParticles();
    } else {
      for (const p of this.particles) {
        if (p.state === 'waiting') {
        }
      }
    }
    this.dirtyFlags.params = false;
  }

  private recomputePaths() {
    if (this.startPoints.length === 0 || this.endPoints.length === 0) return;
    this.pathCache = this.pathFinder.computePathCache(
      this.startPoints,
      this.endPoints
    );
    for (const p of this.particles) {
      this.assignNewPath(p);
    }
  }

  private assignNewPath(p: Particle) {
    if (this.startPoints.length === 0 || this.endPoints.length === 0) return;
    const sIdx = Math.floor(Math.random() * this.startPoints.length);
    const eIdx = Math.floor(Math.random() * this.endPoints.length);
    const key = `${sIdx}->${eIdx}`;
    let path = this.pathCache.get(key);
    if (!path) {
      const s = this.startPoints[sIdx];
      const e = this.endPoints[eIdx];
      path = [
        new THREE.Vector3(s.worldX, 0, s.worldZ),
        new THREE.Vector3(e.worldX, 0, e.worldZ),
      ];
    }
    p.path = path;
    p.pathIndex = 0;
    p.startIdx = sIdx;
    p.endIdx = eIdx;
    const start = this.startPoints[sIdx];
    p.pos.set(start.worldX + (Math.random() - 0.5) * 0.5, 0, start.worldZ + (Math.random() - 0.5) * 0.5);
  }

  private rebuildParticles() {
    const count = this.params.particleCount;
    const oldParticles = this.particles;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const p: Particle = {
        id: i,
        pos: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        baseSpeed:
          PARTICLE_MIN_SPEED +
          Math.random() * (PARTICLE_MAX_SPEED - PARTICLE_MIN_SPEED),
        pathIndex: 0,
        path: [],
        startIdx: 0,
        endIdx: 0,
        state: 'moving',
        waitTimer: 0,
        trail: [],
      };
      if (i < oldParticles.length) {
        p.pos.copy(oldParticles[i].pos);
        p.path = oldParticles[i].path;
        p.pathIndex = oldParticles[i].pathIndex;
      }
      this.assignNewPath(p);
      this.particles.push(p);
    }
    this.positionsBuffer = new Float32Array(count * 3);
    this.speedsBuffer = new Float32Array(count);
    this.colorsBuffer = new Float32Array(count * 3);
    this.trailBuffer = new Float32Array(count * 3 * 6);
  }

  update(dt: number) {
    if (this.dirtyFlags.layout || this.dirtyFlags.params) return;
    if (this.particles.length === 0) this.rebuildParticles();

    const speedMul = this.params.speedMultiplier;
    const arrivalDelay = this.params.arrivalDelay;
    const count = this.particles.length;

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];

      if (p.trail.length === 0) {
        for (let k = 0; k < 6; k++) p.trail.push(new THREE.Vector3());
      }

      if (p.state === 'waiting') {
        p.waitTimer -= dt;
        if (p.waitTimer <= 0) {
          this.assignNewPath(p);
          p.state = 'moving';
        }
      } else {
        const path = p.path;
        if (path.length < 2) {
          p.state = 'waiting';
          p.waitTimer = arrivalDelay;
          continue;
        }

        let targetIdx = p.pathIndex + 1;
        if (targetIdx >= path.length) {
          p.state = 'waiting';
          p.waitTimer = arrivalDelay;
          continue;
        }

        const target = path[targetIdx];
        this.tmpVec.subVectors(target, p.pos);
        this.tmpVec.y = 0;
        const dist = this.tmpVec.length();
        const step = p.baseSpeed * speedMul * dt;

        if (dist <= step) {
          p.pos.copy(target);
          p.pathIndex = targetIdx;
        } else {
          this.tmpVec.normalize().multiplyScalar(step);
          p.pos.add(this.tmpVec);
        }

        p.velocity.copy(this.tmpVec).divideScalar(Math.max(dt, 1e-6));
      }

      for (let k = 5; k > 0; k--) {
        p.trail[k].copy(p.trail[k - 1]);
      }
      p.trail[0].copy(p.pos);

      this.positionsBuffer[i * 3] = p.pos.x;
      this.positionsBuffer[i * 3 + 1] = PARTICLE_RADIUS + 0.2;
      this.positionsBuffer[i * 3 + 2] = p.pos.z;

      const speedNorm = Math.min(
        1,
        Math.max(0, (p.baseSpeed - PARTICLE_MIN_SPEED) / (PARTICLE_MAX_SPEED - PARTICLE_MIN_SPEED))
      );
      this.speedsBuffer[i] = p.baseSpeed * (p.state === 'moving' ? speedMul : 0);

      const r = speedNorm;
      const b = 1 - speedNorm;
      const mid = 1 - Math.abs(speedNorm * 2 - 1);
      this.colorsBuffer[i * 3] = 0.2 * (1 - r) + 0.91 * r + 0.1 * mid;
      this.colorsBuffer[i * 3 + 1] = 0.6 * (1 - r) * 0.5 + 0.74 * mid + 0.3 * r;
      this.colorsBuffer[i * 3 + 2] = 0.86 * b + 0.61 * mid + 0.24 * r;
    }

    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 6; k++) {
        const base = (i * 6 + k) * 3;
        this.trailBuffer[base] = this.particles[i].trail[k].x;
        this.trailBuffer[base + 1] = PARTICLE_RADIUS + 0.2;
        this.trailBuffer[base + 2] = this.particles[i].trail[k].z;
      }
    }
  }
}
