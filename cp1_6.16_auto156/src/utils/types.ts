export enum SurfaceType {
  BuildingRoof = 'building_roof',
  Asphalt = 'asphalt',
  Concrete = 'concrete',
  Grass = 'grass',
  Pavement = 'pavement',
  Water = 'water',
}

export interface SurfaceMaterial {
  type: SurfaceType;
  color: string;
  heatCapacity: number;
  absorptionRate: number;
  label: string;
}

export interface Building {
  id: string;
  gridRow: number;
  gridCol: number;
  widthCells: number;
  depthCells: number;
  height: number;
  hasGreenRoof: boolean;
  meshId: string;
}

export interface GridCell {
  row: number;
  col: number;
  surfaceType: SurfaceType;
  temperature: number;
  buildingId: string | null;
  isWaterBody: boolean;
  effectiveAbsorption: number;
  effectiveHeatCapacity: number;
}

export interface WaterBody {
  id: string;
  centerRow: number;
  centerCol: number;
  radius: number;
  gridCells: { row: number; col: number }[];
}

export type CoolingStrategyType = 'greenRoof' | 'permeablePaving' | 'waterBody';

export interface CoolingEffect {
  avgTempDrop: number;
  coveragePercent: number;
}

export interface CityConfig {
  buildingCount: number;
  roadWidth: number;
  roadMaterial: 'asphalt' | 'concrete';
  grassRatio: number;
}

export const GRID_SIZE = 20;
export const CELL_SIZE = 10;
export const PLOT_SIZE = 200;

export const SURFACE_MATERIALS: Record<SurfaceType, SurfaceMaterial> = {
  [SurfaceType.BuildingRoof]: {
    type: SurfaceType.BuildingRoof,
    color: '#616161',
    heatCapacity: 0.97,
    absorptionRate: 0.9,
    label: '建筑屋顶',
  },
  [SurfaceType.Asphalt]: {
    type: SurfaceType.Asphalt,
    color: '#333333',
    heatCapacity: 0.92,
    absorptionRate: 0.95,
    label: '沥青路面',
  },
  [SurfaceType.Concrete]: {
    type: SurfaceType.Concrete,
    color: '#9E9E9E',
    heatCapacity: 0.88,
    absorptionRate: 0.7,
    label: '透水混凝土',
  },
  [SurfaceType.Grass]: {
    type: SurfaceType.Grass,
    color: '#66BB6A',
    heatCapacity: 1.1,
    absorptionRate: 0.75,
    label: '草坪',
  },
  [SurfaceType.Pavement]: {
    type: SurfaceType.Pavement,
    color: '#D7CCC8',
    heatCapacity: 0.75,
    absorptionRate: 0.6,
    label: '硬质铺装',
  },
  [SurfaceType.Water]: {
    type: SurfaceType.Water,
    color: '#42A5F5',
    heatCapacity: 4.18,
    absorptionRate: 0.1,
    label: '水体',
  },
};

export const ENV_PARAMS = {
  ambientTemp: 32,
  windSpeed: 2,
  relativeHumidity: 45,
  solarIrradiance: 500,
};

export const HEATMAP_COLORS = [
  { temp: 28, r: 0, g: 0, b: 255 },
  { temp: 31, r: 0, g: 255, b: 255 },
  { temp: 34, r: 255, g: 255, b: 0 },
  { temp: 37, r: 255, g: 0, b: 0 },
  { temp: 52, r: 139, g: 0, b: 0 },
];
