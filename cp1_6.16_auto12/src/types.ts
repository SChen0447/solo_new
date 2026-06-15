export interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  color: string;
  glowIntensity: number;
  isFastest: boolean;
  createdAt: number;
}

export interface CollisionEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  startTime: number;
}

export interface Bounds {
  width: number;
  height: number;
}

export interface Stats {
  totalBalls: number;
  totalKineticEnergy: number;
  slowestSpeed: number;
  fastestSpeed: number;
}

export type PresetType = 'surround' | 'uniform' | 'orbit';
