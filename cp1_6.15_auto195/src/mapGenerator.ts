import {
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  Tile,
  Item,
  Exit,
  Position,
  CellType,
  ItemType
} from './types';

interface MazeCell {
  visited: boolean;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
}

export class MapGenerator {
  private maze: MazeCell[][];
  private grid: Tile[][];

  constructor() {
    this.maze = [];
    this.grid = [];
  }

  generate(): { map: Tile[][]; items: Item[]; exit: Exit; startPos: Position } {
    this.initMaze();
    this.recursiveBacktrack(0, 0);
    this.mazeToGrid();
    this.ensureConnectivity();
    const items = this.placeItems();
    const exit = this.placeExit();
    const startPos = this.getStartPosition();
    return { map: this.grid, items, exit, startPos };
  }

  private initMaze(): void {
    this.maze = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row: MazeCell[] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        row.push({
          visited: false,
          walls: { top: true, right: true, bottom: true, left: true }
        });
      }
      this.maze.push(row);
    }
  }

  private recursiveBacktrack(x: number, y: number): void {
    this.maze[y][x].visited = true;
    const directions = this.shuffle([
      { dx: 0, dy: -1, wall: 'top', opposite: 'bottom' },
      { dx: 1, dy: 0, wall: 'right', opposite: 'left' },
      { dx: 0, dy: 1, wall: 'bottom', opposite: 'top' },
      { dx: -1, dy: 0, wall: 'left', opposite: 'right' }
    ]);

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (
        nx >= 0 &&
        nx < MAP_WIDTH &&
        ny >= 0 &&
        ny < MAP_HEIGHT &&
        !this.maze[ny][nx].visited
      ) {
        this.maze[y][x].walls[dir.wall as keyof MazeCell['walls']] = false;
        this.maze[ny][nx].walls[dir.opposite as keyof MazeCell['walls']] = false;
        this.recursiveBacktrack(nx, ny);
      }
    }
  }

  private mazeToGrid(): void {
    const gridW = MAP_WIDTH * 2 + 1;
    const gridH = MAP_HEIGHT * 2 + 1;
    this.grid = [];

    for (let y = 0; y < gridH; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < gridW; x++) {
        row.push({
          type: 'wall' as CellType,
          gridX: x,
          gridY: y
        });
      }
      this.grid.push(row);
    }

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const gx = x * 2 + 1;
        const gy = y * 2 + 1;
        this.grid[gy][gx].type = 'path';

        if (!this.maze[y][x].walls.top) this.grid[gy - 1][gx].type = 'path';
        if (!this.maze[y][x].walls.right) this.grid[gy][gx + 1].type = 'path';
        if (!this.maze[y][x].walls.bottom) this.grid[gy + 1][gx].type = 'path';
        if (!this.maze[y][x].walls.left) this.grid[gy][gx - 1].type = 'path';
      }
    }
  }

  private ensureConnectivity(): void {
    for (let y = 0; y < MAP_HEIGHT - 1; y++) {
      for (let x = 0; x < MAP_WIDTH - 1; x++) {
        const gx = x * 2 + 1;
        const gy = y * 2 + 1;
        if (
          this.grid[gy][gx + 2]?.type === 'path' &&
          this.grid[gy + 2][gx]?.type === 'path' &&
          this.grid[gy + 1][gx + 1]?.type === 'wall'
        ) {
          if (Math.random() < 0.1) {
            this.grid[gy + 1][gx + 1].type = 'path';
          }
        }
      }
    }
  }

  private getPathCells(): { x: number; y: number }[] {
    const cells: { x: number; y: number }[] = [];
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid[y].length; x++) {
        if (this.grid[y][x].type === 'path') {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }

  private placeItems(): Item[] {
    const pathCells = this.getPathCells();
    const startX = 1;
    const startY = 1;
    const endX = this.grid[0].length - 2;
    const endY = this.grid.length - 2;

    const validCells = pathCells.filter(
      (c) =>
        !(c.x === startX && c.y === startY) &&
        !(c.x === endX && c.y === endY)
    );

    const shuffled = this.shuffle(validCells);
    const items: Item[] = [];
    let idCounter = 0;

    const batteryCount = 3;
    for (let i = 0; i < batteryCount && i < shuffled.length; i++) {
      const cell = shuffled[i];
      items.push({
        id: `battery_${idCounter++}`,
        type: 'battery' as ItemType,
        gridX: cell.x,
        gridY: cell.y,
        position: {
          x: cell.x * TILE_SIZE + TILE_SIZE / 2,
          y: cell.y * TILE_SIZE + TILE_SIZE / 2
        },
        collected: false
      });
    }

    if (shuffled.length > batteryCount) {
      const keyCell = shuffled[batteryCount];
      items.push({
        id: `key_${idCounter++}`,
        type: 'key' as ItemType,
        gridX: keyCell.x,
        gridY: keyCell.y,
        position: {
          x: keyCell.x * TILE_SIZE + TILE_SIZE / 2,
          y: keyCell.y * TILE_SIZE + TILE_SIZE / 2
        },
        collected: false
      });
    }

    return items;
  }

  private placeExit(): Exit {
    const endX = this.grid[0].length - 2;
    const endY = this.grid.length - 2;
    return {
      gridX: endX,
      gridY: endY,
      position: {
        x: endX * TILE_SIZE + TILE_SIZE / 2,
        y: endY * TILE_SIZE + TILE_SIZE / 2
      },
      unlocked: false
    };
  }

  private getStartPosition(): Position {
    return {
      x: TILE_SIZE + TILE_SIZE / 2,
      y: TILE_SIZE + TILE_SIZE / 2
    };
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  isWalkable(px: number, py: number): boolean {
    const gx = Math.floor(px / TILE_SIZE);
    const gy = Math.floor(py / TILE_SIZE);
    if (gy < 0 || gy >= this.grid.length || gx < 0 || gx >= this.grid[0].length) {
      return false;
    }
    return this.grid[gy][gx].type === 'path';
  }

  getGridWidth(): number {
    return this.grid[0]?.length || 0;
  }

  getGridHeight(): number {
    return this.grid.length;
  }
}
