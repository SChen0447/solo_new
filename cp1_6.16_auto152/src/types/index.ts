export type FrequencyBand = 125 | 250 | 500 | 1000 | 2000 | 4000;

export const FREQUENCY_BANDS: FrequencyBand[] = [125, 250, 500, 1000, 2000, 4000];

export const FREQUENCY_LABELS: Record<FrequencyBand, string> = {
  125: '125Hz',
  250: '250Hz',
  500: '500Hz',
  1000: '1kHz',
  2000: '2kHz',
  4000: '4kHz'
};

export interface AbsorptionCoefficients {
  125: number;
  250: number;
  500: number;
  1000: number;
  2000: number;
  4000: number;
}

export type MaterialScheme = 'none' | 'basic' | 'enhanced';

export const MATERIAL_SCHEME_NAMES: Record<MaterialScheme, string> = {
  none: '无吸音',
  basic: '基础吸音（吸音板）',
  enhanced: '增强吸音（吸音板+地毯+窗帘）'
};

export const ABSORPTION_SCHEMES: Record<MaterialScheme, AbsorptionCoefficients> = {
  none: { 125: 0.05, 250: 0.06, 500: 0.07, 1000: 0.08, 2000: 0.09, 4000: 0.10 },
  basic: { 125: 0.15, 250: 0.30, 500: 0.55, 1000: 0.70, 2000: 0.75, 4000: 0.70 },
  enhanced: { 125: 0.30, 250: 0.55, 500: 0.80, 1000: 0.90, 2000: 0.95, 4000: 0.90 }
};

export interface SoundSource {
  id: number;
  x: number;
  y: number;
  z: number;
  intensity: number;
}

export interface RoomDimensions {
  width: number;
  depth: number;
  height: number;
}

export interface GridPoint {
  x: number;
  y: number;
  z: number;
  spl: number;
}

export interface SurfaceGridData {
  splValues: number[][];
  width: number;
  height: number;
}

export interface AcousticResult {
  floor: SurfaceGridData;
  ceiling: SurfaceGridData;
  wallNorth: SurfaceGridData;
  wallSouth: SurfaceGridData;
  wallEast: SurfaceGridData;
  wallWest: SurfaceGridData;
}

export interface PickedPointInfo {
  x: number;
  y: number;
  z: number;
  spl: number;
  frequency: FrequencyBand;
  scheme: MaterialScheme;
  screenX: number;
  screenY: number;
}
