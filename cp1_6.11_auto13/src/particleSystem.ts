export type ParticleType = 'frost' | 'mist' | 'sparkle' | 'wallHit';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  type: ParticleType;
  active: boolean;
}

export interface ParticleSystemConfig {
  maxParticles?: number;
  targetFPS?: number;
}

export class ParticleSystem {
  private particles: Particle[];
  private pool: Particle[];
  private maxParticles: number;
  private targetFPS: number;
  private currentFPS: number;
  private frameTimes: number[];
  private lastFrameTime: number;
  private spawnMultiplier: number;
  private degraded: boolean;

  constructor(config: ParticleSystemConfig = {}) {
    this.maxParticles = config.maxParticles ?? 1000;
    this.targetFPS = config.targetFPS ?? 60;
    this.particles = [];
    this.pool = [];
    this.currentFPS = 60;
    this.frameTimes = [];
    this.lastFrameTime = performance.now();
    this.spawnMultiplier = 1;
    this.degraded = false;
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      color: '#ffffff',
      alpha: 0,
      rotation: 0,
      rotationSpeed: 0,
      type: 'frost',
      active: false
    };
  }

  private getFromPool(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) {
        return p;
      }
    }
    if (this.pool.length < this.maxParticles) {
      const newP = this.createEmptyParticle();
      this.pool.push(newP);
      return newP;
    }
    return null;
  }

  private getScaledCount(baseCount: number): number {
    const scaled = Math.max(1, Math.round(baseCount * this.spawnMultiplier));
    const freeSlots = this.maxParticles - this.getActiveCount();
    return Math.min(scaled, freeSlots);
  }

  public recordFrame(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameTimes.push(delta);
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }

    if (this.frameTimes.length >= 10) {
      const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.currentFPS = 1000 / avgDelta;
      this.adjustPerformanceLevel();
    }
  }

  private adjustPerformanceLevel(): void {
    const activeRatio = this.getActiveCount() / this.maxParticles;

    if (this.currentFPS < this.targetFPS * 0.75) {
      if (!this.degraded) {
        this.degraded = true;
        console.warn(
          `[ParticleSystem] FPS 降至 ${this.currentFPS.toFixed(1)}，启用性能降级模式`
        );
      }
      this.spawnMultiplier = Math.max(0.25, this.spawnMultiplier - 0.1);
      this.trimLowPriorityParticles();
    } else if (this.currentFPS >= this.targetFPS * 0.9 && activeRatio < 0.75) {
      this.spawnMultiplier = Math.min(1, this.spawnMultiplier + 0.05);
      if (this.spawnMultiplier >= 0.95 && this.degraded) {
        this.degraded = false;
        console.info('[ParticleSystem] 性能已恢复，退出降级模式');
      }
    }
  }

  private trimLowPriorityParticles(): void {
    const priorityOrder: ParticleType[] = ['frost', 'wallHit', 'sparkle', 'mist'];
    let trimmed = 0;
    const targetRemove = Math.floor(this.particles.length * 0.2);

    for (const type of priorityOrder) {
      if (trimmed >= targetRemove) break;
      for (let i = this.particles.length - 1; i >= 0 && trimmed < targetRemove; i--) {
        const p = this.particles[i];
        if (p.active && p.type === type && p.life < p.maxLife * 0.5) {
          p.life *= 0.5;
          trimmed++;
        }
      }
    }
  }

  public emitFrostTrail(x: number, y: number, direction: { x: number; y: number }): void {
    const count = this.getScaledCount(3 + Math.floor(Math.random() * 3));
    for (let i = 0; i < count; i++) {
      const p = this.getFromPool();
      if (!p) break;

      const angle = Math.atan2(direction.y, direction.x) + (Math.random() - 0.5) * 0.8;
      const speed = 0.5 + Math.random() * 1.5;

      p.x = x + (Math.random() - 0.5) * 8;
      p.y = y + (Math.random() - 0.5) * 8;
      p.vx = Math.cos(angle) * speed - direction.x * 0.3;
      p.vy = Math.sin(angle) * speed - direction.y * 0.3;
      p.life = (400 + Math.random() * 300) * (this.degraded ? 0.6 : 1);
      p.maxLife = p.life;
      p.size = 2 + Math.random() * 4;
      p.color = Math.random() > 0.5 ? '#a8d8ea' : '#e0f7fa';
      p.alpha = 0.8 + Math.random() * 0.2;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.1;
      p.type = 'frost';
      p.active = true;

      this.particles.push(p);
    }
  }

  public emitWallHit(x: number, y: number): void {
    const count = this.getScaledCount(12);
    for (let i = 0; i < count; i++) {
      const p = this.getFromPool();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = (250 + Math.random() * 150) * (this.degraded ? 0.7 : 1);
      p.maxLife = p.life;
      p.size = 3 + Math.random() * 4;
      p.color = '#ef5350';
      p.alpha = 1;
      p.rotation = 0;
      p.rotationSpeed = 0;
      p.type = 'wallHit';
      p.active = true;

      this.particles.push(p);
    }
  }

  public emitCrystalCollect(x: number, y: number): void {
    const count = this.getScaledCount(20);
    for (let i = 0; i < count; i++) {
      const p = this.getFromPool();
      if (!p) break;

      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2.5;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = (500 + Math.random() * 300) * (this.degraded ? 0.7 : 1);
      p.maxLife = p.life;
      p.size = 2 + Math.random() * 5;
      p.color = Math.random() > 0.3 ? '#4fc3f7' : '#81d4fa';
      p.alpha = 1;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.15;
      p.type = 'sparkle';
      p.active = true;

      this.particles.push(p);
    }
  }

  public emitChestCollect(x: number, y: number): void {
    const count = this.getScaledCount(30);
    for (let i = 0; i < count; i++) {
      const p = this.getFromPool();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 1;
      p.life = (600 + Math.random() * 400) * (this.degraded ? 0.7 : 1);
      p.maxLife = p.life;
      p.size = 3 + Math.random() * 6;
      p.color = Math.random() > 0.5 ? '#ffd54f' : '#ffecb3';
      p.alpha = 1;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.2;
      p.type = 'sparkle';
      p.active = true;

      this.particles.push(p);
    }
  }

  public emitPortalBurst(centerX: number, centerY: number, width: number, height: number): void {
    const count = this.getScaledCount(200);
    for (let i = 0; i < count; i++) {
      const p = this.getFromPool();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.max(width, height) * 0.6;
      const speed = 3 + Math.random() * 6;

      p.x = centerX + Math.cos(angle) * dist * 0.2;
      p.y = centerY + Math.sin(angle) * dist * 0.2;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = (800 + Math.random() * 400) * (this.degraded ? 0.65 : 1);
      p.maxLife = p.life;
      p.size = 4 + Math.random() * 10;
      p.color = this.randomMistColor();
      p.alpha = 0.9;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.08;
      p.type = 'mist';
      p.active = true;

      this.particles.push(p);
    }
  }

  private randomMistColor(): string {
    const colors = ['#a8d8ea', '#b3e5fc', '#81d4fa', '#e0f7fa', '#4fc3f7'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  public update(deltaTime: number): void {
    const step = this.degraded ? deltaTime * 1.4 : deltaTime;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) {
        this.particles.splice(i, 1);
        continue;
      }

      p.life -= step;
      if (p.life <= 0) {
        p.active = false;
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = p.life / p.maxLife;

      switch (p.type) {
        case 'frost':
          p.alpha = lifeRatio * 0.9;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.vy -= 0.02;
          break;
        case 'mist':
          p.alpha = lifeRatio * lifeRatio * 0.85;
          p.size *= 1.015;
          p.vx *= 0.985;
          p.vy *= 0.985;
          break;
        case 'sparkle':
          p.alpha = lifeRatio;
          p.vy += 0.05;
          p.vx *= 0.99;
          break;
        case 'wallHit':
          p.alpha = lifeRatio * lifeRatio;
          p.vy += 0.1;
          break;
      }

      p.x += p.vx * (deltaTime / 16.67);
      p.y += p.vy * (deltaTime / 16.67);
      p.rotation += p.rotationSpeed * (deltaTime / 16.67);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const drawShadows = !this.degraded && this.currentFPS >= this.targetFPS * 0.85;

    for (const p of this.particles) {
      if (!p.active) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;

      if (p.type === 'frost' || p.type === 'wallHit') {
        this.drawDiamond(ctx, p.size, p.color, drawShadows);
      } else if (p.type === 'mist') {
        this.drawMist(ctx, p.size, p.color);
      } else if (p.type === 'sparkle') {
        this.drawStar(ctx, p.size, p.color, drawShadows);
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawDiamond(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: string,
    withShadow: boolean
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.6, 0);
    ctx.closePath();
    ctx.fill();

    if (withShadow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 1.5;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private drawMist(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color + '80');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    size: number,
    color: string,
    withShadow: boolean
  ): void {
    ctx.fillStyle = color;
    if (withShadow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 2;
    }

    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    ctx.lineWidth = size * 0.4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  public getActiveCount(): number {
    let count = 0;
    for (const p of this.particles) {
      if (p.active) count++;
    }
    return count;
  }

  public getSpawnMultiplier(): number {
    return this.spawnMultiplier;
  }

  public isDegraded(): boolean {
    return this.degraded;
  }

  public getCurrentFPS(): number {
    return this.currentFPS;
  }

  public clear(): void {
    for (const p of this.particles) {
      p.active = false;
    }
    this.particles = [];
  }
}
