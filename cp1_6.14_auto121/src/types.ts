export type TankType = 'freshwater' | 'saltwater';

export interface FishGroup {
  id: string;
  species: string;
  count: number;
  notes: string;
}

export interface Tank {
  id: string;
  name: string;
  capacity: number;
  type: TankType;
  tempMin: number;
  tempMax: number;
  fishGroups: FishGroup[];
}

export interface WaterReading {
  id: string;
  tankId: string;
  date: string;
  temperature: number;
  ph: number;
  ammonia: number;
  nitrite: number;
  nitrate: number;
  hardness: number;
}

export type FeedType = 'flake' | 'pellet' | 'freeze-dried';

export interface FeedingLog {
  id: string;
  tankId: string;
  date: string;
  feedType: FeedType;
  amount: number;
}

export interface WaterChangeLog {
  id: string;
  tankId: string;
  date: string;
  volume: number;
  addedStabilizer: boolean;
}

export interface ThresholdConfig {
  ammoniaMax: number;
  nitriteMax: number;
  nitrateMax: number;
  phMin: number;
  phMax: number;
  hardnessMin: number;
  hardnessMax: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  ammoniaMax: 0.25,
  nitriteMax: 0.25,
  nitrateMax: 40,
  phMin: 6.5,
  phMax: 8.0,
  hardnessMin: 4,
  hardnessMax: 12,
};

export type TankStatus = 'normal' | 'temp-high' | 'ammonia-high';
