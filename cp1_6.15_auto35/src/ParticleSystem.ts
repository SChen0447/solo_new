import { v4 as uuidv4 } from 'uuid';

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  trail: { x: number; y: number }[];
}

const SKILL_COLORS: Record<string, string> = {
  impact: '#00d4ff',
  shield: '#ffd700',
  blade: '#ff4444',
  shockwave: '#aa00ff',
  echo: '#00ff88',
};

const MAX_PARTICLES = 100;
const TRAIL_LENGTH = 6;

export class ParticleSystem {
  private particles: Particle[] = [];

  emit(skillId: string, x: number, y: number, combo: boolean): void {
    const color = SKILL_COLORS[skillId] || '#ffffff';
    const baseCount = 30;
    const count = combo ? baseCount * 2 : baseCount;
    const speedMultiplier = combo ? 1.5 : 1;
    const lifeMultiplier = combo ? 1.3 : 1;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = (50 + Math.random() * 150) * speedMultiplier;
      const life = (1 + Math.random()) * lifeMultiplier;

      this.particles.push({
        id: uuidv4(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life,
        maxLife: life,
        size: 3 + Math.random() * 4,
        trail: [],
      });
    }
  }

  update(deltaTime: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > TRAIL_LENGTH) {
        p.trail.shift();
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 40 * deltaTime;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= deltaTime;

      if (p.life <= 0) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(p.life / p.maxLife, 0);

      for (let t = 0; t < p.trail.length; t++) {
        const trailAlpha = (t / p.trail.length) * alpha * 0.5;
        const trailSize = (t / p.trail.length) * p.size;
        ctx.beginPath();
        ctx.arc(p.trail[t].x, p.trail[t].y, trailSize, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba(p.color, trailAlpha);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba(p.color, alpha);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRgba(p.color, alpha * 0.3);
      ctx.fill();
    }
  }

  getCount(): number {
    return this.particles.length;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export const particleSystem = new ParticleSystem();
