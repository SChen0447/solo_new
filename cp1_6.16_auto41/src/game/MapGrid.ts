import {
  GRID_COLS,
  GRID_ROWS,
  GridCell,
  Tower,
  TowerType,
  TerrainType,
  TOWER_CONFIGS,
  UPGRADE_COSTS,
  eventBus,
  GAME_EVENTS
} from '../types/index';

const PATH_COORDS: Array<[number, number]> = [
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
  [5, 4], [5, 5], [5, 6], [5, 7],
  [6, 7], [7, 7], [8, 7], [9, 7], [10, 7],
  [10, 6], [10, 5], [10, 4], [10, 3], [10, 2],
  [11, 2], [12, 2], [13, 2], [14, 2], [15, 2],
  [15, 3], [15, 4], [15, 5], [15, 6], [15, 7], [15, 8], [15, 9], [15, 10], [15, 11],
  [14, 11], [13, 11], [12, 11], [11, 11], [10, 11], [9, 11], [8, 11], [7, 11], [6, 11], [5, 11], [4, 11], [3, 11],
  [3, 12], [3, 13], [3, 14],
  [4, 14], [5, 14], [6, 14], [7, 14], [8, 14], [9, 14], [10, 14], [11, 14], [12, 14], [13, 14], [14, 14], [15, 14], [16, 14], [17, 14], [18, 14], [19, 14]
];

export class MapGrid {
  private grid: GridCell[][];
  private towers: Map<string, Tower>;
  private pathCells: Set<string>;
  private pathCoords: Array<[number, number]>;

  constructor() {
    this.grid = [];
    this.towers = new Map();
    this.pathCells = new Set();
    this.pathCoords = PATH_COORDS;
    this.initializeGrid();
    this.setupEventListeners();
  }

  private initializeGrid(): void {
    const pathSet = new Set(PATH_COORDS.map(([x, y]) => `${x},${y}`));
    this.pathCells = pathSet;

    for (let y = 0; y < GRID_ROWS; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        const key = `${x},${y}`;
        let terrain: TerrainType = 'buildable';
        if (pathSet.has(key)) {
          terrain = 'path';
        }
        this.grid[y][x] = {
          x,
          y,
          terrain,
          towerId: null
        };
      }
    }
  }

  private setupEventListeners(): void {
    eventBus.on(GAME_EVENTS.UI_BUILD_CLICKED, (type: TowerType, gridX: number, gridY: number) => {
      this.addTower(type, gridX, gridY);
    });

    eventBus.on(GAME_EVENTS.UI_UPGRADE_CLICKED, (towerId: string) => {
      this.upgradeTower(towerId);
    });

    eventBus.on(GAME_EVENTS.UI_SELL_CLICKED, (towerId: string) => {
      this.sellTower(towerId);
    });

    eventBus.on(GAME_EVENTS.RESTART, () => {
      this.reset();
    });
  }

  public reset(): void {
    this.towers.clear();
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        this.grid[y][x].towerId = null;
      }
    }
  }

  public getGrid(): GridCell[][] {
    return this.grid;
  }

  public getCell(x: number, y: number): GridCell | null {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) {
      return null;
    }
    return this.grid[y][x];
  }

  public canBuildAt(x: number, y: number): boolean {
    const cell = this.getCell(x, y);
    if (!cell) return false;
    return cell.terrain === 'buildable' && cell.towerId === null;
  }

  public addTower(type: TowerType, gridX: number, gridY: number): Tower | null {
    if (!this.canBuildAt(gridX, gridY)) {
      return null;
    }

    const config = TOWER_CONFIGS[type];
    const id = `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tower: Tower = {
      id,
      type,
      gridX,
      gridY,
      level: 1,
      totalCost: config.buildCost,
      lastAttackTime: 0
    };

    this.towers.set(id, tower);
    this.grid[gridY][gridX].towerId = id;
    eventBus.emit(GAME_EVENTS.TOWER_PLACED, tower);
    return tower;
  }

  public upgradeTower(towerId: string): Tower | null {
    const tower = this.towers.get(towerId);
    if (!tower || tower.level >= 3) {
      return null;
    }

    const nextLevel = tower.level + 1;
    const cost = UPGRADE_COSTS[nextLevel];
    tower.level = nextLevel;
    tower.totalCost += cost;
    eventBus.emit(GAME_EVENTS.TOWER_UPGRADED, tower);
    return tower;
  }

  public sellTower(towerId: string): Tower | null {
    const tower = this.towers.get(towerId);
    if (!tower) {
      return null;
    }

    this.towers.delete(towerId);
    this.grid[tower.gridY][tower.gridX].towerId = null;
    eventBus.emit(GAME_EVENTS.TOWER_SOLD, tower);
    return tower;
  }

  public getTower(towerId: string): Tower | null {
    return this.towers.get(towerId) || null;
  }

  public getTowers(): Tower[] {
    return Array.from(this.towers.values());
  }

  public getPathCoords(): Array<[number, number]> {
    return this.pathCoords;
  }

  public getWorldPath(cellSize: number): Array<{ x: number; y: number }> {
    return this.pathCoords.map(([cx, cy]) => ({
      x: (cx + 0.5) * cellSize,
      y: (cy + 0.5) * cellSize
    }));
  }

  public isPath(x: number, y: number): boolean {
    return this.pathCells.has(`${x},${y}`);
  }

  public getCols(): number {
    return GRID_COLS;
  }

  public getRows(): number {
    return GRID_ROWS;
  }
}
