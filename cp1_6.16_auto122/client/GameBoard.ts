import {
  ClientGameState,
  GRID_SIZE,
  CELL_SIZE,
  BASE_SIZE,
  PlayerSide,
  TowerType,
  MonsterType,
  Tower,
  Monster,
  Particle,
  isBaseArea,
  getBaseCenter,
} from '../shared/types';

const CANVAS_PADDING = 40;
const GRID_WIDTH = GRID_SIZE * CELL_SIZE;
const GRID_HEIGHT = GRID_SIZE * CELL_SIZE;
const LERP_FACTOR = 0.1;

export class GameBoard {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: ClientGameState | null = null;
  private playerSide: PlayerSide | null = null;
  private animFrameId: number = 0;
  private lastFrameTime: number = 0;
  private onCellClick: ((gridX: number, gridY: number) => void) | null = null;
  private hoveredCell: { x: number; y: number } | null = null;

  private interpolatedMonsters: Map<string, { x: number; y: number }> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredCell = null;
    });
  }

  private resize() {
    const container = this.canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width - 20, rect.height - 120, 700);
    this.canvas.width = size;
    this.canvas.height = size;
  }

  setGameState(state: ClientGameState) {
    this.gameState = state;
  }

  setPlayerSide(side: PlayerSide) {
    this.playerSide = side;
  }

  setOnCellClick(handler: (gridX: number, gridY: number) => void) {
    this.onCellClick = handler;
  }

  start() {
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private loop() {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.updateInterpolation(delta);
    this.render();

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  private updateInterpolation(delta: number) {
    if (!this.gameState) return;

    for (const monster of this.gameState.monsters) {
      const interp = this.interpolatedMonsters.get(monster.id);
      if (interp) {
        interp.x += (monster.x - interp.x) * Math.min(LERP_FACTOR * (delta / 16.67), 1);
        interp.y += (monster.y - interp.y) * Math.min(LERP_FACTOR * (delta / 16.67), 1);
      } else {
        this.interpolatedMonsters.set(monster.id, { x: monster.x, y: monster.y });
      }
    }

    const activeMonsterIds = new Set(this.gameState.monsters.map(m => m.id));
    for (const [id] of this.interpolatedMonsters) {
      if (!activeMonsterIds.has(id)) {
        this.interpolatedMonsters.delete(id);
      }
    }
  }

  private getCellSize(): number {
    return this.canvas.width / (GRID_SIZE + CANVAS_PADDING / CELL_SIZE * 2);
  }

  private getOffset(): { ox: number; oy: number } {
    const cellSize = this.getCellSize();
    const totalSize = GRID_SIZE * cellSize;
    const ox = (this.canvas.width - totalSize) / 2;
    const oy = (this.canvas.height - totalSize) / 2;
    return { ox, oy };
  }

  private gridToCanvas(gridX: number, gridY: number): { cx: number; cy: number } {
    const cellSize = this.getCellSize();
    const { ox, oy } = this.getOffset();
    return {
      cx: ox + gridX * cellSize,
      cy: oy + gridY * cellSize,
    };
  }

  private canvasToGrid(cx: number, cy: number): { gridX: number; gridY: number } {
    const cellSize = this.getCellSize();
    const { ox, oy } = this.getOffset();
    return {
      gridX: Math.floor((cx - ox) / cellSize),
      gridY: Math.floor((cy - oy) / cellSize),
    };
  }

  private handleClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { gridX, gridY } = this.canvasToGrid(x, y);

    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
      this.onCellClick?.(gridX, gridY);
    }
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { gridX, gridY } = this.canvasToGrid(x, y);

    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
      this.hoveredCell = { x: gridX, y: gridY };
    } else {
      this.hoveredCell = null;
    }
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#0B0C10');
    gradient.addColorStop(1, '#1F2833');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    this.drawGrid();
    this.drawBases();

    if (this.gameState) {
      this.drawTowers();
      this.drawMonsters();
      this.drawParticles();
    }

    if (this.hoveredCell) {
      this.drawHoverHighlight();
    }
  }

  private drawGrid() {
    const ctx = this.ctx;
    const cellSize = this.getCellSize();
    const { ox, oy } = this.getOffset();
    const totalSize = GRID_SIZE * cellSize;

    ctx.strokeStyle = 'rgba(69, 162, 158, 0.3)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * cellSize, oy);
      ctx.lineTo(ox + i * cellSize, oy + totalSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ox, oy + i * cellSize);
      ctx.lineTo(ox + totalSize, oy + i * cellSize);
      ctx.stroke();
    }
  }

  private drawBases() {
    const ctx = this.ctx;
    const cellSize = this.getCellSize();

    for (const side of [PlayerSide.Left, PlayerSide.Right]) {
      const baseCenter = getBaseCenter(side);
      const isLeft = side === PlayerSide.Left;

      const startGridX = isLeft ? 0 : GRID_SIZE - BASE_SIZE;
      const startGridY = Math.floor((GRID_SIZE - BASE_SIZE) / 2);

      const { ox, oy } = this.getOffset();
      const bx = ox + startGridX * cellSize;
      const by = oy + startGridY * cellSize;
      const bw = BASE_SIZE * cellSize;
      const bh = BASE_SIZE * cellSize;

      const baseColor = side === PlayerSide.Left
        ? 'rgba(0, 150, 255, 0.15)'
        : 'rgba(255, 50, 50, 0.15)';
      const borderColor = side === PlayerSide.Left
        ? 'rgba(0, 150, 255, 0.5)'
        : 'rgba(255, 50, 50, 0.5)';

      ctx.fillStyle = baseColor;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = side === PlayerSide.Left ? '#4488FF' : '#FF4444';
      ctx.font = `bold ${Math.floor(cellSize * 0.35)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        side === PlayerSide.Left ? 'LEFT' : 'RIGHT',
        bx + bw / 2,
        by + bh / 2
      );
    }
  }

  private drawTowers() {
    if (!this.gameState) return;
    const ctx = this.ctx;
    const cellSize = this.getCellSize();

    for (const tower of this.gameState.towers) {
      if (tower.destroyed) {
        this.drawDestroyedTower(tower);
        continue;
      }

      const { cx, cy } = this.gridToCanvas(tower.gridX, tower.gridY);
      const centerX = cx + cellSize / 2;
      const centerY = cy + cellSize / 2;
      const size = cellSize * 0.35;

      ctx.save();

      const range = (tower.level === 2
        ? TOWER_CONFIGS[tower.type]!.range
        : TOWER_CONFIGS[tower.type]!.range) * cellSize;

      if (this.hoveredCell && this.hoveredCell.x === tower.gridX && this.hoveredCell.y === tower.gridY) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, range, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(69, 162, 158, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(69, 162, 158, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const colors: Record<TowerType, string> = {
        [TowerType.Arrow]: '#4488FF',
        [TowerType.Cannon]: '#FF4444',
        [TowerType.Freeze]: '#FFFFFF',
      };

      const color = colors[tower.type];

      if (tower.type === TowerType.Arrow) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX + size * 0.866, centerY + size * 0.5);
        ctx.lineTo(centerX - size * 0.866, centerY + size * 0.5);
        ctx.closePath();
      } else if (tower.type === TowerType.Cannon) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = centerX + size * Math.cos(angle);
          const py = centerY + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX + size, centerY);
        ctx.lineTo(centerX, centerY + size);
        ctx.lineTo(centerX - size, centerY);
        ctx.closePath();
      }

      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (tower.level === 2) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const hpRatio = tower.hp / tower.maxHp;
      const barWidth = cellSize * 0.6;
      const barHeight = 4;
      const barX = centerX - barWidth / 2;
      const barY = cy + cellSize * 0.8;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = hpRatio > 0.5 ? '#66FF66' : hpRatio > 0.25 ? '#FFAA00' : '#FF4444';
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

      ctx.restore();
    }
  }

  private drawDestroyedTower(tower: Tower) {
    const ctx = this.ctx;
    const cellSize = this.getCellSize();
    const { cx, cy } = this.gridToCanvas(tower.gridX, tower.gridY);
    const centerX = cx + cellSize / 2;
    const centerY = cy + cellSize / 2;
    const size = cellSize * 0.25;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(centerX - size, centerY - size);
    ctx.lineTo(centerX + size, centerY + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX + size, centerY - size);
    ctx.lineTo(centerX - size, centerY + size);
    ctx.stroke();

    ctx.restore();
  }

  private drawMonsters() {
    if (!this.gameState) return;
    const ctx = this.ctx;
    const cellSize = this.getCellSize();

    for (const monster of this.gameState.monsters) {
      const interp = this.interpolatedMonsters.get(monster.id);
      const mx = interp ? interp.x : monster.x;
      const my = interp ? interp.y : monster.y;

      const { ox, oy } = this.getOffset();
      const centerX = ox + mx * cellSize;
      const centerY = oy + my * cellSize;
      const radius = cellSize * 0.2;

      const colors: Record<MonsterType, string> = {
        [MonsterType.Basic]: '#888888',
        [MonsterType.Elite]: '#FF8800',
        [MonsterType.Fast]: '#44FF44',
      };

      const color = colors[monster.type];

      ctx.save();

      const glowColor = color.replace(')', ', 0.3)').replace('rgb', 'rgba');
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = color.startsWith('#')
        ? `${color}33`
        : glowColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (Date.now() < monster.slowUntil) {
        ctx.strokeStyle = '#88CCFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const hpRatio = monster.hp / monster.maxHp;
      const barWidth = cellSize * 0.4;
      const barHeight = 3;
      const barX = centerX - barWidth / 2;
      const barY = centerY - radius - 6;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = hpRatio > 0.5 ? '#66FF66' : '#FF4444';
      ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

      ctx.restore();
    }
  }

  private drawParticles() {
    if (!this.gameState) return;
    const ctx = this.ctx;
    const cellSize = this.getCellSize();
    const { ox, oy } = this.getOffset();

    for (const particle of this.gameState.particles) {
      const x = ox + particle.x * cellSize;
      const y = oy + particle.y * cellSize;
      const targetX = ox + particle.targetX * cellSize;
      const targetY = oy + particle.targetY * cellSize;

      const px = x + (targetX - x) * particle.progress;
      const py = y + (targetY - y) * particle.progress;

      ctx.save();
      ctx.globalAlpha = 1 - particle.progress;

      if (particle.type === TowerType.Arrow) {
        const angle = Math.atan2(targetY - y, targetX - x);
        const len = 12;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - Math.cos(angle) * len, py - Math.sin(angle) * len);
        ctx.lineTo(px, py);
        ctx.stroke();
      } else if (particle.type === TowerType.Cannon) {
        const r = 6 * (1 - particle.progress * 0.5);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, '#FFAA00');
        grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const size = 8 * (1 - particle.progress * 0.3);
        ctx.fillStyle = '#88CCFF';
        ctx.beginPath();
        ctx.moveTo(px, py - size);
        ctx.lineTo(px + size * 0.6, py);
        ctx.lineTo(px, py + size);
        ctx.lineTo(px - size * 0.6, py);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawHoverHighlight() {
    if (!this.hoveredCell) return;
    const ctx = this.ctx;
    const cellSize = this.getCellSize();
    const { cx, cy } = this.gridToCanvas(this.hoveredCell.x, this.hoveredCell.y);

    ctx.save();
    ctx.strokeStyle = 'rgba(69, 162, 158, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cellSize, cellSize);
    ctx.restore();
  }
}

import { TOWER_CONFIGS } from '../shared/types';
