import { Enemy, EnemyType, WaveConfig, WaveState, WaveStateData } from './types';

const WAVE_CONFIGS: WaveConfig[] = [
  {
    id: 1,
    name: 'First Contact',
    enemies: [
      { type: 'basic', count: 5 }
    ],
    spawnInterval: 1.5
  },
  {
    id: 2,
    name: 'Tracker Swarm',
    enemies: [
      { type: 'basic', count: 4 },
      { type: 'tracker', count: 3 }
    ],
    spawnInterval: 1.2
  },
  {
    id: 3,
    name: 'Elite Strike',
    enemies: [
      { type: 'basic', count: 6 },
      { type: 'tracker', count: 4 },
      { type: 'elite', count: 1 }
    ],
    spawnInterval: 1.0
  },
  {
    id: 4,
    name: 'Iron Wave',
    enemies: [
      { type: 'basic', count: 8 },
      { type: 'tracker', count: 6 },
      { type: 'elite', count: 2 }
    ],
    spawnInterval: 0.8
  },
  {
    id: 5,
    name: 'Final Assault',
    enemies: [
      { type: 'basic', count: 10 },
      { type: 'tracker', count: 8 },
      { type: 'elite', count: 4 }
    ],
    spawnInterval: 0.6
  }
];

const COUNTDOWN_DURATION = 30;

const ENEMY_STATS: Record<EnemyType, { health: number; speed: number; score: number; width: number; height: number }> = {
  basic: { health: 1, speed: 120, score: 10, width: 40, height: 30 },
  tracker: { health: 1, speed: 80, score: 25, width: 35, height: 35 },
  elite: { health: 3, speed: 60, score: 50, width: 60, height: 50 }
};

type WaveEventCallback = (event: 'waveStart' | 'waveEnd' | 'countdownStart') => void;

export class WaveManager {
  private waves: WaveConfig[];
  private currentWaveIndex: number;
  private state: WaveState;
  private countdown: number;
  private enemies: Enemy[];
  private spawnTimer: number;
  private spawnQueue: { type: EnemyType; delay: number }[];
  private nextEnemyId: number;
  private canvasWidth: number;
  private canvasHeight: number;
  private eventCallbacks: WaveEventCallback[];

  constructor(canvasWidth: number, canvasHeight: number) {
    this.waves = WAVE_CONFIGS;
    this.currentWaveIndex = 0;
    this.state = 'idle';
    this.countdown = COUNTDOWN_DURATION;
    this.enemies = [];
    this.spawnTimer = 0;
    this.spawnQueue = [];
    this.nextEnemyId = 0;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.eventCallbacks = [];
  }

  on(event: WaveEventCallback): void {
    this.eventCallbacks.push(event);
  }

  private emit(event: 'waveStart' | 'waveEnd' | 'countdownStart'): void {
    this.eventCallbacks.forEach(cb => cb(event));
  }

  start(): void {
    this.currentWaveIndex = 0;
    this.state = 'countdown';
    this.countdown = COUNTDOWN_DURATION;
    this.enemies = [];
    this.nextEnemyId = 0;
    this.emit('countdownStart');
  }

  skipCountdown(): void {
    if (this.state === 'countdown') {
      this.countdown = 0;
      this.startWave();
    }
  }

  private startWave(): void {
    const wave = this.waves[this.currentWaveIndex];
    if (!wave) return;

    this.state = 'active';
    this.spawnTimer = 0;
    this.spawnQueue = [];

    wave.enemies.forEach(config => {
      for (let i = 0; i < config.count; i++) {
        this.spawnQueue.push({
          type: config.type,
          delay: i * wave.spawnInterval
        });
      }
    });

    this.spawnQueue.sort((a, b) => a.delay - b.delay);
    this.emit('waveStart');
  }

  private endWave(): void {
    this.state = 'completed';
    this.emit('waveEnd');
  }

  update(deltaTime: number): void {
    if (this.state === 'countdown') {
      this.countdown -= deltaTime;
      if (this.countdown <= 0) {
        this.startWave();
      }
    } else if (this.state === 'active') {
      this.spawnTimer += deltaTime;

      while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnTimer) {
        const spawn = this.spawnQueue.shift()!;
        this.spawnEnemy(spawn.type);
      }

      this.updateEnemies(deltaTime);

      if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
        this.endWave();
      }
    } else if (this.state === 'completed') {
      this.currentWaveIndex++;
      if (this.currentWaveIndex < this.waves.length) {
        this.state = 'countdown';
        this.countdown = COUNTDOWN_DURATION;
        this.emit('countdownStart');
      }
    }
  }

  private spawnEnemy(type: EnemyType): void {
    const stats = ENEMY_STATS[type];
    const y = Math.random() * (this.canvasHeight - stats.height - 100) + 50;
    
    const enemy: Enemy = {
      id: this.nextEnemyId++,
      type,
      x: this.canvasWidth + stats.width,
      y,
      width: stats.width,
      height: stats.height,
      speed: stats.speed,
      health: stats.health,
      maxHealth: stats.health,
      score: stats.score,
      velocityY: 0
    };

    this.enemies.push(enemy);
  }

  private updateEnemies(deltaTime: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.x -= enemy.speed * deltaTime;

      if (enemy.type === 'tracker') {
        const targetY = this.canvasHeight / 2;
        const diff = targetY - enemy.y;
        enemy.velocityY += diff * 0.5 * deltaTime;
        enemy.velocityY *= 0.95;
        enemy.y += enemy.velocityY * deltaTime;
      }

      if (enemy.y < 20) {
        enemy.y = 20;
        enemy.velocityY = Math.abs(enemy.velocityY) * 0.5;
      }
      if (enemy.y > this.canvasHeight - enemy.height - 20) {
        enemy.y = this.canvasHeight - enemy.height - 20;
        enemy.velocityY = -Math.abs(enemy.velocityY) * 0.5;
      }

      if (enemy.x + enemy.width < 0) {
        this.enemies.splice(i, 1);
      }
    }
  }

  removeEnemy(enemyId: number): void {
    const index = this.enemies.findIndex(e => e.id === enemyId);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  getState(): WaveStateData {
    return {
      state: this.state,
      currentWave: this.currentWaveIndex + 1,
      totalWaves: this.waves.length,
      countdown: Math.max(0, this.countdown),
      enemiesRemaining: this.enemies.length + this.spawnQueue.length
    };
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  reset(): void {
    this.currentWaveIndex = 0;
    this.state = 'idle';
    this.countdown = COUNTDOWN_DURATION;
    this.enemies = [];
    this.spawnTimer = 0;
    this.spawnQueue = [];
    this.nextEnemyId = 0;
  }
}
