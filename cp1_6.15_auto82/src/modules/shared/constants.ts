export const GRID_SIZE = 10;
export const STREET_WIDTH = 2;
export const BLOCK_SIZE = 8;
export const CELL_SIZE = STREET_WIDTH + BLOCK_SIZE;

export const WORLD_MIN = -(GRID_SIZE * CELL_SIZE) / 2;
export const WORLD_MAX = (GRID_SIZE * CELL_SIZE) / 2;
export const WORLD_SIZE = GRID_SIZE * CELL_SIZE;

export const NODE_COUNT = GRID_SIZE + 1;

export const BUILDING_MIN_HEIGHT = 2;
export const BUILDING_MAX_HEIGHT = 6;
export const BUILDING_SIZE = 4;

export const PARTICLE_MIN_SPEED = 0.5;
export const PARTICLE_MAX_SPEED = 2.0;
export const PARTICLE_RADIUS = 0.1;
export const DEFAULT_PARTICLE_COUNT = 500;

export const HEATMAP_TEXTURE_SIZE = 60;
export const HEATMAP_UPDATE_INTERVAL = 66;
export const HEATMAP_GAUSSIAN_RADIUS = 2;
export const HEATMAP_GAUSSIAN_SIGMA = 1;

export const COLORS = {
  BG_DARK: '#0d1117',
  PANEL_BG: '#161b22',
  PANEL_BORDER: '#30363d',
  SLIDER_TRACK: '#21262d',
  SLIDER_THUMB: '#58a6ff',
  SLIDER_THUMB_HOVER: '#79c0ff',
  BTN_PRIMARY: '#238636',
  BTN_PRIMARY_HOVER: '#2ea043',
  BTN_PRIMARY_ACTIVE: '#1b6b2e',
  TEXT_PRIMARY: '#c9d1d9',
  CARD_BG: '#1c2128',
  GRID_LINE: '#2c3e50',

  START_POINT: '#e74c3c',
  END_POINT: '#2ecc71',

  HEAT_LOW: '#3498db',
  HEAT_MID: '#1abc9c',
  HEAT_HIGH: '#e74c3c',

  PARTICLE_LOW: '#3498db',
  PARTICLE_HIGH: '#e74c3c',

  BUILDING_LOW: '#cccccc',
  BUILDING_HIGH: '#333333',
} as const;

export const PRESETS = {
  normal: {
    particleCount: 500,
    speedMultiplier: 1,
    arrivalDelay: 1,
  },
  morning_peak: {
    particleCount: 1500,
    speedMultiplier: 1.5,
    arrivalDelay: 0.8,
  },
  weekend: {
    particleCount: 800,
    speedMultiplier: 1,
    arrivalDelay: 1.5,
  },
} as const;

export const CAMERA = {
  INITIAL_POS: [40, 35, 40] as [number, number, number],
  INITIAL_TARGET: [0, 0, 0] as [number, number, number],
  MIN_DISTANCE: 5,
  MAX_DISTANCE: 50,
  MIN_POLAR: Math.PI * (10 / 180),
  MAX_POLAR: Math.PI * (80 / 180),
  ROTATE_SPEED: 0.5,
  ZOOM_SPEED: 0.2,
  FOCUS_DURATION: 0.6,
  FOV: 60,
} as const;

export const STATS = {
  PANEL_WIDTH: 240,
  PROGRESS_WIDTH: 180,
  PROGRESS_HEIGHT: 12,
  HISTOGRAM_BINS: 10,
  UPDATE_INTERVAL: 1000,
  HISTOGRAM_UPDATE_INTERVAL: 2000,
} as const;
