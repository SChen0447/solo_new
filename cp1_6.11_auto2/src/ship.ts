import { TrailPoint, Particle, GAME_CONFIG } from './types';

export class Ship {
  x: number;
  y: number;
  energy: number;
  maxEnergy: number;
  gravityWaveActive: boolean;
  gravityWaveRadius: number;
  gravityWaveMaxRadius: number;
  gravityWaveAlpha: number;
  trail: TrailPoint[];
  particles: Particle[];
  targetX: number;
  targetY: number;
  angle: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.energy = GAME_CONFIG.INITIAL_ENERGY;
    this.maxEnergy = GAME_CONFIG.MAX_ENERGY;
    this.gravityWaveActive = false;
    this.gravityWaveRadius = 0;
    this.gravityWaveMaxRadius = GAME_CONFIG.GRAVITY_WAVE_MAX_RADIUS;
    this.gravityWaveAlpha = 0;
    this.trail = [];
    this.particles = [];
    this.angle = -Math.PI / 2;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.energy = GAME_CONFIG.INITIAL_ENERGY;
    this.gravityWaveActive = false;
    this.gravityWaveRadius = 0;
    this.gravityWaveAlpha = 0;
    this.trail = [];
    this.particles = [];
    this.angle = -Math.PI / 2;
  }

  update(dt: number, mouseX: number, mouseY: number, width: number, height: number): void {
    this.targetX = Math.max(GAME_CONFIG.SHIP_RADIUS, Math.min(width - GAME_CONFIG.SHIP_RADIUS, mouseX));
    this.targetY = Math.max(GAME_CONFIG.SHIP_RADIUS, Math.min(height - GAME_CONFIG.SHIP_RADIUS, mouseY));

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      const speed = 400;
      const moveAmount = Math.min(speed * dt, dist);
      this.x += (dx / dist) * moveAmount;
      this.y += (dy / dist) * moveAmount;
      this.angle = Math.atan2(dy, dx);
    }

    this.trail.unshift({ x: this.x, y: this.y, alpha: 1 });
    if (this.trail.length > 20) {
      this.trail.pop();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = Math.max(0, 1 - i / 20);
    }

    this.energy -= GAME_CONFIG.ENERGY_DRAIN_RATE * dt;
    this.energy = Math.max(0, this.energy);

    if (this.gravityWaveActive) {
      this.gravityWaveRadius += GAME_CONFIG.GRAVITY_WAVE_SPEED * dt;
      this.gravityWaveAlpha = Math.max(0, 1 - this.gravityWaveRadius / this.gravityWaveMaxRadius);
      
      const particleCount = 3;
      for (let i = 0; i < particleCount; i++) {
        if (this.particles.length < GAME_CONFIG.MAX_PARTICLES) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 100 + Math.random() * 150;
          this.particles.push({
            x: this.x + Math.cos(angle) * this.gravityWaveRadius,
            y: this.y + Math.sin(angle) * this.gravityWaveRadius,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.5,
            maxLife: 0.5,
            size: 2 + Math.random() * 3,
            color: '#ffffff',
            active: true
          });
        }
      }

      if (this.gravityWaveRadius >= this.gravityWaveMaxRadius) {
        this.gravityWaveActive = false;
        this.gravityWaveRadius = 0;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
      }
    }
  }

  triggerGravityWave(): boolean {
    if (this.gravityWaveActive || this.energy < GAME_CONFIG.GRAVITY_WAVE_COST) {
      return false;
    }
    this.energy -= GAME_CONFIG.GRAVITY_WAVE_COST;
    this.gravityWaveActive = true;
    this.gravityWaveRadius = GAME_CONFIG.SHIP_RADIUS;
    this.gravityWaveAlpha = 1;
    return true;
  }

  addEnergy(amount: number): void {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      const size = (GAME_CONFIG.SHIP_RADIUS * 0.6) * point.alpha;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size);
      gradient.addColorStop(0, `rgba(100, 200, 255, ${0.4 * point.alpha})`);
      gradient.addColorStop(1, `rgba(0, 150, 255, 0)`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.fill();
    }

    if (this.gravityWaveActive) {
      const rings = 3;
      for (let r = 0; r < rings; r++) {
        const ringRadius = this.gravityWaveRadius - r * 15;
        if (ringRadius <= 0) continue;
        const ringAlpha = this.gravityWaveAlpha * (1 - r * 0.3);
        ctx.beginPath();
        ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha * 0.6})`;
        ctx.lineWidth = 3 - r;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.gravityWaveRadius, 0, Math.PI * 2);
      const waveGradient = ctx.createRadialGradient(
        this.x, this.y, this.gravityWaveRadius * 0.8,
        this.x, this.y, this.gravityWaveRadius
      );
      waveGradient.addColorStop(0, `rgba(200, 230, 255, 0)`);
      waveGradient.addColorStop(0.5, `rgba(200, 230, 255, ${this.gravityWaveAlpha * 0.2})`);
      waveGradient.addColorStop(1, `rgba(200, 230, 255, 0)`);
      ctx.fillStyle = waveGradient;
      ctx.fill();
    }

    const shieldAlpha = 0.15 + (this.energy / this.maxEnergy) * 0.2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, GAME_CONFIG.SHIP_RADIUS + 8, 0, Math.PI * 2);
    const shieldGradient = ctx.createRadialGradient(
      this.x, this.y, GAME_CONFIG.SHIP_RADIUS,
      this.x, this.y, GAME_CONFIG.SHIP_RADIUS + 12
    );
    shieldGradient.addColorStop(0, `rgba(0, 255, 255, ${shieldAlpha})`);
    shieldGradient.addColorStop(1, `rgba(0, 255, 255, 0)`);
    ctx.fillStyle = shieldGradient;
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const shipGradient = ctx.createLinearGradient(-GAME_CONFIG.SHIP_RADIUS, 0, GAME_CONFIG.SHIP_RADIUS, 0);
    shipGradient.addColorStop(0, '#ffffff');
    shipGradient.addColorStop(0.5, '#e0f0ff');
    shipGradient.addColorStop(1, '#88ccff');

    ctx.beginPath();
    ctx.moveTo(GAME_CONFIG.SHIP_RADIUS, 0);
    ctx.lineTo(-GAME_CONFIG.SHIP_RADIUS * 0.7, -GAME_CONFIG.SHIP_RADIUS * 0.7);
    ctx.lineTo(-GAME_CONFIG.SHIP_RADIUS * 0.4, 0);
    ctx.lineTo(-GAME_CONFIG.SHIP_RADIUS * 0.7, GAME_CONFIG.SHIP_RADIUS * 0.7);
    ctx.closePath();
    ctx.fillStyle = shipGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 220, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(GAME_CONFIG.SHIP_RADIUS * 0.2, 0, GAME_CONFIG.SHIP_RADIUS * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
    ctx.fill();

    const engineGlow = ctx.createRadialGradient(-GAME_CONFIG.SHIP_RADIUS * 0.5, 0, 0, -GAME_CONFIG.SHIP_RADIUS * 0.5, 0, GAME_CONFIG.SHIP_RADIUS * 0.6);
    engineGlow.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
    engineGlow.addColorStop(0.5, 'rgba(50, 150, 255, 0.4)');
    engineGlow.addColorStop(1, 'rgba(0, 100, 255, 0)');
    ctx.beginPath();
    ctx.ellipse(-GAME_CONFIG.SHIP_RADIUS * 0.5, 0, GAME_CONFIG.SHIP_RADIUS * 0.6, GAME_CONFIG.SHIP_RADIUS * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = engineGlow;
    ctx.fill();

    ctx.restore();
  }
}
