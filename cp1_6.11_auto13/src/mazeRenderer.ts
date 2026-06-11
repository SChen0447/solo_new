import type { MazeData } from './mazeGenerator';

export interface Position {
  x: number;
  y: number;
}

export interface Crystal {
  x: number;
  y: number;
  collected: boolean;
}

export interface Chest {
  x: number;
  y: number;
  collected: boolean;
}

export interface CrackSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number;
  width: number;
  broken: boolean;
}

export interface TrailCell {
  x: number;
  y: number;
  cracks: CrackSegment[];
  seed: number;
}

export function generateIceCracks(cellX: number, cellY: number, entryDir: { x: number; y: number }): CrackSegment[] {
  const cracks: CrackSegment[] = [];
  const seed = (cellX * 127 + cellY * 211) % 10000;
  const rand = (offset: number): number => {
    const v = Math.sin(seed + offset * 37.17) * 10000;
    return v - Math.floor(v);
  };

  const centerX = 0.5 + (rand(1) - 0.5) * 0.2;
  const centerY = 0.5 + (rand(2) - 0.5) * 0.2;

  const entryBias = Math.atan2(entryDir.y, entryDir.x);
  const mainCount = 3 + Math.floor(rand(3) * 3);

  for (let m = 0; m < mainCount; m++) {
    const baseAngle = entryBias + ((m - (mainCount - 1) / 2) / mainCount) * Math.PI * 1.3 + (rand(10 + m) - 0.5) * 0.5;
    const length = 0.2 + rand(20 + m) * 0.4;

    let prevX = centerX;
    let prevY = centerY;
    const segments = 2 + Math.floor(rand(30 + m) * 2);
    for (let s = 0; s < segments; s++) {
      const t = (s + 1) / segments;
      const wobble = (rand(100 + m * 10 + s) - 0.5) * 0.15;
      const angle = baseAngle + wobble;
      const nextX = centerX + Math.cos(angle) * length * t;
      const nextY = centerY + Math.sin(angle) * length * t;

      if (nextX >= 0.05 && nextX <= 0.95 && nextY >= 0.05 && nextY <= 0.95) {
        cracks.push({
          x1: prevX,
          y1: prevY,
          x2: nextX,
          y2: nextY,
          depth: 0.9 - t * 0.5,
          width: 1.8 - t * 1.0,
          broken: rand(200 + m * 10 + s) > 0.75
        });
      }
      prevX = nextX;
      prevY = nextY;
    }

    if (length > 0.25) {
      const branchCount = 1 + Math.floor(rand(40 + m) * 2);
      for (let b = 0; b < branchCount; b++) {
        const bt = 0.3 + rand(50 + m * 5 + b) * 0.4;
        const bx = centerX + Math.cos(baseAngle) * length * bt;
        const by = centerY + Math.sin(baseAngle) * length * bt;
        const bAngle = baseAngle + (rand(60 + b) > 0.5 ? 1 : -1) * (0.4 + rand(70 + b) * 0.6);
        const bLen = 0.08 + rand(80 + b) * 0.18;

        let bpX = bx;
        let bpY = by;
        const bSegs = 1 + Math.floor(rand(90 + b) * 2);
        for (let bs = 0; bs < bSegs; bs++) {
          const bst = (bs + 1) / bSegs;
          const bWobble = (rand(150 + b * 10 + bs) - 0.5) * 0.2;
          const nx = bx + Math.cos(bAngle + bWobble) * bLen * bst;
          const ny = by + Math.sin(bAngle + bWobble) * bLen * bst;

          if (nx >= 0.05 && nx <= 0.95 && ny >= 0.05 && ny <= 0.95) {
            cracks.push({
              x1: bpX,
              y1: bpY,
              x2: nx,
              y2: ny,
              depth: (0.6 - bt * 0.3) * (1 - bst * 0.4),
              width: 1.2 - bst * 0.6,
              broken: rand(250 + b * 10 + bs) > 0.6
            });
          }
          bpX = nx;
          bpY = ny;
        }
      }
    }
  }

  const microCrackCount = 4 + Math.floor(rand(5) * 6);
  for (let mc = 0; mc < microCrackCount; mc++) {
    const sx = 0.2 + rand(300 + mc) * 0.6;
    const sy = 0.2 + rand(400 + mc) * 0.6;
    const sAngle = rand(500 + mc) * Math.PI * 2;
    const sLen = 0.03 + rand(600 + mc) * 0.08;

    cracks.push({
      x1: sx,
      y1: sy,
      x2: sx + Math.cos(sAngle) * sLen,
      y2: sy + Math.sin(sAngle) * sLen,
      depth: 0.25 + rand(700 + mc) * 0.25,
      width: 0.5,
      broken: false
    });
  }

  return cracks;
}

