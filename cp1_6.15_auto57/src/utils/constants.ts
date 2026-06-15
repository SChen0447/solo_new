import type { GameConfig } from '../types/game';

export const GAME_CONFIG: GameConfig = {
  bpm: 128,
  bars: 16,
  beatsPerBar: 4,
  noteSpeed: 400,
  perfectWindow: 50,
  goodWindow: 100,
  perfectScore: 100,
  goodScore: 50,
  maxPlayerHp: 100,
  missDamageThreshold: 3,
  missDamage: 20,
  canvasWidth: 800,
  canvasHeight: 600,
  judgmentLineY: 520,
  trailCount: 8,
  lowTrailCount: 4,
  particleCount: 40,
  lowParticleCount: 20,
  fpsThreshold: 45,
  fpsCheckInterval: 10000,
};

export const COLORS = {
  backgroundStart: '#0a0a2e',
  backgroundEnd: '#1a1a4e',
  note: '#f1c40f',
  noteMiss: '#e74c3c',
  perfect: '#ffd700',
  good: '#2ecc71',
  miss: '#888888',
  playerHpStart: '#2ecc71',
  playerHpEnd: '#e74c3c',
  enemy: '#4a4a8a',
  keyLeft: '#00e5ff',
  keyRight: '#ff00e5',
  keyDefault: '#555555',
  progressStart: '#2ecc71',
  progressEnd: '#e74c3c',
  bossBannerStart: 'rgba(255,0,0,0)',
  bossBannerEnd: 'rgba(255,0,0,0.3)',
  statusBg: 'rgba(0,0,0,0.6)',
  uiPanel: 'rgba(10, 10, 46, 0.9)',
  uiBorder: '#444444',
  uiBorderHover: '#ffd700',
  text: '#ffffff',
  textSecondary: '#aaaaaa',
};

export const ENEMY_CONFIG = {
  normal: { hp: 100, hitsToKill: 3, spawnIntervalBeats: 4 },
  shield: { hp: 150, hitsToKill: 3, spawnIntervalBeats: 8 },
  boss: { hp: 800, hitsToKill: 10, spawnBar: 6 },
};

export const GRADE_THRESHOLDS = {
  S: 0.95,
  A: 0.80,
  B: 0.60,
};

export const GRADE_COLORS = {
  S: '#ffd700',
  A: '#c0c0c0',
  B: '#cd7f32',
  C: '#888888',
};
