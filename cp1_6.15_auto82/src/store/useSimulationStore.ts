import { create } from 'zustand';
import * as THREE from 'three';
import {
  BuildingBlock,
  MarkerPoint,
  SimulationParams,
  PresetMode,
  StatsData,
} from '../modules/shared/types';
import {
  GRID_SIZE,
  CELL_SIZE,
  WORLD_MIN,
  PRESETS,
  DEFAULT_PARTICLE_COUNT,
} from '../modules/shared/constants';

const gridToWorld = (gx: number, gz: number) => ({
  worldX: WORLD_MIN + gx * CELL_SIZE + CELL_SIZE / 2,
  worldZ: WORLD_MIN + gz * CELL_SIZE + CELL_SIZE / 2,
});

const gridNodeToWorld = (gx: number, gz: number) => ({
  worldX: WORLD_MIN + gx * CELL_SIZE,
  worldZ: WORLD_MIN + gz * CELL_SIZE,
});

const genId = () => Math.random().toString(36).slice(2, 10);

const defaultBuildings: BuildingBlock[] = [
  { id: genId(), gridX: 2, gridZ: 2, height: 4, ...gridToWorld(2, 2) },
  { id: genId(), gridX: 2, gridZ: 7, height: 6, ...gridToWorld(2, 7) },
  { id: genId(), gridX: 5, gridZ: 4, height: 3, ...gridToWorld(5, 4) },
  { id: genId(), gridX: 7, gridZ: 2, height: 5, ...gridToWorld(7, 2) },
  { id: genId(), gridX: 7, gridZ: 6, height: 4, ...gridToWorld(7, 6) },
];

const defaultStarts: MarkerPoint[] = [
  { id: genId(), gridX: 0, gridZ: 0, ...gridNodeToWorld(0, 0) },
  { id: genId(), gridX: 0, gridZ: 5, ...gridNodeToWorld(0, 5) },
  { id: genId(), gridX: 5, gridZ: 0, ...gridNodeToWorld(5, 0) },
];

const defaultEnds: MarkerPoint[] = [
  { id: genId(), gridX: 10, gridZ: 10, ...gridNodeToWorld(10, 10) },
  { id: genId(), gridX: 10, gridZ: 5, ...gridNodeToWorld(10, 5) },
  { id: genId(), gridX: 5, gridZ: 10, ...gridNodeToWorld(5, 10) },
];

interface SimulationState {
  buildings: BuildingBlock[];
  startPoints: MarkerPoint[];
  endPoints: MarkerPoint[];
  params: SimulationParams;
  mode: PresetMode;
  stats: StatsData;
  targetFocus: THREE.Vector3 | null;
  crowdDirty: number;

  addBuilding: (gx: number, gz: number, height?: number) => void;
  removeBuilding: (id: string) => void;
  updateBuildingPos: (id: string, newGx: number, newGz: number) => void;
  updateBuildingHeight: (id: string, delta: number) => void;

  setParams: (patch: Partial<SimulationParams>) => void;
  setMode: (mode: PresetMode) => void;
  applyPreset: (mode: PresetMode) => void;

  setStats: (stats: Partial<StatsData>) => void;
  setTargetFocus: (pos: THREE.Vector3 | null) => void;
  markCrowdDirty: () => void;
}

const presetLayouts = {
  normal: () => ({
    buildings: defaultBuildings,
    starts: defaultStarts,
    ends: defaultEnds,
  }),
  morning_peak: () => ({
    buildings: defaultBuildings,
    starts: [
      { id: genId(), gridX: 0, gridZ: 0, ...gridNodeToWorld(0, 0) },
      { id: genId(), gridX: 0, gridZ: 1, ...gridNodeToWorld(0, 1) },
      { id: genId(), gridX: 1, gridZ: 0, ...gridNodeToWorld(1, 0) },
      { id: genId(), gridX: 0, gridZ: 2, ...gridNodeToWorld(0, 2) },
      { id: genId(), gridX: 2, gridZ: 0, ...gridNodeToWorld(2, 0) },
    ],
    ends: [
      { id: genId(), gridX: 10, gridZ: 10, ...gridNodeToWorld(10, 10) },
      { id: genId(), gridX: 9, gridZ: 10, ...gridNodeToWorld(9, 10) },
      { id: genId(), gridX: 10, gridZ: 9, ...gridNodeToWorld(10, 9) },
      { id: genId(), gridX: 8, gridZ: 10, ...gridNodeToWorld(8, 10) },
    ],
  }),
  weekend: () => ({
    buildings: defaultBuildings,
    starts: [
      { id: genId(), gridX: 0, gridZ: 0, ...gridNodeToWorld(0, 0) },
      { id: genId(), gridX: 10, gridZ: 0, ...gridNodeToWorld(10, 0) },
      { id: genId(), gridX: 0, gridZ: 10, ...gridNodeToWorld(0, 10) },
      { id: genId(), gridX: 10, gridZ: 10, ...gridNodeToWorld(10, 10) },
    ],
    ends: [
      { id: genId(), gridX: 5, gridZ: 5, ...gridNodeToWorld(5, 5) },
      { id: genId(), gridX: 5, gridZ: 4, ...gridNodeToWorld(5, 4) },
      { id: genId(), gridX: 4, gridZ: 5, ...gridNodeToWorld(4, 5) },
    ],
  }),
};

