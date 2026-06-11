
import type { Tower, Enemy, Projectile, Particle, TowerType } from '../shared/types';
import { TOWER_CONFIGS, ENEMY_CONFIGS, GRID_COLS, GRID_ROWS } from '../shared/types';
import type { GameController } from '../core/GameController';

interface StarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  brightness: number;
  twinkle: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private controller: GameController;
  private width: number = 0;
  private height: number = 0;
  private stars: StarParticle[] = [];
  private hoverGridX: number = -1;
  private hoverGridY: number = -1;

  constructor(canvas: HTMLCanvasElement, controller: GameController) {
    this.canvas = canvas;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('Canvas 2D context not available');
    this.ctx = c;
    this.controller = controller;
    this.initStars();
    this.resize();
  }

  private initStars(): void {
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00003,
        vy: (Math.random() - 0.5) * 0.00002,
        size: 0.5 + Math.random() * 1.8,
        brightness: 0.3 + Math.random() * 0.7,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.controller.setCanvasSize(this.width, this.height);
  }

  setHoverGrid(gx: number, gy: number): void {
    this.hoverGridX = gx;
    this.hoverGridY = gy;
  }

  render(dt: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawStarfield(dt);
    this.drawMapGrid();
    this.drawPlacementPreview();
    this.drawRangeIndicator();
    this.drawTowers();
    this.drawEnemies();
    this.drawProjectiles();
    this.drawChainEffects();
    this.drawParticles();
  }

  private drawStarfield(dt: number): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#060e1e');
    grad.addColorStop(0.5, '#0a1628');
    grad.addColorStop(1, '#0f1f38');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const s of this.stars) {
      s.x += s.vx * dt * 60;
      s.y += s.vy * dt * 60;
      s.twinkle += dt * 2;
      if (s.x < 0) s.x += 1;
      if (s.x > 1) s.x -= 1;
      if (s.y < 0) s.y += 1;
      if (s.y > 1) s.y -= 1;
      const tw = 0.5 + 0.5 * Math.sin(s.twinkle);
      const alpha = s.brightness * (0.6 + 0.4 * tw);
      ctx.fillStyle = `rgba(150, 220, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x * this.width, s.y * this.height, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMapGrid(): void {
    const ctx = this.ctx;
    const { offsetX, offsetY, cellSize } = this.controller.getMapLayout();
    const w = GRID_COLS * cellSize;
    const h = GRID_ROWS * cellSize;

    ctx.save();
    const mapGrad = ctx.createLinearGradient(offsetX, offsetY, offsetX + w, offsetY + h);
    mapGrad.addColorStop(0, 'rgba(15, 40, 70, 0.7)');
    mapGrad.addColorStop(1, 'rgba(10, 30, 55, 0.7)');
    ctx.fillStyle = mapGrad;
    this.roundRect(ctx, offsetX - 6, offsetY - 6, w + 12, h + 12, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, offsetX - 6, offsetY - 6, w + 12, h + 12, 12);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + x * cellSize, offsetY);
      ctx.lineTo(offsetX + x * cellSize, offsetY + h);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + y * cellSize);
      ctx.lineTo(offsetX + w, offsetY + y * cellSize);
      ctx.stroke();
    }

    this.drawStartEnd(offsetX, offsetY, cellSize);
    ctx.restore();
  }

  private drawStartEnd(offsetX: number, offsetY: number, cellSize: number): void {
    const ctx = this.ctx;
    const startCx = offsetX + 0 * cellSize + cellSize / 2;
    const startCy = offsetY + Math.floor(GRID_ROWS / 2) * cellSize + cellSize / 2;
    const endCx = offsetX + (GRID_COLS - 1) * cellSize + cellSize / 2;
    const endCy = offsetY + Math.floor(GRID_ROWS / 2) * cellSize + cellSize / 2;

    ctx.save();
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.004);
    ctx.shadowBlur = 20 * pulse;
    ctx.shadowColor = '#00ff88';
    ctx.fillStyle = `rgba(0, 255, 136, ${0.3 * pulse})`;
    ctx.beginPath();
    ctx.arc(startCx, startCy, cellSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('入', startCx, startCy);

    ctx.shadowBlur = 20 * pulse;
    ctx.shadowColor = '#ff3366';
    ctx.fillStyle = `rgba(255, 51, 102, ${0.3 * pulse})`;
    ctx.beginPath();
    ctx.arc(endCx, endCy, cellSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ff3366';
    ctx.shadowBlur = 0;
    ctx.fillText('出', endCx, endCy);
    ctx.restore();
  }

  private drawPlacementPreview(): void {
    if (this.hoverGridX < 0 || this.hoverGridY < 0) return;
    if (this.hoverGridX >= GRID_COLS || this.hoverGridY >= GRID_ROWS) return;
    const tm = this.controller.getTowerManager();
    const selType = tm.getSelectedTowerType();
    const existing = tm.getTowerByGrid(this.hoverGridX, this.hoverGridY);
    const { offsetX, offsetY, cellSize } = this.controller.getMapLayout();
    const ctx = this.ctx;
    const cx = offsetX + this.hoverGridX * cellSize + cellSize / 2;
    const cy = offsetY + this.hoverGridY * cellSize + cellSize / 2;

    ctx.save();
    if (existing) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(offsetX + this.hoverGridX * cellSize + 2, offsetY + this.hoverGridY * cellSize + 2, cellSize - 4, cellSize - 4);
      ctx.setLineDash([]);
      const cfg = TOWER_CONFIGS[existing.type];
      ctx.strokeStyle = `${cfg.color}55`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, existing.stats.range, 0, Math.PI * 2);
      ctx.stroke();
    } else if (selType) {
      const cfg = TOWER_CONFIGS[selType];
      const em = this.controller.getEnemyManager();
      em.blockCell(this.hoverGridX, this.hoverGridY);
      const canReach = em.canReachEnd();
      em.unblockCell(this.hoverGridX, this.hoverGridY);
      em.setBlockedCells(tm.getTowers());
      const gold = this.controller.getState().gold;
      const canAfford = gold >= cfg.levels[1].cost;
      const valid = canReach && canAfford && tm.canPlaceTower(this.hoverGridX, this.hoverGridY);
      const color = valid ? cfg.color : '#ff4466';
      ctx.fillStyle = `${color}22`;
      ctx.fillRect(offsetX + this.hoverGridX * cellSize + 2, offsetY + this.hoverGridY * cellSize + 2, cellSize - 4, cellSize - 4);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(offsetX + this.hoverGridX * cellSize + 2, offsetY + this.hoverGridY * cellSize + 2, cellSize - 4, cellSize - 4);
      ctx.strokeStyle = `${color}66`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, cfg.levels[1].range, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawRangeIndicator(): void {
    const tm = this.controller.getTowerManager();
    const selId = tm.getSelectedTowerId();
    if (!selId) return;
    const tower = tm.getTower(selId);
    if (!tower) return;
    const ctx = this.ctx;
    const cfg = TOWER_CONFIGS[tower.type];
    ctx.save();
    ctx.strokeStyle = `${cfg.color}aa`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.stats.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `${cfg.color}11`;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.stats.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawTowers(): void {
    const towers = this.controller.getTowerManager().getTowers();
    for (const t of towers) {
      this.drawTower(t);
    }
  }

  private drawTower(tower: Tower): void {
    const ctx = this.ctx;
    const cfg = TOWER_CONFIGS[tower.type];
    const s = tower.animScale;
    ctx.save();
    ctx.translate(tower.x, tower.y);
    ctx.scale(s, s);

    const baseR = 16;
    const baseGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, baseR);
    baseGrad.addColorStop(0, '#2a4060');
    baseGrad.addColorStop(1, '#10203a');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(0, 0, baseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `${cfg.color}aa`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.rotate(tower.rotation);
    this.drawTowerHead(ctx, tower.type, tower.level, cfg.color);

    ctx.rotate(-tower.rotation);
    this.drawLevelBadge(ctx, tower.level, cfg.color);
    ctx.restore();
  }

  private drawTowerHead(ctx: CanvasRenderingContext2D, type: TowerType, level: number, color: string): void {
    const glow = 8 + level * 3;
    ctx.save();
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.fillStyle = color;

    switch (type) {
      case 'arrow': {
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-4, -7);
        ctx.lineTo(-4, 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(12, -1, 4, 2);
        break;
      }
      case 'cannon': {
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(-2, -8, 4, 16);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1008';
        ctx.fillRect(6, -3, 12, 6);
        break;
      }
      case 'ice': {
        for (let i = 0; i < 6; i++) {
          ctx.save();
          ctx.rotate((Math.PI * 2 * i) / 6);
          ctx.fillRect(-1, 0, 2, 12);
          ctx.restore();
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'poison': {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI * 2 * i) / 8;
          const r = i % 2 === 0 ? 11 : 7;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#003311';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'electric': {
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(6, -2);
        ctx.lineTo(1, -2);
        ctx.lineTo(4, 12);
        ctx.lineTo(-4, 2);
        ctx.lineTo(0, 2);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  private drawLevelBadge(ctx: CanvasRenderingContext2D, level: number, color: string): void {
    ctx.save();
    const spacing = 4;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < level ? color : 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(-8 + i * spacing, 14, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawEnemies(): void {
    const enemies = this.controller.getEnemyManager().getEnemies();
    for (const e of enemies) {
      this.drawEnemy(e);
    }
  }

  private drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const cfg = ENEMY_CONFIGS[enemy.type];
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    if (enemy.isFlying) {
      ctx.save();
      const wave = Math.sin(performance.now() * 0.008) * 3;
      ctx.translate(0, wave - 4);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 8 + enemy.size * 0.5, enemy.size * 0.8, enemy.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.translate(0, Math.sin(performance.now() * 0.008) * 2 - 2);
    }

    if (enemy.hitFlash > 0) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ff3333';
      ctx.fillStyle = `rgba(255, 80, 80, ${enemy.hitFlash * 4})`;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (enemy.slowFactor < 1) {
      ctx.strokeStyle = 'rgba(136, 221, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (enemy.poisonTimer > 0) {
      ctx.fillStyle = 'rgba(170, 255, 85, 0.35)';
      for (let i = 0; i < 3; i++) {
        const a = (performance.now() * 0.003 + (i * Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * enemy.size, Math.sin(a) * enemy.size, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, enemy.size);
    grad.addColorStop(0, this.lighten(cfg.color, 0.3));
    grad.addColorStop(1, this.darken(cfg.color, 0.3));
    ctx.fillStyle = grad;
    ctx.shadowBlur = 6;
    ctx.shadowColor = cfg.color;

    if (enemy.type === 'fast') {
      ctx.beginPath();
      ctx.moveTo(enemy.size, 0);
      ctx.lineTo(-enemy.size * 0.6, -enemy.size * 0.7);
      ctx.lineTo(-enemy.size * 0.3, 0);
      ctx.lineTo(-enemy.size * 0.6, enemy.size * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.type === 'armored') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6;
        ctx.lineTo(Math.cos(a) * enemy.size, Math.sin(a) * enemy.size);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (enemy.type === 'flying') {
      ctx.beginPath();
      ctx.moveTo(enemy.size, 0);
      ctx.lineTo(0, -enemy.size * 0.6);
      ctx.lineTo(-enemy.size, 0);
      ctx.lineTo(0, enemy.size * 0.6);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.type === 'boss') {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        const r = i % 2 === 0 ? enemy.size : enemy.size * 0.6;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
    this.drawHpBar(enemy);
  }

  private drawHpBar(enemy: Enemy): void {
    const ctx = this.ctx;
    const w = Math.max(24, enemy.size * 2.2);
    const h = 4;
    const x = enemy.x - w / 2;
    const y = enemy.y - enemy.size - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = 'rgba(40,40,60,0.9)';
    ctx.fillRect(x, y, w, h);
    const pct = enemy.hp / enemy.maxHp;
    const color = pct > 0.6 ? '#44ff88' : pct > 0.3 ? '#ffcc44' : '#ff4466';
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * pct, h);
  }

  private drawProjectiles(): void {
    const projs = this.controller.getTowerManager().getProjectiles();
    const ctx = this.ctx;
    for (const p of projs) {
      const cfg = TOWER_CONFIGS[p.type];
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = cfg.color;
      ctx.fillStyle = cfg.color;
      if (p.type === 'cannon') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ice') {
        ctx.translate(p.x, p.y);
        ctx.rotate(performance.now() * 0.01);
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate((Math.PI * 2 * i) / 4);
          ctx.fillRect(-1, -6, 2, 12);
          ctx.restore();
        }
      } else if (p.type === 'poison') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = cfg.color + '66';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const angle = Math.atan2(p.targetY - p.y, p.targetX - p.x);
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-4, -3);
        ctx.lineTo(-4, 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawChainEffects(): void {
    const effects = this.controller.getTowerManager().getChainEffects();
    if (effects.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 102, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffff66';
    for (let i = 0; i < effects.length - 1; i++) {
      const a = effects[i];
      const b = effects[i + 1];
      ctx.beginPath();
      const segs = 5;
      ctx.moveTo(a.x, a.y);
      for (let s = 1; s <= segs; s++) {
        const t = s / segs;
        const x = a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 8;
        const y = a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 8;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawParticles(): void {
    const particles = this.controller.getTowerManager().getParticles();
    const ctx = this.ctx;
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private lighten(hex: string, amount: number): string {
    const c = this.parseHex(hex);
    return `rgb(${Math.min(255, Math.floor(c.r + (255 - c.r) * amount))}, ${Math.min(255, Math.floor(c.g + (255 - c.g) * amount))}, ${Math.min(255, Math.floor(c.b + (255 - c.b) * amount))})`;
  }

  private darken(hex: string, amount: number): string {
    const c = this.parseHex(hex);
    return `rgb(${Math.floor(c.r * (1 - amount))}, ${Math.floor(c.g * (1 - amount))}, ${Math.floor(c.b * (1 - amount))})`;
  }

  private parseHex(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
