import { eventBus } from './EventBus';
import { GRID_SIZE, Direction } from './MazeEngine';

interface Position {
  row: number;
  col: number;
}

interface TileData {
  walkable: boolean;
  connections: Record<Direction, boolean>;
}

interface PathNode {
  position: Position;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

const OPPOSITE: Record<Direction, Direction> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const DIRECTIONS: { dir: Direction; dr: number; dc: number }[] = [
  { dir: 'top', dr: -1, dc: 0 },
  { dir: 'bottom', dr: 1, dc: 0 },
  { dir: 'left', dr: 0, dc: -1 },
  { dir: 'right', dr: 0, dc: 1 },
];

export class PathfindingAI {
  private grid: TileData[][] = [];
  private aiPosition: Position = { row: 0, col: 0 };
  private playerPosition: Position = { row: 0, col: 0 };
  private resourcePositions: Position[] = [];
  private currentPath: Position[] = [];
  private moveSpeed: number = 3;
  private aiPixelPos: { x: number; y: number } = { x: 0, y: 0 };
  private targetResourceIndex: number = -1;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('maze:tiles', (tiles: TileData[][]) => {
      this.grid = tiles;
    });

    eventBus.on('player:position', (pos: Position) => {
      this.playerPosition = pos;
    });

    eventBus.on('ai:setPosition', (pos: Position) => {
      this.aiPosition = pos;
    });

    eventBus.on('resources:update', (resources: Position[]) => {
      this.resourcePositions = resources;
      this.recalculatePath();
    });

    eventBus.on('resource:collected', (index: number) => {
      if (index < this.resourcePositions.length) {
        this.resourcePositions.splice(index, 1);
      }
      this.recalculatePath();
    });
  }

  private heuristic(a: Position, b: Position): number {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }

  private canMoveFrom(pos: Position, dir: Direction): boolean {
    if (
      pos.row < 0 ||
      pos.row >= GRID_SIZE ||
      pos.col < 0 ||
      pos.col >= GRID_SIZE
    ) {
      return false;
    }
    const tile = this.grid[pos.row]?.[pos.col];
    if (!tile || !tile.walkable) return false;
    if (!tile.connections[dir]) return false;

    let nr = pos.row;
    let nc = pos.col;
    switch (dir) {
      case 'top':
        nr--;
        break;
      case 'bottom':
        nr++;
        break;
      case 'left':
        nc--;
        break;
      case 'right':
        nc++;
        break;
    }

    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) return false;
    const neighbor = this.grid[nr]?.[nc];
    if (!neighbor || !neighbor.walkable) return false;
    return neighbor.connections[OPPOSITE[dir]];
  }

  findPath(start: Position, goal: Position): Position[] {
    if (
      start.row < 0 || start.row >= GRID_SIZE || start.col < 0 || start.col >= GRID_SIZE ||
      goal.row < 0 || goal.row >= GRID_SIZE || goal.col < 0 || goal.col >= GRID_SIZE
    ) {
      return [];
    }

    const startTile = this.grid[start.row]?.[start.col];
    const goalTile = this.grid[goal.row]?.[goal.col];
    if (!startTile?.walkable || !goalTile?.walkable) {
      return [];
    }

    const openList: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      position: start,
      g: 0,
      h: this.heuristic(start, goal),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);

    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;

      if (current.position.row === goal.row && current.position.col === goal.col) {
        const path: Position[] = [];
        let node: PathNode | null = current;
        while (node) {
          path.unshift(node.position);
          node = node.parent;
        }
        return path;
      }

      closedSet.add(`${current.position.row},${current.position.col}`);

      for (const { dir, dr, dc } of DIRECTIONS) {
        if (!this.canMoveFrom(current.position, dir)) continue;

        const nr = current.position.row + dr;
        const nc = current.position.col + dc;
        const key = `${nr},${nc}`;
        if (closedSet.has(key)) continue;

        const g = current.g + 1;
        const h = this.heuristic({ row: nr, col: nc }, goal);
        const f = g + h;

        const existingNode = openList.find(
          (n) => n.position.row === nr && n.position.col === nc
        );

        if (existingNode) {
          if (g < existingNode.g) {
            existingNode.g = g;
            existingNode.f = f;
            existingNode.parent = current;
          }
        } else {
          openList.push({
            position: { row: nr, col: nc },
            g,
            h,
            f,
            parent: current,
          });
        }
      }
    }

    return [];
  }

  findNearestResource(): { position: Position; index: number } | null {
    if (this.resourcePositions.length === 0) return null;

    let nearestIndex = -1;
    let nearestDist = Infinity;

    for (let i = 0; i < this.resourcePositions.length; i++) {
      const path = this.findPath(this.aiPosition, this.resourcePositions[i]);
      if (path.length > 0 && path.length < nearestDist) {
        nearestDist = path.length;
        nearestIndex = i;
      }
    }

    if (nearestIndex === -1) return null;

    return {
      position: this.resourcePositions[nearestIndex],
      index: nearestIndex,
    };
  }

  recalculatePath(): Position[] {
    const nearest = this.findNearestResource();
    if (!nearest) {
      this.currentPath = [];
      this.targetResourceIndex = -1;
      return [];
    }

    this.targetResourceIndex = nearest.index;
    this.currentPath = this.findPath(this.aiPosition, nearest.position);
    return this.currentPath;
  }

  update(deltaTime: number, tileSize: number): { x: number; y: number; row: number; col: number } {
    if (this.currentPath.length <= 1) {
      this.recalculatePath();
    }

    if (this.currentPath.length <= 1) {
      return {
        x: this.aiPixelPos.x,
        y: this.aiPixelPos.y,
        row: this.aiPosition.row,
        col: this.aiPosition.col,
      };
    }

    const nextPos = this.currentPath[1];
    const targetX = nextPos.col * tileSize + tileSize / 2;
    const targetY = nextPos.row * tileSize + tileSize / 2;

    const moveDistance = this.moveSpeed * tileSize * deltaTime;
    const dx = targetX - this.aiPixelPos.x;
    const dy = targetY - this.aiPixelPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < moveDistance) {
      this.aiPixelPos.x = targetX;
      this.aiPixelPos.y = targetY;
      this.aiPosition = { ...nextPos };
      this.currentPath.shift();
      eventBus.emit('ai:position', this.aiPosition);
    } else {
      this.aiPixelPos.x += (dx / dist) * moveDistance;
      this.aiPixelPos.y += (dy / dist) * moveDistance;
    }

    return {
      x: this.aiPixelPos.x,
      y: this.aiPixelPos.y,
      row: this.aiPosition.row,
      col: this.aiPosition.col,
    };
  }

  setInitialPosition(row: number, col: number, tileSize: number): void {
    this.aiPosition = { row, col };
    this.aiPixelPos = {
      x: col * tileSize + tileSize / 2,
      y: row * tileSize + tileSize / 2,
    };
    eventBus.emit('ai:position', this.aiPosition);
  }

  getPath(): Position[] {
    return this.currentPath;
  }

  getAiPosition(): Position {
    return this.aiPosition;
  }

  getAiPixelPosition(): { x: number; y: number } {
    return this.aiPixelPos;
  }
}

export default PathfindingAI;
