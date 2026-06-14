import { create } from 'zustand';

export interface Building {
  id: number;
  x: number;
  z: number;
  height: number;
}

interface CityState {
  buildings: Building[];
  density: number;
  nextId: number;
  addBuilding: (x: number, z: number, layers?: number) => void;
  removeBuilding: (x: number, z: number, layers?: number) => void;
  updateDensity: (density: number) => void;
  resetBuildings: () => void;
  getBuildingCount: () => number;
  getAverageHeight: () => number;
}

export const useStore = create<CityState>((set, get) => ({
  buildings: [],
  density: 1,
  nextId: 1,

  addBuilding: (x: number, z: number, layers?: number) => {
    const state = get();
    const addLayers = layers ?? state.density;
    const existing = state.buildings.find(b => b.x === x && b.z === z);
    if (existing) {
      set({
        buildings: state.buildings.map(b =>
          b.id === existing.id
            ? { ...b, height: Math.min(b.height + addLayers, 20) }
            : b
        )
      });
    } else {
      const newBuilding: Building = {
        id: state.nextId,
        x,
        z,
        height: Math.min(addLayers, 20)
      };
      set({
        buildings: [...state.buildings, newBuilding],
        nextId: state.nextId + 1
      });
    }
  },

  removeBuilding: (x: number, z: number, layers?: number) => {
    const state = get();
    const removeLayers = layers ?? 1;
    const existing = state.buildings.find(b => b.x === x && b.z === z);
    if (!existing) return;
    const newHeight = existing.height - removeLayers;
    if (newHeight <= 0) {
      set({
        buildings: state.buildings.filter(b => b.id !== existing.id)
      });
    } else {
      set({
        buildings: state.buildings.map(b =>
          b.id === existing.id ? { ...b, height: newHeight } : b
        )
      });
    }
  },

  updateDensity: (density: number) => {
    set({ density: Math.max(1, Math.min(5, Math.floor(density))) });
  },

  resetBuildings: () => {
    set({ buildings: [], nextId: 1 });
  },

  getBuildingCount: () => {
    return get().buildings.length;
  },

  getAverageHeight: () => {
    const buildings = get().buildings;
    if (buildings.length === 0) return 0;
    const total = buildings.reduce((sum, b) => sum + b.height, 0);
    return Math.round((total / buildings.length) * 10) / 10;
  }
}));

export function playClickSound(type: 'add' | 'remove' = 'add') {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = type === 'add' ? 880 : 440;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch (_e) {
    // ignore audio errors
  }
}
