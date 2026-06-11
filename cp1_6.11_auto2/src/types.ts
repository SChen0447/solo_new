export type AsteroidSize = 'small' | 'medium' | 'large';

export interface Vector2 {
  x: number;
  y: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active: boolean;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export interface Crack {
  x: number;
  y: number;
  length: number;
  angle: number;
}

export interface GameState {
  score: number;
  energy: number;
  maxEnergy: number;
  combo: number;
  lastHitTime: number;
  gameTime: number;
  isGameOver: boolean;
  width: number;
  height: number;
}

export interface AsteroidConfig {
  size: AsteroidSize;
  radius: number;
  health: number;
  speed: number;
  score: number;
  color: string;
}

export const ASTEROID_CONFIGS: Record<AsteroidSize, AsteroidConfig> = {
  small: {
    size: 'small',
    radius: 15,
    health: 1,
    speed: 80,
    score: 10,
    color: '#6a6a6a'
  },
  medium: {
    size: 'medium',
    radius: 28,
    health: 2,
    speed: 60,
    score: 25,
    color: '#5a5a5a'
  },
  large: {
    size: 'large',
    radius: 45,
    health: 3,
    speed: 40,
    score: 50,
    color: '#4a4a4a'
  }
};

export const GAME_CONFIG = {
  INITIAL_ENERGY: 100,
  MAX_ENERGY: 100,
  ENERGY_DRAIN_RATE: 5,
  FRAGMENT_ENERGY_VALUE: 20,
  GRAVITY_WAVE_COST: 15,
  GRAVITY_WAVE_MAX_RADIUS: 180,
  GRAVITY_WAVE_SPEED: 400,
  GRAVITY_WAVE_FORCE: 250,
  SHIP_RADIUS: 18,
  COMBO_TIMEOUT: 2000,
  ASTEROID_SPAWN_BASE_INTERVAL: 1200,
  ASTEROID_DIFFICULTY_FACTOR: 0.00008,
  ASTEROID_MAX_SPEED_INCREASE: 60,
  FRAGMENT_HIDDEN_CHANCE_LARGE: 0.5,
  FRAGMENT_HIDDEN_CHANCE_MEDIUM: 0.2,
  FRAGMENT_COLLECT_RADIUS: 60,
  FRAGMENT_SPEED: 100,
  MAX_ASTEROIDS: 80,
  MAX_FRAGMENTS: 20,
  MAX_PARTICLES: 150
} as const;
