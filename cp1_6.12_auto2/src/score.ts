export class ScoreManager {
  private score: number = 0;
  private combo: number = 0;
  private lives: number = 5;
  private maxLives: number = 5;
  private comboAnimTimer: number = 0;
  private comboAnimScale: number = 1;

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.lives = this.maxLives;
    this.comboAnimTimer = 0;
    this.comboAnimScale = 1;
  }

  onSuccessfulLand(): void {
    this.combo++;
    this.score += this.combo;
    this.comboAnimScale = 1.5;
    this.comboAnimTimer = 200;
  }

  onMiss(): void {
    this.lives--;
    this.combo = 0;
  }

  isGameOver(): boolean {
    return this.lives <= 0;
  }

  getScore(): number {
    return this.score;
  }

  getCombo(): number {
    return this.combo;
  }

  getLives(): number {
    return this.lives;
  }

  update(dt: number): void {
    if (this.comboAnimTimer > 0) {
      this.comboAnimTimer -= dt;
      this.comboAnimScale = 1 + 0.5 * (this.comboAnimTimer / 200);
    } else {
      this.comboAnimScale = 1;
    }
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    ctx.save();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const scoreText = `Score: ${this.score}`;
    ctx.fillText(scoreText, 16, 16);

    const comboSize = Math.min(18 + this.combo * 0.8, 36) * this.comboAnimScale;
    ctx.font = `bold ${comboSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = this.combo >= 5 ? '#ffdd57' : this.combo >= 3 ? '#7dffaf' : '#ffffff';
    if (this.combo > 0) {
      ctx.fillText(`x${this.combo}`, 16, 44);
    }

    const heartSize = 18;
    const heartGap = 6;
    const startX = canvasWidth - 16 - (this.maxLives * (heartSize + heartGap));

    for (let i = 0; i < this.maxLives; i++) {
      const hx = startX + i * (heartSize + heartGap);
      const hy = 18;
      this.drawHeart(ctx, hx, hy, heartSize, i < this.lives);
    }

    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, filled: boolean): void {
    ctx.save();
    ctx.beginPath();
    const s = size / 2;
    const topCurveHeight = s * 0.3;
    ctx.moveTo(x + s, y + size);
    ctx.bezierCurveTo(x + s, y + size * 0.7, x, y + size * 0.6, x, y + topCurveHeight + s * 0.1);
    ctx.bezierCurveTo(x, y, x + s * 0.5, y, x + s * 0.5, y + topCurveHeight);
    ctx.bezierCurveTo(x + s * 0.5, y, x + s, y, x + s, y + topCurveHeight + s * 0.1);
    ctx.bezierCurveTo(x + s, y + size * 0.6, x + s, y + size * 0.7, x + s, y + size);
    ctx.bezierCurveTo(x + s, y + size * 0.7, x + s + s, y + size * 0.6, x + s + s, y + topCurveHeight + s * 0.1);
    ctx.bezierCurveTo(x + s + s, y, x + s * 1.5, y, x + s * 0.5, y + topCurveHeight);
    ctx.closePath();

    if (filled) {
      ctx.fillStyle = '#ff4466';
      ctx.shadowColor = '#ff4466';
      ctx.shadowBlur = 8;
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255, 68, 102, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawGameOver(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 60);

    ctx.font = 'bold 28px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffdd57';
    ctx.fillText(`Final Score: ${this.score}`, canvasWidth / 2, canvasHeight / 2 + 10);

    const btnWidth = 180;
    const btnHeight = 50;
    const btnX = canvasWidth / 2 - btnWidth / 2;
    const btnY = canvasHeight / 2 + 60;

    const grad = ctx.createLinearGradient(btnX, btnY, btnX + btnWidth, btnY + btnHeight);
    grad.addColorStop(0, '#7c3aed');
    grad.addColorStop(1, '#4f46e5');
    ctx.fillStyle = grad;

    const r = 12;
    ctx.beginPath();
    ctx.moveTo(btnX + r, btnY);
    ctx.lineTo(btnX + btnWidth - r, btnY);
    ctx.quadraticCurveTo(btnX + btnWidth, btnY, btnX + btnWidth, btnY + r);
    ctx.lineTo(btnX + btnWidth, btnY + btnHeight - r);
    ctx.quadraticCurveTo(btnX + btnWidth, btnY + btnHeight, btnX + btnWidth - r, btnY + btnHeight);
    ctx.lineTo(btnX + r, btnY + btnHeight);
    ctx.quadraticCurveTo(btnX, btnY + btnHeight, btnX, btnY + btnHeight - r);
    ctx.lineTo(btnX, btnY + r);
    ctx.quadraticCurveTo(btnX, btnY, btnX + r, btnY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('REPLAY', canvasWidth / 2, btnY + btnHeight / 2);

    ctx.restore();
  }

  getGameOverButtonBounds(canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } {
    const btnWidth = 180;
    const btnHeight = 50;
    return {
      x: canvasWidth / 2 - btnWidth / 2,
      y: canvasHeight / 2 + 60,
      width: btnWidth,
      height: btnHeight,
    };
  }
}
