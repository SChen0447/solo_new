import type { GameConfig, RoomConfig, PortalConfig, Rect, ItemState, PlayerState } from './types';

export interface PortalInteractResult {
  targetRoomId: number;
  targetX: number;
  targetY: number;
}

export interface ItemCollectResult {
  itemId: string;
  type: 'key' | 'heart' | 'weapon';
}

export class MapSystem {
  private config: GameConfig;
  public currentRoomId: number;
  public rooms: Map<number, RoomConfig> = new Map();
  public items: Map<number, ItemState[]> = new Map();
  public exploredRooms: Set<number> = new Set();
  public unlockedPortals: Set<string> = new Set();
  private time: number = 0;
  private mapLayerCache: HTMLCanvasElement | null = null;
  private cachedRoomId: number = -1;

  constructor(config: GameConfig) {
    this.config = config;
    this.currentRoomId = config.player.startRoomId;

    for (const room of config.rooms) {
      this.rooms.set(room.id, room);
      const itemStates: ItemState[] = room.items.map(item => ({
        ...item,
        collected: false,
      }));
      this.items.set(room.id, itemStates);
    }
    this.exploredRooms.add(this.currentRoomId);
  }

  public getCurrentRoom(): RoomConfig | undefined {
    return this.rooms.get(this.currentRoomId);
  }

  public getPlatformsAndWalls(): { platforms: Rect[]; walls: Rect[] } {
    const room = this.getCurrentRoom();
    if (!room) return { platforms: [], walls: [] };
    return { platforms: [...room.platforms], walls: [...room.walls] };
  }

  public update(dt: number): void {
    this.time += dt;
  }

