export type BalconyOrientation = 'east' | 'south' | 'west' | 'north' | 'southeast' | 'southwest' | 'northeast' | 'northwest';

export type ShadeLevel = 'none' | 'light' | 'medium' | 'heavy';

export type PlantType = 'foliage' | 'flowering' | 'succulent' | 'herb';

export type PlantStatus = 'happy' | 'neutral' | 'sad' | 'dead';

export const PLANT_STATUS_EMOJI: Record<PlantStatus, string> = {
  happy: '😊',
  neutral: '😐',
  sad: '😢',
  dead: '💀'
};

export const PLANT_STATUS_COLOR: Record<PlantStatus, string> = {
  happy: '#4CAF50',
  neutral: '#FFC107',
  sad: '#FF9800',
  dead: '#F44336'
};

export const BALCONY_ORIENTATION_LABEL: Record<BalconyOrientation, string> = {
  east: '东',
  south: '南',
  west: '西',
  north: '北',
  southeast: '东南',
  southwest: '西南',
  northeast: '东北',
  northwest: '西北'
};

export const SHADE_LEVEL_LABEL: Record<ShadeLevel, string> = {
  none: '无遮阳',
  light: '轻度遮阳',
  medium: '中度遮阳',
  heavy: '重度遮阳'
};

export const PLANT_TYPE_LABEL: Record<PlantType, string> = {
  foliage: '观叶',
  flowering: '开花',
  succulent: '多肉',
  herb: '香草'
};

export const PLANT_TYPE_ICON: Record<PlantType, string> = {
  foliage: '🌿',
  flowering: '🌸',
  succulent: '🪴',
  herb: '🌱'
};

export interface BalconyInfo {
  id: string;
  orientation: BalconyOrientation;
  floor: number;
  shadeLevel: ShadeLevel;
  createdAt: string;
}

export interface DailyClimateData {
  id: string;
  balconyId: string;
  date: string;
  maxTemp: number;
  minTemp: number;
  humidity: number;
  lightHours: number;
  lightIntensity: number;
  plantStatus?: PlantStatus;
}

export interface CityWeatherReference {
  date: string;
  avgTemp: number;
  avgHumidity: number;
}

export interface PlantData {
  name: string;
  type: PlantType;
  tags: string[];
}

export interface PlantSuccessRecord {
  plantName: string;
  plantType: PlantType;
  balconyOrientation: BalconyOrientation;
  floorRange: string;
  shadeLevel: ShadeLevel;
  totalDays: number;
  happyDays: number;
  tags: string[];
}

export interface PlantRecommendation {
  plantName: string;
  plantType: PlantType;
  matchScore: number;
  tags: string[];
  icon: string;
}

export interface ChartDataPoint {
  date: string;
  maxTemp: number;
  minTemp: number;
  humidity: number;
  lightHours: number;
  lightIntensity: number;
  referenceTemp: number;
  referenceHumidity: number;
  plantStatus?: PlantStatus;
  statusColor?: string;
}

export type ChartMetric = 'temperature' | 'humidity' | 'light';
