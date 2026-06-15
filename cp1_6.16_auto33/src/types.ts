export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Player extends Entity {
  health: number;
  maxHealth: number;
}

export type EnemyType = 'basic' | 'tracker' | 'elite';

export interface Enemy extends Entity {
  id: number;
  type: EnemyType;
  speed: number;
  health: number;
  maxHealth: number;
  score: number;
  velocityY: number;
}

export interface Bullet extends Entity {
  id: number;
  speed: number;
  damage: number;
  radius?: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface WaveEnemyConfig {
  type: EnemyType;
  count: number;
  delay?: number;
}

export interface WaveConfig {
  id: number;
  name: string;
  enemies: WaveEnemyConfig[];
  spawnInterval: number;
}

export type WaveState = 'idle' | 'countdown' | 'active' | 'completed';

export interface WaveStateData {
  state: WaveState;
  currentWave: number;
  totalWaves: number;
  countdown: number;
  enemiesRemaining: number;
}

export type CollisionEventType = 'enemy_hit' | 'player_hit';

export interface CollisionEvent {
  type: CollisionEventType;
  bulletId?: number;
  enemyId?: number;
  damage?: number;
}

export interface HUDData {
  score: number;
  health: number;
  maxHealth: number;
  wave: number;
  totalWaves: number;
  waveState: WaveState;
  countdown: number;
}

export interface GameState {
  isRunning: boolean;
  isGameOver: boolean;
  score: number;
  displayScore: number;
}
