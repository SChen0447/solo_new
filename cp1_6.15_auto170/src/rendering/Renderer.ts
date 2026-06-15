import type { Entity, Particle, Player, Spike, Spring, Star, GameState } from '../types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private cameraY: number = 0;
  private time: number = 0;
  private gameOverAnimProgress: number = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public setCameraY(y: number): void {
    this.cameraY = y;
  }

  public update(dt: number, gameState: GameState): void {
    this.time += dt;
    if (gameState === 'gameover') {
      this.gameOverAnimProgress = Math.min(1, this.gameOverAnimProgress + dt / 0.3);
    } else {
      this.gameOverAnimProgress = 0;
    }
  }

  public reset(): void {
    this.time = 0;
    this.gameOverAnimProgress = 0;
    this.cameraY = 0;
  }

  private worldToScreenY(worldY: number): number {
    return worldY - this.cameraY;
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(233, 69, 96, 0.03)';
    const gridSize = 40;
    const offsetY = (this.cameraY % gridSize);
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.fillRect(x, 0, 1, this.height);
    }
    for (let y = -offsetY; y < this.height; y += gridSize) {
      ctx.fillRect(0, y, this.width, 1);
    }
  }

  private drawPlatform(entity: Entity, isMoving: boolean = false): void {
    const ctx = this.ctx;
    const screenY = this.worldToScreenY(entity.y);
    if (screenY > this.height + 50 || screenY < -50) return;

    const gradient = ctx.createLinearGradient(entity.x, screenY, entity.x, screenY + entity.height);
    gradient.addColorStop(0, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(entity.x, screenY, entity.width, entity.height);

    let glowIntensity = 0.8;
    if (isMoving) {
      glowIntensity = 0.5 + Math.sin(this.time * 4) * 0.3;
    }
    ctx.strokeStyle = `rgba(233, 69, 96, ${glowIntensity})`;
    ctx.lineWidth = 1;
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = isMoving ? 8 + Math.sin(this.time * 4) * 4 : 4;
    ctx.strokeRect(entity.x, screenY, entity.width, entity.height);
    ctx.shadowBlur = 0;
  }

  private drawSpike(spike: Spike): void {
    const ctx = this.ctx;
    const screenY = this.worldToScreenY(spike.y);
    if (screenY > this.height + 50 || screenY < -50) return;

    const cx = spike.x + spike.width / 2;
    ctx.fillStyle = '#e74c3c';
    ctx.shadowColor = '#e74c3c';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(spike.x, screenY + spike.height);
    ctx.lineTo(cx, screenY);
    ctx.lineTo(spike.x + spike.width, screenY + spike.height);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawSpring(spring: Spring): void {
    const ctx = this.ctx;
    const screenY = this.worldToScreenY(spring.y);
    if (screenY > this.height + 50 || screenY < -50) return;

    ctx.fillStyle = '#2ecc71';
    ctx.shadowColor = '#2ecc71';
    ctx.shadowBlur = 6;
    const radius = 4;
    ctx.beginPath();
    ctx.roundRect(spring.x, screenY, spring.width, spring.height, [radius, radius, 0, 0]);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#1abc9c';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const lineY = screenY + 4 + i * 3;
      ctx.beginPath();
      ctx.moveTo(spring.x + 4, lineY);
      ctx.lineTo(spring.x + spring.width - 4, lineY);
      ctx.stroke();
    }
  }

  private drawStar(star: Star): void {
    if (star.collected) return;
    const ctx = this.ctx;
    const screenY = this.worldToScreenY(star.y);
    if (screenY > this.height + 50 || screenY < -50) return;

    star.rotation += 0.03;
    star.glowPhase += 0.1;

    const cx = star.x + star.width / 2;
    const cy = screenY + star.height / 2;
    const outerRadius = 8;
    const innerRadius = 4;

    const glow = 0.5 + Math.sin(star.glowPhase) * 0.3;
    ctx.shadowColor = '#fff59d';
    ctx.shadowBlur = 10 + glow * 8;

    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6 + star.rotation;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawPlayer(player: Player): void {
    const ctx = this.ctx;

    for (const trail of player.trail) {
      const screenY = this.worldToScreenY(trail.y);
      ctx.fillStyle = `rgba(0, 180, 216, ${trail.alpha})`;
      ctx.fillRect(trail.x, screenY, player.width, player.height);
    }

    const screenY = this.worldToScreenY(player.y);
    ctx.fillStyle = '#00b4d8';
    ctx.shadowColor = '#00b4d8';
    ctx.shadowBlur = 12;
    ctx.fillRect(player.x, screenY, player.width, player.height);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#90e0ef';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(player.x + 0.5, screenY + 0.5, player.width - 1, player.height - 1);
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const screenY = this.worldToScreenY(p.y);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, screenY, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawUI(score: number, stars: number, multiplier: number): void {
    const ctx = this.ctx;
    const isSmall = this.width < 400;
    const fontSize = isSmall ? 18 : 24;

    ctx.font = `600 ${fontSize}px 'Inter', sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';

    const scoreText = `分数: ${score}`;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333';
    ctx.strokeText(scoreText, this.width - 16, 12);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(scoreText, this.width - 16, 12);

    const smallFontSize = isSmall ? 14 : 16;
    ctx.font = `400 ${smallFontSize}px 'Inter', sans-serif`;
    const starText = `★ ${stars}  x${multiplier.toFixed(1)}`;
    ctx.fillStyle = '#fff59d';
    ctx.textAlign = 'right';
    ctx.fillText(starText, this.width - 16, 12 + fontSize + 6);

    ctx.font = `400 ${isSmall ? 11 : 13}px 'Inter', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(224, 224, 224, 0.6)';
    ctx.fillText('A/D 移动  空格 跳跃', 12, 12);
  }

  private drawGameOver(score: number, stars: number): boolean {
    const ctx = this.ctx;
    const t = this.gameOverAnimProgress;
    if (t <= 0) return false;

    const scale = 0.8 + t * 0.2;
    const alpha = t;

    ctx.fillStyle = `rgba(0, 0, 0, ${0.75 * alpha})`;
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;
    const panelW = Math.min(280, this.width * 0.8);
    const panelH = 220;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    ctx.fillStyle = '#16213e';
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "700 28px 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e94560';
    ctx.fillText('游戏结束', 0, -panelH / 2 + 45);

    ctx.font = "500 18px 'Inter', sans-serif";
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(`最终分数: ${score}`, 0, -5);
    ctx.fillStyle = '#fff59d';
    ctx.fillText(`收集星星: ${stars} ★`, 0, 28);

    const btnW = 140;
    const btnH = 44;
    const btnX = -btnW / 2;
    const btnY = panelH / 2 - 66;

    ctx.fillStyle = '#e94560';
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = "600 16px 'Inter', sans-serif";
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText('重 试', 0, btnY + btnH / 2);
    ctx.textBaseline = 'alphabetic';

    ctx.globalAlpha = 1;
    ctx.restore();

    if (t >= 1) {
      this.btnRect = {
        x: cx - btnW / 2,
        y: cy + btnY,
        width: btnW,
        height: btnH
      };
      return true;
    }
    return false;
  }

  private btnRect: { x: number; y: number; width: number; height: number } | null = null;

  public isRetryClicked(mx: number, my: number): boolean {
    if (!this.btnRect) return false;
    return (
      mx >= this.btnRect.x &&
      mx <= this.btnRect.x + this.btnRect.width &&
      my >= this.btnRect.y &&
      my <= this.btnRect.y + this.btnRect.height
    );
  }

  public render(
    entities: Entity[],
    player: Player,
    particles: Particle[],
    score: number,
    stars: number,
    multiplier: number,
    gameState: GameState
  ): void {
    this.drawBackground();

    for (const entity of entities) {
      if (!entity.active && entity.type !== 'movingPlatform' && entity.type !== 'platform') continue;
      switch (entity.type) {
        case 'platform':
          this.drawPlatform(entity, false);
          break;
        case 'movingPlatform':
          this.drawPlatform(entity, true);
          break;
        case 'spike':
          this.drawSpike(entity as Spike);
          break;
        case 'spring':
          this.drawSpring(entity as Spring);
          break;
        case 'star':
          this.drawStar(entity as Star);
          break;
      }
    }

    this.drawPlayer(player);
    this.drawParticles(particles);
    this.drawUI(score, stars, multiplier);

    if (gameState === 'gameover') {
      this.drawGameOver(score, stars);
    }
  }
}
