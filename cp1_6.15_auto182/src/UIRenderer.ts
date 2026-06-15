interface Star {
  x: number;
  y: number;
  size: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export class UIRenderer {
  private width: number;
  private height: number;

  private stars: Star[] = [];
  private starCount: number = 80;

  private scoreFlashTimer: number = 0;
  private scoreFlashDuration: number = 0.5;

  private gameOver: boolean = false;
  private finalScore: number = 0;
  private redFlashTimer: number = 0;
  private redFlashDuration: number = 0.3;

  private buttonWidth: number = 140;
  private buttonHeight: number = 45;
  private buttonHoverScale: number = 1;
  private isHovering: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initStars();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1.5
      });
    }
  }

  public triggerScoreFlash(): void {
    this.scoreFlashTimer = this.scoreFlashDuration;
  }

  public triggerGameOver(score: number): void {
    this.gameOver = true;
    this.finalScore = score;
    this.redFlashTimer = this.redFlashDuration;
  }

  public reset(): void {
    this.gameOver = false;
    this.finalScore = 0;
    this.redFlashTimer = 0;
    this.scoreFlashTimer = 0;
    this.buttonHoverScale = 1;
    this.isHovering = false;
  }

  public updateHover(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    const bx: number = this.width / 2 - this.buttonWidth / 2;
    const by: number = this.height / 2 + 60;
    const prevHover: boolean = this.isHovering;
    this.isHovering = x >= bx && x <= bx + this.buttonWidth && y >= by && y <= by + this.buttonHeight;
    if (this.isHovering !== prevHover) {
      this.buttonHoverScale = this.isHovering ? 1.1 : 1;
    }
  }

  public checkRestartClick(e: MouseEvent | TouchEvent): boolean {
    let x: number, y: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return false;
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }
    const bx: number = this.width / 2 - this.buttonWidth / 2;
    const by: number = this.height / 2 + 60;
    return x >= bx && x <= bx + this.buttonWidth && y >= by && y <= by + this.buttonHeight;
  }

  public renderBackground(ctx: CanvasRenderingContext2D): void {
    const gradient: CanvasGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#302b63');
    gradient.addColorStop(1, '#24243e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      star.twinklePhase += star.twinkleSpeed * 0.016;
      const alpha: number = 0.3 + 0.7 * Math.abs(Math.sin(star.twinklePhase));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public render(ctx: CanvasRenderingContext2D, currentScore: number, gameRunning: boolean): void {
    if (this.scoreFlashTimer > 0) {
      this.scoreFlashTimer -= 0.016;
      if (this.scoreFlashTimer < 0) this.scoreFlashTimer = 0;
    }
    if (this.redFlashTimer > 0) {
      this.redFlashTimer -= 0.016;
      if (this.redFlashTimer < 0) this.redFlashTimer = 0;
    }

    if (gameRunning) {
      this.renderScore(ctx, currentScore);
    }

    if (this.redFlashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = this.redFlashTimer / this.redFlashDuration * 0.6;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    if (this.gameOver && !gameRunning) {
      this.renderGameOver(ctx);
    }
  }

  private renderScore(ctx: CanvasRenderingContext2D, score: number): void {
    const flashProgress: number = 1 - this.scoreFlashTimer / this.scoreFlashDuration;
    const scale: number = this.scoreFlashTimer > 0 ? 1 + 0.2 * Math.sin(flashProgress * Math.PI) : 1;

    ctx.save();
    ctx.font = `bold ${28 * scale}px "Courier New", monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 8;
    ctx.fillText(`分数: ${score}`, this.width / 2, 30);
    ctx.restore();
  }

  private renderGameOver(ctx: CanvasRenderingContext2D): void {
    const panelWidth: number = 320;
    const panelHeight: number = 260;
    const panelX: number = this.width / 2 - panelWidth / 2;
    const panelY: number = this.height / 2 - panelHeight / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(26, 10, 46, 0.85)';
    this.roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 12);
    ctx.fill();
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 10;
    this.roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 12);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillStyle = '#d94a4a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#d94a4a';
    ctx.shadowBlur = 10;
    ctx.fillText('游戏结束', this.width / 2, panelY + 30);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillStyle = '#ffdd57';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffdd57';
    ctx.shadowBlur = 8;
    ctx.fillText(`最终分数: ${this.finalScore}`, this.width / 2, panelY + 90);
    ctx.restore();

    const bx: number = this.width / 2 - this.buttonWidth / 2;
    const by: number = this.height / 2 + 60;
    const scale: number = this.buttonHoverScale;
    const drawW: number = this.buttonWidth * scale;
    const drawH: number = this.buttonHeight * scale;
    const drawX: number = this.width / 2 - drawW / 2;
    const drawY: number = by + (this.buttonHeight - drawH) / 2;

    ctx.save();
    const btnGradient: CanvasGradient = ctx.createLinearGradient(drawX, drawY, drawX + drawW, drawY + drawH);
    btnGradient.addColorStop(0, '#7c3aed');
    btnGradient.addColorStop(1, '#00d4ff');
    ctx.fillStyle = btnGradient;
    this.roundRect(ctx, drawX, drawY, drawW, drawH, 8);
    ctx.fill();
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    this.roundRect(ctx, drawX, drawY, drawW, drawH, 8);
    ctx.stroke();

    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击重新开始', this.width / 2, drawY + drawH / 2);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
