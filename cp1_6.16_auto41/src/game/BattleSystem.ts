import {
  Tower,
  Enemy,
  Projectile,
  TowerType,
  TOWER_CONFIGS,
  DAMAGE_PER_LEVEL,
  SPEED_PER_LEVEL,
  SELL_RATIO,
  UPGRADE_COSTS,
  INITIAL_GOLD,
  INITIAL_LIVES,
  WAVE_REWARD,
  WAVE_COUNTDOWN,
  TOTAL_WAVES,
  GameState,
  GameData,
  eventBus,
  GAME_EVENTS
} from '../types/index';

const MAX_PROJECTILE_POOL = 500;
const PROJECTILE_SPEED = 600;

type MapGridRef = {
  getTowers(): Tower[];
  getTower(id: string): Tower | null;
};

type EnemyManagerRef = {
  getEnemies(): Enemy[];
  getEnemyById(id: string): Enemy | null;
  applyDamage(id: string, damage: number): Enemy | null;
  applySlow(id: string, factor: number, duration: number): Enemy | null;
  applyStun(id: string, duration: number): Enemy | null;
  getEnemiesInRange(cx: number, cy: number, range: number): Enemy[];
  isWaveActive(): boolean;
};

export class BattleSystem {
  private mapGrid: MapGridRef;
  private enemyManager: EnemyManagerRef;
  private projectiles: Projectile[];
  private projectilePool: Projectile[];
  private gold: number;
  private lives: number;
  private state: GameState;
  private currentWave: number;
  private waveCountdown: number;
  private cellSize: number;
  private elapsedTime: number;
  private paused: boolean;
  private nextId: number;

  constructor(mapGrid: MapGridRef, enemyManager: EnemyManagerRef, cellSize: number) {
    this.mapGrid = mapGrid;
    this.enemyManager = enemyManager;
    this.projectiles = [];
    this.projectilePool = [];
    this.gold = INITIAL_GOLD;
    this.lives = INITIAL_LIVES;
    this.state = 'preparing';
    this.currentWave = 0;
    this.waveCountdown = WAVE_COUNTDOWN;
    this.cellSize = cellSize;
    this.elapsedTime = 0;
    this.paused = false;
    this.nextId = 1;
    this.initPool();
    this.setupEventListeners();
  }

  private initPool(): void {
    for (let i = 0; i < MAX_PROJECTILE_POOL; i++) {
      this.projectilePool.push(this.createEmptyProjectile());
    }
  }

  private createEmptyProjectile(): Projectile {
    return {
      id: '',
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      targetId: '',
      towerType: 'arrow',
      damage: 0,
      speed: PROJECTILE_SPEED,
      color: '#fff',
      active: false
    };
  }

  private setupEventListeners(): void {
    eventBus.on(GAME_EVENTS.TOWER_PLACED, (tower: Tower) => {
      const cost = TOWER_CONFIGS[tower.type].buildCost;
      this.spendGold(cost);
    });

    eventBus.on(GAME_EVENTS.TOWER_UPGRADED, (tower: Tower) => {
      const cost = UPGRADE_COSTS[tower.level];
      this.spendGold(cost);
    });

    eventBus.on(GAME_EVENTS.TOWER_SOLD, (tower: Tower) => {
      const refund = Math.floor(tower.totalCost * SELL_RATIO);
      this.addGold(refund);
    });

    eventBus.on(GAME_EVENTS.ENEMY_KILLED, (enemy: Enemy) => {
      this.addGold(enemy.reward);
    });

    eventBus.on(GAME_EVENTS.ENEMY_REACHED_END, (_enemy: Enemy) => {
      this.loseLife(1);
    });

    eventBus.on(GAME_EVENTS.WAVE_COMPLETE, () => {
      this.addGold(WAVE_REWARD);
      this.currentWave++;
      if (this.currentWave >= TOTAL_WAVES) {
        this.state = 'victory';
        eventBus.emit(GAME_EVENTS.VICTORY);
      } else {
        this.state = 'preparing';
        this.waveCountdown = WAVE_COUNTDOWN;
      }
    });

    eventBus.on(GAME_EVENTS.UI_START_WAVE, () => {
      this.startWaveNow();
    });

    eventBus.on(GAME_EVENTS.PAUSE_TOGGLE, () => {
      this.paused = !this.paused;
    });

    eventBus.on(GAME_EVENTS.RESTART, () => {
      this.reset();
    });
  }

