import { generateMaze, getRandomPathCells, type MazeData } from './mazeGenerator';
import { ParticleSystem } from './particleSystem';
import {
  MazeRenderer,
  generateIceCracks,
  type Position,
  type Crystal,
  type Chest,
  type TrailCell,
  type RendererState
} from './mazeRenderer';

export interface GameHUD {
  floor: HTMLElement;
  crystal: HTMLElement;
  chest: HTMLElement;
  timer: HTMLElement;
  startScreen: HTMLElement;
  levelClearScreen: HTMLElement;
  clearTime: HTMLElement;
  clearCrystals: HTMLElement;
  clearChests: HTMLElement;
}

export interface GameConfig {
  mazeSize: number;
  canvas: HTMLCanvasElement;
  hud: GameHUD;
}

export class GameEngine {
  private renderer: MazeRenderer;
  private particles: ParticleSystem;
  private hud: GameHUD;
  private mazeSize: number;

  private maze: MazeData;
  private player: Position;
  private playerPx: { x: number; y: number };
  private moveTarget: { x: number; y: number } | null;
  private moveDirection: { x: number; y: number };
  private moveProgress: number;
  private readonly moveDuration = 110;

  private crystals: Crystal[];
  private chests: Chest[];
  private trails: TrailCell[];
  private portal: Position | null;
  private portalActive: boolean;

  private floor: number;
  private crystalsCollected: number;
  private chestsCollected: number;
  private readonly totalCrystals = 5;
  private readonly totalChests = 3;

  private shake: { intensity: number; duration: number; elapsed: number };
  private wallFlash: { duration: number; elapsed: number };

  private time: number;
  private levelStartTime: number;
  private elapsedTime: number;
  private lastFrame: number;
  private running: boolean;
  private paused: boolean;
  private animFrameId: number | null;

  private keysPressed: Set<string>;
  private readonly playerPxRadiusRatio = 0.32;

  private onLevelClearCallback: (() => void) | null;

  constructor(config: GameConfig) {
    this.mazeSize = config.mazeSize;
    this.hud = config.hud;
    this.renderer = new MazeRenderer(config.canvas);
    this.particles = new ParticleSystem({ maxParticles: 1000, targetFPS: 60 });

    this.maze = generateMaze(this.mazeSize);
    this.player = { x: 1, y: 1 };
    this.playerPx = { x: 0, y: 0 };
    this.moveTarget = null;
    this.moveDirection = { x: 0, y: 0 };
    this.moveProgress = 0;

    this.crystals = [];
    this.chests = [];
    this.trails = [];
    this.portal = null;
    this.portalActive = false;

    this.floor = 1;
    this.crystalsCollected = 0;
    this.chestsCollected = 0;

    this.shake = { intensity: 0, duration: 0, elapsed: 0 };
    this.wallFlash = { duration: 0, elapsed: 0 };

    this.time = 0;
    this.levelStartTime = 0;
    this.elapsedTime = 0;
    this.lastFrame = performance.now();
    this.running = false;
    this.paused = false;
    this.animFrameId = null;

    this.keysPressed = new Set();
    this.onLevelClearCallback = null;

    this.initLevel();
    this.bindEvents();
  }

  public setOnLevelClear(cb: () => void): void {
    this.onLevelClearCallback = cb;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.levelStartTime = performance.now();
    this.lastFrame = performance.now();
    this.loop();
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
    this.lastFrame = performance.now();
  }

  public stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public nextFloor(): void {
    this.floor++;
    this.initLevel();
    this.levelStartTime = performance.now();
    this.updateHUD();
  }

  public resize(): void {
    this.renderer.resize();
  }

  public getState(): { floor: number; time: number; crystals: number; chests: number } {
    return {
      floor: this.floor,
      time: this.elapsedTime,
      crystals: this.crystalsCollected,
      chests: this.chestsCollected
    };
  }

