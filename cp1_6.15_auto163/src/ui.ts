import type { GameConfig, PlayerState, RoomConfig, Particle } from './types';
import type { MapSystem } from './map';

export interface ScreenEffect {
  type: 'transition' | 'unlockText' | 'portalHalo' | 'lowHealthFlash';
  startTime: number;
  duration: number;
  data?: unknown;
}

export class UISystem {
  private config: GameConfig;
  private canvasWidth: number;
  private canvasHeight: number;
  public effects: ScreenEffect[] = [];
  private time: number = 0;

  constructor(config: GameConfig, canvasWidth: number, canvasHeight: number) {
    this.config = config;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public update(dt: number): void {
    this.time += dt;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const elapsed = performance.now() - this.effects[i].startTime;
      if (elapsed >= this.effects[i].duration) {
        this.effects.splice(i, 1);
      }
    }
  }

  public addTransitionEffect(): void {
    this.effects.push({
      type: 'transition',
      startTime: performance.now(),
      duration: this.config.portal.transitionDuration * 2,
    });
  }

  public addUnlockText(text: string): void {
    this.effects.push({
      type: 'unlockText',
      startTime: performance.now(),
      duration: this.config.item.unlockTextDuration,
      data: { text },
    });
  }

  public addPortalHaloEffect(): void {
    const existing = this.effects.find(e => e.type === 'portalHalo');
    if (!existing) {
      this.effects.push({
        type: 'portalHalo',
        startTime: performance.now(),
        duration: 200,
      });
    } else {
      existing.startTime = performance.now();
    }
  }

  public triggerLowHealthFlash(): void {
    const existing = this.effects.find(e => e.type === 'lowHealthFlash');
    if (!existing) {
      this.effects.push({
        type: 'lowHealthFlash',
        startTime: performance.now(),
        duration: 300,
      });
    }
  }

  public getTransitionProgress(): number {
    const t = this.effects.find(e => e.type === 'transition');
    if (!t) return 0;
    const elapsed = performance.now() - t.startTime;
    const total = t.duration;
    const p = elapsed / total;
    if (p < 0.5) return p * 2;
    return 2 - p * 2;
  }

  public isTransitionHalfway(): boolean {
    const t = this.effects.find(e => e.type === 'transition');
    if (!t) return false;
    const elapsed = performance.now() - t.startTime;
    const total = t.duration;
    return elapsed >= total * 0.49 && elapsed <= total * 0.51;
  }

  public isInTransition(): boolean {
    return this.effects.some(e => e.type === 'transition');
  }

