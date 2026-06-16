export type MotionType = 'linear' | 'sine' | 'spiral';
export type GradientType = 'linear' | 'radial';

export interface ColorStop {
  color: string;
  position: number;
}

export interface EmitterConfig {
  id: string;
  x: number;
  y: number;
  rotation: number;
  particleCount: number;
  particleSize: number;
  colors: ColorStop[];
  gradientType: GradientType;
  motionType: MotionType;
  speed: number;
  lifetime: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseColor: string;
  currentColor: string;
  age: number;
  lifetime: number;
  motionType: MotionType;
  speed: number;
  angle: number;
  initialAngle: number;
  spiralRadius: number;
  sineAmplitude: number;
  sineFrequency: number;
  originX: number;
  originY: number;
  collisionFlash: number;
}

export class ParticleEngine {
  private particles: Particle[] = [];
  private emitters: EmitterConfig[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleIdCounter = 0;
  private lastTime = 0;
  private animationId: number | null = null;
  private isPlaying = true;
  private emissionTimers: Map<string, number> = new Map();
  private onFrame?: (fps: number) => void;
  private frameCount = 0;
  private fpsTime = 0;

  constructor(canvas: HTMLCanvasElement, onFrame?: (fps: number) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onFrame = onFrame;
  }

  setEmitters(emitters: EmitterConfig[]): void {
    this.emitters = emitters;
    emitters.forEach(emitter => {
      if (!this.emissionTimers.has(emitter.id)) {
        this.emissionTimers.set(emitter.id, 0);
      }
    });
    const existingIds = new Set(emitters.map(e => e.id));
    this.emissionTimers.forEach((_, id) => {
      if (!existingIds.has(id)) {
        this.emissionTimers.delete(id);
      }
    });
  }

  setPlaying(playing: boolean): void {
    this.isPlaying = playing;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  start(): void {
    if (this.animationId === null) {
      this.lastTime = performance.now();
      this.animate();
    }
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.frameCount++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 1) {
      const fps = Math.round(this.frameCount / this.fpsTime);
      this.onFrame?.(fps);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    if (this.isPlaying) {
      this.update(deltaTime);
    }
    this.draw();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private update(dt: number): void {
    this.emitters.forEach(emitter => {
      this.emitParticles(emitter, dt);
    });

    this.particles = this.particles.filter(p => p.age < p.lifetime);

    this.particles.forEach(particle => {
      particle.age += dt;

      if (particle.collisionFlash > 0) {
        particle.collisionFlash -= dt;
      }

      this.updateParticleMotion(particle, dt);
    });

    this.checkCollisions();
  }

  private emitParticles(emitter: EmitterConfig, dt: number): void {
    const timer = this.emissionTimers.get(emitter.id) || 0;
    const emitInterval = emitter.lifetime / emitter.particleCount;
    const newTimer = timer + dt;

    let emitCount = Math.floor(newTimer / emitInterval);
    const remaining = newTimer % emitInterval;

    emitCount = Math.min(emitCount, Math.ceil(emitter.particleCount * 0.1));

    for (let i = 0; i < emitCount; i++) {
      if (this.particles.length < 2500) {
        this.particles.push(this.createParticle(emitter));
      }
    }

    this.emissionTimers.set(emitter.id, remaining);
  }

  private createParticle(emitter: EmitterConfig): Particle {
    const angleRad = (emitter.rotation * Math.PI) / 180;
    const spread = 0.2;
    const randomAngle = angleRad + (Math.random() - 0.5) * spread;

    const colorIndex = Math.floor(Math.random() * emitter.colors.length);
    const baseColor = emitter.colors[colorIndex]?.color || '#00E5FF';

    const sizeVariation = 0.8 + Math.random() * 0.4;

    return {
      id: this.particleIdCounter++,
      x: emitter.x,
      y: emitter.y,
      vx: Math.cos(randomAngle) * emitter.speed * 50,
      vy: Math.sin(randomAngle) * emitter.speed * 50,
      size: emitter.particleSize * sizeVariation,
      baseColor,
      currentColor: baseColor,
      age: 0,
      lifetime: emitter.lifetime,
      motionType: emitter.motionType,
      speed: emitter.speed,
      angle: randomAngle,
      initialAngle: randomAngle,
      spiralRadius: 0,
      sineAmplitude: 20 + Math.random() * 30,
      sineFrequency: 1 + Math.random() * 2,
      originX: emitter.x,
      originY: emitter.y,
      collisionFlash: 0
    };
  }

  private updateParticleMotion(particle: Particle, dt: number): void {
    switch (particle.motionType) {
      case 'linear':
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        break;

      case 'sine': {
        const distance = particle.speed * 50 * particle.age;
        particle.x = particle.originX + Math.cos(particle.initialAngle) * distance;
        particle.y = particle.originY + Math.sin(particle.initialAngle) * distance;
        const perpAngle = particle.initialAngle + Math.PI / 2;
        const sineOffset = Math.sin(particle.age * particle.sineFrequency * particle.speed) * particle.sineAmplitude;
        particle.x += Math.cos(perpAngle) * sineOffset;
        particle.y += Math.sin(perpAngle) * sineOffset;
        break;
      }

      case 'spiral': {
        particle.spiralRadius += particle.speed * 20 * dt;
        particle.angle += particle.speed * dt * 2;
        particle.x = particle.originX + Math.cos(particle.angle) * particle.spiralRadius;
        particle.y = particle.originY + Math.sin(particle.angle) * particle.spiralRadius;
        break;
      }
    }
  }

  private checkCollisions(): void {
    const particles = this.particles;
    const count = particles.length;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const p1 = particles[i];
        const p2 = particles[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (p1.size + p2.size) / 2;

        if (dist < minDist) {
          if (p1.collisionFlash <= 0) {
            p1.collisionFlash = 0.3;
            p1.currentColor = this.getComplementaryColor(p1.baseColor);
          }
          if (p2.collisionFlash <= 0) {
            p2.collisionFlash = 0.3;
            p2.currentColor = this.getComplementaryColor(p2.baseColor);
          }
        }
      }
    }

    particles.forEach(p => {
      if (p.collisionFlash <= 0 && p.currentColor !== p.baseColor) {
        p.currentColor = p.baseColor;
      }
    });
  }

  private getComplementaryColor(hex: string): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    const compR = 255 - rgb.r;
    const compG = 255 - rgb.g;
    const compB = 255 - rgb.b;
    return `rgb(${compR}, ${compG}, ${compB})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(particle => {
      this.drawParticle(particle);
    });
  }

  private drawParticle(particle: Particle): void {
    const alpha = 1 - particle.age / particle.lifetime;
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = particle.currentColor;
    ctx.shadowColor = particle.currentColor;
    ctx.shadowBlur = particle.size * 2;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clearParticles(): void {
    this.particles = [];
  }
}
