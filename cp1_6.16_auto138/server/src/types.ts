export const CANVAS_SIZE = 64;
export const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00',
  '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FF8800', '#8800FF', '#008800', '#884400',
  '#FFAABB', '#AABBFF', '#AAFFAA', '#CCCCCC'
];
export const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
];
export const THEMES = ['森林', '城市', '星空', '海洋', '山脉', '沙漠', '城堡', '太空站'];
export const ROUND_TIME = 120;
export const TOTAL_ROUNDS = 3;
export const INITIAL_ITEMS = 3;

export type ItemType = 'trap' | 'speedBoost';

export interface Item {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  ownerId: string;
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  color: string;
  score: number;
  items: ItemType[];
  isDrawing: boolean;
  isFrozen: boolean;
  frozenUntil: number;
  speedBoostUntil: number;
  votesReceived: { [playerId: string]: number };
  hasVoted: boolean;
}

export interface Pixel {
  x: number;
  y: number;
  color: number;
  ownerId: string | null;
}

export type GamePhase = 'waiting' | 'playing' | 'voting' | 'results';

export interface GameState {
  roomId: string;
  phase: GamePhase;
  round: number;
  theme: string;
  timeLeft: number;
  canvas: number[][];
  pixelOwners: (string | null)[][];
  players: { [id: string]: Player };
  items: Item[];
  hostId: string;
}
