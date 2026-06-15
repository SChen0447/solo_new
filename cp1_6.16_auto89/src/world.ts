import {
  VoxelType,
  WORLD_SIZE_X,
  WORLD_SIZE_Y,
  WORLD_SIZE_Z,
  WorldEvent,
  EventEmitter,
  VoxelCoord,
} from './types';

export class World {
  private grid: Uint8Array;
  private _eventEmitter: EventEmitter<WorldEvent> = new EventEmitter<WorldEvent>();

  get onWorldChange(): EventEmitter<WorldEvent> {
    return this._eventEmitter;
  }

  constructor() {
    this.grid = new Uint8Array(WORLD_SIZE_X * WORLD_SIZE_Y * WORLD_SIZE_Z);
  }

  private index(x: number, y: number, z: number): number {
    return x + y * WORLD_SIZE_X + z * WORLD_SIZE_X * WORLD_SIZE_Y;
  }

  isInBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < WORLD_SIZE_X && y >= 0 && y < WORLD_SIZE_Y && z >= 0 && z < WORLD_SIZE_Z;
  }

  getVoxel(x: number, y: number, z: number): VoxelType {
    if (!this.isInBounds(x, y, z)) return VoxelType.AIR;
    return this.grid[this.index(x, y, z)] as VoxelType;
  }

  setVoxel(x: number, y: number, z: number, type: VoxelType): boolean {
    if (!this.isInBounds(x, y, z)) return false;
    const currentType = this.getVoxel(x, y, z);
    if (currentType === type) return false;

    this.grid[this.index(x, y, z)] = type;

    const coord: VoxelCoord = { x, y, z };
    if (type === VoxelType.AIR) {
      this._eventEmitter.emit({ type: 'voxelRemoved', coord, voxelType: currentType });
    } else {
      this._eventEmitter.emit({ type: 'voxelAdded', coord, voxelType: type });
    }
    return true;
  }

  generateTerrain(): void {
    for (let x = 0; x < WORLD_SIZE_X; x++) {
      for (let z = 0; z < WORLD_SIZE_Z; z++) {
        this.grid[this.index(x, 0, z)] = VoxelType.STONE;
        for (let y = 1; y < 3 && y < WORLD_SIZE_Y; y++) {
          this.grid[this.index(x, y, z)] = VoxelType.DIRT;
        }
      }
    }
  }

  isSolid(x: number, y: number, z: number): boolean {
    const v = this.getVoxel(x, y, z);
    return v !== VoxelType.AIR;
  }

  isOpaque(x: number, y: number, z: number): boolean {
    const v = this.getVoxel(x, y, z);
    if (v === VoxelType.AIR) return false;
    if (v === VoxelType.GLASS) return false;
    return true;
  }

  getVisibleFaceCount(): number {
    let count = 0;
    const dirs = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1],
    ];
    for (let x = 0; x < WORLD_SIZE_X; x++) {
      for (let y = 0; y < WORLD_SIZE_Y; y++) {
        for (let z = 0; z < WORLD_SIZE_Z; z++) {
          const v = this.getVoxel(x, y, z);
          if (v === VoxelType.AIR) continue;
          for (const [dx, dy, dz] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            const nz = z + dz;
            const neighbor = this.getVoxel(nx, ny, nz);
            if (neighbor === VoxelType.AIR || (neighbor === VoxelType.GLASS && v !== VoxelType.GLASS)) {
              count++;
            }
          }
        }
      }
    }
    return count;
  }

  raycast(
    originX: number, originY: number, originZ: number,
    dirX: number, dirY: number, dirZ: number,
    maxDist: number = 8
  ): { coord: VoxelCoord; normal: VoxelCoord; blockType: VoxelType } | null {
    let x = Math.floor(originX);
    let y = Math.floor(originY);
    let z = Math.floor(originZ);

    const stepX = dirX >= 0 ? 1 : -1;
    const stepY = dirY >= 0 ? 1 : -1;
    const stepZ = dirZ >= 0 ? 1 : -1;

    const tDeltaX = dirX !== 0 ? Math.abs(1 / dirX) : Infinity;
    const tDeltaY = dirY !== 0 ? Math.abs(1 / dirY) : Infinity;
    const tDeltaZ = dirZ !== 0 ? Math.abs(1 / dirZ) : Infinity;

    let tMaxX = dirX !== 0 ? ((dirX > 0 ? (x + 1 - originX) : (originX - x)) * tDeltaX) : Infinity;
    let tMaxY = dirY !== 0 ? ((dirY > 0 ? (y + 1 - originY) : (originY - y)) * tDeltaY) : Infinity;
    let tMaxZ = dirZ !== 0 ? ((dirZ > 0 ? (z + 1 - originZ) : (originZ - z)) * tDeltaZ) : Infinity;

    let normal: VoxelCoord = { x: 0, y: 0, z: 0 };
    let dist = 0;

    for (let i = 0; i < maxDist * 3; i++) {
      const blockType = this.getVoxel(x, y, z);
      if (blockType !== VoxelType.AIR) {
        return { coord: { x, y, z }, normal, blockType };
      }

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          dist = tMaxX;
          x += stepX;
          tMaxX += tDeltaX;
          normal = { x: -stepX, y: 0, z: 0 };
        } else {
          dist = tMaxZ;
          z += stepZ;
          tMaxZ += tDeltaZ;
          normal = { x: 0, y: 0, z: -stepZ };
        }
      } else {
        if (tMaxY < tMaxZ) {
          dist = tMaxY;
          y += stepY;
          tMaxY += tDeltaY;
          normal = { x: 0, y: -stepY, z: 0 };
        } else {
          dist = tMaxZ;
          z += stepZ;
          tMaxZ += tDeltaZ;
          normal = { x: 0, y: 0, z: -stepZ };
        }
      }

      if (dist > maxDist) break;
    }

    return null;
  }
}
