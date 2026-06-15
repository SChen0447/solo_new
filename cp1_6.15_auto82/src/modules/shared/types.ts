export interface BuildingBlock {
  id: string;
  gridX: number;
  gridZ: number;
  height: number;
  worldX: number;
  worldZ: number;
}

export interface MarkerPoint {
  id: string;
  gridX: number;
  gridZ: number;
  worldX: number;
  worldZ: number;
}

export interface SimulationParams {
  particleCount: number;
  speedMultiplier: number;
  arrivalDelay: number;
}

export type PresetMode = 'normal' | 'morning_peak' | 'weekend';

export interface StatsData {
  avgDensity: number;
  speedHistogram: number[];
  avgSpeed: number;
  totalParticles: number;
  runTimeSeconds: number;
}
