
import type { Enemy, EnemyType, Tower } from '../shared/types';
import { ENEMY_CONFIGS, GRID_COLS, GRID_ROWS } from '../shared/types';
import { eventBus } from '../shared/EventBus';

interface GridNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: GridNode | null;
}

export class EnemyManager {
  private enemies: Map<string, Enemy> = new Map();
  private grid: boolean[][] = [];
  private startX: number = 0;
  private startY: number = 0;
  private endX: number = 0;
  private endY: number = 0;
  private cellSize: number = 40;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private enemyIdCounter: number = 0;

  constructor() {
    this.initGrid();
  }

  private initGrid(): void {
    this.grid = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        this.grid[y][x] = true;
      }
    }
    this.startX = 0;
    this.startY = Math.floor(GRID_ROWS / 2);
    this.endX = GRID_COLS - 1;
    this.endY = Math.floor(GRID_ROWS / 2);
  }

  setMapDimensions(offsetX: number, offsetY: number, cellSize: number): void {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.cellSize = cellSize;
  }

  blockCell(gridX: number, gridY: number): void {
    if (gridY >= 0 && gridY < GRID_ROWS && gridX >= 0 && gridX < GRID_COLS) {
      this.grid[gridY][gridX] = false;
      this.recomputeAllPaths();
    }
  }

  unblockCell(gridX: number, gridY: number): void {
    if (gridY >= 0 && gridY < GRID_ROWS && gridX >= 0 && gridX < GRID_COLS) {
      this.grid[gridY][gridX] = true;
    }
  }

  setBlockedCells(towers: Tower[]): void {
    this.initGrid();
    for (const t of towers) {
      if (t.gridY >= 0 && t.gridY < GRID_ROWS && t.gridX >= 0 && t.gridX < GRID_COLS) {
        this.grid[t.gridY][t.gridX] = false;
      }
    }
  }

  canReachEnd(): boolean {
    const path = this.astar(this.startX, this.startY, this.endX, this.endY);
    return path !== null && path.length > 0;
  }

  private astar(sx: number, sy: number, ex: number, ey: number, ignoreBlocks: boolean = false): { x: number; y: number }[] | null {
    if (sx < 0 || sx >= GRID_COLS || sy < 0 || sy >= GRID_ROWS) return null;
    if (ex < 0 || ex >= GRID_COLS || ey < 0 || ey >= GRID_ROWS) return null;

    const open: GridNode[] = [];
    const closed: Set<string> = new Set();
    const nodeMap: Map<string, GridNode> = new Map();

    const start: GridNode = { x: sx, y: sy, g: 0, h: 0, f: 0, parent: null };
    start.h = Math.abs(ex - sx) + Math.abs(ey - sy);
    start.f = start.h;
    open.push(start);
    nodeMap.set(`${sx},${sy}`, start);

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];

    while (open.length > 0) {
      let minIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[minIdx].f) minIdx = i;
      }
      const current = open.splice(minIdx, 1)[0];
      const curKey = `${current.x},${current.y}`;

      if (current.x === ex && current.y === ey) {
        const path: { x: number; y: number }[] = [];
        let n: GridNode | null = current;
        while (n) {
          path.unshift({ x: n.x, y: n.y });
          n = n.parent;
        }
        return path;
      }

      closed.add(curKey);

      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        const nkey = `${nx},${ny}`;
        if (closed.has(nkey)) continue;
        if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue;
        if (!ignoreBlocks && !this.grid[ny][nx]) continue;

        const tentativeG = current.g + 1;
        let neighbor = nodeMap.get(nkey);
        if (!neighbor) {
          neighbor = { x: nx, y: ny, g: Infinity, h: 0, f: 0, parent: null };
          nodeMap.set(nkey, neighbor);
          open.push(neighbor);
        }
        if (tentativeG < neighbor.g) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.h = Math.abs(ex - nx) + Math.abs(ey - ny);
          neighbor.f = neighbor.g + neighbor.h;
        }
      }
    }
    return null;
  }

  findPath(isFlying: boolean = false): { x: number; y: number }[] {
    const path = this.astar(this.startX, this.startY, this.endX, this.endY, isFlying);
    if (!path) return [];
    return path.map((p) => ({
      x: this.offsetX + p.x * this.cellSize + this.cellSize / 2,
      y: this.offsetY + p.y * this.cellSize + this.cellSize / 2,
    }));
  }

  recomputeAllPaths(): void {
    for (const enemy of this.enemies.values()) {
      if (enemy.isFlying) continue;
      const curGridX = Math.floor((enemy.x - this.offsetX) / this.cellSize);
      const curGridY = Math.floor((enemy.y - this.offsetY) / this.cellSize);
      const gx = Math.max(0, Math.min(GRID_COLS - 1, curGridX));
      const gy = Math.max(0, Math.min(GRID_ROWS - 1, curGridY));
      const path = this.astarFrom(gx, gy, this.endX, this.endY);
      if (path && path.length > 0) {
        enemy.path = path.map((p) => ({
          x: this.offsetX + p.x * this.cellSize + this.cellSize / 2,
          y: this.offsetY + p.y * this.cellSize + this.cellSize / 2,
        }));
        enemy.pathIndex = 0;
      }
    }
  }

  private astarFrom(sx: number, sy: number, ex: number, ey: number): { x: number; y: number }[] | null {
    const temp = this.grid[sy]?.[sx];
    if (temp === false) this.grid[sy][sx] = true;
    const result = this.astar(sx, sy, ex, ey, false);
    if (temp === false) this.grid[sy][sx] = temp;
    return result;
  }

  spawnEnemy(type: EnemyType, wave: number): Enemy | null {
    const cfg = ENEMY_CONFIGS[type];
    const waveMult = 1 + (wave - 1) * 0.12;
    const path = this.findPath(cfg.isFlying);
    if (path.length === 0 && !cfg.isFlying) return null;

    this.enemyIdCounter++;
    const id = `e_${this.enemyIdCounter}`;
    const startPos = path.length > 0 ? path[0] : { x: this.offsetX, y: this.offsetY + (GRID_ROWS / 2) * this.cellSize };
    const enemy: Enemy = {
      id,
      type,
      hp: Math.floor(cfg.hp * waveMult),
      maxHp: Math.floor(cfg.hp * waveMult),
      speed: cfg.speed,
      baseSpeed: cfg.speed,
      reward: cfg.reward,
      x: startPos.x,
      y: startPos.y,
      pathIndex: 0,
      path,
      slowTimer: 0,
      slowFactor: 1,
      poisonTimer: 0,
      poisonDps: 0,
      hitFlash: 0,
      isFlying: cfg.isFlying,
      armor: cfg.armor,
      size: cfg.size,
    };
    this.enemies.set(id, enemy);
    return enemy;
  }

  update(dt: number, damageEnemy: (enemyId: string, damage: number) => void): { reachedEnd: Enemy[]; killed: Enemy[] } {
    const reachedEnd: Enemy[] = [];
    const killed: Enemy[] = [];

    for (const enemy of this.enemies.values()) {
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        if (enemy.slowTimer <= 0) {
          enemy.slowFactor = 1;
        }
      }
      if (enemy.poisonTimer > 0) {
        enemy.poisonTimer -= dt;
        enemy.hp -= enemy.poisonDps * dt;
        if (enemy.hp <= 0) {
          enemy.hp = 0;
        }
      }
      if (enemy.hitFlash > 0) {
        enemy.hitFlash -= dt;
      }

      if (enemy.hp <= 0) {
        killed.push(enemy);
        this.enemies.delete(enemy.id);
        eventBus.emit('Core:EnemyKilled', { enemy, goldReward: enemy.reward });
        continue;
      }

      if (enemy.path.length === 0) {
        reachedEnd.push(enemy);
        this.enemies.delete(enemy.id);
        continue;
      }

      const currentSpeed = enemy.baseSpeed * enemy.slowFactor;
      let remaining = currentSpeed * dt;

      while (remaining > 0 && enemy.pathIndex < enemy.path.length - 1) {
        const nextPt = enemy.path[enemy.pathIndex + 1];
        const dx = nextPt.x - enemy.x;
        const dy = nextPt.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= remaining) {
          enemy.x = nextPt.x;
          enemy.y = nextPt.y;
          enemy.pathIndex++;
          remaining -= dist;
        } else {
          enemy.x += (dx / dist) * remaining;
          enemy.y += (dy / dist) * remaining;
          remaining = 0;
        }
      }

      if (enemy.pathIndex >= enemy.path.length - 1) {
        const last = enemy.path[enemy.path.length - 1];
        if (last && Math.hypot(enemy.x - last.x, enemy.y - last.y) < 2) {
          reachedEnd.push(enemy);
          this.enemies.delete(enemy.id);
        }
      }
    }

    return { reachedEnd, killed };
  }

  applyDamage(enemyId: string, damage: number): number {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) return 0;
    const realDmg = damage * (1 - enemy.armor);
    enemy.hp -= realDmg;
    enemy.hitFlash = 0.15;
    if (enemy.hp <= 0) {
      this.enemies.delete(enemyId);
      eventBus.emit('Core:EnemyKilled', { enemy, goldReward: enemy.reward });
    }
    return realDmg;
  }

  applySlow(enemyId: string, percent: number, duration: number): void {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) return;
    const factor = 1 - percent;
    if (factor < enemy.slowFactor || enemy.slowTimer <= 0) {
      enemy.slowFactor = factor;
    }
    enemy.slowTimer = Math.max(enemy.slowTimer, duration);
  }

  applyPoison(enemyId: string, dps: number, duration: number): void {
    const enemy = this.enemies.get(enemyId);
    if (!enemy) return;
    enemy.poisonDps = Math.max(enemy.poisonDps, dps);
    enemy.poisonTimer = Math.max(enemy.poisonTimer, duration);
  }

  getEnemy(id: string): Enemy | undefined {
    return this.enemies.get(id);
  }

  getEnemies(): Enemy[] {
    return Array.from(this.enemies.values());
  }

  clearEnemies(): void {
    this.enemies.clear();
  }

  getEnemyCount(): number {
    return this.enemies.size;
  }

  getStartWorldPos(): { x: number; y: number } {
    return {
      x: this.offsetX + this.startX * this.cellSize + this.cellSize / 2,
      y: this.offsetY + this.startY * this.cellSize + this.cellSize / 2,
    };
  }

  getEndWorldPos(): { x: number; y: number } {
    return {
      x: this.offsetX + this.endX * this.cellSize + this.cellSize / 2,
      y: this.offsetY + this.endY * this.cellSize + this.cellSize / 2,
    };
  }
}
