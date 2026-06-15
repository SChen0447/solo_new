export const GRID_COLS = 20;
export const GRID_ROWS = 15;
export const TOTAL_WAVES = 6;

export { eventBus } from '../events/EventBus';

export type TerrainType = 'path' | 'buildable' | 'blocked';
export type TowerType = 'arrow' | 'magic' | 'cannon' | 'slow';
export type EnemyType = 'normal' | 'fast' | 'heavy' | 'boss';

export interface GridCell {
  x: number;
  y: number;
  terrain: TerrainType;
  towerId: string | null;
}

export interface Tower {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  level: number;
  totalCost: number;
  lastAttackTime: number;
}

export interface TowerConfig {
  baseDamage: number;
  baseAttackInterval: number;
  range: number;
  splashRadius?: number;
  stunDuration?: number;
  slowFactor?: number;
  slowDuration?: number;
  buildCost: number;
  projectileColor: string;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  arrow: {
    baseDamage: 5,
    baseAttackInterval: 0.5,
    range: 3,
    buildCost: 100,
    projectileColor: '#44ff44'
  },
  magic: {
    baseDamage: 8,
    baseAttackInterval: 1,
    range: 2.5,
    splashRadius: 1.2,
    buildCost: 100,
    projectileColor: '#aa44ff'
  },
  cannon: {
    baseDamage: 25,
    baseAttackInterval: 2,
    range: 2,
    splashRadius: 1.5,
    stunDuration: 0.5,
    buildCost: 100,
    projectileColor: '#ff8833'
  },
  slow: {
    baseDamage: 2,
    baseAttackInterval: 1,
    range: 3,
    slowFactor: 0.5,
    slowDuration: 3,
    buildCost: 100,
    projectileColor: '#44aaff'
  }
};

export const UPGRADE_COSTS = [0, 100, 200, 400];

export interface EnemyConfig {
  baseHp: number;
  speed: number;
  reward: number;
  color: string;
  size: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: { baseHp: 40, speed: 1, reward: 10, color: '#66cc66', size: 0.35 },
  fast: { baseHp: 25, speed: 2, reward: 15, color: '#66ccff', size: 0.28 },
  heavy: { baseHp: 120, speed: 0.6, reward: 25, color: '#cc8866', size: 0.45 },
  boss: { baseHp: 500, speed: 0.3, reward: 100, color: '#ff4444', size: 0.6 }
};

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  x: number;
  y: number;
  pathIndex: number;
  slowTimer: number;
  slowFactor: number;
  stunTimer: number;
  reward: number;
  size: number;
  color: string;
  active: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetId: string;
  towerType: TowerType;
  damage: number;
  speed: number;
  splashRadius?: number;
  stunDuration?: number;
  slowFactor?: number;
  slowDuration?: number;
  color: string;
  active: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface RippleEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface WaveEnemyDef {
  type: EnemyType;
  count: number;
  interval: number;
}

export interface Wave {
  enemies: WaveEnemyDef[];
  hpMultiplier: number;
}

export const WAVES: Wave[] = [
  {
    enemies: [{ type: 'normal', count: 5, interval: 1.2 }],
    hpMultiplier: 1.0
  },
  {
    enemies: [
      { type: 'normal', count: 8, interval: 1 },
      { type: 'fast', count: 3, interval: 0.8 }
    ],
    hpMultiplier: 1.3
  },
  {
    enemies: [
      { type: 'fast', count: 8, interval: 0.6 },
      { type: 'heavy', count: 2, interval: 2 }
    ],
    hpMultiplier: 1.69
  },
  {
    enemies: [
      { type: 'normal', count: 10, interval: 0.8 },
      { type: 'heavy', count: 4, interval: 1.5 },
      { type: 'fast', count: 6, interval: 0.5 }
    ],
    hpMultiplier: 2.197
  },
  {
    enemies: [
      { type: 'heavy', count: 8, interval: 1.2 },
      { type: 'fast', count: 12, interval: 0.4 }
    ],
    hpMultiplier: 2.8561
  },
  {
    enemies: [
      { type: 'normal', count: 15, interval: 0.6 },
      { type: 'heavy', count: 6, interval: 1 },
      { type: 'fast', count: 10, interval: 0.4 },
      { type: 'boss', count: 1, interval: 5 }
    ],
    hpMultiplier: 3.71293
  }
];

export type GameState = 'idle' | 'preparing' | 'wave_active' | 'paused' | 'victory' | 'gameover';

export interface GameData {
  state: GameState;
  gold: number;
  lives: number;
  currentWave: number;
  waveCountdown: number;
}

export const INITIAL_GOLD = 300;
export const INITIAL_LIVES = 20;
export const WAVE_REWARD = 50;
export const WAVE_COUNTDOWN = 20;
export const SELL_RATIO = 0.7;
export const DAMAGE_PER_LEVEL = 1.3;
export const SPEED_PER_LEVEL = 0.9;

export const GAME_EVENTS = {
  TOWER_PLACED: 'tower:placed',
  TOWER_UPGRADED: 'tower:upgraded',
  TOWER_SOLD: 'tower:sold',
  ENEMY_KILLED: 'enemy:killed',
  ENEMY_REACHED_END: 'enemy:reached_end',
  WAVE_START: 'wave:start',
  WAVE_COMPLETE: 'wave:complete',
  GOLD_CHANGED: 'gold:changed',
  LIVES_CHANGED: 'lives:changed',
  GAME_OVER: 'game:over',
  VICTORY: 'game:victory',
  RESTART: 'game:restart',
  PAUSE_TOGGLE: 'game:pause_toggle',
  UI_BUILD_CLICKED: 'ui:build_clicked',
  UI_CELL_CLICKED: 'ui:cell_clicked',
  UI_UPGRADE_CLICKED: 'ui:upgrade_clicked',
  UI_SELL_CLICKED: 'ui:sell_clicked',
  UI_START_WAVE: 'ui:start_wave'
};
