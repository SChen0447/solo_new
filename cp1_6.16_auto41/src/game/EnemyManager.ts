import {
  Enemy,
  EnemyType,
  ENEMY_CONFIGS,
  WAVES,
  TOTAL_WAVES,
  eventBus,
  GAME_EVENTS,
  WaveEnemyDef
} from '../types/index';

const MAX_ENEMY_POOL = 200;

export class EnemyManager {
  private enemies: Enemy[];
  private enemyPool: Enemy[];
  private pathWorld: Array<{ x: number; y: number }>;
  private cellSize: number;
  private currentWave: number;
  private waveActive: boolean;
  private spawnQueue: Array<{ type: EnemyType; delay: number }>;
  private spawnTimer: number;
  private nextId: number;

  constructor(cellSize: number, pathWorld: Array<{ x: number; y: number }>) {
    this.enemies = [];
    this.enemyPool = [];
    this.pathWorld = pathWorld;
    this.cellSize = cellSize;
    this.currentWave = 0;
    this.waveActive = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.nextId = 1;
    this.initPool();
    this.setupEventListeners();
  }

  private initPool(): void {
    for (let i = 0; i < MAX_ENEMY_POOL; i++) {
      this.enemyPool.push(this.createEmptyEnemy());
    }
  }

  private createEmptyEnemy(): Enemy {
    return {
      id: '',
      type: 'normal',
      hp: 0,
      maxHp: 0,
      baseSpeed: 0,
      x: 0,
      y: 0,
      pathIndex: 0,
      slowTimer: 0,
      slowFactor: 1,
      stunTimer: 0,
      reward: 0,
      size: 0,
      color: '#000',
      active: false
    };
  }

  private setupEventListeners(): void {
    eventBus.on(GAME_EVENTS.WAVE_START, (waveIndex: number) => {
      this.startWave(waveIndex);
    });

    eventBus.on(GAME_EVENTS.RESTART, () => {
      this.reset();
    });
  }

  public reset(): void {
    for (const enemy of this.enemies) {
      enemy.active = false;
      this.enemyPool.push(enemy);
    }
    this.enemies = [];
    this.currentWave = 0;
    this.waveActive = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
  }

  public setPath(pathWorld: Array<{ x: number; y: number }>): void {
    this.pathWorld = pathWorld;
  }

  public setCellSize(cellSize: number): void {
    this.cellSize = cellSize;
  }

  public startWave(waveIndex: number): void {
    if (waveIndex < 0 || waveIndex >= TOTAL_WAVES) return;
    this.currentWave = waveIndex;
    this.waveActive = true;
    this.spawnQueue = [];
    this.spawnTimer = 0;

    const wave = WAVES[waveIndex];
    let totalDelay = 0;

    for (const def of wave.enemies) {
      for (let i = 0; i < def.count; i++) {
        this.spawnQueue.push({
          type: def.type,
          delay: totalDelay + i * def.interval
        });
      }
      totalDelay += def.count * def.interval;
    }
  }

  private spawnEnemy(type: EnemyType): Enemy | null {
    if (this.enemyPool.length === 0) return null;

    const config = ENEMY_CONFIGS[type];
    const wave = WAVES[this.currentWave];
    const hpMul = wave ? wave.hpMultiplier : 1;
    const enemy = this.enemyPool.pop()!;

    enemy.id = `enemy_${this.nextId++}`;
    enemy.type = type;
    enemy.maxHp = Math.floor(config.baseHp * hpMul);
    enemy.hp = enemy.maxHp;
    enemy.baseSpeed = config.speed;
    enemy.size = config.size;
    enemy.color = config.color;
    enemy.reward = config.reward;
    enemy.pathIndex = 0;
    enemy.slowTimer = 0;
    enemy.slowFactor = 1;
    enemy.stunTimer = 0;
    enemy.active = true;

    if (this.pathWorld.length > 0) {
      enemy.x = this.pathWorld[0].x;
      enemy.y = this.pathWorld[0].y;
    }

    this.enemies.push(enemy);
    return enemy;
  }

