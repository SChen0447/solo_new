export enum TileType {
  WALL = 0,
  FLOOR = 1,
}

export interface Tile {
  type: TileType;
  roomId?: number;
}

export interface Room {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface Player {
  x: number;
  y: number;
  renderX: number;
  renderY: number;
  radius: number;
  viewRadius: number;
  currentRoomId: number;
  speed: number;
}

export type MonsterState = 'patrol' | 'chase' | 'dying' | 'dead';

export interface MonsterFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

export interface Monster {
  id: number;
  x: number;
  y: number;
  radius: number;
  state: MonsterState;
  patrolPoints: { x: number; y: number }[];
  currentPatrolIndex: number;
  patrolSpeed: number;
  chaseSpeed: number;
  roomId: number;
  respawnTimer: number;
  deathAnimation: {
    progress: number;
    fragments: MonsterFragment[];
  } | null;
}

export interface Loot {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  collected: boolean;
  collectAnimation: {
    progress: number;
  } | null;
  flyingToPlayer: {
    progress: number;
    startX: number;
    startY: number;
    duration: number;
  } | null;
  roomId: number;
}

export interface ScreenFlash {
  active: boolean;
  alpha: number;
  duration: number;
  elapsed: number;
}

export interface LootCountBounce {
  active: boolean;
  scale: number;
  duration: number;
  elapsed: number;
}

export interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  smoothTime: number;
}

export interface GameState {
  grid: Tile[][];
  rooms: Room[];
  player: Player;
  monsters: Monster[];
  loots: Loot[];
  lootCount: number;
  killCharges: number;
  screenFlash: ScreenFlash;
  lootCountBounce: LootCountBounce;
  exploredTiles: Set<string>;
  camera: Camera;
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
  warningPulse: number;
  isNearMonster: boolean;
}

export interface GameActions {
  initGame: (seed?: number) => void;
  update: (deltaTime: number, keys: Set<string>) => void;
  useKillSkill: () => void;
}

export type GameStore = GameState & GameActions;
