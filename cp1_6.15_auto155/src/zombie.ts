import {
  Vec2,
  Circle,
  vec2,
  vec2Sub,
  vec2Normalize,
  vec2Length,
  vec2Add,
  vec2Mul,
  circleCollision,
  randomRange,
  randomInt,
  AnimationTimer,
  Particle,
  clamp,
} from './utils';

export type SpawnCorner = 0 | 1 | 2 | 3;

export class Zombie {
  public x: number;
  public y: number;
  public radius: number = 10;
  public baseSpeed: number = 80;
  public alive: boolean = true;
  public dying: boolean = false;

  private fadeInTimer: AnimationTimer;
  private deathTimer: AnimationTimer = new AnimationTimer(0.3);
  public deathParticles: Particle[] = [];

  private mapWidth: number;
  private mapHeight: number;

  constructor(
    x: number,
    y: number,
    mapWidth: number,
    mapHeight: number,
    speedMultiplier: number = 1
  ) {
    this.x = x;
    this.y = y;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.baseSpeed *= speedMultiplier;
    this.fadeInTimer = new AnimationTimer(0.3, true);
  }

  static spawnAtCorner(
    corner: SpawnCorner,
    mapWidth: number,
    mapHeight: number,
    speedMultiplier: number = 1
  ): Zombie {
    const margin = 20;
    let x: number, y: number;

    switch (corner) {
      case 0:
        x = randomRange(margin, mapWidth * 0.2);
        y = randomRange(margin, mapHeight * 0.2);
        break;
      case 1:
        x = randomRange(mapWidth * 0.8, mapWidth - margin);
        y = randomRange(margin, mapHeight * 0.2);
        break;
      case 2:
        x = randomRange(margin, mapWidth * 0.2);
        y = randomRange(mapHeight * 0.8, mapHeight - margin);
        break;
      case 3:
      default:
        x = randomRange(mapWidth * 0.8, mapWidth - margin);
        y = randomRange(mapHeight * 0.8, mapHeight - margin);
        break;
    }

    return new Zombie(x, y, mapWidth, mapHeight, speedMultiplier);
  }

  static spawnAtEdge(
    mapWidth: number,
    mapHeight: number,
    speedMultiplier: number = 1
  ): Zombie {
    const margin = 10;
    const edge = randomInt(0, 3);
    let x: number, y: number;

    switch (edge) {
      case 0:
        x = randomRange(margin, mapWidth - margin);
        y = -margin;
        break;
      case 1:
        x = mapWidth + margin;
        y = randomRange(margin, mapHeight - margin);
        break;
      case 2:
        x = randomRange(margin, mapWidth - margin);
        y = mapHeight + margin;
        break;
      default:
        x = -margin;
        y = randomRange(margin, mapHeight - margin);
        break;
    }

    return new Zombie(x, y, mapWidth, mapHeight, speedMultiplier);
  }

  getCircle(): Circle {
    return { x: this.x, y: this.y, radius: this.radius };
  }

  getSpeed(): number {
    return this.baseSpeed;
  }

  isFullySpawned(): boolean {
    return this.fadeInTimer.isComplete();
  }

  kill(): void {
    if (this.dying || !this.alive) return;

    this.dying = true;
    this.deathTimer.start();

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + randomRange(-0.3, 0.3);
      const speed = randomRange(60, 140);
      const particle = new Particle(
        this.x,
        this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomRange(2, 5),
        '#e74c3c',
        randomRange(0.3, 0.5)
      );
      this.deathParticles.push(particle);
    }
  }

  update(dt: number, playerX: number, playerY: number, allZombies: Zombie[]): void {
    this.fadeInTimer.update(dt);

    if (this.dying) {
      this.deathTimer.update(dt);
      for (const p of this.deathParticles) {
        p.update(dt);
      }
      this.deathParticles = this.deathParticles.filter((p) => p.alive);

      if (this.deathTimer.isComplete() && this.deathParticles.length === 0) {
        this.alive = false;
      }
      return;
    }

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      let moveX = (dx / dist) * this.baseSpeed * dt;
      let moveY = (dy / dist) * this.baseSpeed * dt;

      const separation = this.calculateSeparation(allZombies);
      moveX += separation.x * dt;
      moveY += separation.y * dt;

      this.x += moveX;
      this.y += moveY;
    }

    this.x = clamp(this.x, this.radius, this.mapWidth - this.radius);
    this.y = clamp(this.y, this.radius, this.mapHeight - this.radius);
  }

  private calculateSeparation(allZombies: Zombie[]): Vec2 {
    let sepX = 0;
    let sepY = 0;
    const minDist = this.radius * 2.2;
    const repulsionStrength = 120;

    for (const other of allZombies) {
      if (other === this || !other.alive || other.dying) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist && dist > 0) {
        const force = (1 - dist / minDist) * repulsionStrength;
        sepX += (dx / dist) * force;
        sepY += (dy / dist) * force;
      }
    }

    return { x: sepX, y: sepY };
  }

  resolveCollisionWith(other: Zombie): void {
    if (!this.alive || this.dying || !other.alive || other.dying) return;

    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.radius + other.radius;

    if (dist < minDist && dist > 0) {
      const overlap = (minDist - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      this.x += nx * overlap;
      this.y += ny * overlap;
      other.x -= nx * overlap;
      other.y -= ny * overlap;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.deathParticles) {
      p.draw(ctx);
    }

    if (!this.alive) return;

    ctx.save();

    if (!this.fadeInTimer.isComplete()) {
      ctx.globalAlpha = this.fadeInTimer.progress();
    }

    if (this.dying) {
      const deathProgress = this.deathTimer.progress();
      ctx.globalAlpha = 1 - deathProgress;
    }

    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#922b21';
    ctx.lineWidth = 2;
    ctx.stroke();

    const eyeOffset = 3;
    const eyeSize = 2.5;
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(this.x - eyeOffset, this.y - 2, eyeSize, 0, Math.PI * 2);
    ctx.arc(this.x + eyeOffset, this.y - 2, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.x - eyeOffset, this.y - 2, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.arc(this.x + eyeOffset, this.y - 2, eyeSize * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
