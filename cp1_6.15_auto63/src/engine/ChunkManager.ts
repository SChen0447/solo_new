export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 32;
export const GRID_SIZE = 5;
export const EDITABLE_RADIUS = 1;

export enum VoxelType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  BRICK = 4
}

export const VOXEL_COLORS: Record<number, { top: string; side: string }> = {
  [VoxelType.GRASS]: { top: '#4CAF50', side: '#8B4513' },
  [VoxelType.DIRT]: { top: '#8B4513', side: '#8B4513' },
  [VoxelType.STONE]: { top: '#808080', side: '#707070' },
  [VoxelType.BRICK]: { top: '#7B7B7B', side: '#6B6B6B' }
};

export interface Chunk {
  x: number;
  z: number;
  data: Uint8Array;
  dirty: boolean;
  mesh?: any;
}

export class ChunkManager {
  private chunks: Map<string, Chunk> = new Map();
  private gridSize: number;
  private worldHeight: number;

  constructor(gridSize: number = GRID_SIZE, worldHeight: number = WORLD_HEIGHT) {
    this.gridSize = gridSize;
    this.worldHeight = worldHeight;
    this.generateWorld();
  }

  private getKey(chunkX: number, chunkZ: number): string {
    return `${chunkX},${chunkZ}`;
  }

  private createChunk(chunkX: number, chunkZ: number): Chunk {
    const data = new Uint8Array(CHUNK_SIZE * this.worldHeight * CHUNK_SIZE);
    return { x: chunkX, z: chunkZ, data, dirty: true };
  }

  private generateWorld(): void {
    const halfGrid = Math.floor(this.gridSize / 2);
    const centerX = 0;
    const centerZ = 0;

    for (let cx = -halfGrid; cx <= halfGrid; cx++) {
      for (let cz = -halfGrid; cz <= halfGrid; cz++) {
        const chunk = this.createChunk(cx, cz);
        this.generateTerrain(chunk, cx === centerX && cz === centerZ);
        this.chunks.set(this.getKey(cx, cz), chunk);
      }
    }
  }

  private generateTerrain(chunk: Chunk, isCenter: boolean): void {
    const baseHeight = Math.floor(this.worldHeight * 0.4);

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = chunk.x * CHUNK_SIZE + x;
        const worldZ = chunk.z * CHUNK_SIZE + z;

        let height = baseHeight;
        if (isCenter) {
          const noise = Math.sin(worldX * 0.15) * Math.cos(worldZ * 0.15) * 2;
          height = Math.floor(baseHeight + noise);
        }

        for (let y = 0; y < this.worldHeight; y++) {
          const index = this.getVoxelIndex(x, y, z);
          if (y < height - 3) {
            chunk.data[index] = VoxelType.STONE;
          } else if (y < height) {
            chunk.data[index] = VoxelType.DIRT;
          } else if (y === height) {
            chunk.data[index] = VoxelType.GRASS;
          } else {
            chunk.data[index] = VoxelType.AIR;
          }
        }

        if (isCenter) {
          const grassTop = height;
          for (let h = grassTop; h >= grassTop - 2 && h >= 0; h--) {
            const idx = this.getVoxelIndex(x, h, z);
            if (h === grassTop) {
              chunk.data[idx] = VoxelType.GRASS;
            } else {
              chunk.data[idx] = VoxelType.DIRT;
            }
          }
        }
      }
    }
  }

  private getVoxelIndex(x: number, y: number, z: number): number {
    return x + y * CHUNK_SIZE + z * CHUNK_SIZE * this.worldHeight;
  }

  private worldToChunk(worldX: number, worldY: number, worldZ: number): { chunkX: number; chunkZ: number; localX: number; localY: number; localZ: number } {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return { chunkX, chunkZ, localX, localY: worldY, localZ };
  }

  private isInEditableRange(chunkX: number, chunkZ: number): boolean {
    return Math.abs(chunkX) <= EDITABLE_RADIUS && Math.abs(chunkZ) <= EDITABLE_RADIUS;
  }

  getVoxel(worldX: number, worldY: number, worldZ: number): VoxelType {
    if (worldY < 0 || worldY >= this.worldHeight) return VoxelType.AIR;

    const { chunkX, chunkZ, localX, localY, localZ } = this.worldToChunk(worldX, worldY, worldZ);
    const chunk = this.chunks.get(this.getKey(chunkX, chunkZ));

    if (!chunk) return VoxelType.AIR;

    const index = this.getVoxelIndex(localX, localY, localZ);
    return chunk.data[index] as VoxelType;
  }

  setVoxel(worldX: number, worldY: number, worldZ: number, type: VoxelType): boolean {
    if (worldY < 0 || worldY >= this.worldHeight) return false;

    const { chunkX, chunkZ, localX, localY, localZ } = this.worldToChunk(worldX, worldY, worldZ);

    if (!this.isInEditableRange(chunkX, chunkZ)) return false;

    const chunk = this.chunks.get(this.getKey(chunkX, chunkZ));
    if (!chunk) return false;

    const index = this.getVoxelIndex(localX, localY, localZ);
    const oldType = chunk.data[index];

    if (oldType === type) return false;

    chunk.data[index] = type;
    chunk.dirty = true;

    if (localX === 0) {
      const neighbor = this.chunks.get(this.getKey(chunkX - 1, chunkZ));
      if (neighbor) neighbor.dirty = true;
    }
    if (localX === CHUNK_SIZE - 1) {
      const neighbor = this.chunks.get(this.getKey(chunkX + 1, chunkZ));
      if (neighbor) neighbor.dirty = true;
    }
    if (localZ === 0) {
      const neighbor = this.chunks.get(this.getKey(chunkX, chunkZ - 1));
      if (neighbor) neighbor.dirty = true;
    }
    if (localZ === CHUNK_SIZE - 1) {
      const neighbor = this.chunks.get(this.getKey(chunkX, chunkZ + 1));
      if (neighbor) neighbor.dirty = true;
    }

    return true;
  }

  removeVoxel(worldX: number, worldY: number, worldZ: number): boolean {
    return this.setVoxel(worldX, worldY, worldZ, VoxelType.AIR);
  }

  getChunks(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  getDirtyChunks(): Chunk[] {
    return this.getChunks().filter(c => c.dirty);
  }

  markClean(chunk: Chunk): void {
    chunk.dirty = false;
  }

  getVoxelCount(): number {
    let count = 0;
    for (const chunk of this.chunks.values()) {
      for (let i = 0; i < chunk.data.length; i++) {
        if (chunk.data[i] !== VoxelType.AIR) count++;
      }
    }
    return count;
  }

  getPlacedVoxelCount(): number {
    let count = 0;
    const halfGrid = Math.floor(this.gridSize / 2);

    for (let cx = -halfGrid; cx <= halfGrid; cx++) {
      for (let cz = -halfGrid; cz <= halfGrid; cz++) {
        if (!this.isInEditableRange(cx, cz)) continue;

        const chunk = this.chunks.get(this.getKey(cx, cz));
        if (!chunk) continue;

        for (let i = 0; i < chunk.data.length; i++) {
          if (chunk.data[i] === VoxelType.BRICK) count++;
        }
      }
    }
    return count;
  }
}
