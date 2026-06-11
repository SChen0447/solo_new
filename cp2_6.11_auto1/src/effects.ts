export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'thrust' | 'explosion' | 'pickup' | 'debris' | 'glow';
  alpha?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 200;

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.type === 'thrust') {
        p.vx *= 0.98;
        p.vy *= 0.98;
      }

      if (p.type === 'glow') {
        p.size *= 1.02;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'glow') {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(0.4, p.color + '80');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  addParticle(particle: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  createThrust(x: number, y: number, angle: number): void {
    if (this.particles.length >= this.maxParticles - 1) return;

    const speed = 80 + Math.random() * 60;
    const spread = 0.3;
    const a = angle + Math.PI + (Math.random() - 0.5) * spread;

    this.addParticle({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.5 ? '#ff8c00' : '#39ff14',
      type: 'thrust'
    });
  }

  createExplosion(x: number, y: number, count: number = 20): void {
    const remaining = this.maxParticles - this.particles.length;
    if (remaining <= 0) return;

    const actualCount = Math.min(count, remaining - 1);
    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount + Math.random() * 0.5;
      const speed = 100 + Math.random() * 150;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#ff8c00' : '#ffcc00',
        type: 'explosion'
      });
    }

    if (this.particles.length < this.maxParticles) {
      this.addParticle({
        x,
        y,
        vx: 0,
        vy: 0,
        life: 0.4,
        maxLife: 0.4,
        size: 10,
        color: '#ffffff',
        type: 'glow'
      });
    }
  }

  createPickup(x: number, y: number): void {
    const remaining = this.maxParticles - this.particles.length;
    if (remaining <= 0) return;

    const actualCount = Math.min(8, remaining);
    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount;
      const speed = 60;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        maxLife: 0.4,
        size: 3,
        color: '#39ff14',
        type: 'pickup'
      });
    }
  }

  createDebris(x: number, y: number, count: number = 8): void {
    const remaining = this.maxParticles - this.particles.length;
    if (remaining <= 0) return;

    const actualCount = Math.min(count, remaining);
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1 + Math.random() * 1,
        maxLife: 2,
        size: 2 + Math.random() * 3,
        color: '#888899',
        type: 'debris'
      });
    }
  }

  get count(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}
