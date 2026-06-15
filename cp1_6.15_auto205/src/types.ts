export interface Vec2 {
  x: number;
  y: number;
}

export interface Ship {
  pos: Vec2;
  angle: number;
  shield: number;
  maxShield: number;
}

export interface Debris {
  id: number;
  pos: Vec2;
  vel: Vec2;
  rotation: number;
  rotSpeed: number;
  vertices: Vec2[];
  color: string;
  captured: boolean;
  captureProgress: number;
}

export interface EnergyCore {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  color: string;
  pulsePhase: number;
  captured: boolean;
  captureProgress: number;
}

export interface Asteroid {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  bumps: number[];
}

export interface GravityTrap {
  id: number;
  pos: Vec2;
  baseRadius: number;
  pulsePhase: number;
}

export interface NebulaParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  angle: number;
  dist: number;
  speed: number;
  alpha: number;
}

export interface TractorBeam {
  active: boolean;
  angle: number;
  length: number;
  coneAngle: number;
}

export type GameState = 'start' | 'playing' | 'over';

export interface Score {
  debrisCount: number;
  coreCount: number;
  shieldRemaining: number;
  total: number;
}

export interface GameData {
  ship: Ship;
  debris: Debris[];
  cores: EnergyCore[];
  asteroids: Asteroid[];
  traps: GravityTrap[];
  nebulaParticles: NebulaParticle[];
  beam: TractorBeam;
  state: GameState;
  score: Score;
  timeRemaining: number;
  mousePos: Vec2;
  mouseDown: boolean;
  width: number;
  height: number;
}
