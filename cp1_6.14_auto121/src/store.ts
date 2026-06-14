import { create } from 'zustand';
import axios from 'axios';
import type { Tank, WaterReading, FeedingLog, WaterChangeLog, FishGroup, TankType } from './types';
import { DEFAULT_THRESHOLDS } from './types';

interface AquariumState {
  tanks: Tank[];
  readings: Record<string, WaterReading[]>;
  feedings: Record<string, FeedingLog[]>;
  waterChanges: Record<string, WaterChangeLog[]>;
  loading: boolean;

  fetchAllTanks: () => Promise<void>;
  addTank: (tank: { name: string; capacity: number; type: TankType; tempMin: number; tempMax: number }) => Promise<void>;
  updateTank: (id: string, data: Partial<Tank>) => Promise<void>;
  deleteTank: (id: string) => Promise<void>;
  addFishGroup: (tankId: string, fish: Omit<FishGroup, 'id'>) => Promise<void>;
  removeFishGroup: (tankId: string, fishId: string) => Promise<void>;

  fetchReadings: (tankId: string) => Promise<void>;
  addReading: (tankId: string, reading: Omit<WaterReading, 'id' | 'tankId'>) => Promise<WaterReading | null>;
  deleteReading: (tankId: string, readingId: string) => Promise<void>;

  fetchFeedings: (tankId: string) => Promise<void>;
  addFeeding: (tankId: string, feeding: Omit<FeedingLog, 'id' | 'tankId'>) => Promise<void>;

  fetchWaterChanges: (tankId: string) => Promise<void>;
  addWaterChange: (tankId: string, change: Omit<WaterChangeLog, 'id' | 'tankId'>) => Promise<void>;

  getLatestReading: (tankId: string) => WaterReading | null;
  getTankStatus: (tankId: string) => 'normal' | 'temp-high' | 'ammonia-high';
  getDaysSinceLastWaterChange: (tankId: string) => number | null;
  hasFedToday: (tankId: string) => boolean;
}

export const useAquariumStore = create<AquariumState>((set, get) => ({
  tanks: [],
  readings: {},
  feedings: {},
  waterChanges: {},
  loading: false,

  fetchAllTanks: async () => {
    set({ loading: true });
    try {
      const res = await axios.get<Tank[]>('/api/tanks');
      set({ tanks: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addTank: async (tankData) => {
    const res = await axios.post<Tank>('/api/tanks', tankData);
    set((state) => ({ tanks: [...state.tanks, res.data] }));
  },

  updateTank: async (id, data) => {
    const res = await axios.put<Tank>(`/api/tanks/${id}`, data);
    set((state) => ({
      tanks: state.tanks.map((t) => (t.id === id ? res.data : t)),
    }));
  },

  deleteTank: async (id) => {
    await axios.delete(`/api/tanks/${id}`);
    set((state) => ({
      tanks: state.tanks.filter((t) => t.id !== id),
    }));
  },

  addFishGroup: async (tankId, fish) => {
    const tank = get().tanks.find((t) => t.id === tankId);
    if (!tank) return;
    const updatedFish = [...tank.fishGroups, { ...fish, id: crypto.randomUUID() }];
    const res = await axios.put<Tank>(`/api/tanks/${tankId}`, { fishGroups: updatedFish });
    set((state) => ({
      tanks: state.tanks.map((t) => (t.id === tankId ? res.data : t)),
    }));
  },

  removeFishGroup: async (tankId, fishId) => {
    const tank = get().tanks.find((t) => t.id === tankId);
    if (!tank) return;
    const updatedFish = tank.fishGroups.filter((f) => f.id !== fishId);
    const res = await axios.put<Tank>(`/api/tanks/${tankId}`, { fishGroups: updatedFish });
    set((state) => ({
      tanks: state.tanks.map((t) => (t.id === tankId ? res.data : t)),
    }));
  },

  fetchReadings: async (tankId) => {
    const res = await axios.get<WaterReading[]>(`/api/tanks/${tankId}/readings`);
    set((state) => ({
      readings: { ...state.readings, [tankId]: res.data },
    }));
  },

  addReading: async (tankId, reading) => {
    const res = await axios.post<WaterReading>(`/api/tanks/${tankId}/readings`, reading);
    set((state) => ({
      readings: {
        ...state.readings,
        [tankId]: [...(state.readings[tankId] || []), res.data],
      },
    }));
    return res.data;
  },

  deleteReading: async (tankId, readingId) => {
    await axios.delete(`/api/tanks/${tankId}/readings/${readingId}`);
    set((state) => ({
      readings: {
        ...state.readings,
        [tankId]: (state.readings[tankId] || []).filter((r) => r.id !== readingId),
      },
    }));
  },

  fetchFeedings: async (tankId) => {
    const res = await axios.get<FeedingLog[]>(`/api/tanks/${tankId}/feedings`);
    set((state) => ({
      feedings: { ...state.feedings, [tankId]: res.data },
    }));
  },

  addFeeding: async (tankId, feeding) => {
    const res = await axios.post<FeedingLog>(`/api/tanks/${tankId}/feedings`, feeding);
    set((state) => ({
      feedings: {
        ...state.feedings,
        [tankId]: [...(state.feedings[tankId] || []), res.data],
      },
    }));
  },

  fetchWaterChanges: async (tankId) => {
    const res = await axios.get<WaterChangeLog[]>(`/api/tanks/${tankId}/water-changes`);
    set((state) => ({
      waterChanges: { ...state.waterChanges, [tankId]: res.data },
    }));
  },

  addWaterChange: async (tankId, change) => {
    const res = await axios.post<WaterChangeLog>(`/api/tanks/${tankId}/water-changes`, change);
    set((state) => ({
      waterChanges: {
        ...state.waterChanges,
        [tankId]: [...(state.waterChanges[tankId] || []), res.data],
      },
    }));
  },

  getLatestReading: (tankId) => {
    const tankReadings = get().readings[tankId];
    if (!tankReadings || tankReadings.length === 0) return null;
    return [...tankReadings].sort((a, b) => b.date.localeCompare(a.date))[0];
  },

  getTankStatus: (tankId) => {
    const latest = get().getLatestReading(tankId);
    if (!latest) return 'normal';
    const tank = get().tanks.find((t) => t.id === tankId);
    if (tank && latest.temperature > tank.tempMax) return 'temp-high';
    if (latest.ammonia > DEFAULT_THRESHOLDS.ammoniaMax) return 'ammonia-high';
    return 'normal';
  },

  getDaysSinceLastWaterChange: (tankId) => {
    const changes = get().waterChanges[tankId];
    if (!changes || changes.length === 0) return null;
    const sorted = [...changes].sort((a, b) => b.date.localeCompare(a.date));
    const lastDate = new Date(sorted[0].date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  },

  hasFedToday: (tankId) => {
    const tankFeedings = get().feedings[tankId];
    if (!tankFeedings) return false;
    const today = new Date().toISOString().split('T')[0];
    return tankFeedings.some((f) => f.date === today);
  },
}));