  public reset(): void {
    for (const p of this.projectiles) {
      p.active = false;
      this.projectilePool.push(p);
    }
    this.projectiles = [];
    this.gold = INITIAL_GOLD;
    this.lives = INITIAL_LIVES;
    this.state = 'preparing';
    this.currentWave = 0;
    this.waveCountdown = WAVE_COUNTDOWN;
    this.elapsedTime = 0;
    this.paused = false;
    this.emitState();
    eventBus.emit(GAME_EVENTS.GOLD_CHANGED, this.gold);
    eventBus.emit(GAME_EVENTS.LIVES_CHANGED, this.lives);
  }

  public setCellSize(size: number): void {
    this.cellSize = size;
  }

  private addGold(amount: number): void {
    this.gold += amount;
    eventBus.emit(GAME_EVENTS.GOLD_CHANGED, this.gold);
  }

  private spendGold(amount: number): boolean {
    if (this.gold >= amount) {
      this.gold -= amount;
      eventBus.emit(GAME_EVENTS.GOLD_CHANGED, this.gold);
      return true;
    }
    return false;
  }

  public canAfford(amount: number): boolean {
    return this.gold >= amount;
  }

  public getGold(): number {
    return this.gold;
  }

  public getLives(): number {
    return this.lives;
  }

  private loseLife(amount: number): void {
    this.lives -= amount;
    if (this.lives < 0) this.lives = 0;
    eventBus.emit(GAME_EVENTS.LIVES_CHANGED, this.lives);
    if (this.lives <= 0) {
      this.state = 'gameover';
      eventBus.emit(GAME_EVENTS.GAME_OVER);
    }
  }

  private startWaveNow(): void {
    if (this.state !== 'preparing') return;
    this.state = 'wave_active';
    eventBus.emit(GAME_EVENTS.WAVE_START, this.currentWave);
  }

  public update(deltaTime: number): void {
    if (this.paused || this.state === 'gameover' || this.state === 'victory') return;

    this.elapsedTime += deltaTime;

    if (this.state === 'preparing') {
      this.waveCountdown -= deltaTime;
      if (this.waveCountdown <= 0) {
        this.waveCountdown = 0;
        this.startWaveNow();
      }
    }

    this.updateTowers();
    this.updateProjectiles(deltaTime);
    this.emitState();
  }

  private emitState(): void {
    const data: GameData = {
      state: this.state,
      gold: this.gold,
      lives: this.lives,
      currentWave: this.currentWave,
      waveCountdown: Math.max(0, this.waveCountdown)
    };
  }

  private getTowerStats(tower: Tower): { damage: number; attackInterval: number; range: number } {
    const cfg = TOWER_CONFIGS[tower.type];
    const levelMul = Math.pow(DAMAGE_PER_LEVEL, tower.level - 1);
    const speedMul = Math.pow(SPEED_PER_LEVEL, tower.level - 1);
    return {
      damage: cfg.baseDamage * levelMul,
      attackInterval: cfg.baseAttackInterval * speedMul,
      range: cfg.range
    };
  }

  private updateTowers(): void {
    const towers = this.mapGrid.getTowers();
    for (const tower of towers) {
      const stats = this.getTowerStats(tower);
      if (this.elapsedTime - tower.lastAttackTime < stats.attackInterval) continue;

      const towerX = (tower.gridX + 0.5) * this.cellSize;
      const towerY = (tower.gridY + 0.5) * this.cellSize;
      const inRange = this.enemyManager.getEnemiesInRange(towerX, towerY, stats.range);

      if (inRange.length === 0) continue;

      inRange.sort((a, b) => b.pathIndex - a.pathIndex);
      const target = inRange[0];

      this.fireTower(tower, target, stats.damage);
      tower.lastAttackTime = this.elapsedTime;
    }
  }

