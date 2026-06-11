
import type { GameState, WaveConfig, WaveSpawn, TowerType } from '../shared/types';
import { generateWaves, PREP_TIME, START_GOLD, START_HP, GRID_COLS, GRID_ROWS } from '../shared/types';
import { eventBus } from '../shared/EventBus';
import { EnemyManager } from './EnemyManager';
import { TowerManager } from './TowerManager';

export class GameController {
  private state: GameState;
  private waves: WaveConfig[];
  private currentWaveSpawns: { spawn: WaveSpawn; spawned: number; timer: number }[] = [];
  private waveActive: boolean = false;
  private allSpawned: boolean = false;
  private waveKills: number = 0;
  private waveReward: number = 0;
  private enemyManager: EnemyManager;
  private towerManager: TowerManager;
  private lastTime: number = 0;
  private running: boolean = false;
  private canvasWidth: number = 1280;
  private canvasHeight: number = 720;
  private mapOffsetX: number = 0;
  private mapOffsetY: number = 0;
  private cellSize: number = 40;
  private pendingResize: boolean = false;

  constructor(enemyManager: EnemyManager, towerManager: TowerManager) {
    this.enemyManager = enemyManager;
    this.towerManager = towerManager;
    this.state = {
      gold: START_GOLD,
      wave: 0,
      hp: START_HP,
      maxHp: START_HP,
      kills: 0,
      prepTimer: PREP_TIME,
      isPlaying: false,
      isPreparing: true,
      gameOver: false,
      victory: false,
    };
    this.waves = generateWaves();
    this.bindEvents();
  }

  private bindEvents(): void {
    eventBus.on('UI:TowerSelected', (data) => {
      const d = data as { towerType: TowerType };
      this.towerManager.setSelectedTowerType(d.towerType);
    });
    eventBus.on('UI:TowerPlaced', (data) => {
      const d = data as { gridX: number; gridY: number; towerType: TowerType };
      this.handleTowerPlace(d.gridX, d.gridY, d.towerType);
    });
    eventBus.on('UI:GridClicked', (data) => {
      const d = data as { gridX: number; gridY: number };
      this.handleGridClick(d.gridX, d.gridY);
    });
    eventBus.on('UI:TowerUpgraded', (data) => {
      const d = data as { towerId: string };
      this.handleTowerUpgrade(d.towerId);
    });
    eventBus.on('UI:TowerSold', (data) => {
      const d = data as { towerId: string };
      this.handleTowerSell(d.towerId);
    });
    eventBus.on('UI:WaveStarted', () => {
      this.startWave();
    });
    eventBus.on('UI:Restart', () => {
      this.restart();
    });
    eventBus.on('Core:EnemyKilled', (data) => {
      const d = data as { goldReward: number };
      this.state.gold += d.goldReward;
      this.state.kills++;
      this.waveKills++;
      this.emitState();
    });
  }

