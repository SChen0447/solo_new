import Phaser from 'phaser';

export type ParticleEffectType = 'perfect' | 'good' | 'miss';

export interface TrackedParticle {
  id: number;
  type: ParticleEffectType;
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  createdAt: number;
  particleCount: number;
}

const MAX_PARTICLES = 200;

export class ParticleManager {
  private scene: Phaser.Scene;
  private trackedParticles: TrackedParticle[];
  private nextId: number;
  private totalActiveParticles: number;
  private starTextureKey: string;
  private circleTextureKey: string;
  private shardTextureKey: string;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.trackedParticles = [];
    this.nextId = 1;
    this.totalActiveParticles = 0;
    this.starTextureKey = 'star-particle';
    this.circleTextureKey = 'circle-particle';
    this.shardTextureKey = 'shard-particle';
    this.createTextures();
  }

  private createTextures(): void {
    const gfx = this.scene.add.graphics();

    gfx.clear();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(6, 6, 6);
    gfx.generateTexture(this.circleTextureKey, 12, 12);

    gfx.clear();
    const starPoints = this.drawStarPoints(8, 8, 5, 8, 4);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillPoints(starPoints, true);
    gfx.generateTexture(this.starTextureKey, 16, 16);

    gfx.clear();
    gfx.fillStyle(0xff4444, 1);
    gfx.fillTriangle(0, 0, 10, 4, 4, 10);
    gfx.generateTexture(this.shardTextureKey, 12, 12);

    gfx.destroy();
  }

  private drawStarPoints(
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ): Phaser.Geom.Point[] {
    const points: Phaser.Geom.Point[] = [];
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      points.push(new Phaser.Geom.Point(x, y));
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      points.push(new Phaser.Geom.Point(x, y));
      rot += step;
    }
    return points;
  }

  private sortByCreatedAt(): void {
    this.trackedParticles.sort((a, b) => a.createdAt - b.createdAt);
  }

  private enforceLimit(newParticleCount: number): void {
    this.sortByCreatedAt();

    while (this.totalActiveParticles + newParticleCount > MAX_PARTICLES && this.trackedParticles.length > 0) {
      const oldest = this.trackedParticles.shift();
      if (oldest) {
        this.destroyTrackedParticle(oldest);
      } else {
        break;
      }
    }
  }

  private registerEmitter(
    type: ParticleEffectType,
    emitter: Phaser.GameObjects.Particles.ParticleEmitter
  ): number {
    const id = this.nextId++;
    const now = Date.now();

    const qty = emitter.quantity;
    const particleCount = typeof qty === 'number' ? qty : 5;

    const tracked: TrackedParticle = {
      id,
      type,
      emitter,
      createdAt: now,
      particleCount,
    };

    this.trackedParticles.push(tracked);
    this.totalActiveParticles += particleCount;

    emitter.once('complete', () => {
      this.removeTrackedParticle(id);
    });

    return id;
  }

  private removeTrackedParticle(id: number): void {
    const idx = this.trackedParticles.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const tracked = this.trackedParticles[idx];
      this.totalActiveParticles = Math.max(0, this.totalActiveParticles - tracked.particleCount);
      this.trackedParticles.splice(idx, 1);
    }
  }

  private destroyTrackedParticle(tracked: TrackedParticle): void {
    try {
      tracked.emitter.stop();
      tracked.emitter.destroy();
    } catch (e) {
    }
    this.totalActiveParticles = Math.max(0, this.totalActiveParticles - tracked.particleCount);
    const idx = this.trackedParticles.indexOf(tracked);
    if (idx !== -1) {
      this.trackedParticles.splice(idx, 1);
    }
  }

  spawnPerfect(x: number, y: number): number {
    const particleCount = 30;
    const glowCount = 15;
    const totalNew = particleCount + glowCount;

    this.enforceLimit(totalNew);

    const particles = this.scene.add.particles(x, y, this.starTextureKey, {
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      lifespan: 800,
      quantity: particleCount,
      tint: 0xffd700,
      blendMode: 'ADD',
      gravityY: 50,
      emitting: false,
    });

    const glow = this.scene.add.particles(x, y, this.circleTextureKey, {
      speed: { min: 20, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 2.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 600,
      quantity: glowCount,
      tint: 0xffee88,
      blendMode: 'ADD',
      emitting: false,
    });

    particles.explode();
    glow.explode();

    this.registerEmitter('perfect', particles);
    return this.registerEmitter('perfect', glow);
  }

  spawnGood(x: number, y: number): number {
    const newParticles = 12;
    this.enforceLimit(newParticles);

    const particles = this.scene.add.particles(x, y, this.circleTextureKey, {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 500,
      quantity: newParticles,
      tint: 0xffffff,
      blendMode: 'ADD',
      emitting: false,
    });

    particles.explode();

    return this.registerEmitter('good', particles);
  }

  spawnMiss(x: number, y: number): number {
    const newParticles = 20;
    this.enforceLimit(newParticles);

    const particles = this.scene.add.particles(x, y, this.shardTextureKey, {
      speed: { min: 80, max: 200 },
      angle: { min: 120, max: 240 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 1, end: 0 },
      lifespan: 700,
      quantity: newParticles,
      tint: 0xff3333,
      gravityY: 300,
      rotate: { min: 0, max: 360 },
      emitting: false,
    });

    particles.explode();

    return this.registerEmitter('miss', particles);
  }

  destroyAll(): void {
    while (this.trackedParticles.length > 0) {
      const tracked = this.trackedParticles.shift();
      if (tracked) {
        try {
          tracked.emitter.stop();
          tracked.emitter.destroy();
        } catch (e) {
        }
      }
    }
    this.totalActiveParticles = 0;
  }

  getActiveParticleCount(): number {
    return this.totalActiveParticles;
  }

  getTrackedEmitterCount(): number {
    return this.trackedParticles.length;
  }
}