  private initLevel(): void {
    this.maze = generateMaze(this.mazeSize);
    this.player = { x: 1, y: 1 };
    this.moveTarget = null;
    this.moveDirection = { x: 0, y: 0 };
    this.moveProgress = 0;

    this.crystalsCollected = 0;
    this.chestsCollected = 0;

    this.trails = [];
    this.portal = null;
    this.portalActive = false;

    this.particles.clear();
    this.shake = { intensity: 0, duration: 0, elapsed: 0 };
    this.wallFlash = { duration: 0, elapsed: 0 };
    this.elapsedTime = 0;

    const exclude: Position[] = [this.player];
    const crystalCells = getRandomPathCells(this.maze, this.totalCrystals, exclude);
    this.crystals = crystalCells.map((c) => ({ ...c, collected: false }));
    exclude.push(...crystalCells);

    const chestCells = getRandomPathCells(this.maze, this.totalChests, exclude);
    this.chests = chestCells.map((c) => ({ ...c, collected: false }));
    exclude.push(...chestCells);

    const portalCells = getRandomPathCells(this.maze, 1, exclude);
    if (portalCells.length > 0) {
      this.portal = portalCells[0];
    }

    this.addTrail(this.player.x, this.player.y, { x: 0, y: -1 });
    this.syncPlayerPxFromGrid();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public unbindEvents(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.running || this.paused) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
      e.preventDefault();
    }
    this.keysPressed.add(e.key);

    if (!this.moveTarget) {
      this.tryStartMove();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysPressed.delete(e.key);
  };

  private tryStartMove(): void {
    let dx = 0;
    let dy = 0;

    if (this.keysPressed.has('ArrowUp') || this.keysPressed.has('w') || this.keysPressed.has('W')) dy = -1;
    else if (this.keysPressed.has('ArrowDown') || this.keysPressed.has('s') || this.keysPressed.has('S')) dy = 1;
    else if (this.keysPressed.has('ArrowLeft') || this.keysPressed.has('a') || this.keysPressed.has('A')) dx = -1;
    else if (this.keysPressed.has('ArrowRight') || this.keysPressed.has('d') || this.keysPressed.has('D')) dx = 1;

    if (dx === 0 && dy === 0) return;

    const targetX = this.player.x + dx;
    const targetY = this.player.y + dy;

    if (!this.canMovePixel(targetX, targetY)) {
      this.triggerWallCollision(dx, dy);
      return;
    }

    this.moveTarget = { x: targetX, y: targetY };
    this.moveDirection = { x: dx, y: dy };
    this.moveProgress = 0;
  }

  private canMovePixel(targetX: number, targetY: number): boolean {
    if (
      targetX < 0 ||
      targetX >= this.maze.size ||
      targetY < 0 ||
      targetY >= this.maze.size
    ) {
      return false;
    }
    if (this.maze.grid[targetY][targetX] === 1) {
      return false;
    }
    return true;
  }

  private triggerWallCollision(dx: number, dy: number): void {
    const layout = this.renderer.computeLayout(this.maze);
    const center = this.renderer.gridToWorld(this.player.x, this.player.y, true);
    const hitX = center.x + dx * layout.cellSize * 0.45;
    const hitY = center.y + dy * layout.cellSize * 0.45;

    this.particles.emitWallHit(hitX, hitY);

    this.wallFlash = { duration: 250, elapsed: 0 };
    this.shake = { intensity: 8, duration: 100, elapsed: 0 };
  }

  private addTrail(gx: number, gy: number, entryDir: { x: number; y: number }): void {
    if (this.trails.some((t) => t.x === gx && t.y === gy)) return;
    const dir = entryDir.x === 0 && entryDir.y === 0 ? { x: 0, y: -1 } : entryDir;
    this.trails.push({
      x: gx,
      y: gy,
      cracks: generateIceCracks(gx, gy, dir),
      seed: gx * 1000 + gy
    });
  }

  private syncPlayerPxFromGrid(): void {
    const pos = this.renderer.gridToWorld(this.player.x, this.player.y, true);
    this.playerPx.x = pos.x;
    this.playerPx.y = pos.y;
  }

