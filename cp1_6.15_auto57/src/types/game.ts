export type GameStatus = 'idle' | 'playing' | 'paused' | 'ended';

export type JudgmentType = 'perfect' | 'good' | 'miss';

export type TrackType = 'left' | 'right';

export type EnemyType = 'normal' | 'shield' | 'boss';

export interface Note {
  id: string;
  time: number;
  track: TrackType;
  hit: boolean;
  judgment?: JudgmentType;
  y?: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  track: TrackType;
  spawnTime: number;
  y: number;
  targetY: number;
  alive: boolean;
  hitCount: number;
  deathTime?: number;
}

export interface JudgmentEvent {
  type: JudgmentType;
  track: TrackType;
  time: number;
  noteId: string;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  decay: number;
}

export interface JudgmentEffect {
  id: string;
  type: JudgmentType;
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface ScorePopup {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  startTime: number;
  duration: number;
}

export type GradeType = 'S' | 'A' | 'B' | 'C';

export interface GameConfig {
  bpm: number;
  bars: number;
  beatsPerBar: number;
  noteSpeed: number;
  perfectWindow: number;
  goodWindow: number;
  perfectScore: number;
  goodScore: number;
  maxPlayerHp: number;
  missDamageThreshold: number;
  missDamage: number;
  canvasWidth: number;
  canvasHeight: number;
  judgmentLineY: number;
  trailCount: number;
  lowTrailCount: number;
  particleCount: number;
  lowParticleCount: number;
  fpsThreshold: number;
  fpsCheckInterval: number;
}
