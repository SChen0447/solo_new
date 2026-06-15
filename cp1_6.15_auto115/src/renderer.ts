import {
  SceneState,
  NPC,
  Shop,
  Star,
  InfoPanel,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLOR_SUN,
  COLOR_MOON,
  SHOP_POSITION,
  SHOP_SIZE,
  Vec2,
  formatTime,
  phaseName,
} from './entities';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  render(state: SceneState) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawBackground(state.backgroundColor);
    this.drawGrid();
    this.drawStars(state.stars, state.phase);
    this.drawSunMoon(state.sunMoonPosition, state.isSun, state.phase);
    this.drawShop(state.shop);
    this.drawNPCs(state.npcs);
    this.drawTimeInfo(state.worldTime, state.phase);
    this.drawInfoPanel(state.infoPanel);
    this.drawInfoPanel(state.shopMessagePanel);
  }

  private drawBackground(color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    const gridSize = 40;
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawStars(stars: Star[], phase: string) {
    if (phase === 'day') return;
    const ctx = this.ctx;
    const alphaMult = phase === 'dusk' ? 0.5 : 1;
    stars.forEach((star) => {
      const twinkle = 0.5 + 0.5 * Math.sin(star.phase);
      const alpha = star.baseAlpha * twinkle * alphaMult;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawSunMoon(pos: Vec2, isSun: boolean, phase: string) {
    const ctx = this.ctx;
    const visibleDay = phase !== 'night';
    const visibleNight = phase !== 'day';
    const alpha = isSun
      ? (phase === 'day' ? 1 : phase === 'dusk' ? 0.8 : 0)
      : (phase === 'night' ? 1 : phase === 'dusk' ? 0.4 : 0);
    void visibleDay; void visibleNight;

    if (alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (isSun) {
      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, 20,
        pos.x, pos.y, 20 + 16,
      );
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 36, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLOR_SUN;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = COLOR_MOON;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0a0a2e';
      ctx.beginPath();
      ctx.arc(pos.x - 7, pos.y - 3, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(pos.x + 5, pos.y - 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x + 2, pos.y + 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawShop(shop: Shop) {
    const ctx = this.ctx;
    const { position, width, height } = shop;

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(position.x, position.y, width, height);

    ctx.strokeStyle = '#6B3410';
    ctx.lineWidth = 1;
    const brickH = 10;
    const brickW = 20;
    for (let row = 0; row < Math.ceil(height / brickH); row++) {
      const offset = row % 2 === 0 ? 0 : brickW / 2;
      for (let col = -1; col < Math.ceil(width / brickW) + 1; col++) {
        const bx = position.x + col * brickW + offset;
        const by = position.y + row * brickH;
        if (bx + brickW > position.x && bx < position.x + width) {
          ctx.strokeRect(
            Math.max(bx, position.x),
            by,
            Math.min(brickW, position.x + width - Math.max(bx, position.x)),
            brickH,
          );
        }
      }
    }

    ctx.fillStyle = '#5c2e0d';
    ctx.beginPath();
    ctx.moveTo(position.x - 5, position.y);
    ctx.lineTo(position.x + width / 2, position.y - 25);
    ctx.lineTo(position.x + width + 5, position.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2e1506';
    const doorW = 20;
    const doorH = 30;
    ctx.fillRect(
      position.x + width / 2 - doorW / 2,
      position.y + height - doorH,
      doorW,
      doorH,
    );
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(
      position.x + width / 2 + doorW / 2 - 3,
      position.y + height - doorH / 2,
      1.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    this.drawShopSign(shop);
  }

  private drawShopSign(shop: Shop) {
    const ctx = this.ctx;
    const signW = 40;
    const signH = 16;
    const signX = shop.position.x + shop.width - signW - 5;
    const signY = shop.position.y + 15;

    ctx.save();
    ctx.globalAlpha = shop.signAlpha;
    ctx.fillStyle = shop.signColor;
    ctx.fillRect(signX, signY, signW, signH);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(signX, signY, signW, signH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(shop.signText, signX + signW / 2, signY + signH / 2 + 1);
    ctx.restore();
  }

  private drawNPCs(npcs: NPC[]) {
    npcs.forEach((npc) => {
      if (!npc.visible) return;
      this.drawPixelNPC(npc);
    });
  }

  private drawPixelNPC(npc: NPC) {
    const ctx = this.ctx;
    const scale = npc.scale;
    const w = npc.width * scale;
    const h = npc.height * scale;
    const x = npc.position.x - w / 2;
    const y = npc.position.y - h;

    ctx.save();
    ctx.translate(npc.position.x, npc.position.y);
    ctx.scale(scale, scale);
    ctx.translate(-npc.position.x, -npc.position.y);

    const drawX = npc.position.x - npc.width / 2;
    const drawY = npc.position.y - npc.height;

    const headH = 10;
    const bodyH = 14;
    const legH = 8;

    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(drawX + 2, drawY, npc.width - 4, headH);

    ctx.fillStyle = '#000000';
    if (npc.facing !== 'north') {
      if (npc.facing === 'west') {
        ctx.fillRect(drawX + 3, drawY + 4, 2, 2);
      } else if (npc.facing === 'east') {
        ctx.fillRect(drawX + npc.width - 5, drawY + 4, 2, 2);
      } else {
        ctx.fillRect(drawX + 4, drawY + 4, 2, 2);
        ctx.fillRect(drawX + npc.width - 6, drawY + 4, 2, 2);
      }
    }

    ctx.fillStyle = npc.color;
    ctx.fillRect(drawX + 1, drawY + headH, npc.width - 2, bodyH);

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(drawX + npc.width - 4, drawY + headH + 2, 2, bodyH - 4);

    if (npc.type === 'merchant') {
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(drawX + 5, drawY + headH + 5, npc.width - 10, 2);
      ctx.fillRect(drawX + npc.width / 2 - 1, drawY + headH + 3, 2, bodyH - 6);
    } else if (npc.type === 'guard') {
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(drawX - 1, drawY + headH + 3, 3, 10);
      ctx.fillRect(drawX + npc.width - 2, drawY + headH + 3, 3, 10);
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(drawX + npc.width - 2, drawY + headH + 1, 3, 3);
    }

    ctx.fillStyle = '#3e2723';
    ctx.fillRect(drawX + 2, drawY + headH + bodyH, 4, legH);
    ctx.fillRect(drawX + npc.width - 6, drawY + headH + bodyH, 4, legH);

    ctx.restore();
    void w; void h; void x; void y;
  }

  private drawTimeInfo(worldTime: number, phase: string) {
    const ctx = this.ctx;
    const timeStr = formatTime(worldTime);
    const phaseStr = phaseName(phase as 'day' | 'dusk' | 'night');
    const text = `${phaseStr}  ${timeStr}`;

    ctx.save();
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#000000';
    ctx.fillText(text, 18, 18);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 16, 16);
    ctx.restore();
  }

  private drawInfoPanel(panel: InfoPanel) {
    if (!panel.visible || panel.alpha <= 0) return;
    const ctx = this.ctx;
    const paddingX = 12;
    const paddingY = 10;
    const lineHeight = 20;
    const fontSize = 12;
    const maxTextWidth = Math.max(...panel.content.map((t) => t.length * (fontSize * 0.6)));
    const panelW = paddingX * 2 + maxTextWidth + 20;
    const panelH = paddingY * 2 + panel.content.length * lineHeight;
    const radius = 8;
    const x = panel.position.x;
    const y = panel.position.y;

    ctx.save();
    ctx.globalAlpha = panel.alpha;

    this.roundRect(ctx, x, y, panelW, panelH, radius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#1a1a1a';
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    panel.content.forEach((line, i) => {
      ctx.fillText(line, x + paddingX, y + paddingY + i * lineHeight + 2);
    });

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
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

  hitTestNPC(mx: number, my: number, npcs: NPC[]): NPC | null {
    for (let i = npcs.length - 1; i >= 0; i--) {
      const npc = npcs[i];
      if (!npc.visible) continue;
      const scale = npc.scale;
      const w = npc.width * scale;
      const h = npc.height * scale;
      const x = npc.position.x - w / 2;
      const y = npc.position.y - h;
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
        return npc;
      }
    }
    return null;
  }

  hitTestShop(mx: number, my: number): boolean {
    return (
      mx >= SHOP_POSITION.x - 5 &&
      mx <= SHOP_POSITION.x + SHOP_SIZE.width + 5 &&
      my >= SHOP_POSITION.y - 25 &&
      my <= SHOP_POSITION.y + SHOP_SIZE.height
    );
  }
}
