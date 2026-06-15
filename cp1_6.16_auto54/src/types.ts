export type TimePeriod = 'morning' | 'evening' | 'night';

export interface BuildingData {
  id: string;
  lat: number;
  lng: number;
  height: number;
  floors: number;
  color?: string;
}

export interface RoadData {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  averageSpeed: number;
  congestionLevel: number;
}

export interface PeriodTrafficData {
  roads: RoadData[];
}

export interface RawDataset {
  buildings: Array<{
    id: string;
    lat: number;
    lng: number;
    floors: number;
  }>;
  traffic: {
    morning: PeriodTrafficData;
    evening: PeriodTrafficData;
    night: PeriodTrafficData;
  };
}

export interface DataSnapshot {
  buildings: BuildingData[];
  roads: RoadData[];
  period: TimePeriod;
  stats: {
    totalRoads: number;
    averageSpeed: number;
    maxCongestion: number;
    congestionDistribution: number[];
  };
}

export interface SharedScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  buildingsGroup: THREE.Group;
  heatmapGroup: THREE.Group;
  particlesGroup: THREE.Group;
}

export interface EventMap {
  'data-ready': DataSnapshot;
  'time-changed': TimePeriod;
  'scene-ready': SharedScene;
}
