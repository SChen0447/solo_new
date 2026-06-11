import type { PlayerState } from './player';

export interface EventNotification {
  text: string;
  duration: number;
  elapsed: number;
  color: string;
}

export class UIRenderer {
  private width: number;
  private height: number;
  private notifications: EventNotification[] = [];
  private fps: number = 60;
  private fpsSamples: number[] = [];
  private stars: { x: number; y: number; size: number; alpha: number; twinkle: number }[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.generateStars();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.generateStars();
  }

  private generateStars(): void {
    this.stars = [];
    const count = Math.floor((this.width * this.height) / 5000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  private getScale(): number {
    const baseSize = 800;
    const minScale = 0.55;
    const maxScale = 1.2;
    const s = Math.min(this.width, this.height) / baseSize;
    return Math.max(minScale, Math.min(maxScale, s));
  }

  private getPadding(): number {
    return Math.max(12, this.width * 0.02);
  }

  drawBackground(ctx: CanvasRenderingContext2D, dt: number): void {
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#1a0a3e');
    gradient.addColorStop(1, '#0a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      star.twinkle += dt * 2;
      const alpha = star.alpha * (0.6 + Math.sin(star.twinkle) * 0.4);
      ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHUD(
    ctx: CanvasRenderingContext2D,
    score: number,
    player: PlayerState,
    meteorProgress: number,
    meteorRainActive: boolean,
    meteorRainWarning: boolean,
    scoreMultiplier: number
  ): void {
    const scale = this.getScale();
    const pad = this.getPadding();

    ctx.save();

    const scoreFontSize = Math.floor(24 * scale);
    const scoreY = pad + scoreFontSize;
    ctx.font = `bold ${scoreFontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#39ff14';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#39ff14';
    ctx.fillText(`得分: ${score}`, this.width - pad, scoreY);

    if (scoreMultiplier > 1) {
      const multFontSize = Math.floor(18 * scale);
      ctx.fillStyle = '#ff8c00';
      ctx.shadowColor = '#ff8c00';
      ctx.font = `bold ${multFontSize}px 'Courier New', monospace`;
      ctx.fillText(`x${scoreMultiplier} 倍分`, this.width - pad, scoreY + multFontSize + 4);
    }

    ctx.textAlign = 'left';
    const hpFontSize = Math.floor(20 * scale);
    ctx.fillStyle = '#ff8c00';
    ctx.shadowColor = '#ff8c00';
    ctx.font = `bold ${hpFontSize}px 'Courier New', monospace`;
    ctx.fillText('生命:', pad, pad + hpFontSize);

    const heartSize = Math.max(12, 20 * scale);
    const heartSpacing = Math.max(18, 30 * scale);
    for (let i = 0; i < player.maxHealth; i++) {
      const hx = pad + hpFontSize * 3.5 + i * heartSpacing;
      const hy = pad + hpFontSize * 0.6;

      if (i < player.health) {
        ctx.fillStyle = '#ff3366';
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#333344';
        ctx.shadowBlur = 0;
      }

      this.drawHeart(ctx, hx, hy, heartSize);
    }

    const barWidth = Math.max(80, Math.min(200, this.width * 0.12));
    const barHeight = Math.max(6, 8 * scale);
    const barX = this.width - pad - barWidth;
    const barY = scoreY + Math.floor(20 * scale);

    const barColor = meteorRainActive ? '#ff4400' : meteorRainWarning ? '#ffcc00' : '#ff8c00';

    ctx.strokeStyle = barColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = barColor;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    const fillWidth = barWidth * meteorProgress;
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    const barLabelFontSize = Math.max(10, Math.floor(12 * scale));
    ctx.textAlign = 'right';
    ctx.font = `${barLabelFontSize}px 'Courier New', monospace`;
    ctx.fillStyle = barColor;
    const barLabel = meteorRainActive ? '陨石雨!' : meteorRainWarning ? '即将来袭!' : '下波陨石雨';
    ctx.fillText(barLabel, this.width - pad, barY + barHeight + barLabelFontSize + 4);

    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y, x - size * 0.5, y, x - size * 0.5, y + size * 0.3);
    ctx.bezierCurveTo(x - size * 0.5, y + size * 0.6, x, y + size * 0.8, x, y + size);
    ctx.bezierCurveTo(x, y + size * 0.8, x + size * 0.5, y + size * 0.6, x + size * 0.5, y + size * 0.3);
    ctx.bezierCurveTo(x + size * 0.5, y, x, y, x, y + size * 0.3);
    ctx.fill();
  }

  addNotification(text: string, color: string = '#39ff14', duration: number = 2.5): void {
    this.notifications.push({
      text,
      duration,
      elapsed: 0,
      color
    });
  }

  updateNotifications(dt: number): void {
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      this.notifications[i].elapsed += dt;
      if (this.notifications[i].elapsed >= this.notifications[i].duration) {
        this.notifications.splice(i, 1);
      }
    }
  }

  drawNotifications(ctx: CanvasRenderingContext2D): void {
    const scale = this.getScale();
    const fontSize = Math.max(16, Math.floor(28 * scale));
    let y = this.height * 0.3;

    for (const notif of this.notifications) {
      const progress = notif.elapsed / notif.duration;
      let alpha = 1;

      if (progress < 0.2) {
        alpha = progress / 0.2;
      } else if (progress > 0.8) {
        alpha = (1 - progress) / 0.2;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = notif.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = notif.color;
      ctx.fillText(notif.text, this.width / 2, y);
      ctx.restore();

      y += fontSize + 12;
    }
  }

  updateFPS(dt: number): void {
    const fps = 1 / dt;
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > 30) {
      this.fpsSamples.shift();
    }
    this.fps = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
  }

  drawFPS(ctx: CanvasRenderingContext2D): void {
    const scale = this.getScale();
    const fontSize = Math.max(10, Math.floor(12 * scale));
    ctx.save();
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = this.fps >= 55 ? '#39ff14' : this.fps >= 30 ? '#ffcc00' : '#ff3300';
    ctx.shadowBlur = 5;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillText(`FPS: ${Math.floor(this.fps)}`, 8, this.height - 8);
    ctx.restore();
  }

  clear(): void {
    this.notifications = [];
    this.fpsSamples = [];
    this.fps = 60;
  }
}
