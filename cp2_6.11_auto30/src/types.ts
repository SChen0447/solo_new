export interface Building {
  id: string;
  gridX: number;
  gridZ: number;
  position: { x: number; y: number; z: number };
  width: number;
  depth: number;
  height: number;
  floors: number;
  color: string;
  frontPressure: number;
  backPressure: number;
  pressureDiff: number;
}

export interface Particle {
  id: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  speed: number;
  age: number;
  maxAge: number;
  trail: { x: number; y: number; z: number }[];
  active: boolean;
}

export interface WindParams {
  speed: number;
  direction: number;
}

export interface CityConfig {
  gridSize: number;
  cellSize: number;
  minFloors: number;
  maxFloors: number;
  floorHeight: number;
  minBuildingsPerCell: number;
  maxBuildingsPerCell: number;
}

export interface ParticleConfig {
  count: number;
  trailLength: number;
  particleSize: number;
  spawnPlane: {
    width: number;
    height: number;
    position: { x: number; y: number; z: number };
  };
}

export interface PressureData {
  buildingId: string;
  frontPressure: number;
  backPressure: number;
  sidePressure: number;
  topPressure: number;
}

export interface ContourLevel {
  value: number;
  color: string;
}
