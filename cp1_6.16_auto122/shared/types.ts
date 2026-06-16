export const GRID_SIZE = 9;
export const CELL_SIZE = 64;
export const BASE_SIZE = 3;
export const INITIAL_HP = 100;
export const INITIAL_RESOURCES = 20;
export const RESOURCE_PER_SECOND = 1;
export const KILL_REWARD = 2;
export const TOWER_DESTROY_REWARD = 5;
export const MONSTER_BASE_DAMAGE = 3;
export const AUTO_SPAWN_INTERVAL = 5000;
export const REBUILD_DELAY = 5000;

export enum TowerType {
  Arrow = 'arrow',
  Cannon = 'cannon',
  Freeze = 'freeze',
}

export enum MonsterType {
  Basic = 'basic',
  Elite = 'elite',
  Fast = 'fast',
}

export interface TowerConfig {
  type: TowerType;
  range: number;
  damage: number;
  cooldown: number;
  cost: number;
}

export interface MonsterConfig {
  type: MonsterType;
  hp: number;
  speed: number;
  cost: number;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  [TowerType.Arrow]: {
    type: TowerType.Arrow,
    range: 2,
    damage: 8,
    cooldown: 1500,
    cost: 10,
  },
  [TowerType.Cannon]: {
    type: TowerType.Cannon,
    range: 3,
    damage: 15,
    cooldown: 3000,
    cost: 15,
  },
  [TowerType.Freeze]: {
    type: TowerType.Freeze,
    range: 2.5,
    damage: 3,
    cooldown: 2000,
    cost: 12,
  },
};

export const MONSTER_CONFIGS: Record<MonsterType, MonsterConfig> = {
  [MonsterType.Basic]: {
    type: MonsterType.Basic,
    hp: 20,
    speed: 1,
    cost: 0,
  },
  [MonsterType.Elite]: {
    type: MonsterType.Elite,
    hp: 50,
    speed: 0.8,
    cost: 5,
  },
  [MonsterType.Fast]: {
    type: MonsterType.Fast,
    hp: 12,
    speed: 2,
    cost: 3,
  },
};

export const UPGRADE_MULTIPLIER = 1.4;

export interface Position {
  x: number;
  y: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  owner: PlayerSide;
  level: number;
  lastAttackTime: number;
  destroyed: boolean;
  destroyTime: number;
  hp: number;
  maxHp: number;
}

export interface Monster {
  id: string;
  type: MonsterType;
  owner: PlayerSide;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  slowUntil: number;
  pathIndex: number;
  path: Position[];
  targetBase: Position;
  attackCooldown: number;
  attackingTowerId: string | null;
}

export interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  type: TowerType;
}

export enum PlayerSide {
  Left = 'left',
  Right = 'right',
}

export interface PlayerState {
  side: PlayerSide;
  hp: number;
  resources: number;
}

export interface GameState {
  players: Record<PlayerSide, PlayerState>;
  towers: Tower[];
  monsters: Monster[];
  particles: Particle[];
  gameOver: boolean;
  winner: PlayerSide | null;
  lastUpdateTime: number;
}

export type ClientGameState = GameState & {
  serverTime: number;
  ping: number;
};

export interface PlaceTowerAction {
  type: 'placeTower';
  towerType: TowerType;
  gridX: number;
  gridY: number;
}

export interface UpgradeTowerAction {
  type: 'upgradeTower';
  towerId: string;
}

export interface SpawnMonsterAction {
  type: 'spawnMonster';
  monsterType: MonsterType;
}

export type GameAction = PlaceTowerAction | UpgradeTowerAction | SpawnMonsterAction;

export interface CellOccupancy {
  [key: string]: boolean;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function isBaseArea(side: PlayerSide, gridX: number, gridY: number): boolean {
  if (side === PlayerSide.Left) {
    return gridX < BASE_SIZE && gridY >= (GRID_SIZE - BASE_SIZE) / 2 && gridY < (GRID_SIZE + BASE_SIZE) / 2;
  }
  return gridX >= GRID_SIZE - BASE_SIZE && gridY >= (GRID_SIZE - BASE_SIZE) / 2 && gridY < (GRID_SIZE + BASE_SIZE) / 2;
}

export function getBaseCenter(side: PlayerSide): Position {
  if (side === PlayerSide.Left) {
    return { x: 1, y: Math.floor(GRID_SIZE / 2) };
  }
  return { x: GRID_SIZE - 2, y: Math.floor(GRID_SIZE / 2) };
}
