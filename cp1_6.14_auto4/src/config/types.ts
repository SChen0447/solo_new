export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const PLAYER_MAX_HP = 100;
export const PLAYER_HIT_DAMAGE = 20;
export const SCORE_PER_ENEMY = 100;
export const SCORE_PER_SHARD = 50;
export const SHARDS_PER_UPGRADE = 5;

export const WAVE_INTERVAL_MS = 10000;
export const WAVE_MIN_ENEMIES = 5;
export const WAVE_MAX_ENEMIES = 10;
export const MAX_ENEMIES = 200;

export const BULLET_SWITCH_INTERVAL_MS = 3000;

export const EXPLOSION_DELAY_MS = 1000;
export const BOMBER_EXPLOSION_RADIUS = 120;
export const BOMBER_EXPLOSION_DAMAGE = 25;

export type EnemyType = 'small' | 'medium' | 'bomber';

export interface EnemyConfig {
  type: EnemyType;
  hp: number;
  speed: number;
  radius: number;
  color: number;
  strokeColor: number;
  score: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  small: {
    type: 'small',
    hp: 1,
    speed: 120,
    radius: 14,
    color: 0x2a1a4a,
    strokeColor: 0x00ffc8,
    score: 100
  },
  medium: {
    type: 'medium',
    hp: 4,
    speed: 60,
    radius: 22,
    color: 0x3a2a6a,
    strokeColor: 0x00ffc8,
    score: 100
  },
  bomber: {
    type: 'bomber',
    hp: 2,
    speed: 35,
    radius: 26,
    color: 0x6a1a2a,
    strokeColor: 0xff6644,
    score: 100
  }
};

export interface BulletConfig {
  speed: number;
  damage: number;
  radius: number;
  color: number;
}

export const PLAYER_BULLET_CONFIG: BulletConfig = {
  speed: 520,
  damage: 1,
  radius: 4,
  color: 0x88ffff
};

export const ENEMY_BULLET_CONFIG: BulletConfig = {
  speed: 260,
  damage: 20,
  radius: 5,
  color: 0xff4466
};

export type UpgradeType = 'fireRate' | 'pierce' | 'shield';

export interface UpgradeOption {
  id: UpgradeType;
  title: string;
  description: string;
  icon: string;
}

export const ALL_UPGRADES: UpgradeOption[] = [
  {
    id: 'fireRate',
    title: '射速提升',
    description: '射击速度提升 20%',
    icon: '⚡'
  },
  {
    id: 'pierce',
    title: '子弹穿透',
    description: '子弹穿透数量 +1',
    icon: '🎯'
  },
  {
    id: 'shield',
    title: '护盾恢复',
    description: '恢复 50% 最大生命值',
    icon: '💚'
  }
];

export interface PlayerStats {
  hp: number;
  maxHp: number;
  fireRate: number;
  pierce: number;
  score: number;
  shards: number;
  wave: number;
}

export const DEFAULT_PLAYER_STATS: PlayerStats = {
  hp: PLAYER_MAX_HP,
  maxHp: PLAYER_MAX_HP,
  fireRate: 1,
  pierce: 0,
  score: 0,
  shards: 0,
  wave: 1
};