export const useSimulationStore = create<SimulationState>((set, get) => ({
  buildings: defaultBuildings,
  startPoints: defaultStarts,
  endPoints: defaultEnds,
  params: {
    particleCount: DEFAULT_PARTICLE_COUNT,
    speedMultiplier: 1,
    arrivalDelay: 1,
  },
  mode: 'normal',
  stats: {
    avgDensity: 0,
    speedHistogram: new Array(10).fill(0),
    avgSpeed: 0,
    totalParticles: DEFAULT_PARTICLE_COUNT,
    runTimeSeconds: 0,
  },
  targetFocus: null,
  crowdDirty: 0,

  addBuilding: (gx: number, gz: number, height = 4) => {
    if (gx < 0 || gx >= GRID_SIZE || gz < 0 || gz >= GRID_SIZE) return;
    const exists = get().buildings.some(
      (b) => b.gridX === gx && b.gridZ === gz
    );
    if (exists) return;
    const block: BuildingBlock = {
      id: genId(),
      gridX: gx,
      gridZ: gz,
      height,
      ...gridToWorld(gx, gz),
    };
    set((s) => ({ buildings: [...s.buildings, block] }));
    get().markCrowdDirty();
  },

  removeBuilding: (id: string) => {
    set((s) => ({ buildings: s.buildings.filter((b) => b.id !== id) }));
    get().markCrowdDirty();
  },

  updateBuildingPos: (id: string, newGx: number, newGz: number) => {
    if (newGx < 0 || newGx >= GRID_SIZE || newGz < 0 || newGz >= GRID_SIZE)
      return;
    const conflict = get().buildings.some(
      (b) => b.id !== id && b.gridX === newGx && b.gridZ === newGz
    );
    if (conflict) return;
    set((s) => ({
      buildings: s.buildings.map((b) =>
        b.id === id
          ? { ...b, gridX: newGx, gridZ: newGz, ...gridToWorld(newGx, newGz) }
          : b
      ),
    }));
    get().markCrowdDirty();
  },

  updateBuildingHeight: (id: string, delta: number) => {
    set((s) => ({
      buildings: s.buildings.map((b) => {
        if (b.id !== id) return b;
        const newH = Math.max(2, Math.min(6, b.height + delta));
        return { ...b, height: newH };
      }),
    }));
  },

  setParams: (patch) =>
    set((s) => {
      const next = { ...s.params, ...patch };
      if (
        patch.particleCount !== undefined ||
        patch.arrivalDelay !== undefined
      ) {
        setTimeout(() => get().markCrowdDirty(), 0);
      }
      return { params: next };
    }),

  setMode: (mode) => set({ mode }),

  applyPreset: (mode) => {
    const layout = presetLayouts[mode]();
    const presetParams = PRESETS[mode];
    set({
      mode,
      buildings: layout.buildings,
      startPoints: layout.starts,
      endPoints: layout.ends,
      params: {
        particleCount: presetParams.particleCount,
        speedMultiplier: presetParams.speedMultiplier,
        arrivalDelay: presetParams.arrivalDelay,
      },
    });
    get().markCrowdDirty();
  },

  setStats: (patch) => set((s) => ({ stats: { ...s.stats, ...patch } })),
  setTargetFocus: (pos) => set({ targetFocus: pos }),
  markCrowdDirty: () => set((s) => ({ crowdDirty: s.crowdDirty + 1 })),
}));
