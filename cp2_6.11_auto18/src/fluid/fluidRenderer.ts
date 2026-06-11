import { Particle, ViewTransform, WeatherTransition, Ripple, SnowCover, HeightMap } from '../types';

export class FluidRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(
    particles: Particle[],
    viewTransform: ViewTransform,
    weatherTransition: WeatherTransition,
    ripples: Ripple[],
    snowCover: SnowCover | null,
    heightMap: HeightMap | null,
    cellSize: number
  ): void {
    const { offsetX, offsetY, scale } = viewTransform;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    this.renderSnowCover(snowCover, heightMap, cellSize, scale);
    this.renderRipples(ripples, scale);
    this.renderParticles(particles, scale, weatherTransition);
    this.renderWeatherEffects(weatherTransition, heightMap, cellSize, scale);

    this.ctx.restore();
  }

  private renderParticles(
    particles: Particle[],
    scale: number,
    weatherTransition: WeatherTransition
  ): void {
    const wt = weatherTransition;
    const waterAlpha = wt.active
      ? 0.7 + 0.3 * (wt.to === 'rainy' ? wt.progress : (wt.to === 'snowy' ? -0.1 * wt.progress : 0))
      : (wt.to === 'rainy' ? 1.0 : 0.7);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p.active) continue;

      if (p.type === 'rain') {
        this.renderRainDrop(p, scale);
        continue;
      }
      if (p.type === 'snow') {
        this.renderSnowFlake(p, scale);
        continue;
      }
      if (p.type === 'splash') {
        this.renderSplash(p, scale);
        continue;
      }

      const baseSize = this.getParticleSize(p) * scale;
      const color = this.getParticleColor(p);
      const alpha = Math.min(1.0, (p.life / p.maxLife) * waterAlpha + 0.3);

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = color;

      if (p.type === 'waterfall') {
        this.ctx.globalAlpha = alpha * 0.8;
        this.ctx.fillRect(
          p.x * scale - baseSize * 0.3,
          p.y * scale - baseSize * 0.8,
          baseSize * 0.6,
          baseSize * 2.0
        );
        this.ctx.globalAlpha = alpha * 0.4;
        this.ctx.fillRect(
          p.x * scale - baseSize * 0.5,
          p.y * scale - baseSize * 1.0,
          baseSize * 1.0,
          baseSize * 2.5
        );
      } else if (p.type === 'lake') {
        this.ctx.beginPath();
        this.ctx.arc(p.x * scale, p.y * scale, baseSize * 0.8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = alpha * 0.3;
        this.ctx.beginPath();
        this.ctx.arc(p.x * scale, p.y * scale, baseSize * 1.3, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        const stretch = Math.min(2.0, Math.sqrt(p.vx * p.vx + p.vy * p.vy) / 30);
        this.ctx.beginPath();
        this.ctx.ellipse(
          p.x * scale,
          p.y * scale,
          baseSize * (0.5 + stretch * 0.3),
          baseSize * (0.5 - stretch * 0.1),
          Math.atan2(p.vy, p.vx),
          0, Math.PI * 2
        );
        this.ctx.fill();
      }

      if (p.brightness > 0) {
        this.ctx.globalAlpha = p.brightness * 0.6;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(p.x * scale, p.y * scale, baseSize * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.globalAlpha = 1.0;
  }

  private getParticleSize(p: Particle): number {
    switch (p.type) {
      case 'river': return 2.5;
      case 'lake': return 2.0;
      case 'waterfall': return 3.0;
      default: return 2.0;
    }
  }

  private getParticleColor(p: Particle): string {
    const depthFactor = Math.min(1.0, p.depth);
    if (p.type === 'waterfall') {
      const r = Math.floor(180 + depthFactor * 20);
      const g = Math.floor(220 + depthFactor * 15);
      const b = Math.floor(255);
      return `rgb(${r},${g},${b})`;
    }

    const r = Math.floor(30 + (1 - depthFactor) * 50);
    const g = Math.floor(120 + (1 - depthFactor) * 80);
    const b = Math.floor(200 + (1 - depthFactor) * 55);

    return `rgb(${r},${g},${b})`;
  }

  private renderRainDrop(p: Particle, scale: number): void {
    const len = 6 * scale;
    const alpha = Math.min(1.0, p.life / p.maxLife + 0.3);
    this.ctx.globalAlpha = alpha * 0.5;
    this.ctx.strokeStyle = '#8ecae6';
    this.ctx.lineWidth = 1 * scale;
    this.ctx.beginPath();
    this.ctx.moveTo(p.x * scale, p.y * scale);
    this.ctx.lineTo((p.x - p.vx * 0.02) * scale, (p.y - p.vy * 0.02) * scale);
    this.ctx.stroke();
  }

  private renderSnowFlake(p: Particle, scale: number): void {
    const alpha = Math.min(1.0, p.life / p.maxLife + 0.3);
    this.ctx.globalAlpha = alpha * 0.8;
    this.ctx.fillStyle = '#e8eaf6';
    this.ctx.beginPath();
    this.ctx.arc(p.x * scale, p.y * scale, 1.5 * scale, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderSplash(p: Particle, scale: number): void {
    const alpha = p.life / p.maxLife;
    this.ctx.globalAlpha = alpha * 0.7;
    this.ctx.fillStyle = '#b3e5fc';
    this.ctx.beginPath();
    this.ctx.arc(p.x * scale, p.y * scale, 1.0 * scale, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderRipples(ripples: Ripple[], scale: number): void {
    for (const r of ripples) {
      if (!r.active) continue;
      this.ctx.globalAlpha = r.opacity * 0.5;
      this.ctx.strokeStyle = '#4fc3f7';
      this.ctx.lineWidth = 1.0 * scale;
      this.ctx.beginPath();
      this.ctx.arc(r.x * scale, r.y * scale, r.radius * scale, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1.0;
  }

  private renderSnowCover(
    snowCover: SnowCover | null,
    heightMap: HeightMap | null,
    cellSize: number,
    scale: number
  ): void {
    if (!snowCover || !heightMap) return;
    const { cols, rows, data: hmData } = heightMap;
    const cs = cellSize * scale;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const snowAmount = snowCover.data[idx];
        if (snowAmount <= 0.01) continue;

        this.ctx.globalAlpha = snowAmount * 0.85;
        this.ctx.fillStyle = '#e8eaf6';
        this.ctx.fillRect(x * cs, y * cs, cs + 0.5, cs + 0.5);
      }
    }
    this.ctx.globalAlpha = 1.0;
  }

  private renderWeatherEffects(
    weatherTransition: WeatherTransition,
    heightMap: HeightMap | null,
    cellSize: number,
    scale: number
  ): void {
    if (!weatherTransition.active) return;

    if (weatherTransition.to === 'rainy') {
      const p = weatherTransition.progress;
      this.ctx.globalAlpha = p * 0.08;
      this.ctx.fillStyle = '#37474f';
      this.ctx.fillRect(-1000, -1000, 5000, 5000);
      this.ctx.globalAlpha = 1.0;
    }

    if (weatherTransition.to === 'snowy') {
      const p = weatherTransition.progress;
      this.ctx.globalAlpha = p * 0.05;
      this.ctx.fillStyle = '#cfd8dc';
      this.ctx.fillRect(-1000, -1000, 5000, 5000);
      this.ctx.globalAlpha = 1.0;
    }
  }
}
