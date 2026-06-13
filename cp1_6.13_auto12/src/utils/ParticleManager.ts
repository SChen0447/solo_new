import Phaser from 'phaser';

export type ParticleEffectType = 'perfect' | 'good' | 'miss' | 'judgmentLineFlash';

export interface ParticleEffect {
  id: number;
  type: ParticleEffectType;
  emitters: Phaser.GameObjects.Particles.ParticleEmitter[];
  createdAt: number;
}

const MAX_PARTICLES = 200;

export class ParticleManager {
  private scene: Phaser.Scene;
  private effects: Map<number, ParticleEffect>;
  private nextId: number;
  private totalActiveParticles: number;
  private starTextureKey: string;
  private circleTextureKey: string;
  private shardTextureKey: string;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.effects = new Map();
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

  private enforceLimit(newParticleCount: number): void {
    while (this.totalActiveParticles + newParticleCount > MAX_PARTICLES && this.effects.size > 0) {
      const oldestId = this.getOldestEffectId();
      if (oldestId !== null) {
        this.destroyEffect(oldestId);
      } else {
        break;
      }
    }
  }

  private getOldestEffectId(): number | null {
    let oldestId: number | null = null;
    let oldestTime = Infinity;

    for (const [id, effect] of this.effects.entries()) {
      if (effect.createdAt < oldestTime) {
        oldestTime = effect.createdAt;
        oldestId = id;
      }
    }
    return oldestId;
  }

  private registerEffect(type: ParticleEffectType, emitters: Phaser.GameObjects.Particles.ParticleEmitter[]): number {
    const id = this.nextId++;
    const now = Date.now();

    let count = 0;
    for (const emitter of emitters) {
      const qty = emitter.quantity;
      count += typeof qty === 'number' ? qty : 5;
    }
    this.totalActiveParticles += count;

    this.effects.set(id, { id, type, emitters, createdAt: now });

    for (const emitter of emitters) {
      emitter.once('complete', () => {
        this.removeEffect(id);
      });
    }

    return id;
  }

  private removeEffect(id: number): void {
    const effect = this.effects.get(id);
    if (effect) {
      let count = 0;
      for (const emitter of effect.emitters) {
        const qty = emitter.quantity;
        count += typeof qty === 'number' ? qty : 5;
      }
      this.totalActiveParticles = Math.max(0, this.totalActiveParticles - count);
      this.effects.delete(id);
    }
  }

  spawnPerfect(x: number, y: number): number {
    const newParticles = 30 + 15;
    this.enforceLimit(newParticles);

    const particles = this.scene.add.particles(x, y, this.starTextureKey, {
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      lifespan: 800,
      quantity: 30,
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
      quantity: 15,
      tint: 0xffee88,
      blendMode: 'ADD',
      emitting: false,
    });

    particles.explode();
    glow.explode();

    return this.registerEffect('perfect', [particles, glow]);
  }

  spawnGood(x: number, y: number): number {
    const newParticles = 12;
    this.enforceLimit(newParticles);

    const particles = this.scene.add.particles(x, y, this.circleTextureKey, {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 500,
      quantity: 12,
      tint: 0xffffff,
      blendMode: 'ADD',
      emitting: false,
    });

    particles.explode();

    return this.registerEffect('good', [particles]);
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
      quantity: 20,
      tint: 0xff3333,
      gravityY: 300,
      rotate: { min: 0, max: 360 },
      emitting: false,
    });

    particles.explode();

    return this.registerEffect('miss', [particles]);
  }

  destroyEffect(id: number): void {
    const effect = this.effects.get(id);
    if (effect) {
      for (const emitter of effect.emitters) {
        emitter.stop();
        emitter.destroy();
      }
      this.removeEffect(id);
    }
  }

  destroyAll(): void {
    for (const id of Array.from(this.effects.keys())) {
      this.destroyEffect(id);
    }
    this.totalActiveParticles = 0;
  }

  getActiveParticleCount(): number {
    return this.totalActiveParticles;
  }

  getEffectCount(): number {
    return this.effects.size;
  }
}
