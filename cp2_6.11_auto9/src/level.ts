export const TILE_SIZE = 32;
export const MAP_WIDTH = 25;
export const MAP_HEIGHT = 15;
export const FOG_RADIUS = 4;
export const TOTAL_LEVELS = 5;
export const LEVEL_TIME = 30;
export const FRAGMENTS_PER_LEVEL = 3;

export enum TileType {
  FLOOR = 0,
  WALL = 1,
  EXIT = 2
}

export interface Position {
  x: number;
  y: number;
}

export interface Fragment {
  x: number;
  y: number;
  collected: boolean;
  rotation: number;
  glowPhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Footprint {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

export interface FogCell {
  alpha: number;
  flickerPhase: number;
  flickerSpeed: number;
  noisePhase: number;
  noiseSpeed: number;
  warpOffsetX: number;
  warpOffsetY: number;
  warpSpeed: number;
}

export class Level {
  private tiles: TileType[][];
  private fragments: Fragment[];
  private exitPos: Position;
  private startPos: Position;
  private fog: FogCell[][];
  private levelIndex: number;
  private collectedFragments: number;
  private timeRemaining: number;
  private particles: Particle[];
  private footprints: Footprint[];
  private exitPulsePhase: number;

  constructor(levelIndex: number) {
    this.levelIndex = levelIndex;
    this.tiles = [];
    this.fragments = [];
    this.exitPos = { x: 0, y: 0 };
    this.startPos = { x: 1, y: 1 };
    this.fog = [];
    this.collectedFragments = 0;
    this.timeRemaining = LEVEL_TIME;
    this.particles = [];
    this.footprints = [];
    this.exitPulsePhase = 0;
    this.generate();
  }

  private generate(): void {
    this.tiles = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.tiles[y][x] = TileType.WALL;
      }
    }

    this.generateMaze();

    const floorTiles: Position[] = [];
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      for (let x = 1; x < MAP_WIDTH - 1; x++) {
        if (this.tiles[y][x] === TileType.FLOOR) {
          floorTiles.push({ x, y });
        }
      }
    }

    this.shuffleArray(floorTiles);

    this.startPos = floorTiles[0];
    this.exitPos = floorTiles[floorTiles.length - 1];
    this.tiles[this.exitPos.y][this.exitPos.x] = TileType.EXIT;

    this.fragments = [];
    for (let i = 0; i < FRAGMENTS_PER_LEVEL; i++) {
      const idx = Math.floor(floorTiles.length * (i + 1) / (FRAGMENTS_PER_LEVEL + 1));
      const pos = floorTiles[idx];
      if (pos.x !== this.startPos.x || pos.y !== this.startPos.y) {
        this.fragments.push({
          x: pos.x,
          y: pos.y,
          collected: false,
          rotation: 0,
          glowPhase: Math.random() * Math.PI * 2
        });
      }
    }

