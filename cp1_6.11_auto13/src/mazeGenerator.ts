export type CellType = 0 | 1;

export interface MazeData {
  grid: CellType[][];
  size: number;
  pathCells: Array<{ x: number; y: number }>;
}

const DIRECTIONS = [
  { dx: 0, dy: -2 },
  { dx: 2, dy: 0 },
  { dx: 0, dy: 2 },
  { dx: -2, dy: 0 }
];

export class MazeGenerator {
  private size: number;
  private grid: CellType[][];
  private pathCells: Array<{ x: number; y: number }>;

  constructor(size: number) {
    if (size < 5 || size > 15) {
      throw new Error('迷宫尺寸必须在 5 到 15 之间');
    }
    if (size % 2 === 0) {
      size += 1;
    }
    this.size = size;
    this.grid = [];
    this.pathCells = [];
  }

  public generate(): MazeData {
    this.initGrid();
    this.recursiveBacktrack(1, 1);
    this.collectPathCells();
    return {
      grid: this.grid,
      size: this.size,
      pathCells: this.pathCells
    };
  }

  private initGrid(): void {
    this.grid = [];
    for (let y = 0; y < this.size; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < this.size; x++) {
        row.push(1);
      }
      this.grid.push(row);
    }
  }

  private recursiveBacktrack(x: number, y: number): void {
    this.grid[y][x] = 0;

    const directions = this.shuffleArray([...DIRECTIONS]);

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      if (this.isValidCell(nx, ny) && this.grid[ny][nx] === 1) {
        this.grid[y + dir.dy / 2][x + dir.dx / 2] = 0;
        this.recursiveBacktrack(nx, ny);
      }
    }
  }

  private isValidCell(x: number, y: number): boolean {
    return x > 0 && x < this.size - 1 && y > 0 && y < this.size - 1;
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private collectPathCells(): void {
    this.pathCells = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.grid[y][x] === 0) {
          this.pathCells.push({ x, y });
        }
      }
    }
  }
}

export function generateMaze(size: number): MazeData {
  const generator = new MazeGenerator(size);
  return generator.generate();
}

export function getRandomPathCells(
  maze: MazeData,
  count: number,
  exclude: Array<{ x: number; y: number }> = []
): Array<{ x: number; y: number }> {
  const available = maze.pathCells.filter(
    (cell) => !exclude.some((ex) => ex.x === cell.x && ex.y === cell.y)
  );
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