  private updatePlayer(deltaTime: number): void {
    if (!this.moveTarget) return;

    this.moveProgress += deltaTime;
    const t = Math.min(1, this.moveProgress / this.moveDuration);

    const easeT = this.easeOutQuad(t);

    const from = this.renderer.gridToWorld(this.player.x, this.player.y, true);
    const to = this.renderer.gridToWorld(this.moveTarget.x, this.moveTarget.y, true);
    this.playerPx.x = from.x + (to.x - from.x) * easeT;
    this.playerPx.y = from.y + (to.y - from.y) * easeT;

    this.particles.emitFrostTrail(this.playerPx.x, this.playerPx.y, this.moveDirection);

    if (t >= 1) {
      this.player = { x: this.moveTarget.x, y: this.moveTarget.y };
      this.syncPlayerPxFromGrid();
      this.addTrail(this.player.x, this.player.y, this.moveDirection);
      this.moveTarget = null;
      this.moveProgress = 0;

      this.checkPickups();
      this.tryStartMove();
    }
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private checkPickups(): void {
    const { x, y } = this.player;
    const layout = this.renderer.computeLayout(this.maze);
    const world = this.renderer.gridToWorld(x, y, true);

    for (const crystal of this.crystals) {
      if (!crystal.collected && crystal.x === x && crystal.y === y) {
        crystal.collected = true;
        this.crystalsCollected++;
        this.particles.emitCrystalCollect(world.x, world.y);
        this.updateHUD();

        if (this.crystalsCollected >= this.totalCrystals && this.portal) {
          this.portalActive = true;
        }
      }
    }

    for (const chest of this.chests) {
      if (!chest.collected && chest.x === x && chest.y === y) {
        chest.collected = true;
        this.chestsCollected++;
        this.particles.emitChestCollect(world.x, world.y);
        this.updateHUD();
      }
    }

    if (this.portalActive && this.portal && this.portal.x === x && this.portal.y === y) {
      this.triggerLevelClear(world.x, world.y, layout);
    }
  }

  private triggerLevelClear(px: number, py: number, layout: { canvasWidth: number; canvasHeight: number }): void {
    this.particles.emitPortalBurst(
      layout.canvasWidth / 2,
      layout.canvasHeight / 2,
      layout.canvasWidth,
      layout.canvasHeight
    );

    this.shake = { intensity: 14, duration: 400, elapsed: 0 };

    setTimeout(() => {
      if (this.onLevelClearCallback) {
        this.onLevelClearCallback();
      } else {
        this.showLevelClearScreen();
      }
    }, 900);

    this.paused = true;
  }

  public showLevelClearScreen(): void {
    const state = this.getState();
    this.hud.clearTime.textContent = this.formatTime(state.time);
    this.hud.clearCrystals.textContent = `${state.crystals} / ${this.totalCrystals}`;
    this.hud.clearChests.textContent = `${state.chests} / ${this.totalChests}`;
    this.hud.levelClearScreen.classList.remove('hidden');
  }

  public hideLevelClearScreen(): void {
    this.hud.levelClearScreen.classList.add('hidden');
  }

  private updateHUD(): void {
    this.hud.floor.textContent = String(this.floor);
    this.hud.crystal.textContent = String(this.crystalsCollected);
    this.hud.chest.textContent = `${this.chestsCollected} / ${this.totalChests}`;
  }

  private updateTimer(): void {
    if (!this.running || this.paused) return;
    this.elapsedTime = performance.now() - this.levelStartTime;
    this.hud.timer.textContent = this.formatTime(this.elapsedTime);
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    let deltaTime = now - this.lastFrame;
    this.lastFrame = now;

    if (deltaTime > 100) deltaTime = 100;

    if (!this.paused) {
      this.time += deltaTime;
      this.updatePlayer(deltaTime);

      if (this.shake.elapsed < this.shake.duration) {
        this.shake.elapsed += deltaTime;
      }
      if (this.wallFlash.elapsed < this.wallFlash.duration) {
        this.wallFlash.elapsed += deltaTime;
      }

      this.particles.update(deltaTime);
      this.particles.recordFrame();
      this.updateTimer();
    }

    const state: RendererState = {
      maze: this.maze,
      player: this.player,
      crystals: this.crystals,
      chests: this.chests,
      trails: this.trails,
      portal: this.portal,
      portalActive: this.portalActive,
      shake: { ...this.shake },
      wallFlash: { ...this.wallFlash },
      time: this.time
    };

    this.renderer.render(state);

    const ctx = this.renderer.getContext();
    this.particles.render(ctx);

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}
