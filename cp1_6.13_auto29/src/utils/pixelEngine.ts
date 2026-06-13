const GRID_SIZE = 32;
const MAX_HISTORY = 50;

export type PixelGrid = string[][];

interface HistoryEntry {
  grid: PixelGrid;
  changedPixels: { x: number; y: number }[];
}

export class PixelEngine {
  private grid: PixelGrid;
  private history: HistoryEntry[] = [];
  private historyIndex: number = -1;
  private gridSize: number;

  constructor(size: number = GRID_SIZE) {
    this.gridSize = size;
    this.grid = this.createEmptyGrid();
  }

  private createEmptyGrid(): PixelGrid {
    const grid: PixelGrid = [];
    for (let y = 0; y < this.gridSize; y++) {
      const row: string[] = [];
      for (let x = 0; x < this.gridSize; x++) {
        row.push('#FFFFFF');
      }
      grid.push(row);
    }
    return grid;
  }

  getGrid(): PixelGrid {
    return this.grid.map(row => [...row]);
  }

  getGridSize(): number {
    return this.gridSize;
  }

  fillPixel(x: number, y: number, color: string, brushSize: number = 1): { x: number; y: number }[] {
    const changedPixels: { x: number; y: number }[] = [];
    const half = Math.floor(brushSize / 2);

    const snapshot = this.grid.map(row => [...row]);

    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < this.gridSize && py >= 0 && py < this.gridSize) {
          if (this.grid[py][px] !== color) {
            this.grid[py][px] = color;
            changedPixels.push({ x: px, y: py });
          }
        }
      }
    }

    if (changedPixels.length > 0) {
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push({ grid: snapshot, changedPixels });
      if (this.history.length > MAX_HISTORY) {
        this.history.shift();
      } else {
        this.historyIndex++;
      }
    }

    return changedPixels;
  }

  undo(): { grid: PixelGrid; changedPixels: { x: number; y: number }[] } | null {
    if (this.historyIndex < 0) {
      return null;
    }

    const entry = this.history[this.historyIndex];
    const currentChanged = entry.changedPixels;
    this.grid = entry.grid.map(row => [...row]);
    this.historyIndex--;

    return {
      grid: this.getGrid(),
      changedPixels: currentChanged
    };
  }

  redo(): { grid: PixelGrid; changedPixels: { x: number; y: number }[] } | null {
    if (this.historyIndex >= this.history.length - 1) {
      return null;
    }

    this.historyIndex++;
    const entry = this.history[this.historyIndex];

    const changedPixels: { x: number; y: number }[] = [];
    const snapshot = this.grid.map(row => [...row]);

    for (const pixel of entry.changedPixels) {
      if (snapshot[pixel.y][pixel.x] !== entry.grid[pixel.y][pixel.x]) {
        changedPixels.push(pixel);
      }
    }

    this.applyEntryToGrid(entry);

    return {
      grid: this.getGrid(),
      changedPixels: entry.changedPixels
    };
  }

  private applyEntryToGrid(entry: HistoryEntry): void {
    const prevGrid = this.historyIndex > 0 ? this.history[this.historyIndex - 1].grid : null;
    if (prevGrid) {
      this.grid = prevGrid.map(row => [...row]);
      for (const pixel of entry.changedPixels) {
        this.grid[pixel.y][pixel.x] = entry.grid[pixel.y][pixel.x];
      }
    }
  }

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  clear(): void {
    const snapshot = this.grid.map(row => [...row]);
    const changedPixels: { x: number; y: number }[] = [];

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (this.grid[y][x] !== '#FFFFFF') {
          changedPixels.push({ x, y });
        }
      }
    }

    this.grid = this.createEmptyGrid();

    if (changedPixels.length > 0) {
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push({ grid: snapshot, changedPixels });
      if (this.history.length > MAX_HISTORY) {
        this.history.shift();
      } else {
        this.historyIndex++;
      }
    }
  }

  exportPNG(scale: number = 8): string {
    const canvas = document.createElement('canvas');
    const size = this.gridSize * scale;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        ctx.fillStyle = this.grid[y][x];
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    return canvas.toDataURL('image/png');
  }
}

export function createPixelEngine(size?: number): PixelEngine {
  return new PixelEngine(size);
}
