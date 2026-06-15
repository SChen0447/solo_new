import type { Ship } from '../engine/Ship';
import type { Projectile } from '../engine/Weapon';
import type { ExplosionParticle, FrameState } from '../engine/GameEngine';

export interface BattleRendererOptions {
  canvas: HTMLCanvasElement;
  width?: number;
  height?: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
}

export class BattleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private stars: Star[] = [];
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  private readonly PLAYER_COLOR = '#4a90d9';
  private readonly ENEMY_COLOR = '#d94a4a';
  private readonly SHIP_SIZE = 30;
  private readonly PROJECTILE_SIZE = 2;

  private frameCount = 0;
  private fps = 60;
  private lastFpsUpdate = 0;

  constructor(options: BattleRendererOptions) {
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = options.width || 900;
    this.height = options.height || 600;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.generateStars();
  }

  private generateStars(): void {
    const starCount = 100;
    this.stars = [];

    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1,
        alpha: 0.3 + Math.random() * 0.3
      });
    }
  }

  public render(state: FrameState): void {
    this.updateFPS();
    this.clear();
    this.drawBackground();
    this.drawStars();

    state.ships.forEach(shipData => {
      if (!shipData.isDestroyed) {
        this.drawShip(shipData);
      }
    });

    state.projectiles.forEach(proj => {
      this.drawProjectile(proj);
    });

    state.explosions.forEach(exp => {
      this.drawExplosionParticle(exp);
    });
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      const fpsDisplay = document.getElementById('fpsDisplay');
      if (fpsDisplay) {
        fpsDisplay.textContent = this.fps.toString();
      }
    }
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private drawBackground(): void {
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(): void {
    this.stars.forEach(star => {
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      this.ctx.fill();
    });
  }

  private drawShip(shipData: ReturnType<Ship['toJSON']>): void {
    const { x, y, faction, health, maxHealth, shield, maxShield } = shipData;
    const color = faction === 'player' ? this.PLAYER_COLOR : this.ENEMY_COLOR;

    this.ctx.save();
    this.ctx.translate(x, y);

    if (shield > 0) {
      this.drawShield(shield, maxShield);
    }

    this.drawShipBody(color);
    this.drawHealthBar(health, maxHealth, color);

    this.ctx.restore();
  }

  private drawShield(shield: number, maxShield: number): void {
    const shieldRadius = this.SHIP_SIZE * 0.8;
    const shieldAlpha = 0.3 + (shield / maxShield) * 0.3;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(100, 200, 255, ${shieldAlpha})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    const gradient = this.ctx.createRadialGradient(0, 0, shieldRadius * 0.8, 0, 0, shieldRadius);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(100, 200, 255, ${shieldAlpha * 0.5})`);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
  }

  private drawShipBody(color: string): void {
    const size = this.SHIP_SIZE;
    const halfSize = size / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(halfSize, 0);
    this.ctx.lineTo(-halfSize * 0.6, -halfSize * 0.6);
    this.ctx.lineTo(-halfSize * 0.3, 0);
    this.ctx.lineTo(-halfSize * 0.6, halfSize * 0.6);
    this.ctx.closePath();

    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.strokeStyle = this.lightenColor(color, 30);
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
  }

  private drawHealthBar(health: number, maxHealth: number, color: string): void {
    const barWidth = this.SHIP_SIZE;
    const barHeight = 4;
    const barY = -this.SHIP_SIZE * 0.6 - 8;

    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    const healthPercent = health / maxHealth;
    const healthColor = healthPercent > 0.5 ? '#4ade80' : healthPercent > 0.25 ? '#fbbf24' : '#ef4444';

    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(-barWidth / 2, barY, barWidth * healthPercent, barHeight);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 0.5;
    this.ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
  }

  private drawProjectile(proj: Projectile): void {
    const color = proj.faction === 'player' ? this.PLAYER_COLOR : this.ENEMY_COLOR;

    const alpha = proj.life / proj.maxLife;

    this.ctx.beginPath();
    this.ctx.arc(proj.x, proj.y, this.PROJECTILE_SIZE, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = alpha;
    this.ctx.fill();

    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 6;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.globalAlpha = 1;

    const tailLength = 10;
    const angle = Math.atan2(proj.vy, proj.vx);
    this.ctx.beginPath();
    this.ctx.moveTo(proj.x, proj.y);
    this.ctx.lineTo(
      proj.x - Math.cos(angle) * tailLength,
      proj.y - Math.sin(angle) * tailLength
    );
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.PROJECTILE_SIZE;
    this.ctx.globalAlpha = alpha * 0.5;
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  private drawExplosionParticle(exp: ExplosionParticle): void {
    const alpha = exp.life / exp.maxLife;

    this.ctx.beginPath();
    this.ctx.arc(exp.x, exp.y, exp.size * alpha, 0, Math.PI * 2);
    this.ctx.fillStyle = exp.color;
    this.ctx.globalAlpha = alpha;
    this.ctx.fill();

    this.ctx.shadowColor = exp.color;
    this.ctx.shadowBlur = 8 * alpha;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.globalAlpha = 1;
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  public setScale(scale: number): void {
    this.scale = Math.max(0.5, Math.min(2, scale));
  }

  public setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getFPS(): number {
    return this.fps;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.generateStars();
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.offsetX) / this.scale,
      y: (screenY - rect.top - this.offsetY) / this.scale
    };
  }
}
