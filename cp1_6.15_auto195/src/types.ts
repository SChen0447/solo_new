export const TILE_SIZE = 48;
export const MAP_WIDTH = 10;
export const MAP_HEIGHT = 10;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PLAYER_SIZE = 16;
export const PLAYER_SPEED = 3;
export const LIGHT_ANGLE = Math.PI / 3;
export const LIGHT_LENGTH = 200;
export const LIGHT_SOFT_EDGE = 20;
export const BATTERY_DRAIN_RATE = 5;
export const BATTERY_CHARGE_AMOUNT = 30;
export const MONSTER_COUNT = 2;
export const MONSTER_PERCEIVE_RADIUS = 100;
export const MONSTER_PATROL_SPEED = 1;
export const MONSTER_CHASE_SPEED = 2.5;
export const MONSTER_STUN_TIME = 5000;
export const MONSTER_COOLDOWN_TIME = 30000;
export const MONSTER_DAZE_TIME = 1000;

export type CellType = 'wall' | 'path';

export type ItemType = 'battery' | 'key';

export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  type: CellType;
  gridX: number;
  gridY: number;
}

export interface Item {
  id: string;
  type: ItemType;
  position: Position;
  gridX: number;
  gridY: number;
  collected: boolean;
}

export interface Exit {
  position: Position;
  gridX: number;
  gridY: number;
  unlocked: boolean;
}

export interface Player {
  position: Position;
  hasKey: boolean;
  batteryCount: number;
}

export type MonsterState = 'patrol' | 'chase' | 'stunned' | 'dazed';

export interface Monster {
  id: string;
  position: Position;
  state: MonsterState;
  direction: Position;
  perceiveRadius: number;
  patrolTimer: number;
  stunTimer: number;
  cooldownTimer: number;
  dazeTimer: number;
  pulsePhase: number;
  homeDirection: Position;
}

export interface LightState {
  battery: number;
  angle: number;
  isOn: boolean;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  map: Tile[][];
  items: Item[];
  exit: Exit;
  player: Player;
  monsters: Monster[];
  light: LightState;
  status: GameStatus;
  statusTimer: number;
  time: number;
  deltaTime: number;
}

export interface InputState {
  keys: Record<string, boolean>;
  mouseX: number;
  mouseY: number;
}
