export interface PollutantData {
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  current: PollutantData;
  aqi: number;
  history: PollutantData[];
}

export interface WindParams {
  direction: number;
  speed: number;
}

export type PollutantType = 'pm25' | 'pm10' | 'o3' | 'no2' | 'so2' | 'co';

export const POLLUTANT_LABELS: Record<PollutantType, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  o3: 'O₃',
  no2: 'NO₂',
  so2: 'SO₂',
  co: 'CO',
};

export const POLLUTANT_COLORS: Record<PollutantType, string> = {
  pm25: '#ff1744',
  pm10: '#ff9100',
  o3: '#7c4dff',
  no2: '#00bcd4',
  so2: '#ffc107',
  co: '#4caf50',
};

export const POLLUTANT_MAX: Record<PollutantType, number> = {
  pm25: 150,
  pm10: 250,
  o3: 200,
  no2: 100,
  so2: 150,
  co: 10,
};

export interface Events {
  DATA_UPDATE: { stations: Station[]; wind: WindParams; timestamp: number };
  AGGREGATE_DATA: { stations: Station[]; timestamp: number };
  WIND_CHANGE: WindParams;
  POLLUTANT_SWITCH: PollutantType;
  TIME_SCRUB: { timeIndex: number; isPlaying: boolean };
  PLAY_TOGGLE: boolean;
  STATION_HOVER: { station: Station | null; screenX: number; screenY: number };
  STATION_CLICK: Station;
  HEATMAP_UPDATED: { texture: THREE.CanvasTexture };
}
