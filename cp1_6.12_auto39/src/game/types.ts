export type UnitType = 'swordsman' | 'archer' | 'knight' | 'mage';
export type PlayerSide = 'blue' | 'red';
export type ActionType = 'move' | 'attack' | 'skip';
export type GamePhase = 'player_move' | 'player_attack' | 'ai_turn' | 'game_over';
export type HighlightType = 'move' | 'attack' | 'selected' | 'none';

export interface Position {
  x: number;
  y: number;
}

export interface UnitConfig {
  type: UnitType;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  moveRange: number;
  attackRange: number;
  skillName: string;
  skillDescription: string;
  isAoe: boolean;
}

export interface Unit {
  id: string;
  type: UnitType;
  side: PlayerSide;
  pos: Position;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  moveRange: number;
  attackRange: number;
  skillName: string;
  skillDescription: string;
  isAoe: boolean;
  hasMoved: boolean;
  hasAttacked: boolean;
  isAlive: boolean;
  kills: number;
}

export interface Action {
  type: ActionType;
  unitId: string;
  targetPos?: Position;
  targetId?: string;
}

export interface DamageInfo {
  attackerId: string;
  targetId: string;
  damage: number;
  targetPos: Position;
  wasKilled: boolean;
}

export interface GameState {
  board: (string | null)[][];
  units: Unit[];
  currentTurn: PlayerSide;
  phase: GamePhase;
  turnNumber: number;
  selectedUnitId: string | null;
  highlightedCells: { pos: Position; type: HighlightType }[];
  lastAction: Action | null;
  damageAnimations: DamageInfo[];
  gameOverWinner: PlayerSide | null;
  blueKills: number;
  redKills: number;
}

export const BOARD_SIZE = 6;
export const CELL_SIZE = 60;
export const CELL_SIZE_SMALL = 40;
export const MOBILE_BREAKPOINT = 400;

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  swordsman: {
    type: 'swordsman',
    name: '剑士',
    maxHp: 10,
    attack: 4,
    defense: 3,
    moveRange: 2,
    attackRange: 1,
    skillName: '近战斩击',
    skillDescription: '对相邻敌人造成近战伤害',
    isAoe: false,
  },
  archer: {
    type: 'archer',
    name: '弓手',
    maxHp: 7,
    attack: 3,
    defense: 1,
    moveRange: 2,
    attackRange: 3,
    skillName: '远程射击',
    skillDescription: '对远处敌人射出箭矢',
    isAoe: false,
  },
  knight: {
    type: 'knight',
    name: '骑士',
    maxHp: 12,
    attack: 5,
    defense: 2,
    moveRange: 3,
    attackRange: 1,
    skillName: '冲锋',
    skillDescription: '长距离移动后近战猛击',
    isAoe: false,
  },
  mage: {
    type: 'mage',
    name: '法师',
    maxHp: 6,
    attack: 6,
    defense: 1,
    moveRange: 1,
    attackRange: 2,
    skillName: '范围攻击',
    skillDescription: '对目标及其相邻单位造成伤害',
    isAoe: true,
  },
};

export const INITIAL_BLUE_POSITIONS: Position[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 3, y: 0 },
];

export const INITIAL_RED_POSITIONS: Position[] = [
  { x: 2, y: 5 },
  { x: 3, y: 5 },
  { x: 4, y: 5 },
  { x: 5, y: 5 },
];

export const BLUE_UNIT_ORDER: UnitType[] = ['swordsman', 'archer', 'knight', 'mage'];
export const RED_UNIT_ORDER: UnitType[] = ['swordsman', 'archer', 'knight', 'mage'];

export function posEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function cloneGameState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}
