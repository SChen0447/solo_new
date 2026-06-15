import { GameEngine } from './GameEngine';
import {
  Player,
  Bullet,
  GameState,
  BulletPattern,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BULLET_RADIUS,
  HIT_EFFECT_DURATION,
} from '../shared/types';

const PATTERN_INFO: Record<BulletPattern, { icon: string; name: string }> = {
  fan: { icon: '◈', name: '扇形散射' },
  spiral: { icon: '◉', name: '螺旋射线' },
  homing: { icon: '◎', name: '追踪弹' },
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private animationFrameId: number = 0;
  private gameState: GameState;
  private latencyStatus: 'high' | 'low' | 'normal' = 'normal';
  private frameCount: number = 0;
  private fps: number = 0;
  private lastFpsUpdate: number = 0;
  private stars: Array<{ x: number; y: number; alpha: number }> = [];
  private localHitEffects: Array<{ id: string; x: number; y: number; startTime: number; isMine: boolean }> = [];

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
    this.gameState = engine.getGameState();
    this.generateStars();
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        alpha: 0.1 + Math.random() * 0.1,
      });
    }
  }

  public updateState(state: GameState): void {
    this.gameState = state;
  }

  public updateLatency(status: 'high' | 'low' | 'normal'): void {
    this.latencyStatus = status;
  }

  public addHitEffect(_playerId: string, x: number, y: number, isMine: boolean): void {
    this.localHitEffects.push({
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      startTime: Date.now(),
      isMine,
    });
  }

  private clearCanvas(): void {
    this.ctx.fillStyle = '#0a0a23';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawStars(): void {
    this.ctx.fillStyle = '#ffffff';
    for (const star of this.stars) {
      this.ctx.globalAlpha = star.alpha * (0.8 + Math.random() * 0.4);
      this.ctx.fillRect(star.x, star.y, 1, 1);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawPlayer(player: Player, isLocalPlayer: boolean): void {
    const { x, y, angle, isInvincible, pattern } = player;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);

    let alpha = 1;

    if (isLocalPlayer && this.engine.isPlayerFlashing()) {
      alpha = this.engine.getFlashAlpha();
    }

    if (isInvincible) {
      const flashCycle = Math.floor(Date.now() / 100) % 2;
      alpha = flashCycle === 0 ? 0.2 : 1;
    }

    this.ctx.globalAlpha = alpha;

    const baseWidth = 32;
    const baseHeight = 40;

    this.ctx.beginPath();
    this.ctx.moveTo(baseHeight / 2, 0);
    this.ctx.lineTo(-baseHeight / 2, -baseWidth / 2);
    this.ctx.lineTo(-baseHeight / 4, 0);
    this.ctx.lineTo(-baseHeight / 2, baseWidth / 2);
    this.ctx.closePath();

    this.ctx.fillStyle = '#e94560';
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
    this.ctx.globalAlpha = 1;

    this.drawPatternBanner(x, y - 35, pattern);
  }

  private drawPatternBanner(x: number, y: number, pattern: BulletPattern): void {
    const bannerWidth = 120;
    const bannerHeight = 20;
    const info = PATTERN_INFO[pattern];

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.beginRoundedRect(x - bannerWidth / 2, y, bannerWidth, bannerHeight, 4);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '13px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${info.icon} ${info.name}`, x, y + bannerHeight / 2);
  }

  private beginRoundedRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private drawBullet(bullet: Bullet): void {
    const { x, y, pattern } = bullet;

    this.ctx.beginPath();
    this.ctx.arc(x, y, BULLET_RADIUS, 0, Math.PI * 2);

    switch (pattern) {
      case 'fan':
        this.ctx.fillStyle = '#ff6b6b';
        break;
      case 'spiral':
        this.ctx.fillStyle = '#4ecdc4';
        break;
      case 'homing':
        this.ctx.fillStyle = '#ffe66d';
        break;
    }

    this.ctx.fill();

    this.ctx.shadowColor = this.ctx.fillStyle as string;
    this.ctx.shadowBlur = 8;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private drawLives(): void {
    const playerIds = Object.keys(this.gameState.players).sort();
    const localPlayerId = this.engine.getPlayerId();
    const localIndex = playerIds.indexOf(localPlayerId);

    playerIds.forEach((playerId, index) => {
      const player = this.gameState.players[playerId];
      const isLeft = localIndex === 0 ? index === 0 : index === 1;
      const x = isLeft ? 20 : CANVAS_WIDTH - 20;
      const y = 30;

      this.ctx.font = '28px Arial';
      this.ctx.textAlign = isLeft ? 'left' : 'right';
      this.ctx.textBaseline = 'top';

      let color: string;
      switch (player.lives) {
        case 3:
          color = '#ff4757';
          break;
        case 2:
          color = '#ffa502';
          break;
        case 1:
          color = '#e84118';
          break;
        default:
          color = '#ff4757';
      }

      this.ctx.fillStyle = color;
      const hearts = '♥'.repeat(Math.max(0, player.lives));
      this.ctx.fillText(hearts, x, y);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '14px Arial';
      const label = index === 0 ? '玩家1' : '玩家2';
      this.ctx.fillText(`${label} (${player.score}分)`, x, y + 35);
    });
  }

  private drawLatencyWarning(): void {
    if (this.latencyStatus === 'normal') return;

    const y = 10;
    const x = CANVAS_WIDTH / 2;

    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    if (this.latencyStatus === 'high') {
      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillText('⚠ 高延迟！', x, y);
    } else if (this.latencyStatus === 'low') {
      this.ctx.fillStyle = '#2ed573';
      this.ctx.fillText('✓ 低延迟', x, y);
    }
  }

  private drawHitEffects(): void {
    const now = Date.now();

    this.localHitEffects = this.localHitEffects.filter(
      (effect) => now - effect.startTime < HIT_EFFECT_DURATION
    );

    for (const effect of this.localHitEffects) {
      const elapsed = now - effect.startTime;
      const progress = elapsed / HIT_EFFECT_DURATION;
      const alpha = 1 - progress;
      const offsetY = progress * 30;

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#ffd700';
      this.ctx.font = 'bold 24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('命中！', effect.x, effect.y - 40 - offsetY);
      this.ctx.globalAlpha = 1;
    }

    for (const effect of this.gameState.hitEffects) {
      const elapsed = now - effect.startTime;
      if (elapsed >= HIT_EFFECT_DURATION) continue;

      const progress = elapsed / HIT_EFFECT_DURATION;
      const alpha = 1 - progress;
      const offsetY = progress * 30;

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#ffd700';
      this.ctx.font = 'bold 24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('命中！', effect.x, effect.y - 40 - offsetY);
      this.ctx.globalAlpha = 1;
    }
  }

  private drawFPS(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`FPS: ${this.fps}`, 10, CANVAS_HEIGHT - 25);
  }

  private render = (): void => {
    this.clearCanvas();
    this.drawStars();

    for (const bullet of this.gameState.bullets) {
      this.drawBullet(bullet);
    }

    const playerIds = Object.keys(this.gameState.players).sort();
    const localPlayerId = this.engine.getPlayerId();

    for (const playerId of playerIds) {
      const player = this.gameState.players[playerId];
      const isLocalPlayer = playerId === localPlayerId;
      this.drawPlayer(player, isLocalPlayer);
    }

    this.drawLives();
    this.drawLatencyWarning();
    this.drawHitEffects();
    this.drawFPS();

    this.animationFrameId = requestAnimationFrame(this.render);
  };

  public start(): void {
    this.lastFpsUpdate = performance.now();
    this.animationFrameId = requestAnimationFrame(this.render);
  }

  public stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public destroy(): void {
    this.stop();
  }
}
