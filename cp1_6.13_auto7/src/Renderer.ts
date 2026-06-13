import { SceneManager, GameState, BattleState } from './SceneManager';
import { RoomType, Room, ItemType } from './MapGenerator';
import { Player } from './Player';

const COL_BG = '#1a0a2e';
const COL_WALL = '#3a2a1e';
const COL_WALL_LIGHT = '#4a3a2e';
const COL_FLOOR = '#2a1a3e';
const COL_FLOOR_BRICK = '#321e48';
const COL_CORRIDOR = '#251538';
const COL_CORRIDOR_BRICK = '#2d1a40';
const COL_ACCENT = '#c95a2b';
const COL_ACCENT_LIGHT = '#e87a4b';
const COL_HP = '#c9302b';
const COL_STAMINA = '#2bc95a';
const COL_EXP = '#2b8ac9';
const COL_TEXT = '#e0d0c0';
const COL_TEXT_DIM = '#8a7a6a';
const COL_RED_GLOW = 'rgba(200, 40, 30, ';
const COL_GOLD = '#f0c040';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private tileCache: Map<string, HTMLCanvasElement> = new Map();
  private spriteCache: Map<string, HTMLCanvasElement> = new Map();
  private frameCount: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.width = canvas.width;
    this.height = canvas.height;
    this.buildTileCache();
    this.buildSpriteCache();
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;
  }

  render(scene: SceneManager): void {
    this.frameCount++;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (scene.gameState === GameState.BATTLE) {
      this.renderBattle(scene);
    } else {
      this.renderDungeon(scene);
    }

    if (scene.gameState === GameState.GAME_OVER) {
      this.renderGameOver(scene);
    } else if (scene.gameState === GameState.VICTORY) {
      this.renderVictory(scene);
    } else if (scene.gameState === GameState.LEVEL_UP) {
      this.renderLevelUp(scene);
    }

    if (scene.fadeState.active) {
      ctx.fillStyle = `rgba(10, 5, 20, ${scene.fadeState.alpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private renderDungeon(scene: SceneManager): void {
    const ctx = this.ctx;
    const ts = scene.mapData.tileSize;
    const cam = scene.camera;

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    const startX = Math.max(0, Math.floor(cam.x / ts));
    const startY = Math.max(0, Math.floor(cam.y / ts));
    const endX = Math.min(scene.mapData.width, Math.ceil((cam.x + this.width) / ts) + 1);
    const endY = Math.min(scene.mapData.height, Math.ceil((cam.y + this.height) / ts) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = scene.mapData.tiles[y][x];
        const px = x * ts;
        const py = y * ts;
        const key = tile === RoomType.WALL ? 'wall' : (tile === RoomType.CORRIDOR ? 'corr' : 'floor');
        const cached = this.tileCache.get(key);
        if (cached) {
          ctx.drawImage(cached, px, py);
        }
      }
    }

    for (const room of scene.mapData.rooms) {
      if (room.type !== RoomType.EMPTY) {
        this.renderRoomMarker(ctx, room, ts, scene);
      }
    }

    this.renderPlayer(ctx, scene.player, ts, scene);

    ctx.restore();

    this.renderHUD(scene);

    if (scene.gameState === GameState.TRAP) {
      this.renderTrapOverlay(scene);
    } else if (scene.gameState === GameState.CHEST) {
      this.renderChestOverlay(scene);
    }

    this.renderMessages(scene);
  }

  private renderRoomMarker(ctx: CanvasRenderingContext2D, room: Room, ts: number, scene: SceneManager): void {
    const cx = (room.x + room.width / 2) * ts;
    const cy = (room.y + room.height / 2) * ts;

    if (room.cleared && room.type !== RoomType.START) {
      ctx.globalAlpha = 0.15;
    }

    switch (room.type) {
      case RoomType.START:
        this.drawPixelIcon(ctx, cx - 4, cy - 4, 'start');
        break;
      case RoomType.MONSTER:
        if (!room.cleared) this.drawPixelIcon(ctx, cx - 4, cy - 4, 'monster');
        break;
      case RoomType.CHEST:
        this.drawPixelIcon(ctx, cx - 4, cy - 4, room.cleared ? 'chest_open' : 'chest');
        break;
      case RoomType.TRAP:
        if (!room.cleared) this.drawPixelIcon(ctx, cx - 4, cy - 4, 'trap');
        break;
      case RoomType.BOSS:
        if (!room.cleared) this.drawPixelIcon(ctx, cx - 4, cy - 4, 'boss');
        break;
    }

    ctx.globalAlpha = 1;
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, player: Player, ts: number, scene: SceneManager): void {
    const px = player.x * ts;
    const py = player.y * ts;

    const bobY = Math.sin(this.frameCount * 0.1) * 1.5;

    ctx.save();
    ctx.translate(px, py + bobY);

    const sprite = this.spriteCache.get('player');
    if (sprite) {
      ctx.drawImage(sprite, -4, -4);
    }

    ctx.restore();

    if (player.stats.stamina <= 10) {
      ctx.fillStyle = 'rgba(200, 50, 50, 0.3)';
      ctx.beginPath();
      ctx.arc(px + ts / 2, py + ts / 2, ts * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderBattle(scene: SceneManager): void {
    const ctx = this.ctx;
    const bs = scene.battleState;
    const anim = bs.animation;

    ctx.fillStyle = COL_BG;
    ctx.fillRect(0, 0, this.width, this.height);

    if (anim.playerHit > 0 || anim.monsterHit > 0) {
      const intensity = Math.max(anim.playerHit, anim.monsterHit) / 400;
      const glow = Math.min(0.6, intensity * 0.8);
      const grd = ctx.createRadialGradient(this.width / 2, this.height / 2, this.width * 0.3, this.width / 2, this.height / 2, this.width * 0.6);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, `${COL_RED_GLOW}${glow})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    const shakeOx = (Math.random() - 0.5) * anim.shakeX * 2;
    const shakeOy = (Math.random() - 0.5) * anim.shakeY * 2;

    ctx.save();
    ctx.translate(shakeOx, shakeOy);

    this.drawBattleArena(ctx, scene);

    this.drawBattleMonster(ctx, scene);

    this.drawBattlePlayer(ctx, scene);

    if (anim.playerSlash > 0) {
      this.drawSlashEffect(ctx, scene, true);
    }
    if (anim.monsterAttack > 0) {
      this.drawSlashEffect(ctx, scene, false);
    }

    if (anim.damagePopupMonster > 0) {
      this.drawDamagePopup(ctx, this.width / 2 + 100, this.height / 2 - 80, anim.damageAmountMonster, anim.damagePopupMonster, 900, COL_ACCENT);
    }
    if (anim.damagePopupPlayer > 0) {
      this.drawDamagePopup(ctx, this.width / 2 - 100, this.height / 2 - 80, anim.damageAmountPlayer, anim.damagePopupPlayer, 900, COL_HP);
    }

    ctx.restore();

    this.drawBattleHUD(ctx, scene);

    if (bs.playerTurn && bs.canAct && !bs.victory) {
      const pulse = 0.5 + Math.sin(this.frameCount * 0.08) * 0.3;
      ctx.fillStyle = `rgba(201, 90, 43, ${pulse})`;
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ 空格键 攻击 ]', this.width / 2, this.height - 50);
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = `rgba(200, 200, 200, ${pulse * 0.7})`;
      ctx.fillText('[ Q 使用药水 ]', this.width / 2, this.height - 28);
    } else if (!bs.victory) {
      ctx.fillStyle = 'rgba(200, 100, 100, 0.5)';
      ctx.font = '16px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('怪物回合...', this.width / 2, this.height - 40);
    }
  }

  private drawBattleArena(ctx: CanvasRenderingContext2D, scene: SceneManager): void {
    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.strokeStyle = 'rgba(201, 90, 43, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 80, 300, 40, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(201, 90, 43, 0.08)';
    ctx.fill();
  }

  private drawBattleMonster(ctx: CanvasRenderingContext2D, scene: SceneManager): void {
    const bs = scene.battleState;
    const anim = bs.animation;
    const cx = this.width / 2 + 100;
    const cy = this.height / 2 - 30;

    let ox = 0, oy = 0;
    if (anim.monsterHit > 0) {
      const t = anim.monsterHit / anim.monsterHitDuration;
      ox = Math.sin(t * Math.PI * 6) * 6 * t;
      oy = -t * 8;
    }

    ctx.save();
    ctx.translate(cx + ox, oy);

    const size = bs.isBoss ? 24 : 16;
    const spriteKey = bs.isBoss ? 'boss_battle' : 'monster_battle';
    const sprite = this.spriteCache.get(spriteKey);
    if (sprite) {
      ctx.drawImage(sprite, -size / 2, cy - size / 2, size, size);
    } else {
      ctx.fillStyle = bs.isBoss ? '#8a2a5a' : '#6a3a4a';
      ctx.fillRect(-size / 2, cy - size / 2, size, size);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(-size / 4, cy - size / 4, 3, 3);
      ctx.fillRect(size / 4 - 3, cy - size / 4, 3, 3);
    }

    if (anim.monsterHit > 0) {
      const t = anim.monsterHit / anim.monsterHitDuration;
      ctx.fillStyle = `rgba(255, 255, 255, ${t * 0.7})`;
      ctx.fillRect(-size / 2, cy - size / 2, size, size);
    }

    ctx.restore();

    ctx.fillStyle = COL_TEXT;
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(bs.monsterName, cx, cy - size / 2 - 20);
  }

  private drawBattlePlayer(ctx: CanvasRenderingContext2D, scene: SceneManager): void {
    const bs = scene.battleState;
    const anim = bs.animation;
    const cx = this.width / 2 - 100;
    const cy = this.height / 2 - 30;

    let ox = 0;
    if (anim.playerSlash > 0) {
      const t = anim.playerSlash / anim.playerSlashDuration;
      ox = t * 30;
    }
    if (anim.playerHit > 0) {
      const t = anim.playerHit / anim.playerHitDuration;
      ox += Math.sin(t * Math.PI * 6) * 6 * t;
    }

    ctx.save();
    ctx.translate(cx + ox, 0);

    const sprite = this.spriteCache.get('player_battle');
    if (sprite) {
      ctx.drawImage(sprite, -8, cy - 8, 16, 16);
    } else {
      ctx.fillStyle = '#4a8ac9';
      ctx.fillRect(-8, cy - 8, 16, 16);
      ctx.fillStyle = '#8ac9ff';
      ctx.fillRect(-4, cy - 4, 4, 4);
      ctx.fillRect(0, cy - 4, 4, 4);
    }

    if (anim.playerHit > 0) {
      const t = anim.playerHit / anim.playerHitDuration;
      ctx.fillStyle = `rgba(255, 50, 50, ${t * 0.6})`;
      ctx.fillRect(-8, cy - 8, 16, 16);
    }

    ctx.restore();
  }

  private drawSlashEffect(ctx: CanvasRenderingContext2D, scene: SceneManager, isPlayer: boolean): void {
    const bs = scene.battleState;
    const anim = bs.animation;
    const cx = this.width / 2 + (isPlayer ? 60 : -60);
    const cy = this.height / 2 - 30;

    const progress = isPlayer
      ? 1 - anim.playerSlash / anim.playerSlashDuration
      : 1 - anim.monsterAttack / anim.monsterAttackDuration;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(progress * Math.PI * 0.5);

    const alpha = 1 - progress;
    ctx.strokeStyle = `rgba(255, 200, 100, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, -20);
    ctx.lineTo(20, 20);
    ctx.moveTo(20, -20);
    ctx.lineTo(-20, 20);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 200, ${alpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.lineTo(25, 0);
    ctx.moveTo(0, -25);
    ctx.lineTo(0, 25);
    ctx.stroke();

    ctx.restore();
  }

  private drawDamagePopup(ctx: CanvasRenderingContext2D, x: number, y: number, amount: number, remaining: number, total: number, color: string): void {
    const t = remaining / total;
    const offsetY = (1 - t) * -30;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(`-${amount}`, x + 1, y + offsetY + 1);
    ctx.fillStyle = color;
    ctx.fillText(`-${amount}`, x, y + offsetY);
    ctx.restore();
  }

  private drawBattleHUD(ctx: CanvasRenderingContext2D, scene: SceneManager): void {
    const bs = scene.battleState;
    const p = scene.player.stats;

    const barW = 200;
    const barH = 16;
    const px = 30;
    const py = 30;

    this.drawBar(ctx, px, py, barW, barH, p.hp, p.maxHp, COL_HP, 'HP');
    this.drawBar(ctx, px, py + 24, barW, barH, p.stamina, p.maxStamina, COL_STAMINA, 'SP');

    const mx = this.width - barW - 30;
    this.drawBar(ctx, mx, py, barW, barH, bs.monsterHp, bs.monsterMaxHp, COL_ACCENT, bs.monsterName);

    ctx.fillStyle = COL_TEXT_DIM;
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`ATK:${p.attack}  DEF:${p.defense}`, px + barW, py + 50);
  }

  private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, current: number, max: number, color: string, label: string): void {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, h);

    const ratio = Math.max(0, Math.min(1, current / max));
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * ratio, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = COL_TEXT;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${label}`, x + 4, y + 12);
    ctx.textAlign = 'right';
    ctx.fillText(`${current}/${max}`, x + w - 4, y + 12);
  }

  private renderHUD(scene: SceneManager): void {
    const ctx = this.ctx;
    const p = scene.player.stats;
    const pad = 16;
    const barW = 160;
    const barH = 12;

    ctx.fillStyle = 'rgba(10, 5, 20, 0.75)';
    ctx.fillRect(0, 0, 260, 95);
    ctx.strokeStyle = 'rgba(201, 90, 43, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 260, 95);

    this.drawBar(ctx, pad, pad, barW, barH, p.hp, p.maxHp, COL_HP, 'HP');
    this.drawBar(ctx, pad, pad + 18, barW, barH, p.stamina, p.maxStamina, COL_STAMINA, 'SP');

    const expRatio = p.expToNextLevel > 0 ? p.exp / p.expToNextLevel : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(pad, pad + 36, barW, 6);
    ctx.fillStyle = COL_EXP;
    ctx.fillRect(pad, pad + 36, barW * expRatio, 6);

    ctx.fillStyle = COL_TEXT;
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Lv.${p.level}  ATK:${p.attack}  DEF:${p.defense}`, pad, pad + 58);
    ctx.fillText(`Floor:${p.floor}  Gold:${p.gold}  Score:${p.score}`, pad, pad + 72);

    const invX = this.width - 200;
    ctx.fillStyle = 'rgba(10, 5, 20, 0.75)';
    ctx.fillRect(invX - 8, 0, 208, 60);
    ctx.strokeStyle = 'rgba(201, 90, 43, 0.4)';
    ctx.strokeRect(invX - 8, 0, 208, 60);

    ctx.fillStyle = COL_TEXT;
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'left';
    let iy = 14;
    for (const item of scene.player.inventory) {
      if (item.count > 0) {
        ctx.fillText(`${this.itemIcon(item.type)} ${this.itemName(item.type)} x${item.count}`, invX, iy);
        iy += 14;
      }
    }

    ctx.fillStyle = COL_TEXT_DIM;
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WASD/方向键:移动  空格:攻击  Q:药水  E:交互  Enter:确认', this.width / 2, this.height - 8);
  }

  private renderMessages(scene: SceneManager): void {
    const ctx = this.ctx;
    const msgX = 16;
    const msgY = this.height - 60;

    ctx.fillStyle = 'rgba(10, 5, 20, 0.6)';
    ctx.fillRect(msgX - 4, msgY - 4, 400, 48);

    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i < scene.messageLog.messages.length; i++) {
      const msg = scene.messageLog.messages[i];
      const age = performance.now() - msg.time;
      const alpha = age < 5000 ? 1 : Math.max(0.3, 1 - (age - 5000) / 3000);
      ctx.fillStyle = `rgba(224, 208, 192, ${alpha * (i === 0 ? 1 : 0.6)})`;
      ctx.fillText(msg.text, msgX, msgY + i * 14);
    }
  }

  private renderTrapOverlay(scene: SceneManager): void {
    const ctx = this.ctx;
    const flash = Math.sin(this.frameCount * 0.3) * 0.3 + 0.3;
    ctx.fillStyle = `rgba(200, 40, 30, ${flash})`;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = COL_HP;
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('陷阱触发！', this.width / 2, this.height / 2);
  }

  private renderChestOverlay(scene: SceneManager): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 5, 20, 0.5)';
    ctx.fillRect(0, 0, this.width, this.height);

    const pulse = Math.sin(this.frameCount * 0.06) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(240, 192, 64, ${pulse})`;
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('发现宝箱！按 E 打开', this.width / 2, this.height / 2);
  }

  private renderGameOver(scene: SceneManager): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(10, 0, 0, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = COL_HP;
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('你已陨落', this.width / 2, this.height / 2 - 40);

    ctx.fillStyle = COL_TEXT;
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText(`最终分数: ${scene.player.stats.score}  深入层数: ${scene.player.stats.floor}`, this.width / 2, this.height / 2 + 20);

    const pulse = 0.5 + Math.sin(this.frameCount * 0.05) * 0.3;
    ctx.fillStyle = `rgba(224, 208, 192, ${pulse})`;
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('按 Enter 重新开始', this.width / 2, this.height / 2 + 70);
  }

  private renderVictory(scene: SceneManager): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(10, 5, 20, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    const pulse = 0.6 + Math.sin(this.frameCount * 0.04) * 0.4;
    ctx.fillStyle = `rgba(240, 192, 64, ${pulse})`;
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('胜利！', this.width / 2, this.height / 2 - 40);

    ctx.fillStyle = COL_ACCENT;
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText('时空领主已被击败！', this.width / 2, this.height / 2 + 10);

    ctx.fillStyle = COL_TEXT;
    ctx.fillText(`最终分数: ${scene.player.stats.score}`, this.width / 2, this.height / 2 + 40);

    const pulse2 = 0.5 + Math.sin(this.frameCount * 0.05) * 0.3;
    ctx.fillStyle = `rgba(224, 208, 192, ${pulse2})`;
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('按 Enter 重新开始', this.width / 2, this.height / 2 + 80);
  }

  private renderLevelUp(scene: SceneManager): void {
    const ctx = this.ctx;
    const pulse = 0.5 + Math.sin(this.frameCount * 0.1) * 0.5;
    ctx.fillStyle = `rgba(100, 200, 255, ${pulse * 0.3})`;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = `rgba(100, 200, 255, ${0.8 + pulse * 0.2})`;
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`等级提升！ Lv.${scene.player.stats.level}`, this.width / 2, this.height / 2);
  }

  private drawPixelIcon(ctx: CanvasRenderingContext2D, x: number, y: number, type: string): void {
    const sprite = this.spriteCache.get(type);
    if (sprite) {
      ctx.drawImage(sprite, x, y);
    }
  }

  private buildTileCache(): void {
    const ts = 16;

    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = ts;
    floorCanvas.height = ts;
    const fctx = floorCanvas.getContext('2d')!;
    fctx.fillStyle = COL_FLOOR;
    fctx.fillRect(0, 0, ts, ts);
    fctx.strokeStyle = COL_FLOOR_BRICK;
    fctx.lineWidth = 0.5;
    for (let bx = 0; bx < ts; bx += 8) {
      for (let by = 0; by < ts; by += 4) {
        fctx.strokeRect(bx, by, 8, 4);
      }
    }
    this.tileCache.set('floor', floorCanvas);

    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = ts;
    wallCanvas.height = ts;
    const wctx = wallCanvas.getContext('2d')!;
    wctx.fillStyle = COL_WALL;
    wctx.fillRect(0, 0, ts, ts);
    wctx.fillStyle = COL_WALL_LIGHT;
    for (let wy = 0; wy < ts; wy += 4) {
      const offset = (wy % 8 === 0) ? 0 : 4;
      for (let wx = offset; wx < ts; wx += 8) {
        wctx.fillRect(wx + 0.5, wy + 0.5, 7, 3.5);
      }
    }
    this.tileCache.set('wall', wallCanvas);

    const corrCanvas = document.createElement('canvas');
    corrCanvas.width = ts;
    corrCanvas.height = ts;
    const cctx = corrCanvas.getContext('2d')!;
    cctx.fillStyle = COL_CORRIDOR;
    cctx.fillRect(0, 0, ts, ts);
    cctx.strokeStyle = COL_CORRIDOR_BRICK;
    cctx.lineWidth = 0.3;
    cctx.strokeRect(2, 2, 12, 12);
    this.tileCache.set('corr', corrCanvas);
  }

  private buildSpriteCache(): void {
    this.spriteCache.set('player', this.createSprite(8, 8, (ctx) => {
      ctx.fillStyle = '#4a8ac9';
      ctx.fillRect(1, 0, 6, 3);
      ctx.fillStyle = '#8ac9ff';
      ctx.fillRect(2, 1, 2, 1);
      ctx.fillRect(4, 1, 2, 1);
      ctx.fillStyle = '#3a6a9a';
      ctx.fillRect(2, 3, 4, 3);
      ctx.fillStyle = '#4a8ac9';
      ctx.fillRect(0, 4, 2, 2);
      ctx.fillRect(6, 4, 2, 2);
      ctx.fillStyle = '#3a3a5a';
      ctx.fillRect(2, 6, 2, 2);
      ctx.fillRect(4, 6, 2, 2);
    }));

    this.spriteCache.set('start', this.createSprite(8, 8, (ctx) => {
      ctx.fillStyle = '#2bc95a';
      ctx.fillRect(3, 0, 2, 2);
      ctx.fillRect(1, 2, 6, 4);
      ctx.fillRect(3, 6, 2, 2);
    }));

    this.spriteCache.set('monster', this.createSprite(8, 8, (ctx) => {
      ctx.fillStyle = '#8a3a4a';
      ctx.fillRect(1, 0, 6, 3);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(2, 1, 1, 1);
      ctx.fillRect(5, 1, 1, 1);
      ctx.fillStyle = '#6a2a3a';
      ctx.fillRect(0, 3, 8, 3);
      ctx.fillStyle = '#5a1a2a';
      ctx.fillRect(1, 6, 2, 2);
      ctx.fillRect(5, 6, 2, 2);
    }));

    this.spriteCache.set('boss', this.createSprite(8, 8, (ctx) => {
      ctx.fillStyle = '#8a2a5a';
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = '#ff0044';
      ctx.fillRect(1, 1, 2, 2);
      ctx.fillRect(5, 1, 2, 2);
      ctx.fillStyle = '#aa3a6a';
      ctx.fillRect(2, 4, 4, 2);
      ctx.fillStyle = '#6a1a4a';
      ctx.fillRect(0, 0, 2, 1);
      ctx.fillRect(6, 0, 2, 1);
    }));

    this.spriteCache.set('chest', this.createSprite(8, 8, (ctx) => {
      ctx.fillStyle = '#8a6a2a';
      ctx.fillRect(1, 2, 6, 4);
      ctx.fillStyle = COL_GOLD;
      ctx.fillRect(2, 3, 4, 2);
      ctx.fillStyle = '#aa8a3a';
      ctx.fillRect(1, 2, 6, 1);
      ctx.fillStyle = '#6a4a1a';
      ctx.fillRect(3, 4, 2, 1);
    }));

    this.spriteCache.set('chest_open', this.createSprite(8, 8, (ctx) => {
      ctx.fillStyle = '#5a4a2a';
      ctx.fillRect(1, 3, 6, 3);
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(1, 1, 6, 1);
      ctx.fillRect(1, 2, 6, 1);
    }));

    this.spriteCache.set('trap', this.createSprite(8, 8, (ctx) => {
      ctx.fillStyle = '#aa3a1a';
      ctx.fillRect(0, 0, 8, 8);
      ctx.fillStyle = '#ff6a3a';
      ctx.fillRect(2, 2, 4, 4);
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(3, 1, 2, 6);
      ctx.fillRect(1, 3, 6, 2);
    }));

    this.spriteCache.set('player_battle', this.createSprite(16, 16, (ctx) => {
      ctx.fillStyle = '#4a8ac9';
      ctx.fillRect(3, 0, 10, 5);
      ctx.fillStyle = '#8ac9ff';
      ctx.fillRect(5, 1, 2, 2);
      ctx.fillRect(9, 1, 2, 2);
      ctx.fillStyle = '#3a6a9a';
      ctx.fillRect(4, 5, 8, 6);
      ctx.fillStyle = '#4a8ac9';
      ctx.fillRect(1, 6, 3, 4);
      ctx.fillRect(12, 6, 3, 4);
      ctx.fillStyle = '#3a3a5a';
      ctx.fillRect(4, 11, 3, 5);
      ctx.fillRect(9, 11, 3, 5);
    }));

    this.spriteCache.set('monster_battle', this.createSprite(16, 16, (ctx) => {
      ctx.fillStyle = '#8a3a4a';
      ctx.fillRect(2, 0, 12, 6);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(4, 2, 3, 2);
      ctx.fillRect(9, 2, 3, 2);
      ctx.fillStyle = '#6a2a3a';
      ctx.fillRect(1, 6, 14, 5);
      ctx.fillStyle = '#5a1a2a';
      ctx.fillRect(3, 11, 4, 5);
      ctx.fillRect(9, 11, 4, 5);
    }));

    this.spriteCache.set('boss_battle', this.createSprite(24, 24, (ctx) => {
      ctx.fillStyle = '#8a2a5a';
      ctx.fillRect(2, 0, 20, 8);
      ctx.fillStyle = '#ff0044';
      ctx.fillRect(5, 2, 4, 3);
      ctx.fillRect(15, 2, 4, 3);
      ctx.fillStyle = '#aa3a6a';
      ctx.fillRect(4, 8, 16, 8);
      ctx.fillStyle = '#6a1a4a';
      ctx.fillRect(0, 0, 4, 4);
      ctx.fillRect(20, 0, 4, 4);
      ctx.fillStyle = '#5a0a3a';
      ctx.fillRect(5, 16, 5, 8);
      ctx.fillRect(14, 16, 5, 8);
    }));
  }

  private createSprite(w: number, h: number, drawFn: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    drawFn(ctx);
    return c;
  }

  private itemName(type: ItemType): string {
    const m: Record<string, string> = {
      health_potion: '生命药水',
      stamina_potion: '体力药水',
      sword: '利剑',
      shield: '盾牌',
      key: '钥匙',
      gold: '金币'
    };
    return m[type] || '?';
  }

  private itemIcon(type: ItemType): string {
    const m: Record<string, string> = {
      health_potion: '♥',
      stamina_potion: '⚡',
      sword: '⚔',
      shield: '⛨',
      key: '🔑',
      gold: '●'
    };
    return m[type] || '?';
  }
}