  private handleGridClick(gridX: number, gridY: number): void {
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) return;
    const existing = this.towerManager.getTowerByGrid(gridX, gridY);
    if (existing) {
      this.towerManager.setSelectedTowerId(existing.id);
      this.towerManager.setSelectedTowerType(null);
      this.emitState();
      return;
    }
    const type = this.towerManager.getSelectedTowerType();
    if (type) {
      this.handleTowerPlace(gridX, gridY, type);
    } else {
      this.towerManager.setSelectedTowerId(null);
      this.emitState();
    }
  }

  private handleTowerPlace(gridX: number, gridY: number, type: TowerType): void {
    if (gridX === 0 && gridY === Math.floor(GRID_ROWS / 2)) return;
    if (gridX === GRID_COLS - 1 && gridY === Math.floor(GRID_ROWS / 2)) return;

    this.enemyManager.blockCell(gridX, gridY);
    if (!this.enemyManager.canReachEnd()) {
      this.enemyManager.unblockCell(gridX, gridY);
      this.towerManager.setBlockedCells(this.towerManager.getTowers());
      return;
    }
    const result = this.towerManager.buildTower(gridX, gridY, type, this.state.gold);
    if (result.tower) {
      this.state.gold -= result.cost;
      this.towerManager.setBlockedCells(this.towerManager.getTowers());
      this.emitState();
    } else {
      this.enemyManager.unblockCell(gridX, gridY);
      this.towerManager.setBlockedCells(this.towerManager.getTowers());
    }
  }

  private handleTowerUpgrade(towerId: string): void {
    const result = this.towerManager.upgradeTower(towerId, this.state.gold);
    if (result.tower) {
      this.state.gold -= result.cost;
      this.emitState();
    }
  }

  private handleTowerSell(towerId: string): void {
    const tower = this.towerManager.getTower(towerId);
    if (!tower) return;
    const gridX = tower.gridX;
    const gridY = tower.gridY;
    const result = this.towerManager.sellTower(towerId);
    if (result.tower) {
      this.state.gold += result.refund;
      this.enemyManager.unblockCell(gridX, gridY);
      this.towerManager.setBlockedCells(this.towerManager.getTowers());
      this.towerManager.setSelectedTowerId(null);
      this.emitState();
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.state.isPlaying = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
    this.emitState();
  }

  stop(): void {
    this.running = false;
  }

  restart(): void {
    this.state = {
      gold: START_GOLD,
      wave: 0,
      hp: START_HP,
      maxHp: START_HP,
      kills: 0,
      prepTimer: PREP_TIME,
      isPlaying: true,
      isPreparing: true,
      gameOver: false,
      victory: false,
    };
    this.waves = generateWaves();
    this.waveActive = false;
    this.allSpawned = false;
    this.waveKills = 0;
    this.waveReward = 0;
    this.currentWaveSpawns = [];
    this.enemyManager.clearEnemies();
    this.towerManager.clearAll();
    this.towerManager.setSelectedTowerId(null);
    this.towerManager.setSelectedTowerType(null);
    this.towerManager.setBlockedCells([]);
    this.emitState();
  }

  setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.computeMapLayout();
  }

  private computeMapLayout(): void {
    const rightPanelW = Math.min(320, this.canvasWidth * 0.22);
    const bottomBarH = Math.min(80, this.canvasHeight * 0.1);
    const topBarH = Math.min(50, this.canvasHeight * 0.06);
    const mapW = this.canvasWidth - rightPanelW - 40;
    const mapH = this.canvasHeight - bottomBarH - topBarH - 40;
    this.cellSize = Math.floor(Math.min(mapW / GRID_COLS, mapH / GRID_ROWS));
    this.cellSize = Math.max(28, this.cellSize);
    const totalMapW = this.cellSize * GRID_COLS;
    const totalMapH = this.cellSize * GRID_ROWS;
    this.mapOffsetX = Math.floor(20 + (mapW - totalMapW) / 2);
    this.mapOffsetY = Math.floor(topBarH + 20 + (mapH - totalMapH) / 2);
    this.enemyManager.setMapDimensions(this.mapOffsetX, this.mapOffsetY, this.cellSize);
    this.towerManager.setMapDimensions(this.mapOffsetX, this.mapOffsetY, this.cellSize);
    for (const t of this.towerManager.getTowers()) {
      t.x = this.mapOffsetX + t.gridX * this.cellSize + this.cellSize / 2;
      t.y = this.mapOffsetY + t.gridY * this.cellSize + this.cellSize / 2;
    }
    this.towerManager.setBlockedCells(this.towerManager.getTowers());
    this.pendingResize = false;
  }

  getMapLayout(): { offsetX: number; offsetY: number; cellSize: number } {
    if (this.pendingResize) this.computeMapLayout();
    return { offsetX: this.mapOffsetX, offsetY: this.mapOffsetY, cellSize: this.cellSize };
  }

  requestResize(): void {
    this.pendingResize = true;
  }

  private startWave(): void {
    if (this.waveActive || this.state.gameOver || this.state.victory) return;
    if (this.state.wave >= this.waves.length) return;
    this.state.wave++;
    this.state.isPreparing = false;
    this.waveActive = true;
    this.allSpawned = false;
    this.waveKills = 0;
    this.waveReward = this.waves[this.state.wave - 1].reward;
    const waveCfg = this.waves[this.state.wave - 1];
    this.currentWaveSpawns = waveCfg.spawns.map((s) => ({
      spawn: s,
      spawned: 0,
      timer: -(s.delay ?? 0),
    }));
    this.emitState();
  }

  private loop(time: number): void {
    if (!this.running) return;
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;

    if (this.pendingResize) this.computeMapLayout();

    if (!this.state.gameOver && !this.state.victory) {
      this.update(dt);
    }

    eventBus.emit('Core:FrameUpdate', { dt });
    requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number): void {
    if (this.state.isPreparing) {
      this.state.prepTimer -= dt;
      if (this.state.prepTimer <= 0) {
        this.startWave();
      }
      this.towerManager.update(dt);
      this.enemyManager.update(dt, () => {});
      this.emitState();
      return;
    }

    if (this.waveActive) {
      let allDone = true;
      for (const s of this.currentWaveSpawns) {
        if (s.spawned < s.spawn.count) {
          allDone = false;
          s.timer += dt;
          while (s.timer >= s.spawn.interval && s.spawned < s.spawn.count) {
            s.timer -= s.spawn.interval;
            this.enemyManager.spawnEnemy(s.spawn.type, this.state.wave);
            s.spawned++;
          }
        }
      }
      this.allSpawned = allDone;
    }

    this.towerManager.update(dt);
    const { reachedEnd } = this.enemyManager.update(dt, () => {});
    for (const e of reachedEnd) {
      this.state.hp -= e.type === 'boss' ? 5 : 1;
      if (this.state.hp <= 0) {
        this.state.hp = 0;
        this.state.gameOver = true;
        eventBus.emit('Core:PlayerDied', {});
      }
    }

    if (this.waveActive && this.allSpawned && this.enemyManager.getEnemyCount() === 0) {
      this.waveActive = false;
      this.state.gold += this.waveReward;
      eventBus.emit('Core:WaveCompleted', {
        wave: this.state.wave,
        kills: this.waveKills,
        reward: this.waveReward,
      });
      if (this.state.wave >= this.waves.length) {
        this.state.victory = true;
      } else {
        this.state.isPreparing = true;
        this.state.prepTimer = PREP_TIME;
      }
    }

    this.emitState();
  }

  private emitState(): void {
    eventBus.emit('Core:GameStateUpdated', {
      ...this.state,
      waveCount: this.waves.length,
      towerCount: this.towerManager.getTowerCount(),
      selectedTowerType: this.towerManager.getSelectedTowerType(),
      selectedTowerId: this.towerManager.getSelectedTowerId(),
      selectedTower: this.towerManager.getSelectedTowerId()
        ? this.towerManager.getTower(this.towerManager.getSelectedTowerId()!)
        : null,
    });
  }

  getState(): GameState & { waveCount: number } {
    return { ...this.state, waveCount: this.waves.length };
  }

  getEnemyManager(): EnemyManager {
    return this.enemyManager;
  }

  getTowerManager(): TowerManager {
    return this.towerManager;
  }
}
