import { eventBus } from './eventBus';
import type { Ship, Asteroid, GravityTrap, Vec2, GameState, Score } from './types';

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export class GameController {
  private ship: Ship;
  private state: GameState = 'start';
  private score: Score = { debrisCount: 0, coreCount: 0, shieldRemaining: 100, total: 0 };
  private timeRemaining: number = 180;
  private shipAngle: number = 0;
  private prevPos: Vec2 = { x: 0, y: 0 };
  private flamePhase: number = 0;
  private collisionCooldown: number = 0;
  private startBtnBounds: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };
  private restartBtnBounds: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };
  private scale: number = 1;

  constructor(w: number, h: number) {
    this.ship = {
      pos: { x: w / 2, y: h / 2 },
      angle: 0,
      shield: 100,
      maxShield: 100,
    };
    this.prevPos = { x: this.ship.pos.x, y: this.ship.pos.y };
    this.setupEvents();
  }

  private setupEvents(): void {
    eventBus.on('debris:captured', (id: unknown) => {
      if (this.state === 'playing') {
        this.score.debrisCount++;
        eventBus.emit('scene:removeDebris', id);
      }
    });
    eventBus.on('core:captured', (id: unknown) => {
      if (this.state === 'playing') {
        this.score.coreCount++;
        eventBus.emit('scene:removeCore', id);
      }
    });
  }

  reset(w: number, h: number): void {
    this.ship = {
      pos: { x: w / 2, y: h / 2 },
      angle: 0,
      shield: 100,
      maxShield: 100,
    };
    this.prevPos = { x: this.ship.pos.x, y: this.ship.pos.y };
    this.score = { debrisCount: 0, coreCount: 0, shieldRemaining: 100, total: 0 };
    this.timeRemaining = 180;
    this.state = 'playing';
    this.collisionCooldown = 0;
  }

  getState(): GameState { return this.state; }
  getShip(): Ship { return this.ship; }
  getTimeRemaining(): number { return this.timeRemaining; }

  updateShip(mousePos: Vec2, w: number, h: number): void {
    this.prevPos.x = this.ship.pos.x;
    this.prevPos.y = this.ship.pos.y;
    this.ship.pos.x = mousePos.x;
    this.ship.pos.y = mousePos.y;
    const dx = this.ship.pos.x - this.prevPos.x;
    const dy = this.ship.pos.y - this.prevPos.y;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      this.shipAngle = Math.atan2(dy, dx);
    }
    if (this.ship.pos.x < 15) this.ship.pos.x = 15;
    if (this.ship.pos.x > w - 15) this.ship.pos.x = w - 15;
    if (this.ship.pos.y < 15) this.ship.pos.y = 15;
    if (this.ship.pos.y > h - 15) this.ship.pos.y = h - 15;
  }

  update(dt: number, asteroids: Asteroid[], traps: GravityTrap[]): void {
    if (this.state !== 'playing') return;

    this.flamePhase += dt * 8;
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.endGame();
      return;
    }

    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);

    for (const a of asteroids) {
      const d = dist(this.ship.pos, a.pos);
      if (d < a.radius + 12) {
        if (this.collisionCooldown <= 0) {
          const dmg = 15 + Math.random() * 10;
          this.ship.shield -= dmg;
          this.collisionCooldown = 0.5;
          if (this.ship.shield <= 0) {
            this.ship.shield = 0;
            this.endGame();
            return;
          }
        }
      }
    }

    for (const t of traps) {
      const d = dist(this.ship.pos, t.pos);
      const pulse = Math.sin(t.pulsePhase / 0.8 * Math.PI * 2);
      const radius = t.baseRadius + 15 * (0.5 + 0.5 * pulse);
      if (d < radius + 30) {
        const strength = (1 - d / (radius + 30)) * 120;
        const angle = Math.atan2(t.pos.y - this.ship.pos.y, t.pos.x - this.ship.pos.x);
        this.ship.pos.x += Math.cos(angle) * strength * dt;
        this.ship.pos.y += Math.sin(angle) * strength * dt;
      }
    }

    this.score.shieldRemaining = Math.round(this.ship.shield);
  }

  private endGame(): void {
    this.state = 'over';
    this.score.total = this.score.debrisCount * 10 + this.score.coreCount * 50 + this.score.shieldRemaining;
  }

  handleClick(x: number, y: number): boolean {
    if (this.state === 'start') {
      const b = this.startBtnBounds;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return true;
      }
    }
    if (this.state === 'over') {
      const b = this.restartBtnBounds;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return true;
      }
    }
    return false;
  }

  drawShip(ctx: CanvasRenderingContext2D): void {
    if (this.state !== 'playing') return;
    const s = this.ship;
    ctx.save();
    ctx.translate(s.pos.x, s.pos.y);
    ctx.rotate(this.shipAngle);

    const flameSize = 5 + Math.sin(this.flamePhase) * 5;
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(-10 - flameSize, 0);
    ctx.lineTo(-10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-10, -9);
    ctx.lineTo(-10 - flameSize * 0.7, -6);
    ctx.lineTo(-10, -3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawUI(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    this.scale = w < 768 ? 0.8 : 1;
    const sc = this.scale;

    if (this.state === 'playing') {
      const barW = 200 * sc;
      const barH = 20 * sc;
      const barX = 15 * sc;
      const barY = 15 * sc;
      ctx.fillStyle = '#34495e';
      ctx.fillRect(barX, barY, barW, barH);
      const shieldPct = this.ship.shield / this.ship.maxShield;
      ctx.fillStyle = '#3498db';
      ctx.fillRect(barX, barY, barW * shieldPct, barH);
      ctx.strokeStyle = '#45a29e';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      ctx.fillStyle = '#c5c6c7';
      ctx.font = `${12 * sc}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`护盾 ${Math.round(this.ship.shield)}`, barX + barW / 2, barY + barH * 0.75);

      const totalScore = this.score.debrisCount * 10 + this.score.coreCount * 50;
      ctx.save();
      ctx.shadowColor = '#45a29e';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#45a29e';
      ctx.font = `${24 * sc}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`得分: ${totalScore}`, w - 20 * sc, 35 * sc);
      ctx.restore();

      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      ctx.fillStyle = '#c5c6c7';
      ctx.font = `${16 * sc}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, w / 2, 30 * sc);
    }

    if (this.state === 'start') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.shadowColor = '#45a29e';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#66fcf1';
      ctx.font = `bold ${48 * sc}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('银河遗骸打捞者', w / 2, h / 2 - 60 * sc);
      ctx.restore();

      const btnW = 180 * sc;
      const btnH = 48 * sc;
      const btnX = w / 2 - btnW / 2;
      const btnY = h / 2 + 10 * sc;
      this.startBtnBounds = { x: btnX, y: btnY, w: btnW, h: btnH };
      ctx.fillStyle = '#45a29e';
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 8 * sc);
      ctx.fill();
      ctx.fillStyle = '#0b0c10';
      ctx.font = `${18 * sc}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('点击开始', btnX + btnW / 2, btnY + btnH * 0.65);

      ctx.fillStyle = '#c5c6c7';
      ctx.font = `${14 * sc}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('鼠标移动控制飞船 | 按住左键发射牵引光束', w / 2, h / 2 + 90 * sc);
    }

    if (this.state === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.shadowColor = '#45a29e';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#66fcf1';
      ctx.font = `bold ${42 * sc}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('任务结束', w / 2, h / 2 - 80 * sc);
      ctx.restore();

      ctx.fillStyle = '#c5c6c7';
      ctx.font = `${20 * sc}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`残骸打捞: ${this.score.debrisCount}  ×10 = ${this.score.debrisCount * 10}`, w / 2, h / 2 - 30 * sc);
      ctx.fillText(`能量核心: ${this.score.coreCount}  ×50 = ${this.score.coreCount * 50}`, w / 2, h / 2 + 5 * sc);
      ctx.fillText(`剩余护盾: ${this.score.shieldRemaining}`, w / 2, h / 2 + 40 * sc);

      ctx.save();
      ctx.shadowColor = '#45a29e';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#66fcf1';
      ctx.font = `bold ${28 * sc}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`最终得分: ${this.score.total}`, w / 2, h / 2 + 85 * sc);
      ctx.restore();

      const btnW = 180 * sc;
      const btnH = 48 * sc;
      const btnX = w / 2 - btnW / 2;
      const btnY = h / 2 + 110 * sc;
      this.restartBtnBounds = { x: btnX, y: btnY, w: btnW, h: btnH };
      ctx.fillStyle = '#45a29e';
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 8 * sc);
      ctx.fill();
      ctx.fillStyle = '#0b0c10';
      ctx.font = `${18 * sc}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('再玩一次', btnX + btnW / 2, btnY + btnH * 0.65);
    }
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
