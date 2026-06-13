import Phaser from 'phaser';

export interface TrailConfig {
  color: number;
  velocity: { x: number; y: number };
  lifeSpan: number;
  size: { min: number; max: number };
  emissionRate: number;
}

export interface ExplosionConfig {
  color: number;
  count: number;
  lifeSpan: number;
  speed: { min: number; max: number };
  size: { min: number; max: number };
}

export interface DebrisConfig {
  count: number;
  lifeSpan: number;
  speed: { min: number; max: number };
  size: { min: number; max: number };
  rotationSpeed: number;
}

interface ParticleData {
  life?: number;
  maxLife?: number;
  vx?: number;
  vy?: number;
  vrotation?: number;
  targetRadius?: number;
}

type Particle = (Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle) & ParticleData;

export class ParticleManager {
  private scene: Phaser.Scene;
  private particleGroup: Phaser.GameObjects.Group;
  private activeParticles: Particle[];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.particleGroup = scene.add.group();
    this.activeParticles = [];
  }

  createDynamicTrail(
    x: number,
    y: number,
    color: number,
    shipSpeed: number,
    baseSpeed: number = 100
  ): void {
    const normalizedSpeed = Math.min(Math.max(shipSpeed / baseSpeed, 0.2), 3);
    const lifeSpan = 0.3 * normalizedSpeed + 0.2;
    const emissionInterval = 0.08 / normalizedSpeed;
    const sizeRange = {
      min: 2 + normalizedSpeed * 1.5,
      max: 5 + normalizedSpeed * 3
    };

    if (Math.random() < (1 / 60) / emissionInterval) {
      this.spawnTrailParticle(x, y, color, lifeSpan, sizeRange);
    }
  }

  private spawnTrailParticle(
    x: number,
    y: number,
    color: number,
    lifeSpan: number,
    sizeRange: { min: number; max: number }
  ): void {
    const size = Phaser.Math.Between(sizeRange.min * 10, sizeRange.max * 10) / 10;
    const offsetAngle = Phaser.Math.FloatBetween(-0.5, 0.5);
    const offsetDist = Phaser.Math.Between(0, 8);
    const px = x + Math.cos(offsetAngle) * offsetDist;
    const py = y + Math.sin(offsetAngle) * offsetDist;

    const particle = this.scene.add.circle(px, py, size, color);
    particle.setAlpha(0.85);
    particle.setBlendMode(Phaser.BlendModes.ADD);

    (particle as unknown as { life: number; maxLife: number }).life = lifeSpan;
    (particle as unknown as { life: number; maxLife: number }).maxLife = lifeSpan;

    this.particleGroup.add(particle);
    this.activeParticles.push(particle as Particle);
  }

  createExplosion(x: number, y: number, color: number = 0x00aaff, config?: Partial<ExplosionConfig>): void {
    const count = config?.count ?? 15;
    const lifeSpan = config?.lifeSpan ?? 0.3;
    const speedMin = config?.speed?.min ?? 60;
    const speedMax = config?.speed?.max ?? 160;
    const sizeMin = config?.size?.min ?? 2;
    const sizeMax = config?.size?.max ?? 5;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const speed = Phaser.Math.Between(speedMin, speedMax);
      const size = Phaser.Math.Between(sizeMin * 10, sizeMax * 10) / 10;

      const particle = this.scene.add.circle(x, y, size, color);
      particle.setAlpha(0.9);
      particle.setBlendMode(Phaser.BlendModes.ADD);

      const typedParticle = particle as unknown as {
        life: number;
        maxLife: number;
        vx: number;
        vy: number;
      };
      typedParticle.life = lifeSpan;
      typedParticle.maxLife = lifeSpan;
      typedParticle.vx = Math.cos(angle) * speed;
      typedParticle.vy = Math.sin(angle) * speed;

      this.particleGroup.add(particle);
      this.activeParticles.push(particle as Particle);
    }
  }

  createDebrisExplosion(x: number, y: number, shipColor: number, config?: Partial<DebrisConfig>): void {
    const count = config?.count ?? 30;
    const lifeSpan = config?.lifeSpan ?? 0.6;
    const speedMin = config?.speed?.min ?? 80;
    const speedMax = config?.speed?.max ?? 280;
    const sizeMin = config?.size?.min ?? 3;
    const sizeMax = config?.size?.max ?? 8;
    const rotationSpeed = config?.rotationSpeed ?? 6;

    const colors = [shipColor, 0xff4400, 0xffaa00, 0xffffff];

    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(speedMin, speedMax);
      const width = Phaser.Math.Between(sizeMin, sizeMax);
      const height = Phaser.Math.Between(sizeMin, sizeMax);
      const color = colors[Phaser.Math.Between(0, colors.length - 1)];

      const particle = this.scene.add.rectangle(x, y, width, height, color);
      particle.setAlpha(0.95);

      const typedParticle = particle as unknown as {
        life: number;
        maxLife: number;
        vx: number;
        vy: number;
        vrotation: number;
      };
      typedParticle.life = lifeSpan;
      typedParticle.maxLife = lifeSpan;
      typedParticle.vx = Math.cos(angle) * speed;
      typedParticle.vy = Math.sin(angle) * speed;
      typedParticle.vrotation = Phaser.Math.FloatBetween(-rotationSpeed, rotationSpeed);

      this.particleGroup.add(particle);
      this.activeParticles.push(particle as Particle);
    }
  }

  createShockwave(x: number, y: number, radius: number, color: number = 0xffffff): void {
    const ring = this.scene.add.circle(x, y, 2, 0xffffff, 0);
    ring.setStrokeStyle(3, color, 0.8);
    ring.setBlendMode(Phaser.BlendModes.ADD);

    const typedRing = ring as unknown as {
      life: number;
      maxLife: number;
      targetRadius: number;
    };
    typedRing.life = 0.4;
    typedRing.maxLife = 0.4;
    typedRing.targetRadius = radius;

    this.particleGroup.add(ring);
    this.activeParticles.push(ring as Particle);
  }

  update(delta: number): void {
    const dt = delta / 1000;
    const toRemove: number[] = [];

    for (let i = 0; i < this.activeParticles.length; i++) {
      const particle = this.activeParticles[i];

      if (particle.life !== undefined && particle.maxLife !== undefined) {
        particle.life -= dt;

        if (particle.vx !== undefined) {
          particle.x += (particle.vx ?? 0) * dt;
          particle.y += (particle.vy ?? 0) * dt;
          particle.vx = (particle.vx ?? 0) * 0.97;
          particle.vy = (particle.vy ?? 0) * 0.97;
        }

        if (particle.vrotation !== undefined) {
          particle.rotation += (particle.vrotation ?? 0) * dt;
        }

        if (particle.targetRadius !== undefined) {
          const progress = 1 - particle.life / particle.maxLife;
          const r = 2 + particle.targetRadius * progress;
          particle.setRadius(r);
        }

        const alpha = Math.max(0, particle.life / particle.maxLife);
        particle.setAlpha(alpha);

        if (particle.life <= 0) {
          toRemove.push(i);
        }
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const p = this.activeParticles[idx];
      this.particleGroup.remove(p);
      p.destroy();
      this.activeParticles.splice(idx, 1);
    }
  }

  clear(): void {
    for (const particle of this.activeParticles) {
      particle.destroy();
    }
    this.activeParticles.length = 0;
    this.particleGroup.clear(true, true);
  }

  getActiveCount(): number {
    return this.activeParticles.length;
  }
}
