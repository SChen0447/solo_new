import { create } from 'zustand';
import {
  ClimateParams,
  TerrainData,
  HoverInfo,
  ParticleCounts,
  DEFAULTS
} from './types';

interface StoreState {
  climate: ClimateParams;
  terrain: TerrainData | null;
  hover: HoverInfo;
  particleCounts: ParticleCounts;
  fps: number;
  setTemperature: (v: number) => void;
  setHumidity: (v: number) => void;
  setPressure: (v: number) => void;
  setTerrain: (t: TerrainData) => void;
  setHover: (h: HoverInfo) => void;
  setParticleCounts: (c: ParticleCounts) => void;
  setFps: (f: number) => void;
}

export const useStore = create<StoreState>((set) => ({
  climate: { ...DEFAULTS },
  terrain: null,
  hover: { type: null, index: -1, screenX: 0, screenY: 0 },
  particleCounts: { wind: 0, rain: 0, cloud: 0, total: 0 },
  fps: 0,

  setTemperature: (v) =>
    set((s) => ({ climate: { ...s.climate, temperature: v } }),

  setHumidity: (v) =>
    set((s) => ({ climate: { ...s.climate, humidity: v } })),

  setPressure: (v) =>
    set((s) => ({ climate: { ...s.climate, pressure: v } }),

  setTerrain: (t) => set({ terrain: t }),
  setHover: (h) => set({ hover: h }),
  setParticleCounts: (c) => set({ particleCounts: c }),
  setFps: (f) => set({ fps: f })
}));
