import { eventBus } from '../eventBus';
import type { Particle, ParticleType } from '../types';

export class ParticleSystem {
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private readonly MAX_PARTICLES: number = 500;
  private readonly PARTICLE_GRAVITY: number = 100;
  private enabled: boolean = true;

  constructor() {
    this.initializePool();
    this.setupEventListeners();
  }

  private initializePool(): void {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.pool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      color: '#ffffff',
      life: 0,
      maxLife: 0,
      rotation: 0,
      rotationSpeed: 0,
      active: false
    };
  }

  private setupEventListeners(): void {
    eventBus.on('EFFECT', (event) => {
      if (event.type === 'EFFECT' && this.enabled) {
        const { type, x, y, color } = event.payload;
        this.spawnEffect(type, x, y, color);
      }
    });

    eventBus.on('JUMP', (event) => {
      if (event.type === 'JUMP' && this.enabled) {
        this.spawnEffect('dust', event.payload.x, event.payload.y);
      }
    });

    eventBus.on('VASE_BROKEN', (event) => {
      if (event.type === 'VASE_BROKEN' && this.enabled) {
        const { x, y, color } = event.payload;
        this.spawnDebris(x, y, color);
      }
    });

    eventBus.on('PHYSICS_DEBUG', (event) => {
      if (event.type === 'PHYSICS_DEBUG' && event.payload.particlesEnabled !== undefined) {
        this.enabled = event.payload.particlesEnabled;
      }
    });
  }

  private spawnEffect(type: ParticleType, x: number, y: number, baseColor?: string): void {
    switch (type) {
      case 'dust':
        this.spawnDust(x, y);
        break;
      case 'spark':
        this.spawnSpark(x, y);
        break;
      case 'debris':
        this.spawnDebris(x, y, baseColor || '#e07a5f');
        break;
    }
  }

  private spawnDust(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const particle = this.getParticle();
      if (!particle) continue;

      particle.x = x + (Math.random() - 0.5) * 20;
      particle.y = y - 5 - Math.random() * 10;
      particle.vx = (Math.random() - 0.5) * 30;
      particle.vy = -20 - Math.random() * 30;
      particle.size = 3 + Math.random() * 2;
      particle.color = '#d4a373';
      particle.life = 1.0;
      particle.maxLife = 1.0;
      particle.active = true;
    }
  }

  private spawnSpark(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const particle = this.getParticle();
      if (!particle) continue;

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;

      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.size = 2 + Math.random() * 3;
      particle.color = '#ffb703';
      particle.life = 0.5;
      particle.maxLife = 0.5;
      particle.active = true;
    }
  }

  private spawnDebris(x: number, y: number, baseColor: string): void {
    const baseHue = this.hexToHue(baseColor);

    for (let i = 0; i < 12; i++) {
      const particle = this.getParticle();
      if (!particle) continue;

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      const hueOffset = (Math.random() - 0.5) * 60;
      const hue = (baseHue + hueOffset + 360) % 360;

      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 50;
      particle.size = 4 + Math.random() * 6;
      particle.color = `hsl(${hue}, 70%, 60%)`;
      particle.life = 2.0;
      particle.maxLife = 2.0;
      particle.rotation = Math.random() * Math.PI * 2;
      particle.rotationSpeed = 2 + Math.random() * 3;
      particle.active = true;
    }

    for (let i = 0; i < 6; i++) {
      const particle = this.getParticle();
      if (!particle) continue;

      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 80;

      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 30;
      particle.size = 3 + Math.random() * 4;
      particle.color = baseColor;
      particle.life = 1.5;
      particle.maxLife = 1.5;
      particle.rotation = Math.random() * Math.PI * 2;
      particle.rotationSpeed = 1 + Math.random() * 2;
      particle.active = true;
    }
  }

  private hexToHue(hex: string): number {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0;

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;

    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return h * 360;
  }

  private getParticle(): Particle | null {
    if (this.pool.length > 0) {
      const p = this.pool.pop()!;
      this.particles.push(p);
      return p;
    }

    if (this.particles.length < this.MAX_PARTICLES) {
      const p = this.createEmptyParticle();
      this.particles.push(p);
      return p;
    }

    const inactive = this.particles.find(p => !p.active);
    return inactive || null;
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.vy += this.PARTICLE_GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.rotationSpeed !== undefined) {
        p.rotation! += p.rotationSpeed * dt;
      }

      p.life -= dt;

      if (p.life <= 0) {
        p.active = false;
        p.life = 0;
        this.pool.push(p);
        this.particles.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled) return;

    this.particles.forEach(p => {
      if (!p.active) return;

      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.rotation !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.globalAlpha = 1;
  }

  public destroy(): void {
    this.particles = [];
    this.pool = [];
  }
}
