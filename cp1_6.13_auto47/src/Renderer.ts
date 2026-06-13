import { TileMap } from './TileMap';
import { Player } from './Player';
import { GameWorld } from './GameWorld';
import { TileState, GameState } from './types';
import { HEX_SIZE, MAP_RADIUS, PLAYER_SIZE, VOLCANO_COUNTDOWN, COLORS, METEOR_SHOCKWAVE_RADIUS } from './constants';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private time: number = 0;
  private hoverRestart: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  public checkRestartClick(x: number, y: number): boolean {
    if (!this.hoverRestart) return false;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2 + 80;
    return Math.abs(x - cx) < 100 && Math.abs(y - cy) < 28;
  }

  public checkRestartHover(x: number, y: number): boolean {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2 + 80;
    this.hoverRestart = Math.abs(x - cx) < 100 && Math.abs(y - cy) < 28;
    return this.hoverRestart;
  }

  public render(deltaTime: number, world: GameWorld): void {
    this.time += deltaTime;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    this.drawBackground(w, h);

    const zoom = world.getCameraZoom();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-world.getPlayer().position.x, -world.getPlayer().position.y * 0.6 - world.getPlayer().z * 0.4);
    ctx.transform(1, 0, -0.4, 1, 0, 0);

    this.drawMagmaOcean(world);
    this.drawTiles(world);
    this.drawCrystals(world);
    this.drawLavaFlows(world);
    this.drawMeteors(world);
    this.drawShockwaves(world);
    this.drawPlayer(world.getPlayer());
    this.drawParticles(world);

    ctx.restore();

    this.drawUI(world);

    if (world.gameOverInfo) {
      this.drawGameOver(world);
    }
  }

  private drawBackground(w: number, h: number): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2a0a00');
    grad.addColorStop(0.5, '#401200');
    grad.addColorStop(1, '#1a0500');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 30; i++) {
      const px = ((i * 137.5 + this.time * 20) % (w + 200)) - 100;
      const py = ((i * 89.3) % h);
      ctx.fillStyle = i % 3 === 0 ? '#ff4400' : '#ff8800';
      ctx.beginPath();
      ctx.arc(px, py, 1 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawMagmaOcean(world: GameWorld): void {
    const ctx = this.ctx;
    const radius = MAP_RADIUS * HEX_SIZE * 1.8;
    const grad = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius);
    grad.addColorStop(0, COLORS.LAVA_RED);
    grad.addColorStop(0.5, COLORS.LAVA_ORANGE);
    grad.addColorStop(0.8, '#801000');
    grad.addColorStop(1, '#200000');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 + this.time * 0.2;
      const r = radius * (0.5 + 0.3 * Math.sin(this.time * 1.5 + i));
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      ctx.fillStyle = COLORS.LAVA_YELLOW;
      ctx.beginPath();
      ctx.arc(x, y, 3 + Math.sin(this.time * 3 + i) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawTiles(world: GameWorld): void {
    const ctx = this.ctx;
    const tiles = world.getTileMap().getTiles();

    const sorted = [...tiles].sort((a, b) => {
      const pa = TileMap.hexToPixel(a.coord);
      const pb = TileMap.hexToPixel(b.coord);
      return pa.y - pb.y;
    });

    for (const tile of sorted) {
      const pos = TileMap.hexToPixel(tile.coord);
      const dist = TileMap.getHexDistance(tile.coord, { q: 0, r: 0 });
      const distK = Math.min(1, dist / MAP_RADIUS);

      if (tile.state === TileState.GONE) continue;

      let offsetY = 0;
      let alpha = 1;
      let tintR = 0, tintG = 0, tintB = 0;
      let flash = 0;

      if (tile.state === TileState.WARNING) {
        flash = Math.floor(this.time * 8) % 2;
        if (flash) {
          tintR = 255;
          tintG = 60;
          tintB = 0;
        }
      } else if (tile.state === TileState.COLLAPSING) {
        offsetY = tile.collapseProgress * 80;
        alpha = 1 - tile.collapseProgress;
        const rot = tile.collapseProgress * 2;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(rot);
        ctx.translate(-pos.x, -pos.y);
      }

      const size = HEX_SIZE * 0.92;
      const rBase = Math.floor(120 * (1 - distK * 0.8));
      const gBase = Math.floor(30 * (1 - distK * 0.9));
      const bBase = Math.floor(20 * (1 - distK * 0.95));
      let r = rBase + (tintR - rBase) * (flash ? 0.7 : 0);
      let g = gBase + (tintG - gBase) * (flash ? 0.7 : 0);
      let b = bBase + (tintB - bBase) * (flash ? 0.7 : 0);

      ctx.globalAlpha = alpha;

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      this.drawHex(pos.x, pos.y + 8, size);
      ctx.fill();

      const grad = ctx.createLinearGradient(pos.x - size, pos.y - size, pos.x + size, pos.y + size);
      grad.addColorStop(0, `rgb(${r + 30},${g + 20},${b + 15})`);
      grad.addColorStop(1, `rgb(${Math.max(0, r - 30)},${Math.max(0, g - 20)},${Math.max(0, b - 15)})`);
      ctx.fillStyle = grad;
      this.drawHex(pos.x, pos.y + offsetY, size);
      ctx.fill();

      ctx.strokeStyle = `rgba(0,0,0,0.5)`;
      ctx.lineWidth = 2;
      this.drawHex(pos.x, pos.y + offsetY, size);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,180,100,0.25)`;
      ctx.lineWidth = 1;
      this.drawHex(pos.x, pos.y + offsetY, size * 0.9);
      ctx.stroke();

      if (tile.state === TileState.WARNING && flash) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = COLORS.LAVA_RED;
        this.drawHex(pos.x, pos.y + offsetY, size * 0.9);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.globalAlpha = 1;
      if (tile.state === TileState.COLLAPSING) {
        ctx.restore();
      }
    }
  }

  private drawHex(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  private drawCrystals(world: GameWorld): void {
    const ctx = this.ctx;
    for (const c of world.getCrystals()) {
      if (c.collected && c.collectProgress > 1) continue;
      const alpha = c.collected ? Math.max(0, 1 - c.collectProgress) : 1;
      const yOffset = c.collected ? -c.collectProgress * 50 : Math.sin(this.time * 2 + c.id) * 3;
      ctx.save();
      ctx.translate(c.position.x, c.position.y + yOffset);
      ctx.rotate(c.rotation);
      ctx.globalAlpha = alpha;

      ctx.shadowColor = COLORS.CRYSTAL_GLOW;
      ctx.shadowBlur = 15 + Math.sin(this.time * 3) * 5;

      const s = 12 * (c.collected ? (1 - c.collectProgress * 0.5) : 1);
      ctx.fillStyle = COLORS.CRYSTAL_GOLD;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);
      ctx.lineTo(s * 0.7, -s * 0.3);
      ctx.lineTo(s * 0.5, s * 1.1);
      ctx.lineTo(-s * 0.5, s * 1.1);
      ctx.lineTo(-s * 0.7, -s * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = COLORS.CRYSTAL_GLOW;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);
      ctx.lineTo(s * 0.7, -s * 0.3);
      ctx.lineTo(0, -s * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  private drawLavaFlows(world: GameWorld): void {
    const ctx = this.ctx;
    for (const flow of world.getHazardSpawner().getLavaFlows()) {
      const angle = Math.atan2(flow.velocity.y, flow.velocity.x);
      ctx.save();
      ctx.translate(flow.position.x, flow.position.y);
      ctx.rotate(angle);

      ctx.shadowColor = COLORS.LAVA_ORANGE;
      ctx.shadowBlur = 20;

      const grad = ctx.createLinearGradient(-30, 0, 30, 0);
      grad.addColorStop(0, COLORS.LAVA_RED);
      grad.addColorStop(0.5, COLORS.LAVA_ORANGE);
      grad.addColorStop(1, COLORS.LAVA_YELLOW);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 30, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawMeteors(world: GameWorld): void {
    const ctx = this.ctx;
    for (const m of world.getHazardSpawner().getMeteors()) {
      if (m.exploded) continue;
      ctx.save();
      ctx.translate(m.position.x, m.position.y);

      ctx.shadowColor = COLORS.LAVA_ORANGE;
      ctx.shadowBlur = 25;

      const size = 18;
      const grad = ctx.createRadialGradient(-3, -3, 0, 0, 0, size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, COLORS.LAVA_YELLOW);
      grad.addColorStop(0.7, COLORS.LAVA_ORANGE);
      grad.addColorStop(1, COLORS.LAVA_RED);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawShockwaves(world: GameWorld): void {
    const ctx = this.ctx;
    for (const m of world.getHazardSpawner().getActiveShockwaves()) {
      const t = m.shockwaveProgress;
      const alpha = 1 - t;
      const r = t * METEOR_SHOCKWAVE_RADIUS;
      ctx.save();
      ctx.translate(m.targetPos.x, m.targetPos.y);
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = COLORS.LAVA_ORANGE;
      ctx.lineWidth = 6 * (1 - t);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = COLORS.LAVA_YELLOW;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPlayer(player: Player): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(player.position.x, player.position.y - player.z);

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, player.z + 2, PLAYER_SIZE * 0.6 * (1 + player.z / 300), PLAYER_SIZE * 0.25 * (1 + player.z / 300), 0, 0, Math.PI * 2);
    ctx.fill();

    if (player.isStunned) {
      ctx.rotate(player.rotation);
    }

    ctx.scale(player.scaleX, player.scaleY);

    const size = PLAYER_SIZE;
    let bodyColor = '#605050';
    let bodyColor2 = '#403030';

    if (player.isLavaFlashing()) {
      bodyColor = '#ff2020';
      bodyColor2 = '#aa0000';
    }

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;

    const grad = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size * 0.6);
    grad.addColorStop(0, bodyColor);
    grad.addColorStop(1, bodyColor2);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#2a2020';
    ctx.beginPath();
    ctx.arc(-size * 0.2, -size * 0.1, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.2, -size * 0.1, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-size * 0.18, -size * 0.12, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.22, -size * 0.12, size * 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1010';
    ctx.beginPath();
    ctx.arc(0, size * 0.15, size * 0.1, 0, Math.PI);
    ctx.fill();

    if (player.isSteamJumping && player.zVelocity > 100) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(-size * 0.25, size * 0.4);
      ctx.quadraticCurveTo(0, size * 0.9, size * 0.25, size * 0.4);
      ctx.fill();
    }

    if (player.isGliding && player.zVelocity < 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, size * 0.1);
      ctx.quadraticCurveTo(-size * 0.3, size * 0.5, 0, size * 0.3);
      ctx.quadraticCurveTo(size * 0.3, size * 0.5, size * 0.6, size * 0.1);
      ctx.fill();
    }

    ctx.restore();

    if (player.isStunned) {
      ctx.save();
      ctx.translate(player.position.x, player.position.y - player.z - PLAYER_SIZE);
      for (let i = 0; i < 3; i++) {
        const angle = player.stunStarsAngle + (i * Math.PI * 2) / 3;
        const r = 22;
        const sx = Math.cos(angle) * r;
        const sy = Math.sin(angle) * r;
        ctx.fillStyle = COLORS.CRYSTAL_GOLD;
        this.drawStar(sx, sy, 5, 8, 4);
      }
      ctx.restore();
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    const ctx = this.ctx;
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  private drawParticles(world: GameWorld): void {
    const ctx = this.ctx;
    for (const p of world.getParticles().getParticles()) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.type === 'steam' || p.type === 'smoke') {
        ctx.globalAlpha = alpha * 0.6;
      }
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawUI(world: GameWorld): void {
    const ctx = this.ctx;
    const w = this.canvas.width;

    const pulse = 1 + Math.sin(this.time * 4) * 0.03;

    this.drawUICard(20, 20, 220, 50, pulse);
    this.drawUICard(20, 80, 220, 30, pulse);

    const scoreBounce = world.getScoreBounce();
    ctx.save();
    ctx.translate(w / 2, 45);
    ctx.scale(scoreBounce, scoreBounce);
    this.drawUICard(-80, -22, 160, 44, pulse);

    const scoreGrad = ctx.createLinearGradient(-60, -12, 60, 12);
    scoreGrad.addColorStop(0, COLORS.TEXT_YELLOW);
    scoreGrad.addColorStop(1, COLORS.TEXT_ORANGE);
    ctx.fillStyle = scoreGrad;
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLORS.LAVA_ORANGE;
    ctx.shadowBlur = 6;
    ctx.fillText(`${world.score}`, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏱ 喷发倒计时', 32, 45);

    const countdownPct = Math.max(0, world.volcanoCountdown / VOLCANO_COUNTDOWN);
    this.drawProgressBar(32, 55, 196, 12, countdownPct, countdownPct < 0.25 ? COLORS.LAVA_RED : COLORS.LAVA_ORANGE);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillText(`${world.volcanoCountdown.toFixed(1)}s`, 110, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('💨 蒸汽背包', 32, 95);
    const chargePct = world.getPlayer().getSteamCharge() / 100;
    this.drawProgressBar(32, 105, 196, 12, chargePct, '#ffffff');
    if (chargePct >= 1) {
      ctx.fillStyle = COLORS.LAVA_YELLOW;
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText('SPACE 释放!', 120, 95);
    }
  }

  private drawUICard(x: number, y: number, w: number, h: number, pulse: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-x - w / 2, -y - h / 2);

    const r = 8;
    ctx.fillStyle = COLORS.UI_BG;
    this.roundRect(x, y, w, h, r);
    ctx.fill();

    ctx.strokeStyle = COLORS.UI_BORDER;
    ctx.lineWidth = 2;
    this.roundRect(x, y, w, h, r);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255,150,50,${0.3 + Math.sin(this.time * 6) * 0.2})`;
    ctx.lineWidth = 1;
    this.roundRect(x - 1, y - 1, w + 2, h + 2, r + 1);
    ctx.stroke();
    ctx.restore();
  }

  private drawProgressBar(x: number, y: number, w: number, h: number, pct: number, color: string): void {
    const ctx = this.ctx;
    this.roundRect(x, y, w, h, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
    ctx.fillStyle = color;
    this.roundRect(x + 1, y + 1, (w - 2) * pct, h - 2, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    this.roundRect(x, y, w, h, 4);
    ctx.stroke();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
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

  private drawGameOver(world: GameWorld): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const info = world.gameOverInfo!;
    const alpha = Math.min(1, info.fadeProgress);

    if (info.state === GameState.VOLCANO) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const shrinkT = Math.min(1, info.fadeProgress);
      const radius = Math.sqrt(w * w + h * h) * 0.8 * (1 - shrinkT);
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radius * 1.3);
      grad.addColorStop(0, 'rgba(255,0,0,0.1)');
      grad.addColorStop(0.6, 'rgba(180,0,0,0.85)');
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(60,0,0,0.75)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    if (info.fadeProgress < 0.3 && info.state !== GameState.VOLCANO) return;

    const contentAlpha = info.state === GameState.VOLCANO
      ? alpha
      : Math.min(1, Math.max(0, info.fadeProgress - 0.3) / 0.7);

    ctx.save();
    ctx.globalAlpha = contentAlpha;

    if (info.state === GameState.GAMEOVER) {
      const textAlpha = Math.min(1, info.fadeProgress);
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.fillStyle = COLORS.GAMEOVER_TEXT;
      ctx.font = 'bold 72px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = COLORS.LAVA_RED;
      ctx.shadowBlur = 20;
      ctx.fillText('Game Over', w / 2, h / 2 - 100);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = COLORS.LAVA_RED;
      ctx.font = 'bold 58px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = COLORS.LAVA_YELLOW;
      ctx.shadowBlur = 20;
      ctx.fillText('火山喷发！', w / 2, h / 2 - 100);
      ctx.restore();
    }

    ctx.fillStyle = '#ffdd88';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${world.getRank()} - ${info.score} 分`, w / 2, h / 2 - 30);

    const btnScale = this.hoverRestart ? 1.08 : 1;
    ctx.save();
    ctx.translate(w / 2, h / 2 + 80);
    ctx.scale(btnScale, btnScale);
    this.roundRect(-100, -28, 200, 56, 10);
    const btnGrad = ctx.createLinearGradient(-100, -28, 100, 28);
    btnGrad.addColorStop(0, this.hoverRestart ? '#ff4000' : '#cc2000');
    btnGrad.addColorStop(1, this.hoverRestart ? '#ff8000' : '#991000');
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重新开始', 0, 0);
    ctx.restore();

    ctx.restore();
  }
}
