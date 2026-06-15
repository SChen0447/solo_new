import { create } from 'zustand';
import {
  WeatherStore,
  WeatherParams,
  WeatherMode,
  TimeScale,
  WEATHER_PRESETS,
} from '../types';
import {
  generatePlants,
  updatePlant,
  interpolateWeather,
} from '../components/GrowthSimulator';

const initialWeather: WeatherParams = { ...WEATHER_PRESETS.sunny };

export const useWeatherStore = create<WeatherStore>((set, get) => ({
  weather: initialWeather,
  targetWeather: { ...initialWeather },
  weatherMode: 'sunny',
  timeScale: 1,
  ecoDay: 0,
  plants: [],
  selectedPlantId: null,
  glowPlantId: null,

  setWeather: (params) => {
    const clamped: Partial<WeatherParams> = {};
    if (params.temperature !== undefined) clamped.temperature = Math.max(-10, Math.min(45, params.temperature));
    if (params.humidity !== undefined) clamped.humidity = Math.max(0, Math.min(100, params.humidity));
    if (params.light !== undefined) clamped.light = Math.max(0, Math.min(2000, params.light));
    if (params.windSpeed !== undefined) clamped.windSpeed = Math.max(0, Math.min(20, params.windSpeed));

    set((state) => ({
      targetWeather: { ...state.targetWeather, ...clamped },
    }));
  },

  setWeatherMode: (mode: WeatherMode) => {
    set({
      weatherMode: mode,
      targetWeather: { ...WEATHER_PRESETS[mode] },
    });
  },

  setTimeScale: (scale: TimeScale) => set({ timeScale: scale }),

  selectPlant: (id) => {
    if (id) {
      set({ selectedPlantId: id, glowPlantId: id });
      setTimeout(() => {
        const cur = get().glowPlantId;
        if (cur === id) set({ glowPlantId: null });
      }, 3000);
    } else {
      set({ selectedPlantId: null });
    }
  },

  setGlowPlant: (id) => set({ glowPlantId: id }),

  initPlants: () => {
    const humidity = get().weather.humidity;
    set({ plants: generatePlants(humidity) });
  },

  tick: (deltaMs: number) => {
    const state = get();
    if (state.plants.length === 0) return;

    const newWeather = interpolateWeather(state.weather, state.targetWeather, deltaMs);
    const deltaDays = (deltaMs / 1000) * state.timeScale * 0.5;

    const newPlants = state.plants.map((p) =>
      updatePlant(p, newWeather, deltaDays, state.weatherMode)
    );

    set({
      weather: newWeather,
      ecoDay: state.ecoDay + deltaDays,
      plants: newPlants,
    });
  },
}));