  public checkPortalCollision(player: PlayerState): PortalInteractResult | null {
    const room = this.getCurrentRoom();
    if (!room) return null;

    const playerCX = player.x + player.width / 2;
    const playerCY = player.y + player.height / 2;
    const pr = this.config.portal.radius;

    for (const portal of room.portals) {
      const dx = playerCX - portal.x;
      const dy = playerCY - portal.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= pr + 4) {
        const portalKey = `${this.currentRoomId}_${portal.x}_${portal.y}`;
        if (portal.requiredKey && !this.unlockedPortals.has(portalKey)) {
          if (player.keys > 0) {
            return null;
          }
          return null;
        }
        return {
          targetRoomId: portal.targetRoomId,
          targetX: portal.targetX,
          targetY: portal.targetY,
        };
      }
    }
    return null;
  }

  public tryUnlockPortal(player: PlayerState): boolean {
    const room = this.getCurrentRoom();
    if (!room) return false;
    if (player.keys <= 0) return false;

    const playerCX = player.x + player.width / 2;
    const playerCY = player.y + player.height / 2;
    const pr = this.config.portal.radius;

    for (const portal of room.portals) {
      if (!portal.requiredKey) continue;
      const dx = playerCX - portal.x;
      const dy = playerCY - portal.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= pr + 8) {
        const portalKey = `${this.currentRoomId}_${portal.x}_${portal.y}`;
        if (!this.unlockedPortals.has(portalKey)) {
          this.unlockedPortals.add(portalKey);
          return true;
        }
      }
    }
    return false;
  }

  public isPortalLocked(roomId: number, portal: PortalConfig): boolean {
    if (!portal.requiredKey) return false;
    const portalKey = `${roomId}_${portal.x}_${portal.y}`;
    return !this.unlockedPortals.has(portalKey);
  }

  public switchRoom(targetRoomId: number, targetX: number, targetY: number, player: PlayerState): void {
    this.currentRoomId = targetRoomId;
    this.exploredRooms.add(targetRoomId);
    player.x = targetX - player.width / 2;
    player.y = targetY - player.height;
    player.vx = 0;
    player.vy = 0;
    this.cachedRoomId = -1;
  }

  public checkItemCollection(player: PlayerState): ItemCollectResult | null {
    const roomItems = this.items.get(this.currentRoomId);
    if (!roomItems) return null;

    const px1 = player.x;
    const py1 = player.y;
    const px2 = player.x + player.width;
    const py2 = player.y + player.height;

    for (const item of roomItems) {
      if (item.collected) continue;
      const size = this.getItemSize(item.type);
      const ix1 = item.x - size / 2;
      const iy1 = item.y - size / 2;
      const ix2 = item.x + size / 2;
      const iy2 = item.y + size / 2;

      if (px1 < ix2 && px2 > ix1 && py1 < iy2 && py2 > iy1) {
        item.collected = true;
        return { itemId: item.id, type: item.type };
      }
    }
    return null;
  }

  private getItemSize(type: 'key' | 'heart' | 'weapon'): number {
    const cfg = this.config.item;
    if (type === 'key') return cfg.keySize;
    if (type === 'heart') return cfg.heartSize;
    return cfg.weaponSize;
  }

  private ensureMapLayerCache(): void {
    if (!this.mapLayerCache) {
      this.mapLayerCache = document.createElement('canvas');
      this.mapLayerCache.width = 256;
      this.mapLayerCache.height = 256;
    }
  }

  private renderMapLayerToCache(room: RoomConfig): void {
    this.ensureMapLayerCache();
    if (!this.mapLayerCache) return;
    const cacheCtx = this.mapLayerCache.getContext('2d');
    if (!cacheCtx) return;

    this.cachedRoomId = room.id;
    const c = cacheCtx;
    const rc = this.config.room;

    c.fillStyle = rc.backgroundColor;
    c.fillRect(0, 0, 256, 256);

    const dotCount = 60;
    c.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < dotCount; i++) {
      const dx = (i * 47) % 256;
      const dy = (i * 83) % 256;
      c.fillRect(dx, dy, 2, 2);
    }

    for (const wall of room.walls) {
      this.drawBrickRect(c, wall.x, wall.y, wall.w, wall.h, rc.wallColor);
    }

    for (const plat of room.platforms) {
      this.drawRoundedRect(c, plat.x, plat.y, plat.w, plat.h, rc.borderRadius, rc.platformColor);
    }
  }

  private drawBrickRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 1;
    const brickW = 16;
    const brickH = 8;
    for (let by = y; by < y + h; by += brickH) {
      const rowOffset = ((by - y) / brickH) % 2 === 0 ? 0 : brickW / 2;
      for (let bx = x - rowOffset; bx < x + w; bx += brickW) {
        c.strokeRect(bx, by, brickW, brickH);
      }
    }
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 1;
    for (let by = y; by < y + h; by += brickH) {
      const rowOffset = ((by - y) / brickH) % 2 === 0 ? 0 : brickW / 2;
      for (let bx = x - rowOffset; bx < x + w; bx += brickW) {
        c.beginPath();
        c.moveTo(bx + 1, by + brickH - 1);
        c.lineTo(bx + brickW - 1, by + brickH - 1);
        c.lineTo(bx + brickW - 1, by + 1);
        c.stroke();
      }
    }
  }

  private drawRoundedRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string): void {
    const radius = Math.min(r, w / 2, h / 2);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x + radius, y);
    c.lineTo(x + w - radius, y);
    c.quadraticCurveTo(x + w, y, x + w, y + radius);
    c.lineTo(x + w, y + h - radius);
    c.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    c.lineTo(x + radius, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - radius);
    c.lineTo(x, y + radius);
    c.quadraticCurveTo(x, y, x + radius, y);
    c.closePath();
    c.fill();

    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.fillRect(x + 1, y + 1, w - 2, 2);
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(x + 1, y + h - 3, w - 2, 2);
  }

  public renderBackground(ctx: CanvasRenderingContext2D, scale: number): void {
    const room = this.getCurrentRoom();
    if (!room) return;

    if (this.cachedRoomId !== room.id) {
      this.renderMapLayerToCache(room);
    }
    if (this.mapLayerCache) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.mapLayerCache, 0, 0, 256 * scale, 256 * scale);
    }
  }

  public renderPortals(ctx: CanvasRenderingContext2D, scale: number): void {
    const room = this.getCurrentRoom();
    if (!room) return;
    const pr = this.config.portal.radius;
    const pp = this.config.portal.pulsePeriod;

    for (const portal of room.portals) {
      const pulse = 1 + Math.sin(this.time * Math.PI * 2 / pp) * 0.15;
      const isLocked = this.isPortalLocked(room.id, portal);

      ctx.save();
      ctx.translate(portal.x * scale, portal.y * scale);

      for (let i = 3; i >= 0; i--) {
        const glowR = (pr + i * 4) * scale * pulse;
        const alpha = isLocked ? 0.04 * (3 - i) : 0.1 * (3 - i);
        ctx.fillStyle = isLocked
          ? `rgba(128,128,128,${alpha})`
          : `rgba(170,80,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = isLocked
        ? (this.unlockedPortals.has(`${room.id}_${portal.x}_${portal.y}`) ? '#ffd700' : '#666')
        : '#9b59ff';
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, pr * scale * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = isLocked ? '#aaa' : '#d6b3ff';
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, pr * scale * 0.65 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      if (!isLocked) {
        const rotAngle = this.time * 3;
        ctx.strokeStyle = 'rgba(200,150,255,0.7)';
        ctx.lineWidth = 1 * scale;
        for (let a = 0; a < 4; a++) {
          const angle1 = rotAngle + (a * Math.PI / 2);
          const angle2 = angle1 + Math.PI / 6;
          ctx.beginPath();
          ctx.arc(0, 0, pr * scale * 0.85, angle1, angle2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  public renderItems(ctx: CanvasRenderingContext2D, scale: number): void {
    const roomItems = this.items.get(this.currentRoomId);
    if (!roomItems) return;

    const ic = this.config.item;
    for (const item of roomItems) {
      if (item.collected) continue;
      ctx.save();
      ctx.translate(item.x * scale, item.y * scale);

      if (item.type === 'key') {
        const rot = (this.time / ic.keyRotationPeriod) * Math.PI * 2;
        ctx.rotate(rot);
        const size = ic.keySize * scale;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 6 * scale;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(size * 0.3, -size * 0.12, size * 0.55, size * 0.24);
        ctx.fillRect(size * 0.6, size * 0.05, size * 0.12, size * 0.2);
        ctx.fillRect(size * 0.78, size * 0.05, size * 0.08, size * 0.15);
      } else if (item.type === 'heart') {
        const pulse = 1 + Math.sin(this.time * Math.PI * 2 / ic.heartPulsePeriod) * 0.15;
        ctx.scale(pulse, pulse);
        const size = ic.heartSize * scale;
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 6 * scale;
        ctx.fillStyle = '#e91e63';
        this.drawHeartShape(ctx, size);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(-size * 0.22, -size * 0.18, size * 0.12, size * 0.08, -0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const rot = this.time * 2;
        ctx.rotate(rot);
        const size = ic.weaponSize * scale;
        const particleCount = 6;
        for (let i = 0; i < particleCount; i++) {
          const pAng = rot * 1.5 + (i / particleCount) * Math.PI * 2;
          const pR = size * (0.7 + Math.sin(this.time * 4 + i) * 0.15);
          const px = Math.cos(pAng) * pR;
          const py = Math.sin(pAng) * pR;
          ctx.fillStyle = `hsla(280, 80%, ${60 + Math.sin(this.time * 5 + i) * 20}%, 0.7)`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowColor = '#8b00ff';
        ctx.shadowBlur = 10 * scale;
        ctx.fillStyle = '#4a0e7a';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? size * 0.55 : size * 0.25;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c77dff';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawHeartShape(ctx: CanvasRenderingContext2D, size: number): void {
    const s = size;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.2, -s * 0.55, s * 0.1, 0, s * 0.45);
    ctx.bezierCurveTo(s * 0.55, s * 0.1, s * 0.5, -s * 0.2, 0, s * 0.3);
    ctx.closePath();
  }
}
