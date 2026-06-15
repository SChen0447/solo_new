export type Species = 'tree' | 'shrub' | 'vine' | 'grass';
export type WeatherMode = 'sunny' | 'cloudy' | 'rainy' | 'dusty';
export type GrowthStage = 'seedling' | 'mature' | 'aging';
export type TimeScale = 1 | 2 | 5 | 10;

export interface WeatherParams {
  temperature: number;
  humidity: number;
  light: number;
  windSpeed: number;
}

export interface Plant {
  id: string;
  species: Species;
  position: [number, number, number];
  age: number;
  height: number;
  maxHeight: number;
  leafCount: number;
  maxLeaves: number;
  orientation: number;
  tilt: number;
  health: number;
  stage: GrowthStage;
  leafColor: string;
  segments: number;
}

export interface WeatherStoreState {
  weather: WeatherParams;
  targetWeather: WeatherParams;
  weatherMode: WeatherMode;
  timeScale: TimeScale;
  ecoDay: number;
  plants: Plant[];
  selectedPlantId: string | null;
  glowPlantId: string | null;
}

export interface WeatherStoreActions {
  setWeather: (params: Partial<WeatherParams>) => void;
  setWeatherMode: (mode: WeatherMode) => void;
  setTimeScale: (scale: TimeScale) => void;
  selectPlant: (id: string | null) => void;
  setGlowPlant: (id: string | null) => void;
  tick: (deltaMs: number) => void;
  initPlants: () => void;
}

export type WeatherStore = WeatherStoreState & WeatherStoreActions;

export const SPECIES_CONFIG: Record<Species, {
  minHeight: number;
  maxHeight: number;
  minLeaves: number;
  maxLeaves: number;
  segments: number;
  color: string;
  label: string;
}> = {
  tree: { minHeight: 5, maxHeight: 12, minLeaves: 40, maxLeaves: 80, segments: 12, color: '#2d5a27', label: '乔木' },
  shrub: { minHeight: 2, maxHeight: 4, minLeaves: 20, maxLeaves: 40, segments: 8, color: '#4a8c3f', label: '灌木' },
  vine: { minHeight: 0.5, maxHeight: 2, minLeaves: 10, maxLeaves: 25, segments: 6, color: '#66bb5a', label: '藤蔓' },
  grass: { minHeight: 0.1, maxHeight: 0.5, minLeaves: 3, maxLeaves: 8, segments: 4, color: '#88dd77', label: '草' },
};

export const WEATHER_PRESETS: Record<WeatherMode, WeatherParams> = {
  sunny: { temperature: 25, humidity: 50, light: 1200, windSpeed: 2 },
  cloudy: { temperature: 20, humidity: 70, light: 600, windSpeed: 4 },
  rainy: { temperature: 18, humidity: 95, light: 300, windSpeed: 8 },
  dusty: { temperature: 35, humidity: 15, light: 800, windSpeed: 15 },
};

export const SKY_COLORS: Record<WeatherMode, string> = {
  sunny: '#4a90d9',
  cloudy: '#b0b0b0',
  rainy: '#3a3a3a',
  dusty: '#c8a952',
};
