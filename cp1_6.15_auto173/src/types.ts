export interface BuildingData {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  width: number;
  height: number;
  depth: number;
}

export interface BuildingMesh extends THREE.Mesh {
  userData: {
    buildingId: string;
    isBuilding: boolean;
  };
}

export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  bezierP1: THREE.Vector3;
  bezierP2: THREE.Vector3;
  progress: number;
  speed: number;
  baseSpeed: number;
  isInWake: boolean;
  wakeTimer: number;
  age: number;
  maxAge: number;
  trail: THREE.Vector3[];
}

export interface WindParams {
  baseSpeed: number;
  direction: THREE.Vector3;
  turbulenceStrength: number;
  wakeSlowdownFactor: number;
  gridSize: number;
}

export interface WindGridCell {
  avgSpeed: number;
  particleCount: number;
  totalSpeed: number;
}

export interface ExportData {
  timestamp: number;
  buildings: BuildingData[];
  windParams: {
    baseSpeed: number;
    directionX: number;
    directionY: number;
    directionZ: number;
  };
  windGrid: {
    size: number;
    cells: number[][];
  };
  statistics: {
    avgSpeed: number;
    maxSpeed: number;
    minSpeed: number;
  };
}

export type EditorMode = 'select' | 'move' | 'add';
