interface Particle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class Player {
  private width: number;
  private height: number;

  private x: number;
  private y: number;
  private targetX: number;

  private baseWidth: number = 20;
  private baseHeight: number = 30;

  private baseColor: string = '#00d4ff';
  private flashColor: string = '#ffffff';
  private flashTimer: number = 0;
  private flashDuration: number = 0.2;

  private particles: Particle[] = [];
  private particleLifetime: number = 0.3;
  private particleSize: number = 3;
  private particleEmitTimer: number = 0;
  private particleEmitInterval: number = 0.016;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.x = width / 2;
    this.targetX = width / 2;
    this.y = height - 120;
  }

  public getX(): number { return this.x; }
  public getY(): number { return this.y; }
  public getWidth(): number { return this.baseWidth; }
  public getHeight(): number { return this.baseHeight; }
  public getHalfWidth(): number { return this.baseWidth / 2; }
  public getHalfHeight(): number { return this.baseHeight / 2; }

  public setTargetX(x: number): void {
    this.targetX = x;
  }

  public triggerCollectFlash(): void {
    this.flashTimer = this.flashDuration;
  }

  public reset(): void {
    this.x = this.width / 2;
    this.targetX = this.width / 2;
    this.particles = [];
    this.flashTimer = 0;
  }

  public update(deltaTime: number, trackLeft: number, trackRight: number): void {
    const dt: number = deltaTime * (1 / 60);
    const clampedTarget: number = Math.max(trackLeft + this.baseWidth / 2 + 5, Math.min(trackRight - this.baseWidth / 2 - 5, this.targetX));
    this.x += (clampedTarget - this.x) * Math.min(1, dt * 30);

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer < 0) this.flashTimer = 0;
    }

    this.particleEmitTimer += dt;
    while (this.particleEmitTimer >= this.particleEmitInterval) {
      this.particleEmitTimer -= this.particleEmitInterval;
      this.emitParticle();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private emitParticle(): void {
    const currentColor: string = this.flashTimer > 0 ? this.flashColor : this.baseColor;
    this.particles.push({
      x: this.x + (Math.random() - 0.5) * 6,
      y: this.y + this.baseHeight / 2 + Math.random() * 4,
      life: this.particleLifetime,
      maxLife: this.particleLifetime,
      size: this.particleSize,
      color: currentColor
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha: number = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const currentColor: string = this.flashTimer > 0 ? this.flashColor : this.baseColor;
    ctx.save();
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 6;
    ctx.fillStyle = currentColor;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.baseHeight / 2);
    ctx.lineTo(this.x - this.baseWidth / 2, this.y + this.baseHeight / 2);
    ctx.lineTo(this.x + this.baseWidth / 2, this.y + this.baseHeight / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}
