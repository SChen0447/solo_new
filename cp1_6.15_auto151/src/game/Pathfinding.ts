import { Vec3, MAP_SIZE, GRID_SIZE } from '../types/game';

interface GridNode {
  x: number;
  z: number;
  walkable: boolean;
  g: number;
  h: number;
  f: number;
  parent: GridNode | null;
}

export class Pathfinding {
  private gridWidth: number;
  private gridHeight: number;
  private grid: GridNode[][];
  private obstacles: Set<string> = new Set();

  constructor() {
    this.gridWidth = Math.floor(MAP_SIZE / GRID_SIZE);
    this.gridHeight = Math.floor(MAP_SIZE / GRID_SIZE);
    this.grid = this.createGrid();
  }

  private createGrid(): GridNode[][] {
    const grid: GridNode[][] = [];
    for (let x = 0; x < this.gridWidth; x++) {
      grid[x] = [];
      for (let z = 0; z < this.gridHeight; z++) {
        grid[x][z] = {
          x,
          z,
          walkable: true,
          g: 0,
          h: 0,
          f: 0,
          parent: null,
        };
      }
    }
    return grid;
  }

  private worldToGrid(worldPos: Vec3): { x: number; z: number } {
    const halfMap = MAP_SIZE / 2;
    return {
      x: Math.floor((worldPos[0] + halfMap) / GRID_SIZE),
      z: Math.floor((worldPos[2] + halfMap) / GRID_SIZE),
    };
  }

  private gridToWorld(gridX: number, gridZ: number): Vec3 {
    const halfMap = MAP_SIZE / 2;
    return [
      gridX * GRID_SIZE + GRID_SIZE / 2 - halfMap,
      0,
      gridZ * GRID_SIZE + GRID_SIZE / 2 - halfMap,
    ];
  }

  private isInBounds(x: number, z: number): boolean {
    return x >= 0 && x < this.gridWidth && z >= 0 && z < this.gridHeight;
  }

  addObstacle(worldPos: Vec3, radius: number = 1): void {
    const gridPos = this.worldToGrid(worldPos);
    const gridRadius = Math.ceil(radius / GRID_SIZE);
    
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dz = -gridRadius; dz <= gridRadius; dz++) {
        const x = gridPos.x + dx;
        const z = gridPos.z + dz;
        if (this.isInBounds(x, z)) {
          const key = `${x},${z}`;
          this.obstacles.add(key);
          this.grid[x][z].walkable = false;
        }
      }
    }
  }

  removeObstacle(worldPos: Vec3, radius: number = 1): void {
    const gridPos = this.worldToGrid(worldPos);
    const gridRadius = Math.ceil(radius / GRID_SIZE);
    
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dz = -gridRadius; dz <= gridRadius; dz++) {
        const x = gridPos.x + dx;
        const z = gridPos.z + dz;
        if (this.isInBounds(x, z)) {
          const key = `${x},${z}`;
          this.obstacles.delete(key);
          this.grid[x][z].walkable = true;
        }
      }
    }
  }

  checkCollision(worldPos: Vec3, radius: number = 0.5): boolean {
    const gridPos = this.worldToGrid(worldPos);
    const gridRadius = Math.ceil(radius / GRID_SIZE);
    
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dz = -gridRadius; dz <= gridRadius; dz++) {
        const x = gridPos.x + dx;
        const z = gridPos.z + dz;
        if (!this.isInBounds(x, z) || !this.grid[x][z].walkable) {
          return true;
        }
      }
    }
    return false;
  }

  private heuristic(a: GridNode, b: GridNode): number {
    const dx = Math.abs(a.x - b.x);
    const dz = Math.abs(a.z - b.z);
    return dx + dz;
  }

  private getNeighbors(node: GridNode): GridNode[] {
    const neighbors: GridNode[] = [];
    const directions = [
      [0, -1], [0, 1], [-1, 0], [1, 0],
      [-1, -1], [-1, 1], [1, -1], [1, 1],
    ];

    for (const [dx, dz] of directions) {
      const x = node.x + dx;
      const z = node.z + dz;
      
      if (this.isInBounds(x, z) && this.grid[x][z].walkable) {
        if (dx !== 0 && dz !== 0) {
          const corner1 = this.grid[node.x + dx][node.z];
          const corner2 = this.grid[node.x][node.z + dz];
          if (!corner1.walkable || !corner2.walkable) {
            continue;
          }
        }
        neighbors.push(this.grid[x][z]);
      }
    }

    return neighbors;
  }

  findPath(startWorld: Vec3, endWorld: Vec3): Vec3[] | null {
    const startGrid = this.worldToGrid(startWorld);
    const endGrid = this.worldToGrid(endWorld);

    if (!this.isInBounds(startGrid.x, startGrid.z) ||
        !this.isInBounds(endGrid.x, endGrid.z) ||
        !this.grid[startGrid.x][startGrid.z].walkable ||
        !this.grid[endGrid.x][endGrid.z].walkable) {
      return null;
    }

    for (let x = 0; x < this.gridWidth; x++) {
      for (let z = 0; z < this.gridHeight; z++) {
        this.grid[x][z].g = 0;
        this.grid[x][z].h = 0;
        this.grid[x][z].f = 0;
        this.grid[x][z].parent = null;
      }
    }

    const openSet: GridNode[] = [];
    const closedSet: Set<string> = new Set();
    
    const startNode = this.grid[startGrid.x][startGrid.z];
    const endNode = this.grid[endGrid.x][endGrid.z];
    
    openSet.push(startNode);

    while (openSet.length > 0) {
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet[currentIndex];

      if (current.x === endNode.x && current.z === endNode.z) {
        const path: Vec3[] = [];
        let temp: GridNode | null = current;
        while (temp) {
          path.unshift(this.gridToWorld(temp.x, temp.z));
          temp = temp.parent;
        }
        return path;
      }

      openSet.splice(currentIndex, 1);
      closedSet.add(`${current.x},${current.z}`);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (closedSet.has(`${neighbor.x},${neighbor.z}`)) {
          continue;
        }

        const moveCost = current.g + 
          ((neighbor.x !== current.x && neighbor.z !== current.z) ? 1.414 : 1);

        if (moveCost < neighbor.g || !openSet.includes(neighbor)) {
          neighbor.g = moveCost;
          neighbor.h = this.heuristic(neighbor, endNode);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return null;
  }

  smoothPath(path: Vec3[]): Vec3[] {
    if (path.length < 3) return path;

    const smoothed: Vec3[] = [path[0]];
    let lastIndex = 0;

    for (let i = 2; i < path.length; i++) {
      if (!this.hasLineOfSight(path[lastIndex], path[i])) {
        smoothed.push(path[i - 1]);
        lastIndex = i - 1;
      }
    }

    smoothed.push(path[path.length - 1]);
    return smoothed;
  }

  private hasLineOfSight(start: Vec3, end: Vec3): boolean {
    const dx = end[0] - start[0];
    const dz = end[2] - start[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    const steps = Math.ceil(distance / (GRID_SIZE * 0.5));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const point: Vec3 = [
        start[0] + dx * t,
        0,
        start[2] + dz * t,
      ];
      if (this.checkCollision(point, 0.3)) {
        return false;
      }
    }

    return true;
  }
}