  public renderStatusBar(ctx: CanvasRenderingContext2D, player: PlayerState, currentRoomId: number): void {
    const ui = this.config.ui;
    const heartSize = ui.heartSize;
    const padding = 10;

    for (let i = 0; i < player.maxHealth; i++) {
      const x = padding + i * (heartSize + 4);
      const y = padding;
      const filled = i < player.health;
      const scale = filled ? 1 : 0.5;
      this.drawHeart(ctx, x + heartSize / 2, y + heartSize / 2, heartSize * scale, filled);
    }

    const heartRowY = padding + heartSize + 4;
    const keySize = 16;
    ctx.save();
    ctx.translate(padding + keySize / 2, heartRowY + keySize / 2);
    ctx.fillStyle = '#c9a84c';
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(-keySize / 2, -keySize / 2, keySize, keySize);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-keySize / 4, -keySize / 4, keySize / 2, keySize / 2);
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#c9a84c';
    ctx.fillText(`x ${player.keys}`, padding + keySize + 6, heartRowY + keySize - 3);

    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    const roomText = `房间 #${currentRoomId}`;
    ctx.fillText(roomText, padding, heartRowY + keySize + 18);
  }

  private drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, filled: boolean): void {
    const s = size;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.2, -s * 0.55, s * 0.1, 0, s * 0.45);
    ctx.bezierCurveTo(s * 0.55, s * 0.1, s * 0.5, -s * 0.2, 0, s * 0.3);
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = '#e91e63';
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(-s * 0.22, -s * 0.15, s * 0.12, s * 0.08, -0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#333';
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  public renderMinimap(ctx: CanvasRenderingContext2D, mapSystem: MapSystem, player: PlayerState): void {
    const ui = this.config.ui;
    const size = ui.minimapSize;
    const roomSize = ui.minimapRoomSize;
    const x = this.canvasWidth - size - 10;
    const y = this.canvasHeight - size - 10;
    const currentRoom = mapSystem.getCurrentRoom();

    ctx.save();
    ctx.fillStyle = '#00000080';
    this.roundRect(ctx, x, y, size, size, 6);
    ctx.fill();
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const padding = 8;
    const contentW = size - padding * 2;
    const contentH = size - padding * 2;

    let minMx = Infinity, maxMx = -Infinity, minMy = Infinity, maxMy = -Infinity;
    for (const [, room] of mapSystem.rooms) {
      minMx = Math.min(minMx, room.minimapX);
      maxMx = Math.max(maxMx, room.minimapX);
      minMy = Math.min(minMy, room.minimapY);
      maxMy = Math.max(maxMy, room.minimapY);
    }
    const gridCols = (maxMx - minMx + 1);
    const gridRows = (maxMy - minMy + 1);
    const cellW = contentW / gridCols;
    const cellH = contentH / gridRows;
    const roomDrawW = Math.min(roomSize * 0.8, cellW * 0.8);
    const roomDrawH = Math.min(roomSize * 0.8, cellH * 0.8);

    for (const [roomId, room] of mapSystem.rooms) {
      const gx = room.minimapX - minMx;
      const gy = room.minimapY - minMy;
      const rx = x + padding + gx * cellW + (cellW - roomDrawW) / 2;
      const ry = y + padding + gy * cellH + (cellH - roomDrawH) / 2;

      const isExplored = mapSystem.exploredRooms.has(roomId);
      const isCurrent = roomId === mapSystem.currentRoomId;

      if (isExplored) {
        ctx.fillStyle = isCurrent ? '#ffffff' : '#666';
      } else {
        ctx.fillStyle = '#2a2a2a';
      }
      ctx.fillRect(rx, ry, roomDrawW, roomDrawH);

      if (isCurrent) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(rx - 1, ry - 1, roomDrawW + 2, roomDrawH + 2);
      } else if (isExplored) {
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, roomDrawW, roomDrawH);
      }

      if (isCurrent && currentRoom) {
        const px = rx + (player.x / this.config.room.width) * roomDrawW;
        const py = ry + (player.y / this.config.room.height) * roomDrawH;
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    ctx.restore();
  }

  public renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[], scale: number): void {
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * scale, p.y * scale, p.radius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public renderDarts(ctx: CanvasRenderingContext2D, darts: { x: number; y: number; vx: number }[], scale: number): void {
    const dw = this.config.item.dartWidth * scale;
    const dh = this.config.item.dartHeight * scale;
    for (const d of darts) {
      ctx.save();
      ctx.translate(d.x * scale, d.y * scale);
      if (d.vx < 0) ctx.rotate(Math.PI);
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
      ctx.fillStyle = '#c9a84c';
      ctx.beginPath();
      ctx.moveTo(dw / 2, -dh / 2);
      ctx.lineTo(dw / 2 + 4, 0);
      ctx.lineTo(dw / 2, dh / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  public renderEffects(ctx: CanvasRenderingContext2D): void {
    for (const eff of this.effects) {
      const elapsed = performance.now() - eff.startTime;
      const p = elapsed / eff.duration;

      if (eff.type === 'transition') {
        const alpha = p < 0.5 ? p * 2 : 2 - p * 2;
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.restore();
      }

      if (eff.type === 'unlockText') {
        const text = (eff.data as { text: string }).text;
        const animP = p;
        let scale: number;
        let alpha: number;
        if (animP < 0.3) {
          scale = 0.3 + (animP / 0.3) * 1.2;
          alpha = animP / 0.3;
        } else if (animP < 0.8) {
          scale = 1.5 - ((animP - 0.3) / 0.5) * 0.5;
          alpha = 1;
        } else {
          scale = 1 - ((animP - 0.8) / 0.2) * 0.2;
          alpha = 1 - ((animP - 0.8) / 0.2);
        }
        ctx.save();
        ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#c9a84c';
        ctx.shadowBlur = 10;
        ctx.fillText(text, 0, 0);
        ctx.strokeStyle = '#c9a84c';
        ctx.lineWidth = 2;
        ctx.strokeText(text, 0, 0);
        ctx.restore();
      }

      if (eff.type === 'portalHalo') {
        const alpha = 1 - p;
        ctx.save();
        ctx.globalAlpha = alpha * 0.6;
        const gradient = ctx.createRadialGradient(
          this.canvasWidth / 2, this.canvasHeight / 2, this.canvasWidth * 0.15,
          this.canvasWidth / 2, this.canvasHeight / 2, this.canvasWidth * 0.7
        );
        gradient.addColorStop(0, 'rgba(170,80,255,0)');
        gradient.addColorStop(1, 'rgba(170,80,255,0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.restore();
      }

      if (eff.type === 'lowHealthFlash') {
        const flash = (Math.sin(elapsed * 0.03) + 1) * 0.5;
        const alpha = flash * (1 - p) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        const gradient = ctx.createRadialGradient(
          this.canvasWidth / 2, this.canvasHeight / 2, this.canvasWidth * 0.25,
          this.canvasWidth / 2, this.canvasHeight / 2, this.canvasWidth * 0.7
        );
        gradient.addColorStop(0, 'rgba(255,0,0,0)');
        gradient.addColorStop(1, 'rgba(255,0,0,1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.restore();
      }
    }
  }

  public renderPortalPrompt(ctx: CanvasRenderingContext2D, canInteract: boolean, needKey: boolean, playerKeys: number, scale: number): void {
    if (!canInteract) return;
    const text = needKey && playerKeys > 0 ? `按 E 解锁 (需要1钥匙)` : (needKey ? '需要钥匙' : '按 E 进入');
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight - 80;
    ctx.save();
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = needKey ? (playerKeys > 0 ? '#ffd700' : '#ff4444') : '#9b59ff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    const pulse = 1 + Math.sin(this.time * 5) * 0.08;
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.fillText(`[ ${text} ]`, 0, 0);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
