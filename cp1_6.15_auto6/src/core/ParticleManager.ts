import * as THREE from 'three';
import { ParticleData, MotionType } from '../types';

export class ParticleManager {
  private particles: Map<string, ParticleData> = new Map();
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  addParticle(particle: ParticleData): void {
    this.particles.set(particle.id, particle);
    this.notify();
  }

  removeParticle(id: string): void {
    this.particles.delete(id);
    this.notify();
  }

  getParticle(id: string): ParticleData | undefined {
    return this.particles.get(id);
  }

  getAllParticles(): ParticleData[] {
    return Array.from(this.particles.values());
  }

  updateParticle(id: string, updates: Partial<Pick<ParticleData, 'color' | 'size' | 'motionType' | 'position'>>): void {
    const particle = this.particles.get(id);
    if (particle) {
      if (updates.position) {
        particle.position.copy(updates.position);
        particle.initialPosition.copy(updates.position);
      }
      if (updates.color !== undefined) particle.color = updates.color;
      if (updates.size !== undefined) particle.size = updates.size;
      if (updates.motionType !== undefined) particle.motionType = updates.motionType;
      this.notify();
    }
  }

  updatePositions(time: number): void {
    this.particles.forEach((p) => {
      switch (p.motionType) {
        case 'float':
          p.position.y = p.initialPosition.y + Math.sin(time * 0.001 + p.initialPosition.x) * 0.5;
          break;
        case 'orbit': {
          const radius = Math.sqrt(p.initialPosition.x ** 2 + p.initialPosition.z ** 2) || 2;
          const baseAngle = Math.atan2(p.initialPosition.z, p.initialPosition.x);
          const angle = baseAngle + time * 0.0005;
          p.position.x = Math.cos(angle) * radius;
          p.position.z = Math.sin(angle) * radius;
          p.position.y = p.initialPosition.y + Math.sin(time * 0.002) * 0.3;
          break;
        }
        case 'sine':
          p.position.x = p.initialPosition.x + Math.sin(time * 0.0015) * 1;
          p.position.y = p.initialPosition.y + Math.sin(time * 0.001 + Math.PI / 2) * 0.5;
          break;
        default:
          break;
      }
    });
  }

  clear(): void {
    this.particles.clear();
    this.notify();
  }

  get count(): number {
    return this.particles.size;
  }

  syncFromStore(storeParticles: ParticleData[]): void {
    this.particles.clear();
    storeParticles.forEach((p) => {
      this.particles.set(p.id, {
        ...p,
        position: p.position.clone(),
        initialPosition: p.initialPosition.clone()
      });
    });
  }
}

export const particleManager = new ParticleManager();
