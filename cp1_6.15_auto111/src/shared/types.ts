export type BulletPattern = 'fan' | 'spiral' | 'homing';

export interface Player {
  id: string;
  x: number;
  y: number;
  angle: number;
  lives: number;
  pattern: BulletPattern;
  isInvincible: boolean;
  invincibleEndTime: number;
  lastFireTime: number;
  spiralAngle: number;
  score: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  pattern: BulletPattern;
  targetId?: string;
  speed: number;
}

export interface CollisionResult {
  bulletId: string;
  hitPlayerId: string;
  shooterId: string;
}

export interface GameState {
  players: Record<string, Player>;
  bullets: Bullet[];
  hitEffects: HitEffect[];
}

export interface HitEffect {
  id: string;
  playerId: string;
  x: number;
  y: number;
  startTime: number;
}

export interface ClientToServerEvents {
  playerInput: (data: {
    playerId: string;
    x: number;
    y: number;
    angle: number;
    pattern: BulletPattern;
    timestamp: number;
  }) => void;
  fireBullet: (data: {
    playerId: string;
    bullets: Bullet[];
    timestamp: number;
  }) => void;
  switchPattern: (data: {
    playerId: string;
    pattern: BulletPattern;
  }) => void;
  ping: (timestamp: number) => void;
  resetGame: () => void;
}

export interface ServerToClientEvents {
  gameState: (state: GameState) => void;
  collision: (result: CollisionResult) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  pong: (timestamp: number) => void;
  latencyWarning: (status: 'high' | 'low' | 'normal') => void;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PLAYER_SPEED = 5;
export const PLAYER_RADIUS = 20;
export const BULLET_RADIUS = 5;
export const BULLET_SPEED = 8;
export const FAN_BULLET_COUNT = 6;
export const FAN_SPREAD_ANGLE = 30;
export const SPIRAL_ROTATION_SPEED = 10;
export const SPIRAL_FIRE_INTERVAL = 150;
export const HOMING_SPEED_FACTOR = 0.7;
export const INITIAL_LIVES = 3;
export const INVINCIBLE_DURATION = 2000;
export const HIT_EFFECT_DURATION = 1500;
export const SYNC_INTERVAL = 50;
export const HIGH_LATENCY_THRESHOLD = 80;
export const LOW_LATENCY_THRESHOLD = 20;
