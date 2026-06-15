import type { Particle, EnergyData, EnergyType } from '../types';

interface SimulationEngineCallbacks {
  onFrame: (particles: Particle[], frame: number) => void;
  onComplete: () => void;
}

interface ShockwaveRing {
  radius: number;
  maxRadius: number;
  opacity: number;
  width: number;
}

export class SimulationEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private shockwaveRings: ShockwaveRing[] = [];
  private energyData: EnergyData | null = null;
  private callbacks: SimulationEngineCallbacks;
  private animationId: number | null = null;
  private frameCount: number = 0;
  private maxFrames: number = 200;
  private isRunning: boolean = false;
  private centerX: number = 0;
  private centerY: number = 0;
  private gravity: number = 0.05;
  private elasticity: number = 0.3;
  private particleIdCounter: number = 0;

  private readonly particleConfigs: Record<EnergyType, {
    colors: string[];
    sizeRange: [number, number];
    speedRange: [number, number];
    lifeTime: number;
  }> = {
    explosion: {
      colors: ['#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00'],
      sizeRange: [3, 6],
      speedRange: [2, 5],
      lifeTime: 0.8
    },
    jet: {
      colors: ['#0066ff', '#0088ff', '#00aaff', '#33bbff', '#66ccff'],
      sizeRange: [2, 4],
      speedRange: [1.5, 4],
      lifeTime: 1.2
    },
    pillar: {
      colors: ['#ffd700', '#ffea00', '#ffff66', '#fffacd', '#fff8dc'],
      sizeRange: [1, 2],
      speedRange: [1, 3],
      lifeTime: 1.5
    },
    shockwave: {
      colors: ['#ffffcc', '#ffff99', '#ffff66', '#fffacd'],
      sizeRange: [2, 3],
      speedRange: [1, 2.5],
      lifeTime: 0.6
    }
  };

  constructor(canvas: HTMLCanvasElement, callbacks: SimulationEngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.updateCanvasSize();
  }

  private updateCanvasSize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
  }

  private createParticle(energyData: EnergyData): Particle {
    const config = this.particleConfigs[energyData.type];
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 15;
    const x = this.centerX + Math.cos(angle) * distance;
    const y = this.centerY + Math.sin(angle) * distance;

    let vx: number, vy: number;
    const speed = config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]);

    switch (energyData.type) {
      case 'explosion':
        vx = Math.cos(angle) * speed * (0.8 + energyData.intensity * 0.4);
        vy = Math.sin(angle) * speed * (0.8 + energyData.intensity * 0.4);
        break;
      case 'jet': {
        const parabolaFactor = 1 - Math.pow(Math.abs(angle - Math.PI / 2) / Math.PI, 2);
        const jetSpeed = speed * parabolaFactor;
        vx = Math.cos(angle) * jetSpeed * 0.5;
        vy = -Math.abs(Math.sin(angle)) * jetSpeed * 1.5;
        break;
      }
      case 'pillar':
        vx = (Math.random() - 0.5) * 0.5;
        vy = -speed * (0.8 + Math.random() * 0.4);
        break;
      case 'shockwave':
        vx = Math.cos(angle) * speed * 1.5;
        vy = Math.sin(angle) * speed * 1.5;
        break;
      default:
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
    }

    const size = config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]);
    const color = config.colors[Math.floor(Math.random() * config.colors.length)];
    const maxLife = Math.round(config.lifeTime * 60);

    return {
      id: this.particleIdCounter++,
      x,
      y,
      vx,
      vy,
      size,
      color,
      life: maxLife,
      maxLife,
      type: energyData.type
    };
  }

  private initParticles(energyData: EnergyData): void {
    this.particles = [];
    this.particleIdCounter = 0;
    for (let i = 0; i < energyData.particleCount; i++) {
      this.particles.push(this.createParticle(energyData));
    }

    if (energyData.type === 'shockwave') {
      this.shockwaveRings = [{
        radius: 10,
        maxRadius: 100 + energyData.radius * 200,
        opacity: 0.8,
        width: 6 + Math.random() * 2
      }];
    } else {
      this.shockwaveRings = [];
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += this.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      if (p.life <= 0 || p.y > this.canvas.height / window.devicePixelRatio + 50) {
        this.particles.splice(i, 1);
      }
    }
  }

  private handleCollisions(): void {
    const particles = this.particles;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = p1.size + p2.size;

        if (distance < minDist && distance > 0) {
          const nx = dx / distance;
          const ny = dy / distance;
          const dvx = p1.vx - p2.vx;
          const dvy = p1.vy - p2.vy;
          const dvn = dvx * nx + dvy * ny;

          if (dvn > 0) continue;

          const restitution = this.elasticity;
          const impulse = -(1 + restitution) * dvn / 2;

          p1.vx += impulse * nx;
          p1.vy += impulse * ny;
          p2.vx -= impulse * nx;
          p2.vy -= impulse * ny;

          const overlap = (minDist - distance) / 2;
          p1.x -= overlap * nx;
          p1.y -= overlap * ny;
          p2.x += overlap * nx;
          p2.y += overlap * ny;
        }
      }
    }
  }

  private updateShockwaveRings(): void {
    for (let i = this.shockwaveRings.length - 1; i >= 0; i--) {
      const ring = this.shockwaveRings[i];
      ring.radius += 3;
      ring.opacity = Math.max(0, ring.opacity - 0.015);

      if (ring.opacity <= 0 || ring.radius >= ring.maxRadius) {
        this.shockwaveRings.splice(i, 1);
      }
    }
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    for (const ring of this.shockwaveRings) {
      const gradient = this.ctx.createRadialGradient(
        this.centerX, this.centerY, ring.radius - ring.width,
        this.centerX, this.centerY, ring.radius + ring.width
      );
      gradient.addColorStop(0, 'rgba(255, 255, 200, 0)');
      gradient.addColorStop(0.5, `rgba(255, 255, 150, ${ring.opacity * 0.6})`);
      gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');

      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, ring.radius + ring.width, 0, Math.PI * 2);
      this.ctx.arc(this.centerX, this.centerY, Math.max(0, ring.radius - ring.width), 0, Math.PI * 2, true);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const size = p.size * (0.5 + alpha * 0.5);

      this.ctx.save();
      this.ctx.globalAlpha = alpha;

      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2);
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(0.5, p.color + '80');
      gradient.addColorStop(1, p.color + '00');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }

    if (this.frameCount < 20) {
      const glowAlpha = 1 - this.frameCount / 20;
      const gradient = this.ctx.createRadialGradient(
        this.centerX, this.centerY, 0,
        this.centerX, this.centerY, 50 + this.energyData!.intensity * 100
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${glowAlpha * 0.8})`);
      gradient.addColorStop(0.3, `rgba(255, 200, 100, ${glowAlpha * 0.4})`);
      gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    this.updateParticles();
    this.handleCollisions();
    this.updateShockwaveRings();
    this.render();

    this.callbacks.onFrame([...this.particles], this.frameCount);
    this.frameCount++;

    if (this.frameCount >= this.maxFrames && this.particles.length === 0) {
      this.stop();
      this.callbacks.onComplete();
      return;
    }

    if (this.frameCount < this.maxFrames || this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.animate);
    } else {
      this.stop();
      this.callbacks.onComplete();
    }
  };

  public start(energyData: EnergyData): void {
    this.updateCanvasSize();
    this.energyData = energyData;
    this.frameCount = 0;
    this.isRunning = true;
    this.initParticles(energyData);
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public clear(): void {
    this.stop();
    this.particles = [];
    this.shockwaveRings = [];
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }

  public resize(): void {
    this.updateCanvasSize();
  }
}
