import type { NoteColor, InstrumentType } from './types'

export const CANVAS_RATIO = 9 / 16
export const MAX_CANVAS_WIDTH = 500

export const COLORS = {
  bgTop: '#0a3d62',
  bgBottom: '#0b0015',
  cliff: '#2d3e4f',
  reefDark: '#2f3640',
  reefLight: '#1a1a2e',
  fish: '#718093',
  submarine: '#2d98da',
  windowGlow: '#00d4ff',
  ui: '#dfe6e9',
  staff: '#a4b0be',
  heart: '#00d4ff',
} as const

export const NOTE_COLORS: Record<NoteColor, string> = {
  red: '#ff4757',
  blue: '#2ed573',
  yellow: '#ffa502',
  purple: '#a29bfe',
  green: '#7bed9f',
}

export const NOTE_INSTRUMENTS: Record<NoteColor, InstrumentType> = {
  red: 'piano',
  blue: 'violin',
  yellow: 'drum',
  purple: 'harp',
  green: 'flute',
}

export const COLOR_KEYS: NoteColor[] = ['red', 'blue', 'yellow', 'purple', 'green']

export const BASE_FREQUENCY = 261.63
export const SEMITONE_RATIO = Math.pow(2, 1 / 12)

export const SUBMARINE = {
  width: 70,
  height: 35,
  baseSpeed: 5,
  slowMultiplier: 0.6,
  slowDuration: 1000,
  hitFlashDuration: 200,
}

export const SOUND_BALL = {
  radius: 14,
  glowRadius: 12,
  glowAlpha: 0.6,
  baseSpeed: 2,
  wobbleAmp: 15,
  wobbleSpeed: 0.03,
  spawnInterval: 800,
}

export const OBSTACLE = {
  reefMinWidth: 40,
  reefMaxWidth: 80,
  reefMinHeight: 30,
  reefMaxHeight: 50,
  reefSpeed: 1.5,
  spawnInterval: 2500,
}

export const FISH = {
  minCount: 5,
  maxCount: 8,
  amplitude: 30,
  period: 1500,
  speed: 1.8,
  spawnInterval: 4000,
  fishWidth: 18,
  fishHeight: 10,
}

export const JELLYFISH = {
  minRadius: 12,
  maxRadius: 22,
  speed: 0.5,
  pulsePeriod: 1000,
  spawnInterval: 3000,
}

export const TRAIL = {
  maxParticles: 60,
  particleLife: 500,
  spawnInterval: 50,
}

export const SHOCKWAVE = {
  initialRadius: 20,
  finalRadius: 60,
  duration: 300,
}

export const TRACK = {
  minWidth: 30,
  maxWidth: 80,
  fadeDuration: 500,
  barHeight: 20,
  maxLayers: 12,
}

export const COLLISION = {
  ballCollectRadius: 40,
}

export const INITIAL_LIVES = 3
