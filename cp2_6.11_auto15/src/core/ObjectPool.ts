
import type { Particle, Projectile } from '../shared/types';

export class ObjectPool<T extends { active: boolean }> {
  private pool: T[] = [];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, initialSize: number = 50, maxSize: number = 500) {
    this.factory = factory;
    this.maxSize = maxSize;
    for (let i = 0; i < initialSize; i++) {
      const obj = factory();
      obj.active = false;
      this.pool.push(obj);
    }
  }

  acquire(): T {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        this.pool[i].active = true;
        return this.pool[i];
      }
    }
    if (this.pool.length < this.maxSize) {
      const obj = this.factory();
      obj.active = true;
      this.pool.push(obj);
      return obj;
    }
    const obj = this.factory();
    obj.active = true;
    return obj;
  }

  release(obj: T): void {
    obj.active = false;
  }

  getActive(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        result.push(this.pool[i]);
      }
    }
    return result;
  }

  forEachActive(cb: (obj: T) => void): void {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        cb(this.pool[i]);
      }
    }
  }

  clearAll(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
  }
}

export function createParticleFactory(): () => Particle {
  return () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    color: '#ffffff',
    size: 2,
  });
}

export function createProjectileFactory(): () => Projectile {
  return () => ({
    active: false,
    x: 0,
    y: 0,
    targetId: null,
    targetX: 0,
    targetY: 0,
    damage: 0,
    type: 'arrow',
    speed: 300,
  });
}