  public update(deltaTime: number): void {
    if (this.waveActive && this.spawnQueue.length > 0) {
      this.spawnTimer += deltaTime;
      while (this.spawnQueue.length > 0 && this.spawnTimer >= this.spawnQueue[0].delay) {
        const toSpawn = this.spawnQueue.shift()!;
        this.spawnEnemy(toSpawn.type);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active) continue;
      this.updateEnemy(enemy, deltaTime);

      if (enemy.pathIndex >= this.pathWorld.length - 1) {
        const reached = this.pathWorld[this.pathWorld.length - 1];
        if (Math.abs(enemy.x - reached.x) < 2 && Math.abs(enemy.y - reached.y) < 2) {
          eventBus.emit(GAME_EVENTS.ENEMY_REACHED_END, enemy);
          enemy.active = false;
        }
      }

      if (!enemy.active) {
        this.enemies.splice(i, 1);
        this.enemyPool.push(enemy);
      }
    }

    if (this.waveActive && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveActive = false;
      eventBus.emit(GAME_EVENTS.WAVE_COMPLETE, this.currentWave);
    }
  }

  private updateEnemy(enemy: Enemy, deltaTime: number): void {
    if (enemy.stunTimer > 0) {
      enemy.stunTimer -= deltaTime;
      if (enemy.stunTimer < 0) enemy.stunTimer = 0;
      return;
    }

    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= deltaTime;
      if (enemy.slowTimer <= 0) {
        enemy.slowTimer = 0;
        enemy.slowFactor = 1;
      }
    }

    if (enemy.pathIndex >= this.pathWorld.length - 1) return;

    const target = this.pathWorld[enemy.pathIndex + 1];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const speed = enemy.baseSpeed * this.cellSize * enemy.slowFactor;
    const moveDist = speed * deltaTime;

    if (dist <= moveDist) {
      enemy.x = target.x;
      enemy.y = target.y;
      enemy.pathIndex++;
    } else {
      enemy.x += (dx / dist) * moveDist;
      enemy.y += (dy / dist) * moveDist;
    }
  }

  public getEnemies(): Enemy[] {
    return this.enemies.filter(e => e.active);
  }

  public getEnemyById(id: string): Enemy | null {
    return this.enemies.find(e => e.id === id && e.active) || null;
  }

  public applyDamage(enemyId: string, damage: number): Enemy | null {
    const enemy = this.getEnemyById(enemyId);
    if (!enemy) return null;

    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.active = false;
      eventBus.emit(GAME_EVENTS.ENEMY_KILLED, enemy);
    }
    return enemy;
  }

  public applySlow(enemyId: string, factor: number, duration: number): Enemy | null {
    const enemy = this.getEnemyById(enemyId);
    if (!enemy) return null;
    enemy.slowFactor = Math.min(enemy.slowFactor, factor);
    enemy.slowTimer = Math.max(enemy.slowTimer, duration);
    return enemy;
  }

  public applyStun(enemyId: string, duration: number): Enemy | null {
    const enemy = this.getEnemyById(enemyId);
    if (!enemy) return null;
    enemy.stunTimer = Math.max(enemy.stunTimer, duration);
    return enemy;
  }

  public getEnemiesInRange(cx: number, cy: number, rangeCells: number): Enemy[] {
    const range = rangeCells * this.cellSize;
    const result: Enemy[] = [];
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const dx = enemy.x - cx;
      const dy = enemy.y - cy;
      if (dx * dx + dy * dy <= range * range) {
        result.push(enemy);
      }
    }
    return result;
  }

  public isWaveActive(): boolean {
    return this.waveActive;
  }

  public getCurrentWave(): number {
    return this.currentWave;
  }

  public getNextWaveEnemies(waveIndex: number): WaveEnemyDef[] {
    if (waveIndex < 0 || waveIndex >= TOTAL_WAVES) return [];
    return WAVES[waveIndex].enemies;
  }
}
