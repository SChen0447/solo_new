export interface Vector2 {
  x: number;
  y: number;
}

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EntityType = 'player' | 'platform' | 'movingPlatform' | 'spike' | 'spring' | 'star';

export interface Entity extends AABB {
  type: EntityType;
  vx: number;
  vy: number;
  onGround: boolean;
  active: boolean;
  restitution: number;
  friction: number;
  passable: boolean;
}

export interface Platform extends Entity {
  type: 'platform';
}

export interface MovingPlatform extends Entity {
  type: 'movingPlatform';
  baseX: number;
  moveRange: number;
  moveSpeed: number;
  movePhase: number;
}

export interface Spike extends Entity {
  type: 'spike';
}

export interface Spring extends Entity {
  type: 'spring';
  bounceFactor: number;
}

export interface Star extends Entity {
  type: 'star';
  collected: boolean;
  rotation: number;
  glowPhase: number;
}

export interface Player extends Entity {
  type: 'player';
  trail: { x: number; y: number; alpha: number; life: number }[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export type GameState = 'playing' | 'gameover';
