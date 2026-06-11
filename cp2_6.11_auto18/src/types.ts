export type ToolType = 'raise' | 'lower' | 'smooth';
export type WeatherType = 'sunny' | 'rainy' | 'snowy';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  depth: number;
  type: 'river' | 'lake' | 'waterfall' | 'rain' | 'snow' | 'splash';
  active: boolean;
  brightness: number;
}

export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface HeightMap {
  cols: number;
  rows: number;
  data: Float32Array;
}

export interface PerformanceStats {
  fps: number;
  particleCount: number;
  gridUpdateTime: number;
}

export interface ExportData {
  heightMap: number[];
  cols: number;
  rows: number;
  seed: number;
  weather: WeatherType;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  active: boolean;
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
