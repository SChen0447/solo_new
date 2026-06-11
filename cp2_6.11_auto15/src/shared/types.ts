
export type TowerType = 'arrow' | 'cannon' | 'ice' | 'poison' | 'electric';
export type TowerLevel = 1 | 2 | 3;
export type EnemyType = 'normal' | 'fast' | 'armored' | 'flying' | 'boss';

export interface TowerStats {
  damage: number;
  range: number;
  fireRate: number;
  cost: number;
  splashRadius?: number;
  slowPercent?: number;
  slowDuration?: number;
  poisonDamage?: number;
  poisonDuration?: number;
  chainCount?: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  level: TowerLevel;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  cooldown: number;
  stats: TowerStats;
  totalInvested: number;
  animScale: number;
  animTime: number;
  rotation: number;
  targetId: string | null;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  reward: number;
  x: number;
  y: number;
  pathIndex: number;
  path: { x: number; y: number }[];
  slowTimer: number;
  slowFactor: number;
  poisonTimer: number;
  poisonDps: number;
  hitFlash: number;
  isFlying: boolean;
  armor: number;
  size: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Projectile {
  active: boolean;
  x: number;
  y: number;
  targetId: string | null;
  targetX: number;
  targetY: number;
  damage: number;
  type: TowerType;
  speed: number;
  splashRadius?: number;
  slowPercent?: number;
  slowDuration?: number;
  poisonDamage?: number;
  poisonDuration?: number;
  chainCount?: number;
  chainedIds?: string[];
}

export interface WaveSpawn {
  type: EnemyType;
  count: number;
  interval: number;
  delay?: number;
}

export interface WaveConfig {
  wave: number;
  spawns: WaveSpawn[];
  reward: number;
}

export interface GameState {
  gold: number;
  wave: number;
  hp: number;
  maxHp: number;
  kills: number;
  prepTimer: number;
  isPlaying: boolean;
  isPreparing: boolean;
  gameOver: boolean;
  victory: boolean;
}

export interface TowerConfig {
  type: TowerType;
  name: string;
  description: string;
  color: string;
  levels: Record<TowerLevel, TowerStats>;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  arrow: {
    type: 'arrow',
    name: '箭塔',
    description: '对单目标高伤害',
    color: '#66ffcc',
    levels: {
      1: { damage: 25, range: 120, fireRate: 1.0, cost: 50 },
      2: { damage: 45, range: 140, fireRate: 0.85, cost: 80 },
      3: { damage: 70, range: 160, fireRate: 0.7, cost: 120 },
    },
  },
  cannon: {
    type: 'cannon',
    name: '炮塔',
    description: '范围溅射伤害',
    color: '#ffaa55',
    levels: {
      1: { damage: 35, range: 100, fireRate: 1.5, cost: 75, splashRadius: 40 },
      2: { damage: 60, range: 115, fireRate: 1.3, cost: 110, splashRadius: 50 },
      3: { damage: 100, range: 130, fireRate: 1.1, cost: 160, splashRadius: 65 },
    },
  },
  ice: {
    type: 'ice',
    name: '冰塔',
    description: '减速控场',
    color: '#88ddff',
    levels: {
      1: { damage: 10, range: 110, fireRate: 1.0, cost: 60, slowPercent: 0.5, slowDuration: 2.0 },
      2: { damage: 18, range: 125, fireRate: 0.9, cost: 95, slowPercent: 0.6, slowDuration: 2.5 },
      3: { damage: 28, range: 140, fireRate: 0.8, cost: 140, slowPercent: 0.7, slowDuration: 3.0 },
    },
  },
  poison: {
    type: 'poison',
    name: '毒塔',
    description: '持续中毒伤害',
    color: '#aaff55',
    levels: {
      1: { damage: 8, range: 100, fireRate: 1.2, cost: 55, poisonDamage: 15, poisonDuration: 3.0 },
      2: { damage: 14, range: 115, fireRate: 1.1, cost: 90, poisonDamage: 25, poisonDuration: 4.0 },
      3: { damage: 22, range: 130, fireRate: 1.0, cost: 135, poisonDamage: 40, poisonDuration: 5.0 },
    },
  },
  electric: {
    type: 'electric',
    name: '电塔',
    description: '连锁闪电攻击',
    color: '#ffff66',
    levels: {
      1: { damage: 20, range: 110, fireRate: 1.0, cost: 80, chainCount: 3 },
      2: { damage: 35, range: 125, fireRate: 0.9, cost: 120, chainCount: 4 },
      3: { damage: 55, range: 140, fireRate: 0.8, cost: 180, chainCount: 5 },
    },
  },
};

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number;
  reward: number;
  isFlying: boolean;
  armor: number;
  size: number;
  color: string;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: { type: 'normal', name: '普通', hp: 100, speed: 40, reward: 10, isFlying: false, armor: 0, size: 14, color: '#aaccff' },
  fast: { type: 'fast', name: '快速', hp: 60, speed: 80, reward: 15, isFlying: false, armor: 0, size: 11, color: '#66ffff' },
  armored: { type: 'armored', name: '重甲', hp: 300, speed: 25, reward: 25, isFlying: false, armor: 0.3, size: 18, color: '#ffaa88' },
  flying: { type: 'flying', name: '飞行', hp: 80, speed: 55, reward: 20, isFlying: true, armor: 0, size: 12, color: '#ff88ff' },
  boss: { type: 'boss', name: '首领', hp: 1500, speed: 20, reward: 150, isFlying: false, armor: 0.4, size: 28, color: '#ff4466' },
};

export function generateWaves(): WaveConfig[] {
  const waves: WaveConfig[] = [];
  for (let w = 1; w <= 20; w++) {
    const spawns: WaveSpawn[] = [];
    const baseCount = 6 + w * 2;
    const interval = Math.max(0.4, 1.1 - w * 0.03);

    spawns.push({ type: 'normal', count: baseCount, interval });

    if (w >= 2) spawns.push({ type: 'fast', count: Math.floor(3 + w * 0.8), interval: interval * 0.7, delay: 2 });
    if (w >= 3) spawns.push({ type: 'armored', count: Math.floor(1 + w * 0.5), interval: interval * 1.3, delay: 4 });
    if (w >= 4) spawns.push({ type: 'flying', count: Math.floor(2 + w * 0.5), interval: interval * 0.9, delay: 3 });
    if (w % 5 === 0) spawns.push({ type: 'boss', count: 1, interval: 1, delay: 8 });

    waves.push({ wave: w, spawns, reward: 50 + w * 20 });
  }
  return waves;
}

export const GRID_COLS = 20;
export const GRID_ROWS = 12;
export const PREP_TIME = 15;
export const START_GOLD = 250;
export const START_HP = 20;
