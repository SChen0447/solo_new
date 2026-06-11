import { Star, GameState } from './types';
import { Ship } from './ship';
import { AsteroidManager } from './asteroid';
import { FragmentManager } from './fragment';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private stars: Star[];
  private backgroundCanvas: HTMLCanvasElement | null;
  private backgroundCtx: CanvasRenderingContext2D | null;
  private comboAnimTimer: number;
  private comboAnimScale: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.stars = [];
    this.backgroundCanvas = null;
    this.backgroundCtx = null;
    this.comboAnimTimer = 0;
    this.comboAnimScale = 1;
    this.generateStars();
    this.createBackground();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.generateStars();
    this.createBackground();
  }

  private generateStars(): void {
    this.stars = [];
    const starCount = Math.floor((this.width * this.height) / 8000);
    
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.5 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }

  private createBackground(): void {
    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCanvas.width = this.width;
    this.backgroundCanvas.height = this.height;
    this.backgroundCtx = this.backgroundCanvas.getContext('2d');
    
    if (!this.backgroundCtx) return;

    const gradient = this.backgroundCtx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.3, '#1a0a2e');
    gradient.addColorStop(0.6, '#0d1a3d');
    gradient.addColorStop(1, '#0a0a1a');
    
    this.backgroundCtx.fillStyle = gradient;
    this.backgroundCtx.fillRect(0, 0, this.width, this.height);

    const nebulaGradient1 = this.backgroundCtx.createRadialGradient(
      this.width * 0.2, this.height * 0.3, 0,
      this.width * 0.2, this.height * 0.3, this.width * 0.4
    );
    nebulaGradient1.addColorStop(0, 'rgba(100, 50, 150, 0.1)');
    nebulaGradient1.addColorStop(1, 'rgba(100, 50, 150, 0)');
    this.backgroundCtx.fillStyle = nebulaGradient1;
    this.backgroundCtx.fillRect(0, 0, this.width, this.height);

    const nebulaGradient2 = this.backgroundCtx.createRadialGradient(
      this.width * 0.8, this.height * 0.7, 0,
      this.width * 0.8, this.height * 0.7, this.width * 0.5
    );
    nebulaGradient2.addColorStop(0, 'rgba(50, 100, 200, 0.08)');
    nebulaGradient2.addColorStop(1, 'rgba(50, 100, 200, 0)');
    this.backgroundCtx.fillStyle = nebulaGradient2;
    this.backgroundCtx.fillRect(0, 0, this.width, this.height);
  }

  triggerComboAnimation(): void {
    this.comboAnimTimer = 0.3;
    this.comboAnimScale = 1.3;
  }

  update(dt: number): void {
    if (this.comboAnimTimer > 0) {
      this.comboAnimTimer -= dt;
      this.comboAnimScale = 1 + (this.comboAnimScale - 1) * 0.9;
    }
  }

  render(
    gameState: GameState,
    ship: Ship,
    asteroidManager: AsteroidManager,
    fragmentManager: FragmentManager,
    gameTime: number
  ): void {
    const ctx = this.ctx;

    if (this.backgroundCanvas) {
      ctx.drawImage(this.backgroundCanvas, 0, 0);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(0.3, '#1a0a2e');
      gradient.addColorStop(0.6, '#0d1a3d');
      gradient.addColorStop(1, '#0a0a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    this.drawStars(ctx, gameTime);
    fragmentManager.draw(ctx);
    asteroidManager.draw(ctx);
    ship.draw(ctx);
    this.drawUI(ctx, gameState);
  }

  private drawStars(ctx: CanvasRenderingContext2D, gameTime: number): void {
    for (const star of this.stars) {
      const twinkle = Math.sin(gameTime * star.twinkleSpeed + star.twinkleOffset);
      const alpha = star.baseAlpha * (0.5 + twinkle * 0.5);
      
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const panelX = 20;
    const panelY = 20;
    const panelWidth = 240;
    const panelHeight = 140;
    const padding = 16;

    ctx.save();
    
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();
    ctx.restore();

    const contentX = panelX + padding;
    let contentY = panelY + padding;

    ctx.save();
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(`得分: ${gameState.score}`, contentX, contentY + 20);
    ctx.restore();

    contentY += 36;

    ctx.save();
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#00ffff';
    ctx.fillText('能量', contentX, contentY + 14);
    ctx.restore();

    const barX = contentX + 45;
    const barY = contentY;
    const barWidth = panelWidth - padding * 2 - 45;
    const barHeight = 16;
    const energyPercent = gameState.energy / gameState.maxEnergy;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const energyGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * energyPercent, barY);
    if (energyPercent > 0.5) {
      energyGradient.addColorStop(0, '#00ffff');
      energyGradient.addColorStop(1, '#00ccaa');
    } else if (energyPercent > 0.25) {
      energyGradient.addColorStop(0, '#ffcc00');
      energyGradient.addColorStop(1, '#ff9900');
    } else {
      energyGradient.addColorStop(0, '#ff4444');
      energyGradient.addColorStop(1, '#ff0000');
    }

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX + 2, barY + 2, Math.max(0, (barWidth - 4) * energyPercent), barHeight - 4, 2);
    ctx.fillStyle = energyGradient;
    ctx.shadowColor = energyPercent > 0.5 ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 100, 100, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

    contentY += 32;

    ctx.save();
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#00ffff';
    ctx.fillText('连击', contentX, contentY + 14);
    ctx.restore();

    if (gameState.combo > 1) {
      ctx.save();
      const scale = this.comboAnimScale;
      ctx.translate(contentX + 45 + 15, contentY + 8);
      ctx.scale(scale, scale);
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText(`${gameState.combo}x`, 0, 10);
      ctx.restore();
    } else {
      ctx.save();
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.fillText('-', contentX + 45, contentY + 14);
      ctx.restore();
    }

    if (gameState.isGameOver) {
      this.drawGameOver(ctx, gameState.score);
    }

    ctx.save();
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.fillText('空格 / 点击 释放引力波', this.width - 20, this.height - 20);
    ctx.fillText('R 重新开始', this.width - 20, this.height - 40);
    ctx.restore();
  }

  private drawGameOver(ctx: CanvasRenderingContext2D, score: number): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const panelWidth = 360;
    const panelHeight = 220;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 16);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6666';
    ctx.shadowColor = 'rgba(255, 100, 100, 0.6)';
    ctx.shadowBlur = 15;
    ctx.fillText('游戏结束', centerX, centerY - 60);
    ctx.restore();

    ctx.save();
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fillText(`最终得分: ${score}`, centerX, centerY);
    ctx.restore();

    const btnX = centerX - 80;
    const btnY = centerY + 40;
    const btnWidth = 160;
    const btnHeight = 44;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 8);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = 'rgba(0, 255, 255, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText('重新开始', centerX, btnY + 30);
    ctx.restore();

    this.restartButton = { x: btnX, y: btnY, width: btnWidth, height: btnHeight };
  }

  restartButton: { x: number; y: number; width: number; height: number } | null = null;

  checkRestartClick(mouseX: number, mouseY: number): boolean {
    if (!this.restartButton) return false;
    return (
      mouseX >= this.restartButton.x &&
      mouseX <= this.restartButton.x + this.restartButton.width &&
      mouseY >= this.restartButton.y &&
      mouseY <= this.restartButton.y + this.restartButton.height
    );
  }

  clearRestartButton(): void {
    this.restartButton = null;
  }
}
