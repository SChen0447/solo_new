export const CANVAS_SIZE = 64;
export const COLORS = [
  '#FFFFFF', '#000000', '#FF0000', '#00FF00',
  '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FF8800', '#8800FF', '#008800', '#884400',
  '#FFAABB', '#AABBFF', '#AAFFAA', '#CCCCCC'
];

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
