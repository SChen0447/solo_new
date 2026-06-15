import { eventBus } from './EventBus';

export const GRID_SIZE = 21;
export const TILE_SIZE = 28;

export type Direction = 'top' | 'right' | 'bottom' | 'left';

export interface Tile {
  type: string;
  rotation: number;
  connections: Record<Direction, boolean>;
  color: string;
  weight: number;
}

export interface Cell {
  collapsed: boolean;
  options: Tile[];
  tile: Tile | null;
  row: number;
  col: number;
}

const OPPOSITE: Record<Direction, Direction> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const DIRECTIONS: Direction[] = ['top', 'right', 'bottom', 'left'];

function createWallTile(): Tile {
  return {
    type: 'wall',
    rotation: 0,
    connections: {
      top: false,
      right: false,
      bottom: false,
      left: false,
    },
    color: '#2a2f4c',
    weight: 3,
  };
}

function createStraightTile(rotation: number): Tile {
  const horizontal = rotation % 2 === 0;
  return {
    type: 'straight',
    rotation,
    connections: {
      top: !horizontal,
      right: horizontal,
      bottom: !horizontal,
      left: horizontal,
    },
    color: '#3a3f5c',
    weight: 2,
  };
}

function createTTile(rotation: number): Tile {
  const connections: Record<Direction, boolean> = {
    top: false,
    right: false,
    bottom: false,
    left: false,
  };
  const missingDir = DIRECTIONS[rotation % 4];
  for (const dir of DIRECTIONS) {
    connections[dir] = dir !== missingDir;
  }
  return {
    type: 't-junction',
    rotation,
    connections,
    color: '#3a3f5c',
    weight: 2,
  };
}

function createCornerTile(rotation: number): Tile {
  const connections: Record<Direction, boolean> = {
    top: false,
    right: false,
    bottom: false,
    left: false,
  };
  const dir1 = DIRECTIONS[rotation % 4];
  const dir2 = DIRECTIONS[(rotation + 1) % 4];
  connections[dir1] = true;
  connections[dir2] = true;
  return {
    type: 'corner',
    rotation,
    connections,
    color: '#3a3f5c',
    weight: 2,
  };
}

function createCrossTile(): Tile {
  return {
    type: 'cross',
    rotation: 0,
    connections: {
      top: true,
      right: true,
      bottom: true,
      left: true,
    },
    color: '#3a3f5c',
    weight: 1,
  };
}

function createDeadEndTile(rotation: number): Tile {
  const connections: Record<Direction, boolean> = {
    top: false,
    right: false,
    bottom: false,
    left: false,
  };
  connections[DIRECTIONS[rotation % 4]] = true;
  return {
    type: 'dead-end',
    rotation,
    connections,
    color: '#3a3f5c',
    weight: 1,
  };
}

export function getAllTiles(): Tile[] {
  const tiles: Tile[] = [];
  tiles.push(createWallTile());
  for (let i = 0; i < 2; i++) {
    tiles.push(createStraightTile(i));
  }
  for (let i = 0; i < 4; i++) {
    tiles.push(createTTile(i));
  }
  for (let i = 0; i < 4; i++) {
    tiles.push(createCornerTile(i));
  }
  for (let i = 0; i < 4; i++) {
    tiles.push(createDeadEndTile(i));
  }
  tiles.push(createCrossTile());
  return tiles;
}

function getNeighbor(row: number, col: number, dir: Direction): { row: number; col: number } | null {
  switch (dir) {
    case 'top':
      return row > 0 ? { row: row - 1, col } : null;
    case 'bottom':
      return row < GRID_SIZE - 1 ? { row: row + 1, col } : null;
    case 'left':
      return col > 0 ? { row, col: col - 1 } : null;
    case 'right':
      return col < GRID_SIZE - 1 ? { row, col: col + 1 } : null;
  }
}

function isWalkable(tile: Tile | null): boolean {
  if (!tile) return false;
  return tile.type !== 'wall';
}

function getEntropy(cell: Cell): number {
  return cell.options.length;
}

function weightedRandomSelect(tiles: Tile[]): Tile {
  const totalWeight = tiles.reduce((sum, t) => sum + t.weight, 0);
  let random = Math.random() * totalWeight;
  for (const tile of tiles) {
    random -= tile.weight;
    if (random <= 0) return tile;
  }
  return tiles[tiles.length - 1];
}

export class MazeEngine {
  private grid: Cell[][] = [];
  private allTiles: Tile[] = getAllTiles();
  private animationRow: number = -1;
  private fadeProgress: number = 0;
  private generating: boolean = false;

  constructor() {
    this.initGrid();
  }

