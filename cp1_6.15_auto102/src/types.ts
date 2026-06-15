import * as THREE from 'three';

export enum ParticleType {
  WIND = 'wind',
  RAIN = 'rain',
  CLOUD = 'cloud'
}

export interface Particle {
  id: number;
  type: ParticleType;
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  opacity: number;
  age: number;
  lifetime: number;
  rotation: number;
  rotSpeed: number;
}

export interface TerrainData {
  width: number;
  depth: number;
  segmentsX: number;
  segmentsZ: number;
  heights: Float32Array;
  getHeightAt: (x: number, z: number) => number;
}

export interface ClimateParams {
  temperature: number;
  humidity: number;
  pressure: number;
}

export interface HoverInfo {
  type: ParticleType | null;
  index: number;
  screenX: number;
  screenY: number;
}

export interface ParticleCounts {
  wind: number;
  rain: number;
  cloud: number;
  total: number;
}

export const BOUNDS = {
  minX: -4,
  maxX: 4,
  minY: 0,
  maxY: 4,
  minZ: -2.5,
  maxZ: 2.5,
  width: 8,
  height: 4,
  depth: 5
} as const;

export const DEFAULTS: ClimateParams = {
  temperature: 15,
  humidity: 50,
  pressure: 1000
};

export const RANGES = {
  temperature: { min: -10, max: 40, step: 1 },
  humidity: { min: 0, max: 100, step: 1 },
  pressure: { min: 950, max: 1050, step: 1 }
} as const;

export const COLORS = {
  wind: 0x42a5f5,
  rain: 0x00e5ff,
  cloud: 0xffffff,
  terrainLow: 0x1b5e20,
  terrainHigh: 0xbdbdbd
} as const;
