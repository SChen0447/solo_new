import { Particle, ViewTransform, WeatherTransition, Ripple, SnowCover, HeightMap, LODCluster } from '../types';

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
    cellSize: number,
    lodClusters: LODCluster[]
  ): void {
    const { offsetX, offsetY, scale } = viewTransform;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    this.renderSnowCover(snowCover, heightMap, cellSize, scale);
    this.renderRipples(ripples, scale);
    this.renderWaterBodyGradient(particles, scale);
    this.renderParticles(particles, scale, weatherTransition, lodClusters);
    this.renderWeatherEffects(weatherTransition);

    this.ctx.restore();
  }

  private renderWaterBodyGradient(particles: Particle[], scale: number): void {
    const gridCells: Map<number, { count: number; maxDepth: number; x: number; y: number }> = new Map();
    const cellSize = 8 * scale;

    for (const p of particles) {
      if (!p.active) continue;
      if (p.type === 'rain' || p.type === 'snow' || p.type === 'splash') continue;
      const cx = Math.floor(p.x * scale / cellSize);
      const cy = Math.floor(p.y * scale / cellSize);
      const key = cy * 100000 + cx;
      const cell = gridCells.get(key);
      if (!cell) {
        gridCells.set(key, {
          count: 1,
          maxDepth: p.depth,
          x: cx * cellSize,
          y: cy * cellSize,
        });
      } else {
        cell.count++;
        if (p.depth > cell.maxDepth) cell.maxDepth = p.depth;
      }
    }

    for (const cell of gridCells.values()) {
      if (cell.count < 2) continue;
      const alpha = Math.min(0.18, cell.count * 0.04);
      const depthT = Math.min(1, cell.maxDepth);
      const r = Math.floor(30 + (1 - depthT) * 40);
      const g = Math.floor(110 + (1 - depthT) * 80);
      const b = Math.floor(190 + (1 - depthT) * 65);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = `rgb(${r},${g},${b})`;
      this.ctx.fillRect(cell.x, cell.y, cellSize + 1, cellSize + 1);
    }
    this.ctx.globalAlpha = 1;
  }

  private renderParticles(
    particles: Particle[],
    scale: number,
    weatherTransition: WeatherTransition,
    lodClusters: LODCluster[]
  ): void {
    const wt = weatherTransition;
    const waterAlpha = wt.active
      ? 0.7 + 0.3 * (wt.to === 'rainy' ? wt.progress : (wt.to === 'snowy' ? -0.1 * wt.progress : 0))
      : (wt.to === 'rainy' ? 1.0 : 0.75);

    this.renderLODClusters(lodClusters, scale);

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

      if (p.lodLevel > 0) continue;

      const baseSize = this.getParticleSize(p) * scale;
      const color = this.getParticleColor(p);
      const alpha = Math.min(1.0, (p.life / p.maxLife) * waterAlpha + 0.3);

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = color;

      if (p.type === 'waterfall') {
        this.ctx.globalAlpha = alpha * 0.85;
        this.ctx.fillRect(
          p.x * scale - baseSize * 0.3,
          p.y * scale - baseSize * 0.9,
          baseSize * 0.6,
          baseSize * 2.2
        );
        this.ctx.globalAlpha = alpha * 0.35;
        this.ctx.fillStyle = '#e0f7fa';
        this.ctx.fillRect(
          p.x * scale - baseSize * 0.6,
          p.y * scale - baseSize * 1.2,
          baseSize * 1.2,
          baseSize * 2.8
        );
      } else if (p.type === 'lake') {
        this.ctx.beginPath();
        this.ctx.arc(p.x * scale, p.y * scale, baseSize * 0.85, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = alpha * 0.25;
        this.ctx.fillStyle = '#b3e5fc';
        this.ctx.beginPath();
        this.ctx.arc(p.x * scale, p.y * scale, baseSize * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        const stretch = Math.min(2.0, Math.sqrt(p.vx * p.vx + p.vy * p.vy) / 35);
        const angle = Math.atan2(p.vy, p.vx);
        const rx = baseSize * (0.55 + stretch * 0.35);
        const ry = baseSize * (0.45 - stretch * 0.1);
        this.ctx.beginPath();
        this.ctx.ellipse(p.x * scale, p.y * scale, Math.max(0.8, rx), Math.max(0.5, ry), angle, 0, Math.PI * 2);
        this.ctx.fill();
      }

      if (p.brightness > 0) {
        this.ctx.globalAlpha = p.brightness * 0.7;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(p.x * scale, p.y * scale, baseSize * 1.8, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.globalAlpha = 1.0;
  }

  private renderLODClusters(clusters: LODCluster[], scale: number): void {
    for (const c of clusters) {
      const depthT = Math.min(1, c.avgDepth);
      const r = Math.floor(35 + (1 - depthT) * 45);
      const g = Math.floor(120 + (1 - depthT) * 70);
      const b = Math.floor(200 + (1 - depthT) * 55);
      this.ctx.globalAlpha = 0.55;
      this.ctx.fillStyle = `rgb(${r},${g},${b})`;
      const radius = Math.min(14, 3.5 + c.count * 0.35) * scale;
      this.ctx.beginPath();
      this.ctx.arc(c.x * scale, c.y * scale, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 0.2;
      this.ctx.fillStyle = '#b3e5fc';
      this.ctx.beginPath();
      this.ctx.arc(c.x * scale, c.y * scale, radius * 1.4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }

  private getParticleSize(p: Particle): number {
    switch (p.type) {
      case 'river': return 2.8;
      case 'lake': return 2.2;
      case 'waterfall': return 3.2;
      default: return 2.2;
    }
  }

  private getParticleColor(p: Particle): string {
    const depthFactor = Math.min(1.0, p.depth);
    if (p.type === 'waterfall') {
      const r = Math.floor(185 + depthFactor * 15);
      const g = Math.floor(225 + depthFactor * 10);
      const b = 255;
      return `rgb(${r},${g},${b})`;
    }
    const r = Math.floor(28 + (1 - depthFactor) * 52);
    const g = Math.floor(115 + (1 - depthFactor) * 85);
    const b = Math.floor(195 + (1 - depthFactor) * 60);
    return `rgb(${r},${g},${b})`;
  }

  private renderRainDrop(p: Particle, scale: number): void {
    const len = 7 * scale;
    const alpha = Math.min(1.0, p.life / p.maxLife + 0.3);
    this.ctx.globalAlpha = alpha * 0.55;
    this.ctx.strokeStyle = '#8ecae6';
    this.ctx.lineWidth = 1.2 * scale;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(p.x * scale, p.y * scale);
    this.ctx.lineTo((p.x - p.vx * 0.018) * scale, (p.y - p.vy * 0.018) * scale);
    this.ctx.stroke();
  }

  private renderSnowFlake(p: Particle, scale: number): void {
    const alpha = Math.min(1.0, p.life / p.maxLife + 0.3);
    this.ctx.globalAlpha = alpha * 0.85;
    this.ctx.fillStyle = '#e8eaf6';
    this.ctx.beginPath();
    this.ctx.arc(p.x * scale, p.y * scale, 1.8 * scale, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = alpha * 0.3;
    this.ctx.beginPath();
    this.ctx.arc(p.x * scale, p.y * scale, 3.2 * scale, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderSplash(p: Particle, scale: number): void {
    const alpha = Math.max(0, p.life / p.maxLife);
    this.ctx.globalAlpha = alpha * 0.75;
    this.ctx.fillStyle = '#b3e5fc';
    this.ctx.beginPath();
    this.ctx.arc(p.x * scale, p.y * scale, 1.3 * scale, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = alpha * 0.3;
    this.ctx.fillStyle = '#e0f7fa';
    this.ctx.beginPath();
    this.ctx.arc(p.x * scale, p.y * scale, 2.2 * scale, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderRipples(ripples: Ripple[], scale: number): void {
    for (const r of ripples) {
      if (!r.active) continue;
      this.ctx.globalAlpha = r.opacity * 0.55;
      this.ctx.strokeStyle = '#4fc3f7';
      this.ctx.lineWidth = 1.2 * scale;
      this.ctx.beginPath();
      this.ctx.arc(r.x * scale, r.y * scale, r.radius * scale, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.globalAlpha = r.opacity * 0.18;
      this.ctx.lineWidth = 3 * scale;
      this.ctx.beginPath();
      this.ctx.arc(r.x * scale, r.y * scale, r.radius * scale * 0.7, 0, Math.PI * 2);
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
        if (snowAmount <= 0.015) continue;
        if (hmData[idx] < 0.2) continue;

        const px = x * cs;
        const py = y * cs;
        const thickness = snowAmount * cs * 0.35;

        this.ctx.globalAlpha = Math.min(0.95, 0.3 + snowAmount * 0.7);
        this.ctx.fillStyle = '#f0f4ff';
        this.ctx.fillRect(px, py, cs + 0.5, cs + 0.5);

        if (snowAmount > 0.35 && thickness > 0.5) {
          this.ctx.globalAlpha = Math.min(0.85, snowAmount * 0.7);
          this.ctx.fillStyle = '#e3ecff';
          this.ctx.fillRect(px, py - thickness, cs + 0.5, thickness * 0.6);

          this.ctx.globalAlpha = Math.min(0.5, snowAmount * 0.4);
          this.ctx.fillStyle = '#ffffff';
          this.ctx.beginPath();
          this.ctx.moveTo(px, py - thickness);
          this.ctx.lineTo(px + cs * 0.15, py - thickness - thickness * 0.3);
          this.ctx.lineTo(px + cs * 0.45, py - thickness);
          this.ctx.lineTo(px + cs * 0.6, py - thickness - thickness * 0.18);
          this.ctx.lineTo(px + cs, py - thickness);
          this.ctx.lineTo(px + cs, py);
          this.ctx.lineTo(px, py);
          this.ctx.closePath();
          this.ctx.fill();
        }
      }
    }
    this.ctx.globalAlpha = 1.0;
  }

  private renderWeatherEffects(weatherTransition: WeatherTransition): void {
    if (!weatherTransition.active) return;

    if (weatherTransition.to === 'rainy') {
      const p = weatherTransition.progress;
      this.ctx.globalAlpha = p * 0.09;
      this.ctx.fillStyle = '#263238';
      this.ctx.fillRect(-2000, -2000, 8000, 8000);
      this.ctx.globalAlpha = 1.0;
    }

    if (weatherTransition.to === 'snowy') {
      const p = weatherTransition.progress;
      this.ctx.globalAlpha = p * 0.07;
      this.ctx.fillStyle = '#cfd8dc';
      this.ctx.fillRect(-2000, -2000, 8000, 8000);
      this.ctx.globalAlpha = 1.0;
    }

    if (weatherTransition.to === 'sunny') {
      const p = weatherTransition.progress;
      this.ctx.globalAlpha = (1 - p) * 0.06;
      this.ctx.fillStyle = '#37474f';
      this.ctx.fillRect(-2000, -2000, 8000, 8000);
      this.ctx.globalAlpha = 1.0;
    }
  }
}