export interface RendererState {
  maze: MazeData;
  player: Position;
  crystals: Crystal[];
  chests: Chest[];
  trails: TrailCell[];
  portal: Position | null;
  portalActive: boolean;
  shake: { intensity: number; duration: number; elapsed: number };
  wallFlash: { duration: number; elapsed: number };
  time: number;
}

export interface Layout {
  offsetX: number;
  offsetY: number;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
}

export class MazeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layout: Layout;
  private stars: Array<{ x: number; y: number; size: number; brightness: number; twinkleSpeed: number }>;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }
    this.ctx = ctx;
    this.layout = { offsetX: 0, offsetY: 0, cellSize: 0, canvasWidth: 0, canvasHeight: 0 };
    this.stars = [];
    this.resize();
    this.generateStars();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.layout.canvasWidth = rect.width;
    this.layout.canvasHeight = rect.height;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  private generateStars(): void {
    this.stars = [];
    const count = 150;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.8 + 0.4,
        brightness: Math.random() * 0.6 + 0.4,
        twinkleSpeed: Math.random() * 2 + 1
      });
    }
  }

  public computeLayout(maze: MazeData): Layout {
    const topBarHeight = 70;
    const padding = 40;
    const availableWidth = this.layout.canvasWidth - padding * 2;
    const availableHeight = this.layout.canvasHeight - topBarHeight - padding * 2;

    const cellByWidth = Math.floor(availableWidth / maze.size);
    const cellByHeight = Math.floor(availableHeight / maze.size);
    const cellSize = Math.min(cellByWidth, cellByHeight);

    const mazePixelWidth = cellSize * maze.size;
    const mazePixelHeight = cellSize * maze.size;

    this.layout.cellSize = cellSize;
    this.layout.offsetX = (this.layout.canvasWidth - mazePixelWidth) / 2;
    this.layout.offsetY = topBarHeight + (availableHeight - mazePixelHeight) / 2;

    return this.layout;
  }

  public worldToGrid(wx: number, wy: number): Position {
    return {
      x: Math.floor((wx - this.layout.offsetX) / this.layout.cellSize),
      y: Math.floor((wy - this.layout.offsetY) / this.layout.cellSize)
    };
  }

  public gridToWorld(gx: number, gy: number, center = true): Position {
    const s = this.layout.cellSize;
    return {
      x: this.layout.offsetX + gx * s + (center ? s / 2 : 0),
      y: this.layout.offsetY + gy * s + (center ? s / 2 : 0)
    };
  }

  public render(state: RendererState): void {
    const ctx = this.ctx;

    let shakeX = 0;
    let shakeY = 0;
    if (state.shake.elapsed < state.shake.duration) {
      const t = state.shake.elapsed / state.shake.duration;
      const magnitude = state.shake.intensity * (1 - t);
      shakeX = (Math.random() - 0.5) * magnitude * 2;
      shakeY = (Math.random() - 0.5) * magnitude * 2;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.drawBackground(state.time);
    this.computeLayout(state.maze);
    this.drawMazeWalls(state.maze);
    this.drawTrails(state.trails);
    this.drawPathHighlight(state.trails);
    this.drawCrystals(state.crystals, state.time);
    this.drawChests(state.chests, state.time);
    if (state.portal && state.portalActive) {
      this.drawPortal(state.portal, state.time);
    }
    this.drawPlayer(state.player, state.time);

    if (state.wallFlash.elapsed < state.wallFlash.duration) {
      const t = 1 - state.wallFlash.elapsed / state.wallFlash.duration;
      this.drawWallFlash(t);
    }

    ctx.restore();
  }

  private drawBackground(time: number): void {
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight } = this.layout;

    const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    gradient.addColorStop(0, '#0b0f19');
    gradient.addColorStop(1, '#1a237e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    for (const star of this.stars) {
      const twinkle = 0.6 + 0.4 * Math.sin(time * star.twinkleSpeed * 0.003 + star.x * 10);
      const alpha = star.brightness * twinkle;

      const sx = star.x * canvasWidth;
      const sy = star.y * canvasHeight;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#e0f7fa';
      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = '#a8d8ea';
      ctx.shadowBlur = star.size * 3;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawMazeWalls(maze: MazeData): void {
    const { offsetX, offsetY, cellSize } = this.layout;

    for (let y = 0; y < maze.size; y++) {
      for (let x = 0; x < maze.size; x++) {
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;

        if (maze.grid[y][x] === 1) {
          this.drawIceWall(px, py, cellSize, x, y);
        } else {
          this.drawIceFloor(px, py, cellSize, x, y);
        }
      }
    }
  }

  private drawIceWall(px: number, py: number, size: number, gx: number, gy: number): void {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
    gradient.addColorStop(0, 'rgba(120, 180, 220, 0.75)');
    gradient.addColorStop(0.5, 'rgba(168, 216, 234, 0.6)');
    gradient.addColorStop(1, 'rgba(90, 150, 200, 0.8)');

    ctx.fillStyle = gradient;
    ctx.fillRect(px, py, size, size);

    ctx.strokeStyle = 'rgba(200, 230, 250, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);

    const seed = (gx * 73 + gy * 131) % 100;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, size, size);
    ctx.clip();

    ctx.strokeStyle = 'rgba(224, 247, 250, 0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const sx = px + (seed + i * 29) % size;
      const sy = py + (seed * 2 + i * 41) % size;
      const ex = sx + ((seed * 3 + i * 17) % (size / 2)) - size / 4;
      const ey = sy + ((seed * 5 + i * 23) % (size / 2)) - size / 4;
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const cx = px + size / 2 + Math.sin(seed) * size * 0.2;
    const cy = py + size / 2 + Math.cos(seed) * size * 0.2;
    const branches = 3 + (seed % 2);
    for (let i = 0; i < branches; i++) {
      const angle = (i / branches) * Math.PI * 2 + seed * 0.1;
      const len = size * 0.3;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    }
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.3;
    const innerGradient = ctx.createRadialGradient(
      px + size * 0.3, py + size * 0.3, 0,
      px + size * 0.3, py + size * 0.3, size * 0.6
    );
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = innerGradient;
    ctx.fillRect(px, py, size, size);
    ctx.restore();
  }

  private drawIceFloor(px: number, py: number, size: number, gx: number, gy: number): void {
    const ctx = this.ctx;

    const gradient = ctx.createRadialGradient(
      px + size / 2, py + size / 2, 0,
      px + size / 2, py + size / 2, size
    );
    gradient.addColorStop(0, 'rgba(30, 60, 110, 0.4)');
    gradient.addColorStop(1, 'rgba(20, 40, 80, 0.55)');

    ctx.fillStyle = gradient;
    ctx.fillRect(px, py, size, size);

    const seed = (gx * 53 + gy * 97) % 100;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#a8d8ea';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(px + (seed * 7) % size, py);
    ctx.lineTo(px + ((seed * 11) % size), py + size);
    ctx.stroke();
    ctx.restore();
  }

  private drawTrails(trails: TrailCell[]): void {
    const ctx = this.ctx;
    const { cellSize } = this.layout;

    for (const trail of trails) {
      const { x, y } = this.gridToWorld(trail.x, trail.y, false);

      ctx.save();
      const cellGrad = ctx.createRadialGradient(
        x + cellSize / 2, y + cellSize / 2, cellSize * 0.1,
        x + cellSize / 2, y + cellSize / 2, cellSize * 0.7
      );
      cellGrad.addColorStop(0, 'rgba(79, 195, 247, 0.22)');
      cellGrad.addColorStop(1, 'rgba(79, 195, 247, 0)');
      ctx.fillStyle = cellGrad;
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.restore();

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const crack of trail.cracks) {
        const cx1 = x + crack.x1 * cellSize;
        const cy1 = y + crack.y1 * cellSize;
        const cx2 = x + crack.x2 * cellSize;
        const cy2 = y + crack.y2 * cellSize;

        ctx.lineWidth = crack.width;
        ctx.globalAlpha = crack.depth * 0.85;
        ctx.strokeStyle = 'rgba(224, 247, 250, 0.9)';
        ctx.shadowColor = 'rgba(168, 216, 234, 0.8)';
        ctx.shadowBlur = crack.width * 2;

        ctx.beginPath();
        ctx.moveTo(cx1, cy1);

        if (crack.broken) {
          const steps = 3;
          let lastX = cx1;
          let lastY = cy1;
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const gapChance = (crack.x1 + crack.y1 + t) * 17.3;
            const shouldGap = Math.abs(Math.sin(gapChance)) > 0.82 && i < steps;
            if (shouldGap) {
              ctx.stroke();
              ctx.beginPath();
              const gapT = t + 0.05;
              lastX = cx1 + (cx2 - cx1) * gapT + (Math.sin(t * 12 + crack.x1 * 50) - 0.5) * 3;
              lastY = cy1 + (cy2 - cy1) * gapT + (Math.cos(t * 10 + crack.y1 * 50) - 0.5) * 3;
              ctx.moveTo(lastX, lastY);
            } else {
              const mx = cx1 + (cx2 - cx1) * t + (Math.sin(t * 12 + crack.x1 * 80) - 0.5) * 3.5;
              const my = cy1 + (cy2 - cy1) * t + (Math.cos(t * 10 + crack.y1 * 80) - 0.5) * 3.5;
              ctx.lineTo(mx, my);
            }
          }
          ctx.stroke();
        } else {
          const steps = 4;
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const mx = cx1 + (cx2 - cx1) * t + (Math.sin(t * 12 + crack.x1 * 80) - 0.5) * 3.5;
            const my = cy1 + (cy2 - cy1) * t + (Math.cos(t * 10 + crack.y1 * 80) - 0.5) * 3.5;
            ctx.lineTo(mx, my);
          }
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;
      ctx.restore();

      ctx.save();
      for (const crack of trail.cracks) {
        if (crack.width < 1.2) continue;
        const cx1 = x + crack.x1 * cellSize;
        const cy1 = y + crack.y1 * cellSize;
        const cx2 = x + crack.x2 * cellSize;
        const cy2 = y + crack.y2 * cellSize;

        ctx.lineWidth = crack.width * 0.35;
        ctx.globalAlpha = crack.depth * 0.55;
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.8)';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        const steps = 3;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const mx = cx1 + (cx2 - cx1) * t + (Math.sin(t * 12 + crack.x1 * 80) - 0.5) * 2.5;
          const my = cy1 + (cy2 - cy1) * t + (Math.cos(t * 10 + crack.y1 * 80) - 0.5) * 2.5;
          ctx.lineTo(mx, my);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawPathHighlight(trails: TrailCell[]): void {
    if (trails.length < 2) return;

    const ctx = this.ctx;
    const { cellSize } = this.layout;

    ctx.save();
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.3)';
    ctx.lineWidth = Math.max(4, cellSize * 0.2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const first = this.gridToWorld(trails[0].x, trails[0].y, true);
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < trails.length; i++) {
      const p = this.gridToWorld(trails[i].x, trails[i].y, true);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(129, 212, 250, 0.5)';
    ctx.lineWidth = Math.max(2, cellSize * 0.08);
    ctx.stroke();

    ctx.restore();
  }

  private drawCrystals(crystals: Crystal[], time: number): void {
    const ctx = this.ctx;
    const { cellSize } = this.layout;

    for (const crystal of crystals) {
      if (crystal.collected) continue;

      const { x, y } = this.gridToWorld(crystal.x, crystal.y, true);
      const pulse = 1 + 0.15 * Math.sin(time * 0.004);
      const bob = Math.sin(time * 0.003) * 3;

      const s = cellSize * 0.32 * pulse;
      const cy = y + bob;

      ctx.save();
      ctx.shadowColor = '#4fc3f7';
      ctx.shadowBlur = 25;

      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.moveTo(x, cy - s);
      ctx.lineTo(x + s * 0.65, cy - s * 0.2);
      ctx.lineTo(x + s * 0.5, cy + s);
      ctx.lineTo(x - s * 0.5, cy + s);
      ctx.lineTo(x - s * 0.65, cy - s * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(224, 247, 250, 0.9)';
      ctx.beginPath();
      ctx.moveTo(x, cy - s);
      ctx.lineTo(x + s * 0.2, cy - s * 0.4);
      ctx.lineTo(x - s * 0.1, cy - s * 0.1);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#81d4fa';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, cy - s);
      ctx.lineTo(x, cy + s);
      ctx.moveTo(x + s * 0.65, cy - s * 0.2);
      ctx.lineTo(x - s * 0.5, cy + s);
      ctx.moveTo(x - s * 0.65, cy - s * 0.2);
      ctx.lineTo(x + s * 0.5, cy + s);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawChests(chests: Chest[], time: number): void {
    const ctx = this.ctx;
    const { cellSize } = this.layout;

    for (const chest of chests) {
      if (chest.collected) continue;

      const { x, y } = this.gridToWorld(chest.x, chest.y, true);
      const pulse = 1 + 0.1 * Math.sin(time * 0.0035);
      const glow = 0.5 + 0.5 * Math.sin(time * 0.0025);

      const w = cellSize * 0.65 * pulse;
      const h = cellSize * 0.5 * pulse;

      ctx.save();
      ctx.shadowColor = '#ffd54f';
      ctx.shadowBlur = 20 + glow * 15;

      ctx.fillStyle = '#ffd54f';
      this.roundRect(ctx, x - w / 2, y - h / 2 + h * 0.3, w, h * 0.7, 4);
      ctx.fill();

      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y - h / 2 + h * 0.3);
      ctx.lineTo(x - w / 2 + w * 0.08, y - h / 2 + h * 0.1);
      ctx.quadraticCurveTo(x, y - h / 2 - h * 0.05, x + w / 2 - w * 0.08, y - h / 2 + h * 0.1);
      ctx.lineTo(x + w / 2, y - h / 2 + h * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff8e1';
      ctx.fillRect(x - w * 0.03, y - h * 0.15, w * 0.06, h * 0.35);
      ctx.fillStyle = '#ff8f00';
      ctx.fillRect(x - w * 0.08, y - h * 0.05, w * 0.16, h * 0.15);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - w / 2 + 2, y - h / 2 + h * 0.3 + 2, w - 4, h * 0.4);

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawPortal(portal: Position, time: number): void {
    const ctx = this.ctx;
    const { cellSize } = this.layout;
    const { x, y } = this.gridToWorld(portal.x, portal.y, true);

    const baseR = cellSize * 0.44;
    const breathPulse = 1 + 0.18 * Math.sin(time * 0.005);
    const blink = 0.55 + 0.45 * (Math.sin(time * 0.012) * 0.5 + 0.5);
    const swirl = time * 0.003;
    const ringPhase = (time * 0.0015) % 1;

    ctx.save();
    ctx.shadowColor = '#ce93d8';
    ctx.shadowBlur = (30 + 20 * blink) * breathPulse;

    for (let layer = 4; layer >= 1; layer--) {
      const lr = baseR * (layer / 4) * breathPulse * blink;
      const alpha = (0.12 + layer * 0.07) * blink;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, lr);
      gradient.addColorStop(0, `rgba(225, 190, 231, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(186, 104, 200, ${alpha * 0.75})`);
      gradient.addColorStop(0.75, `rgba(103, 58, 183, ${alpha * 0.4})`);
      gradient.addColorStop(1, 'rgba(49, 27, 146, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, lr, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let ring = 0; ring < 3; ring++) {
      const ringT = (ringPhase + ring / 3) % 1;
      const ringR = baseR * (0.4 + ringT * 0.9) * breathPulse;
      const ringAlpha = (1 - ringT) * 0.6 * blink;
      const ringWidth = 2 + ringT * 3;

      ctx.strokeStyle = `rgba(206, 147, 216, ${ringAlpha})`;
      ctx.lineWidth = ringWidth;
      ctx.shadowColor = '#e1bee7';
      ctx.shadowBlur = 12 * (1 - ringT);
      ctx.beginPath();
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    const swirlR = baseR * 0.8 * breathPulse * blink;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * blink})`;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const angle = swirl + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(x, y, swirlR, angle, angle + Math.PI * 0.7);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(186, 104, 200, ${0.5 * blink})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      const angle = -swirl * 1.5 + (i * Math.PI * 2) / 2 + 0.3;
      ctx.beginPath();
      ctx.arc(x, y, swirlR * 0.55, angle, angle + Math.PI * 0.9);
      ctx.stroke();
    }

    const coreSize = baseR * 0.22 * breathPulse * blink;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 25 * blink;
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, coreSize);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${blink})`);
    coreGrad.addColorStop(0.5, `rgba(225, 190, 231, ${0.8 * blink})`);
    coreGrad.addColorStop(1, `rgba(186, 104, 200, 0)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(x, y, coreSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * blink})`;
    ctx.font = `bold ${Math.floor(cellSize * 0.22 * breathPulse)}px Iceberg, "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⤴', x, y);

    ctx.restore();
  }

  private drawPlayer(player: Position, time: number): void {
    const ctx = this.ctx;
    const { cellSize } = this.layout;
    const { x, y } = this.gridToWorld(player.x, player.y, true);

    const s = cellSize * 0.35;
    const bob = Math.sin(time * 0.006) * 2;
    const cy = y + bob;

    ctx.save();
    ctx.shadowColor = '#e0f7fa';
    ctx.shadowBlur = 20;

    const auraGradient = ctx.createRadialGradient(x, cy, 0, x, cy, s * 2);
    auraGradient.addColorStop(0, 'rgba(224, 247, 250, 0.3)');
    auraGradient.addColorStop(1, 'rgba(168, 216, 234, 0)');
    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(x, cy, s * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e0f7fa';
    ctx.beginPath();
    ctx.moveTo(x, cy - s);
    ctx.lineTo(x + s * 0.55, cy - s * 0.35);
    ctx.lineTo(x + s * 0.45, cy - s * 0.05);
    ctx.lineTo(x + s * 0.6, cy + s * 0.8);
    ctx.lineTo(x + s * 0.15, cy + s * 0.6);
    ctx.lineTo(x, cy + s * 0.85);
    ctx.lineTo(x - s * 0.15, cy + s * 0.6);
    ctx.lineTo(x - s * 0.6, cy + s * 0.8);
    ctx.lineTo(x - s * 0.45, cy - s * 0.05);
    ctx.lineTo(x - s * 0.55, cy - s * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(168, 216, 234, 0.7)';
    ctx.beginPath();
    ctx.moveTo(x, cy - s);
    ctx.lineTo(x - s * 0.2, cy - s * 0.2);
    ctx.lineTo(x, cy + s * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#4fc3f7';
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x - s * 0.18, cy - s * 0.45, s * 0.08, 0, Math.PI * 2);
    ctx.arc(x + s * 0.18, cy - s * 0.45, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawWallFlash(intensity: number): void {
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight } = this.layout;

    ctx.save();
    const gradient = ctx.createRadialGradient(
      canvasWidth / 2, canvasHeight / 2, Math.min(canvasWidth, canvasHeight) * 0.3,
      canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) * 0.7
    );
    gradient.addColorStop(0, `rgba(239, 83, 80, 0)`);
    gradient.addColorStop(0.7, `rgba(239, 83, 80, ${0.35 * intensity})`);
    gradient.addColorStop(1, `rgba(239, 83, 80, ${0.7 * intensity})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
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