  private fireTower(tower: Tower, target: Enemy, damage: number): void {
    if (this.projectilePool.length === 0) return;

    const cfg = TOWER_CONFIGS[tower.type];
    const proj = this.projectilePool.pop()!;

    proj.id = `proj_${this.nextId++}`;
    proj.towerType = tower.type;
    proj.x = (tower.gridX + 0.5) * this.cellSize;
    proj.y = (tower.gridY + 0.5) * this.cellSize;
    proj.targetId = target.id;
    proj.targetX = target.x;
    proj.targetY = target.y;
    proj.damage = damage;
    proj.speed = PROJECTILE_SPEED;
    proj.color = cfg.projectileColor;
    proj.splashRadius = cfg.splashRadius ? cfg.splashRadius * this.cellSize : undefined;
    proj.stunDuration = cfg.stunDuration;
    proj.slowFactor = cfg.slowFactor;
    proj.slowDuration = cfg.slowDuration;
    proj.active = true;

    this.projectiles.push(proj);
  }

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active) continue;

      const target = this.enemyManager.getEnemyById(proj.targetId);
      if (target) {
        proj.targetX = target.x;
        proj.targetY = target.y;
      }

      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveDist = proj.speed * deltaTime;

      if (dist <= moveDist || !target) {
        this.hitTarget(proj);
        proj.active = false;
      } else {
        proj.x += (dx / dist) * moveDist;
        proj.y += (dy / dist) * moveDist;
      }

      if (!proj.active) {
        this.projectiles.splice(i, 1);
        this.projectilePool.push(proj);
      }
    }
  }

  private hitTarget(proj: Projectile): void {
    if (proj.splashRadius) {
      const inSplash = this.enemyManager.getEnemiesInRange(proj.targetX, proj.targetY, proj.splashRadius / this.cellSize);
      for (const enemy of inSplash) {
        this.enemyManager.applyDamage(enemy.id, proj.damage);
        if (proj.stunDuration) {
          this.enemyManager.applyStun(enemy.id, proj.stunDuration);
        }
      }
    } else {
      const enemy = this.enemyManager.getEnemyById(proj.targetId);
      if (enemy) {
        this.enemyManager.applyDamage(enemy.id, proj.damage);
        if (proj.slowFactor && proj.slowDuration) {
          this.enemyManager.applySlow(enemy.id, proj.slowFactor, proj.slowDuration);
        }
      }
    }
  }

  public getProjectiles(): Projectile[] {
    return this.projectiles.filter(p => p.active);
  }

  public getState(): GameState {
    return this.state;
  }

  public getCurrentWave(): number {
    return this.currentWave;
  }

  public getWaveCountdown(): number {
    return Math.max(0, this.waveCountdown);
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public getGameData(): GameData {
    return {
      state: this.state as GameState,
      gold: this.gold,
      lives: this.lives,
      currentWave: this.currentWave,
      waveCountdown: Math.max(0, this.waveCountdown)
    };
  }

  public canBuildTower(type: TowerType): boolean {
    return this.gold >= TOWER_CONFIGS[type].buildCost;
  }

  public canUpgradeTower(towerId: string): boolean {
    const tower = this.mapGrid.getTower(towerId);
    if (!tower || tower.level >= 3) return false;
    return this.gold >= UPGRADE_COSTS[tower.level + 1];
  }

  public getUpgradeCost(towerId: string): number | null {
    const tower = this.mapGrid.getTower(towerId);
    if (!tower || tower.level >= 3) return null;
    return UPGRADE_COSTS[tower.level + 1];
  }

  public getSellValue(towerId: string): number | null {
    const tower = this.mapGrid.getTower(towerId);
    if (!tower) return null;
    return Math.floor(tower.totalCost * SELL_RATIO);
  }
}