    this.fog = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.fog[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.fog[y][x] = {
          alpha: 0.9,
          flickerPhase: Math.random() * Math.PI * 2,
          flickerSpeed: 0.05 + Math.random() * 0.1,
          noisePhase: Math.random() * Math.PI * 2,
          noiseSpeed: 0.08 + Math.random() * 0.12,
          warpOffsetX: Math.random() * Math.PI * 2,
          warpOffsetY: Math.random() * Math.PI * 2,
          warpSpeed: 0.03 + Math.random() * 0.05
        };
      }
    }
  }

  private generateMaze(): void {
    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      for (let x = 1; x < MAP_WIDTH - 1; x++) {
        this.tiles[y][x] = TileType.FLOOR;
      }
    }

    const wallCount = 60 + this.levelIndex * 10;
    for (let i = 0; i < wallCount; i++) {
      const x = 2 + Math.floor(Math.random() * (MAP_WIDTH - 4));
      const y = 2 + Math.floor(Math.random() * (MAP_HEIGHT - 4));
      this.tiles[y][x] = TileType.WALL;
    }

    this.ensureConnectivity();
  }

  private ensureConnectivity(): void {
    const visited: boolean[][] = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      visited[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        visited[y][x] = false;
      }
    }

    const queue: Position[] = [{ x: 1, y: 1 }];
    visited[1][1] = true;
    const floorPositions: Position[] = [];

    while (queue.length > 0) {
      const pos = queue.shift()!;
      floorPositions.push(pos);

      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
      ];

      for (const dir of dirs) {
        const nx = pos.x + dir.dx;
        const ny = pos.y + dir.dy;
        if (nx >= 1 && nx < MAP_WIDTH - 1 && ny >= 1 && ny < MAP_HEIGHT - 1 &&
            !visited[ny][nx] && this.tiles[ny][nx] === TileType.FLOOR) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      for (let x = 1; x < MAP_WIDTH - 1; x++) {
        if (this.tiles[y][x] === TileType.FLOOR && !visited[y][x]) {
          this.tiles[y][x] = TileType.WALL;
        }
      }
    }
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  public update(deltaTime: number, playerX: number, playerY: number): void {
    this.timeRemaining -= deltaTime;
    if (this.timeRemaining < 0) this.timeRemaining = 0;

    this.exitPulsePhase += deltaTime * 2;

    for (const fragment of this.fragments) {
      if (!fragment.collected) {
        fragment.rotation += deltaTime * 3;
        fragment.glowPhase += deltaTime * 4;
      }
    }

    this.updateFog(deltaTime, playerX, playerY);

    this.updateParticles(deltaTime);

    this.updateFootprints(deltaTime);

    this.checkFragmentCollection(playerX, playerY);
  }

  private updateFog(deltaTime: number, playerX: number, playerY: number): void {
    const px = playerX / TILE_SIZE + 0.5;
    const py = playerY / TILE_SIZE + 0.5;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const dx = x + 0.5 - px;
        const dy = y + 0.5 - py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetAlpha = 0;
        if (dist > FOG_RADIUS) {
          targetAlpha = Math.min(0.9, (dist - FOG_RADIUS) / 3);
        }

        this.fog[y][x].alpha += (targetAlpha - this.fog[y][x].alpha) * 0.1;
        this.fog[y][x].flickerPhase += this.fog[y][x].flickerSpeed;
        this.fog[y][x].noisePhase += this.fog[y][x].noiseSpeed;
        this.fog[y][x].warpOffsetX += this.fog[y][x].warpSpeed;
        this.fog[y][x].warpOffsetY += this.fog[y][x].warpSpeed * 0.7;
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateFootprints(deltaTime: number): void {
    const maxFootprints = 20;
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      this.footprints[i].age += deltaTime;
      if (this.footprints[i].age >= this.footprints[i].maxAge) {
        this.footprints.splice(i, 1);
      }
    }
    while (this.footprints.length > maxFootprints) {
      this.footprints.shift();
    }
  }

  private checkFragmentCollection(playerX: number, playerY: number): void {
    const px = playerX / TILE_SIZE + 0.5;
    const py = playerY / TILE_SIZE + 0.5;

    for (const fragment of this.fragments) {
      if (!fragment.collected) {
        const dx = fragment.x + 0.5 - px;
        const dy = fragment.y + 0.5 - py;
        if (dx * dx + dy * dy < 0.6) {
          fragment.collected = true;
          this.collectedFragments++;
          this.spawnCollectionParticles(
            fragment.x * TILE_SIZE + TILE_SIZE / 2,
            fragment.y * TILE_SIZE + TILE_SIZE / 2
          );
        }
      }
    }
  }

  private spawnCollectionParticles(x: number, y: number): void {
    const maxParticles = 60;
    const newParticleCount = 20;
    
    while (this.particles.length + newParticleCount > maxParticles) {
      this.particles.shift();
    }
    
    for (let i = 0; i < newParticleCount; i++) {
      if (this.particles.length >= maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color: `hsl(${40 + Math.random() * 20}, 100%, ${50 + Math.random() * 30}%)`,
        size: 2 + Math.random() * 3
      });
    }
  }

  public addFootprint(x: number, y: number): void {
    if (this.footprints.length >= 20) {
      this.footprints.shift();
    }
    this.footprints.push({
      x,
      y,
      age: 0,
      maxAge: 3
    });
  }

  public isWalkable(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileX >= MAP_WIDTH || tileY < 0 || tileY >= MAP_HEIGHT) {
      return false;
    }
    return this.tiles[tileY][tileX] !== TileType.WALL;
  }

  public isNearExit(playerX: number, playerY: number): boolean {
    const px = playerX / TILE_SIZE + 0.5;
    const py = playerY / TILE_SIZE + 0.5;
    const dx = this.exitPos.x + 0.5 - px;
    const dy = this.exitPos.y + 0.5 - py;
    return dx * dx + dy * dy < 1.0;
  }

  public canExit(): boolean {
    return this.collectedFragments >= FRAGMENTS_PER_LEVEL;
  }

  public isTimeUp(): boolean {
    return this.timeRemaining <= 0;
  }

  public getTiles(): TileType[][] { return this.tiles; }
  public getStartPosition(): Position { return this.startPos; }
  public getExitPosition(): Position { return this.exitPos; }
  public getFragments(): Fragment[] { return this.fragments; }
  public getFog(): FogCell[][] { return this.fog; }
  public getCollectedFragments(): number { return this.collectedFragments; }
  public getTimeRemaining(): number { return this.timeRemaining; }
  public getLevelIndex(): number { return this.levelIndex; }
  public getParticles(): Particle[] { return this.particles; }
  public getFootprints(): Footprint[] { return this.footprints; }
  public getExitPulsePhase(): number { return this.exitPulsePhase; }
}
