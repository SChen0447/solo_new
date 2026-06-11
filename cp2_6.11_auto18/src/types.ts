export type ToolType = 'raise' | 'lower' | 'smooth';
export type WeatherType = 'sunny' | 'rainy' | 'snowy';

export type EventType =
  | 'terrain:modified'
  | 'terrain:heights:changed'
  | 'tool:changed'
  | 'weather:changed'
  | 'config:export'
  | 'config:import';

export interface SPHParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  density: number;
  pressure: number;
  life: number;
  maxLife: number;
  depth: number;
  type: 'river' | 'lake' | 'waterfall' | 'rain' | 'snow' | 'splash';
  active: boolean;
  brightness: number;
  lodLevel: number;
  hashKey: number;
}

export interface Particle extends SPHParticle {}

export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface HeightMap {
  cols: number;
  rows: number;
  data: Float32Array;
  flowFieldX?: Float32Array;
  flowFieldY?: Float32Array;
  flowFieldComputed?: boolean;
}

export interface PerformanceStats {
  fps: number;
  particleCount: number;
  gridUpdateTime: number;
}

export interface ExportData {
  version: string;
  heightMap: number[];
  cols: number;
  rows: number;
  seed: number;
  weather: WeatherType;
  tool: ToolType;
  viewTransform: ViewTransform;
  cellSize: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  active: number;
}

export interface SnowCover {
  data: Float32Array;
}

export interface WeatherTransition {
  from: WeatherType;
  to: WeatherType;
  progress: number;
  duration: number;
  active: boolean;
}

export type EventCallback = (payload?: unknown) => void;

export interface TerrainModifiedPayload {
  heightMap: HeightMap;
  modifiedCells: Set<number>;
  modifiedBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

export interface SpatialHashGrid {
  cellSize: number;
  table: Map<number, number[]>;
  cols: number;
  rows: number;
  worldWidth: number;
  worldHeight: number;
}

export interface LODCluster {
  x: number;
  y: number;
  count: number;
  avgVx: number;
  avgVy: number;
  avgDepth: number;
  type: Particle['type'];
}
