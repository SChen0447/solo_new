import { create } from 'zustand';

export interface CityParams {
  plotSize: number;
  density: number;
  maxHeight: number;
  growthSpeed: number;
}

export interface CityState {
  params: CityParams;
  growthProgress: number;
  isNightMode: boolean;
  fps: number;
  cameraMode: 'overview' | 'ground' | 'follow';
  setParams: (params: Partial<CityParams>) => void;
  setGrowthProgress: (t: number) => void;
  toggleNightMode: () => void;
  setFps: (fps: number) => void;
  setCameraMode: (mode: 'overview' | 'ground' | 'follow') => void;
  resetGrowth: () => void;
}

export const useCityStore = create<CityState>((set) => ({
  params: {
    plotSize: 100,
    density: 0.5,
    maxHeight: 80,
    growthSpeed: 1.0,
  },
  growthProgress: 0,
  isNightMode: false,
  fps: 60,
  cameraMode: 'overview',
  setParams: (newParams) =>
    set((state) => ({
      params: { ...state.params, ...newParams },
      growthProgress: 0,
    })),
  setGrowthProgress: (t) => set({ growthProgress: t }),
  toggleNightMode: () => set((state) => ({ isNightMode: !state.isNightMode })),
  setFps: (fps) => set({ fps }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  resetGrowth: () => set({ growthProgress: 0 }),
}));
