import { Player } from './player';

export interface Note {
  angle: number;
  collected: boolean;
  pulse: number;
}

export interface Obstacle {
  angle: number;
  rotation: number;
  warning: boolean;
  warningPhase: number;
  spawnTime: number;
}

export interface CollectParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface BeatRing {
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  angle: number;
}

export interface GameState {
  score: number;
  combo: number;
  comboMultiplier: number;
  comboBreakText: { text: string; life: number; maxLife: number };
  flashEffect: { active: boolean; alpha: number; life: number; maxLife: number };
  gameOver: boolean;
  freezeTimer: number;
  bgColorProgress: number;
  bgColorPhase: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private centerX: number;
  private centerY: number;
  private innerRadius = 200;
  private outerRadius = 260;
  private midRadius = 230;
  private segmentCount = 8;
  private colors = ['#ff0066', '#00ffcc'];
  private particleColors = ['#ff0066', '#00ffcc', '#ffcc00'];
  private collectParticles: CollectParticle[] = [];
  private beatRings: BeatRing[] = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.centerX = ctx.canvas.width / 2;
    this.centerY = ctx.canvas.height / 2;
  }

  public getMidRadius(): number {
    return this.midRadius;
  }

  public angleToPosition(angle: number, radius?: number): { x: number; y: number } {
    const r = radius ?? this.midRadius;
    return {
      x: this.centerX + Math.cos(angle) * r,
      y: this.centerY + Math.sin(angle) * r
    };
  }

  public spawnCollectParticles(angle: number): void {
    const pos = this.angleToPosition(angle);
    for (let i = 0; i < 10; i++) {
      const speed = 60 + Math.random() * 80;
      const a = Math.random() * Math.PI * 2;
      this.collectParticles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: 4 + Math.random() * 4,
        color: this.particleColors[Math.floor(Math.random() * this.particleColors.length)],
        life: 0.5,
        maxLife: 0.5
      });
    }
    if (this.collectParticles.length > 200) {
      this.collectParticles.splice(0, this.collectParticles.length - 200);
    }
  }

  public spawnBeatRing(angle: number): void {
    this.beatRings.push({
      radius: 0,
      alpha: 0.8,
      life: 0.3,
      maxLife: 0.3,
      angle: angle
    });
  }

  public update(dt: number): void {
    for (let i = this.collectParticles.length - 1; i >= 0; i--) {
      const p = this.collectParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.collectParticles.splice(i, 1);
    }
    for (let i = this.beatRings.length - 1; i >= 0; i--) {
      const r = this.beatRings[i];
      r.radius = 40 * (1 - r.life / r.maxLife);
      r.alpha = 0.8 * (r.life / r.maxLife);
      r.life -= dt;
      if (r.life <= 0) this.beatRings.splice(i, 1);
    }
  }

  public render(
    player: Player,
    notes: Note[],
    obstacles: Obstacle[],
    gameState: GameState,
    dt: number
  ): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    this.drawBackground(gameState, dt);

    this.drawBeatRings();
    this.drawTrack();
    this.drawNotes(notes, dt);
    this.drawObstacles(obstacles, dt);
    this.drawTrail(player);
    this.drawPlayer(player);
    this.drawCollectParticles();
    this.drawUI(gameState);

    if (gameState.flashEffect.active) {
      ctx.fillStyle = `rgba(255, 255, 255, ${gameState.flashEffect.alpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (gameState.gameOver) {
      this.drawGameOver(gameState);
    }
  }

  private drawBackground(gameState: GameState, dt: number): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    gameState.bgColorProgress += dt / 0.5;
    if (gameState.bgColorProgress > 1) gameState.bgColorProgress = 1;

    const t = gameState.bgColorProgress;
    const c1 = this.lerpColor('#1a0033', '#33001a', gameState.bgColorPhase, t);
    const c2 = this.lerpColor('#33001a', '#1a0033', gameState.bgColorPhase, t);

    const gradient = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, w * 0.7);
    gradient.addColorStop(0, '#0d001a');
    gradient.addColorStop(0.5, c1);
    gradient.addColorStop(1, c2);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private lerpColor(a: string, b: string, phase: number, t: number): string {
    const tt = phase === 0 ? t : 1 - t;
    const ah = parseInt(a.replace('#', ''), 16);
    const bh = parseInt(b.replace('#', ''), 16);
    const ar = (ah >> 16) & 0xff;
    const ag = (ah >> 8) & 0xff;
    const ab = ah & 0xff;
    const br = (bh >> 16) & 0xff;
    const bg = (bh >> 8) & 0xff;
    const bb = bh & 0xff;
    const r = Math.round(ar + (br - ar) * tt);
    const g = Math.round(ag + (bg - ag) * tt);
    const bl = Math.round(ab + (bb - ab) * tt);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  private drawTrack(): void {
    const ctx = this.ctx;
    const segAngle = (Math.PI * 2) / this.segmentCount;

    for (let i = 0; i < this.segmentCount; i++) {
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle * 0.98;
      const color = this.colors[i % 2];

      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, this.outerRadius, startAngle, endAngle);
      ctx.arc(this.centerX, this.centerY, this.innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = color + '33';
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  private drawBeatRings(): void {
    const ctx = this.ctx;
    for (const ring of this.beatRings) {
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, this.midRadius + ring.radius, ring.angle - 0.3, ring.angle + 0.3);
      ctx.strokeStyle = `rgba(255, 255, 255, ${ring.alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  private drawNotes(notes: Note[], dt: number): void {
    const ctx = this.ctx;
    for (const note of notes) {
      if (note.collected) continue;
      note.pulse += dt * 4;
      const pos = this.angleToPosition(note.angle);
      const pulseScale = 1 + Math.sin(note.pulse) * 0.15;
      const r = 6 * pulseScale;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(note.angle + Math.PI / 2);

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawObstacles(obstacles: Obstacle[], dt: number): void {
    const ctx = this.ctx;
    for (const obs of obstacles) {
      const pos = this.angleToPosition(obs.angle);
      let alpha = 1;

      if (obs.warning) {
        obs.warningPhase += dt * 10;
        alpha = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(obs.warningPhase));
      }

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(obs.rotation);

      const size = 20;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.7, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.7, 0);
      ctx.closePath();

      ctx.fillStyle = `rgba(255, 0, 64, ${alpha})`;
      ctx.shadowColor = '#ff0040';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255, 100, 100, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawTrail(player: Player): void {
    const ctx = this.ctx;
    for (const p of player.trail) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 204, ${p.alpha})`;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private drawPlayer(player: Player): void {
    if (!player.alive) return;
    const ctx = this.ctx;
    const pos = player.getPosition();
    const size = player.size;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(player.rotation);

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(size * 0.5, size * 0.5);
    ctx.lineTo(-size * 0.5, size * 0.5);
    ctx.closePath();

    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private drawCollectParticles(): void {
    const ctx = this.ctx;
    for (const p of this.collectParticles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  private drawUI(gameState: GameState): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;

    const boxX = w - 200;
    const boxY = 20;
    const boxW = 180;
    const boxH = 90;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 6;
    ctx.fillText(`SCORE: ${gameState.score}`, boxX + 12, boxY + 30);
    ctx.shadowBlur = 0;

    if (gameState.combo > 0) {
      ctx.font = 'bold 32px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.shadowColor = '#ff0066';
      ctx.shadowBlur = 10;
      ctx.fillText(`COMBO x${gameState.comboMultiplier}`, boxX + 12, boxY + 70);
      ctx.shadowBlur = 0;
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#cccccc';
      ctx.fillText(`${gameState.combo} HITS`, boxX + 12, boxY + 86);
    }

    if (gameState.comboBreakText.life > 0) {
      const alpha = Math.min(1, gameState.comboBreakText.life / gameState.comboBreakText.maxLife);
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0040';
      ctx.shadowBlur = 10;
      ctx.fillText(gameState.comboBreakText.text, this.centerX, 120);
      ctx.shadowBlur = 0;
    }
  }

  private drawGameOver(gameState: GameState): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = 'bold 56px "Courier New", monospace';
    ctx.fillStyle = '#ff0066';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff0066';
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', this.centerX, this.centerY - 80);
    ctx.shadowBlur = 0;

    ctx.font = '32px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 10;
    ctx.fillText(`FINAL SCORE: ${gameState.score}`, this.centerX, this.centerY - 10);
    ctx.shadowBlur = 0;

    const btnX = this.centerX - 110;
    const btnY = this.centerY + 40;
    const btnW = 220;
    const btnH = 56;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击重新开始', this.centerX, btnY + btnH / 2);
    ctx.restore();

    (ctx.canvas as HTMLCanvasElement & { restartButton?: { x: number; y: number; w: number; h: number } }).restartButton = {
      x: btnX, y: btnY, w: btnW, h: btnH
    };
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

  public clearParticles(): void {
    this.collectParticles = [];
    this.beatRings = [];
  }
}