  private initGrid(): void {
    this.grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        rowCells.push({
          collapsed: false,
          options: [...this.allTiles],
          tile: null,
          row,
          col,
        });
      }
      this.grid.push(rowCells);
    }
    this.applyBoundaryConstraints();
  }

  private applyBoundaryConstraints(): void {
    for (let col = 0; col < GRID_SIZE; col++) {
      this.grid[0][col].options = this.grid[0][col].options.filter(
        (t) => !t.connections.top
      );
      this.grid[GRID_SIZE - 1][col].options = this.grid[GRID_SIZE - 1][col].options.filter(
        (t) => !t.connections.bottom
      );
    }
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grid[row][0].options = this.grid[row][0].options.filter(
        (t) => !t.connections.left
      );
      this.grid[row][GRID_SIZE - 1].options = this.grid[row][GRID_SIZE - 1].options.filter(
        (t) => !t.connections.right
      );
    }
  }

  generate(): void {
    let success = false;
    let attempts = 0;
    while (!success && attempts < 10) {
      this.initGrid();
      success = this.runWFC();
      attempts++;
    }
    if (!success) {
      this.generateFallbackMaze();
    }
    this.addColorVariation();
    this.generating = true;
    this.animationRow = -1;
    this.fadeProgress = 0;
    this.startGenerationAnimation();
  }

  private generateFallbackMaze(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.grid[row][col];
        if (row === 0 || row === GRID_SIZE - 1 || col === 0 || col === GRID_SIZE - 1) {
          cell.tile = createWallTile();
          cell.collapsed = true;
          cell.options = [cell.tile];
        } else if (row % 2 === 1 && col % 2 === 1) {
          cell.tile = createCrossTile();
          cell.collapsed = true;
          cell.options = [cell.tile];
        } else {
          cell.tile = createStraightTile(row % 2 === 0 ? 0 : 1);
          cell.collapsed = true;
          cell.options = [cell.tile];
        }
      }
    }
  }

  private runWFC(): boolean {
    while (!this.isFullyCollapsed()) {
      const cell = this.getLowestEntropyCell();
      if (!cell) break;
      if (cell.options.length === 0) return false;
      if (!this.collapseCell(cell)) return false;
      if (!this.propagate(cell)) return false;
    }
    return true;
  }

  private isFullyCollapsed(): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!this.grid[row][col].collapsed) return false;
      }
    }
    return true;
  }

  private getLowestEntropyCell(): Cell | null {
    let minEntropy = Infinity;
    let cell: Cell | null = null;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const c = this.grid[row][col];
        if (!c.collapsed && c.options.length < minEntropy && c.options.length > 0) {
          minEntropy = c.options.length;
          cell = c;
        }
      }
    }
    return cell;
  }

  private collapseCell(cell: Cell): boolean {
    if (cell.options.length === 0) return false;
    const tile = weightedRandomSelect(cell.options);
    cell.tile = tile;
    cell.collapsed = true;
    cell.options = [tile];
    return true;
  }

  private propagate(startCell: Cell): boolean {
    const stack: Cell[] = [startCell];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const cell = stack.pop()!;
      const key = `${cell.row},${cell.col}`;
      if (visited.has(key)) continue;
      visited.add(key);

      for (const dir of DIRECTIONS) {
        const neighborPos = getNeighbor(cell.row, cell.col, dir);
        if (!neighborPos) continue;
        const neighbor = this.grid[neighborPos.row][neighborPos.col];
        if (neighbor.collapsed) continue;

        const compatibleOptions: Tile[] = [];
        for (const cellTile of cell.options) {
          const requiredConnection = cellTile.connections[dir];
          const matching = neighbor.options.filter(
            (t) => t.connections[OPPOSITE[dir]] === requiredConnection
          );
          for (const m of matching) {
            if (!compatibleOptions.find((o) => o.type === m.type && o.rotation === m.rotation)) {
              compatibleOptions.push(m);
            }
          }
        }

        if (compatibleOptions.length < neighbor.options.length) {
          neighbor.options = compatibleOptions;
          if (neighbor.options.length === 0) {
            return false;
          }
          if (neighbor.options.length === 1) {
            neighbor.tile = neighbor.options[0];
            neighbor.collapsed = true;
          }
          stack.push(neighbor);
        }
      }
    }
    return true;
  }

  private addColorVariation(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.grid[row][col];
        if (cell.tile && cell.tile.type === 'wall') {
          const variation = Math.floor(Math.random() * 32) - 16;
          const baseR = 42;
          const baseG = 47;
          const baseB = 76;
          const r = Math.max(30, Math.min(80, baseR + variation));
          const g = Math.max(30, Math.min(80, baseG + variation));
          const b = Math.max(50, Math.min(120, baseB + variation));
          cell.tile = { ...cell.tile, color: `rgb(${r}, ${g}, ${b})` };
        } else if (cell.tile) {
          const variation = Math.floor(Math.random() * 20) - 10;
          const baseR = 58;
          const baseG = 63;
          const baseB = 92;
          const r = Math.max(40, Math.min(90, baseR + variation));
          const g = Math.max(40, Math.min(90, baseG + variation));
          const b = Math.max(60, Math.min(130, baseB + variation));
          cell.tile = { ...cell.tile, color: `rgb(${r}, ${g}, ${b})` };
        }
      }
    }
  }

  private startGenerationAnimation(): void {
    this.animationRow = -1;
    const animateRow = () => {
      this.animationRow++;
      eventBus.emit('maze:rowGenerated', this.animationRow);
      if (this.animationRow < GRID_SIZE - 1) {
        setTimeout(animateRow, 100);
      } else {
        this.generating = false;
        this.startFadeIn();
      }
    };
    setTimeout(animateRow, 100);
  }

  private startFadeIn(): void {
    const startTime = performance.now();
    const duration = 500;
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      this.fadeProgress = Math.min(1, elapsed / duration);
      eventBus.emit('maze:fadeProgress', this.fadeProgress);
      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        eventBus.emit('maze:complete', this.getWalkableGrid());
        eventBus.emit('maze:tiles', this.getTileData());
      }
    };
    requestAnimationFrame(animate);
  }

  getTileData(): { walkable: boolean; connections: Record<Direction, boolean> }[][] {
    const data: { walkable: boolean; connections: Record<Direction, boolean> }[][] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowArr: { walkable: boolean; connections: Record<Direction, boolean> }[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.grid[row][col];
        const walkable = isWalkable(cell.tile);
        rowArr.push({
          walkable,
          connections: cell.tile ? { ...cell.tile.connections } : {
            top: false, right: false, bottom: false, left: false
          },
        });
      }
      data.push(rowArr);
    }
    return data;
  }

  getGrid(): Cell[][] {
    return this.grid;
  }

  getAnimationRow(): number {
    return this.animationRow;
  }

  getFadeProgress(): number {
    return this.fadeProgress;
  }

  getWalkableGrid(): boolean[][] {
    const walkable: boolean[][] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowArr: boolean[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        rowArr.push(isWalkable(this.grid[row][col].tile));
      }
      walkable.push(rowArr);
    }
    return walkable;
  }

  isWalkableAt(row: number, col: number): boolean {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
    return isWalkable(this.grid[row][col].tile);
  }

  canMove(row: number, col: number, dir: Direction): boolean {
    if (!this.isWalkableAt(row, col)) return false;
    const cell = this.grid[row][col];
    if (!cell.tile) return false;
    if (!cell.tile.connections[dir]) return false;
    const neighbor = getNeighbor(row, col, dir);
    if (!neighbor) return false;
    return this.isWalkableAt(neighbor.row, neighbor.col);
  }

  getRandomWalkablePosition(minDistFromCorners: number = 2): { row: number; col: number } {
    const walkableCells: { row: number; col: number }[] = [];
    for (let row = minDistFromCorners; row < GRID_SIZE - minDistFromCorners; row++) {
      for (let col = minDistFromCorners; col < GRID_SIZE - minDistFromCorners; col++) {
        if (this.isWalkableAt(row, col)) {
          walkableCells.push({ row, col });
        }
      }
    }
    if (walkableCells.length === 0) {
      const mid = Math.floor(GRID_SIZE / 2);
      return { row: mid, col: mid };
    }
    return walkableCells[Math.floor(Math.random() * walkableCells.length)];
  }

  findPath(start: { row: number; col: number }, end: { row: number; col: number }): { row: number; col: number }[] {
    if (!this.isWalkableAt(start.row, start.col) || !this.isWalkableAt(end.row, end.col)) {
      return [];
    }

    const queue: { row: number; col: number; dist: number }[] = [];
    const visited = new Set<string>();
    const parent = new Map<string, { row: number; col: number } | null>();

    queue.push({ ...start, dist: 0 });
    visited.add(`${start.row},${start.col}`);
    parent.set(`${start.row},${start.col}`, null);

    const directions = [
      { dr: -1, dc: 0, dir: 'top' as Direction },
      { dr: 1, dc: 0, dir: 'bottom' as Direction },
      { dr: 0, dc: -1, dir: 'left' as Direction },
      { dr: 0, dc: 1, dir: 'right' as Direction },
    ];

    let found = false;
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.row === end.row && current.col === end.col) {
        found = true;
        break;
      }

      for (const { dr, dc, dir } of directions) {
        const nr = current.row + dr;
        const nc = current.col + dc;
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;
        if (!this.canMove(current.row, current.col, dir)) continue;

        visited.add(key);
        parent.set(key, { row: current.row, col: current.col });
        queue.push({ row: nr, col: nc, dist: current.dist + 1 });
      }
    }

    if (!found) return [];

    const path: { row: number; col: number }[] = [];
    let current: { row: number; col: number } | null = end;
    while (current) {
      path.unshift(current);
      current = parent.get(`${current.row},${current.col}`) || null;
    }
    return path;
  }
}

export default MazeEngine;
