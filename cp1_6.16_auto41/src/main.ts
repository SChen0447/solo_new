import { MapGrid } from './game/MapGrid';
import { EnemyManager } from './game/EnemyManager';
import { BattleSystem } from './game/BattleSystem';
import { UiRenderer } from './ui/UiRenderer';
import { eventBus, GAME_EVENTS, GRID_COLS, GRID_ROWS } from './types/index';

class Game {
  private mapGrid!: MapGrid;
  private enemyManager!: EnemyManager;
  private battleSystem!: BattleSystem;
  private uiRenderer!: UiRenderer;

  private canvas!: HTMLCanvasElement;
  private container!: HTMLElement;
  private cellSize: number = 40;

  private lastTime: number = 0;
  private running: boolean = false;
  private rafId: number | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }
    this.container = document.getElementById('game-container') as HTMLElement;
    if (!this.container) {
      throw new Error('Game container not found');
    }

    this.calcInitialCellSize();

    this.mapGrid = new MapGrid();

    const pathWorld = this.mapGrid.getWorldPath(this.cellSize);
    this.enemyManager = new EnemyManager(this.cellSize, pathWorld);

    this.battleSystem = new BattleSystem(
      this.mapGrid as any,
      this.enemyManager as any,
      this.cellSize
    );

    this.uiRenderer = new UiRenderer(
      this.canvas,
      this.container,
      this.mapGrid as any,
      this.battleSystem as any,
      this.enemyManager as any
    );

    this.syncSizes();

    window.addEventListener('resize', () => {
      this.syncSizes();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.uiRenderer['selectedBuildType'] = null;
        this.uiRenderer['selectedTowerId'] = null;
      }
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        eventBus.emit(GAME_EVENTS.PAUSE_TOGGLE);
      }
      if (e.key === 'r' || e.key === 'R') {
        eventBus.emit(GAME_EVENTS.RESTART);
      }
      if (e.key === '1') this.selectBuild('arrow');
      if (e.key === '2') this.selectBuild('magic');
      if (e.key === '3') this.selectBuild('cannon');
      if (e.key === '4') this.selectBuild('slow');
    });

    this.start();
  }

  private selectBuild(type: 'arrow' | 'magic' | 'cannon' | 'slow'): void {
    if (this.battleSystem.canBuildTower(type)) {
      this.uiRenderer['selectedBuildType'] = type;
      this.uiRenderer['selectedTowerId'] = null;
    }
  }

  private calcInitialCellSize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const sidePanel = 180;
    const topMargin = 70;
    const bottomMargin = 20;
    const availW = w - sidePanel - 40;
    const availH = h - topMargin - bottomMargin;
    const cellByW = Math.floor(availW / GRID_COLS);
    const cellByH = Math.floor(availH / GRID_ROWS);
    this.cellSize = Math.max(20, Math.min(cellByW, cellByH));
  }

  private syncSizes(): void {
    const newSize = this.uiRenderer.getCellSize();
    if (newSize !== this.cellSize) {
      this.cellSize = newSize;
      this.enemyManager.setCellSize(this.cellSize);
      this.enemyManager.setPath(this.mapGrid.getWorldPath(this.cellSize));
      this.battleSystem.setCellSize(this.cellSize);
    } else {
      this.enemyManager.setPath(this.mapGrid.getWorldPath(this.cellSize));
    }
  }

  private start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (now: number): void => {
    if (!this.running) return;

    let deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (deltaTime > 0.1) deltaTime = 0.1;
    if (deltaTime < 0) deltaTime = 0;

    this.syncSizes();

    this.enemyManager.update(deltaTime);
    this.battleSystem.update(deltaTime);
    this.uiRenderer.update(deltaTime);

    this.uiRenderer.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new Game();
    });
  } else {
    new Game();
  }
}

bootstrap();
