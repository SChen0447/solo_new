export type ParticleType = 'smoke' | 'spark';

export interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export class ParticleSystem {
  particles: Particle[];
  maxParticles: number = 200;

  constructor() {
    this.particles = [];
  }

  emitSmoke(x: number, y: number, angle: number): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }

    const spread = 0.3;
    for (let i = 0; i < 3; i++) {
      const randomAngle = angle + Math.PI + (Math.random() - 0.5) * spread;
      const speed = 0.5 + Math.random() * 0.5;
      this.particles.push({
        type: 'smoke',
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(randomAngle) * speed,
        vy: Math.sin(randomAngle) * speed,
        life: 60,
        maxLife: 60,
        size: 6,
        color: '#9e9e9e',
        alpha: 0.6
      });
    }
  }

  emitSparks(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        type: 'spark',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 18,
        maxLife: 18,
        size: 4,
        color: '#ffffff',
        alpha: 1
      });
    }
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      if (p.type === 'smoke') {
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.size += 0.05;
        p.alpha = 0.6 * (p.life / p.maxLife);
      } else {
        p.vy += 0.1;
        p.alpha = p.life / p.maxLife;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  clear(): void {
    this.particles = [];
  }
}
