export enum TileState {
  STABLE = 'stable',
  WARNING = 'warning',
  COLLAPSING = 'collapsing',
  GONE = 'gone'
}

export interface HexCoord {
  q: number;
  r: number;
}

export interface Tile {
  coord: HexCoord;
  state: TileState;
  timer: number;
  collapseProgress: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Crystal {
  id: number;
  position: Vector2;
  tileCoord: HexCoord;
  collected: boolean;
  rotation: number;
  collectProgress: number;
}

export interface Meteor {
  id: number;
  startPos: Vector2;
  targetPos: Vector2;
  position: Vector2;
  progress: number;
  duration: number;
  exploded: boolean;
  shockwaveRadius: number;
  shockwaveProgress: number;
}

export interface LavaFlow {
  id: number;
  side: 'left' | 'right';
  position: Vector2;
  velocity: Vector2;
}

export interface Particle {
  id: number;
  position: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'lava' | 'trail' | 'shockwave' | 'crystal' | 'steam' | 'smoke';
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
  glide: boolean;
}

export enum GameState {
  PLAYING = 'playing',
  GAMEOVER = 'gameover',
  VOLCANO = 'volcano'
}

export interface GameOverInfo {
  state: GameState;
  score: number;
  fadeProgress: number;
}
