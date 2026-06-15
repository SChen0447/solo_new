import { create } from 'zustand';
import { saveAs } from 'file-saver';
import { generateRockMesh } from '@/utils/rockModel';
import { createWell, validateWellPosition } from '@/utils/wellManager';
import { initSimulation, stepSimulation } from '@/utils/flowSimulator';

export type HeterogeneityMode = 'uniform' | 'layered' | 'random';
export type WellType = 'injector' | 'producer';
export type WellPlacementMode = 'none' | WellType;

export interface RockParams {
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  porosity: number;
  permeability: number;
  heterogeneity: HeterogeneityMode;
}

export interface Well {
  id: string;
  type: WellType;
  position: { x: number; y: number; z: number };
  rate: number;
}

export interface ProbeData {
  position: { x: number; y: number; z: number };
  porosity: number;
  permeability: number;
  pressure: number;
  saturation: number;
}

export interface MeshData {
  positions: Float32Array;
  indices: Uint32Array;
  colors: Float32Array;
}

interface SimulationState {
  rockParams: RockParams;
  wells: Well[];
  isRunning: boolean;
  currentTime: number;
  timeStep: number;
  rockGenerated: boolean;
  meshData: MeshData | null;
  pressureField: number[][][];
  saturationField: number[][][];
  velocityField: number[][][][];
  porosityField: number[][][];
  permeabilityField: number[][][];
  panelCollapsed: boolean;
  selectedWellId: string | null;
  probeData: ProbeData | null;
  probePosition: { x: number; y: number };
  wellPlacementMode: WellPlacementMode;
}

interface SimulationActions {
  setRockParams: (params: Partial<RockParams>) => void;
  confirmRockModel: () => void;
  addWell: (type: WellType, position: { x: number; y: number; z: number }) => void;
  removeWell: (id: string) => void;
  updateWellRate: (id: string, rate: number) => void;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  stepSim: () => void;
  setProbeData: (data: ProbeData | null, screenPos?: { x: number; y: number }) => void;
  setProbePosition: (pos: { x: number; y: number }) => void;
  togglePanel: () => void;
  setWellPlacementMode: (mode: WellPlacementMode) => void;
  exportCSV: () => void;
  selectWell: (id: string | null) => void;
}

const GRID_X = 10;
const GRID_Y = 8;
const GRID_Z = 5;

const createEmpty3DArray = <T>(x: number, y: number, z: number, defaultValue: T): T[][][] => {
  return Array.from({ length: x }, () =>
    Array.from({ length: y }, () =>
      Array.from({ length: z }, () => defaultValue)
    )
  );
};

const createEmpty4DArray = (x: number, y: number, z: number): number[][][][] => {
  return Array.from({ length: x }, () =>
    Array.from({ length: y }, () =>
      Array.from({ length: z }, () => [0, 0, 0])
    )
  );
};

const initialState: SimulationState = {
  rockParams: {
    sizeX: 10,
    sizeY: 8,
    sizeZ: 5,
    porosity: 0.25,
    permeability: 1e-10,
    heterogeneity: 'uniform',
  },
  wells: [],
  isRunning: false,
  currentTime: 0,
  timeStep: 0.01,
  rockGenerated: false,
  meshData: null,
  pressureField: createEmpty3DArray(GRID_X, GRID_Y, GRID_Z, 1e5),
  saturationField: createEmpty3DArray(GRID_X, GRID_Y, GRID_Z, 1.0),
  velocityField: createEmpty4DArray(GRID_X, GRID_Y, GRID_Z),
  porosityField: createEmpty3DArray(GRID_X, GRID_Y, GRID_Z, 0.25),
  permeabilityField: createEmpty3DArray(GRID_X, GRID_Y, GRID_Z, 1e-10),
  panelCollapsed: false,
  selectedWellId: null,
  probeData: null,
  probePosition: { x: 0, y: 0 },
  wellPlacementMode: 'none',
};

export const useSimulationStore = create<SimulationState & SimulationActions>((set, get) => ({
  ...initialState,

  setRockParams: (params) =>
    set((state) => ({
      rockParams: { ...state.rockParams, ...params },
    })),

  confirmRockModel: () => {
    const { rockParams } = get();
    const { positions, indices, porosityField, permeabilityField, colors } = generateRockMesh(rockParams);

    const { pressure, saturation, velocity } = initSimulation(
      GRID_X, GRID_Y, GRID_Z, porosityField, permeabilityField
    );

    set({
      rockGenerated: true,
      meshData: { positions, indices, colors },
      porosityField,
      permeabilityField,
      pressureField: pressure,
      saturationField: saturation,
      velocityField: velocity,
      currentTime: 0,
      isRunning: false,
      wells: [],
      probeData: null,
    });
  },

  addWell: (type, position) => {
    const { rockParams, wells } = get();
    const rockSize = { x: rockParams.sizeX, y: rockParams.sizeY, z: rockParams.sizeZ };

    if (!validateWellPosition(position, rockSize)) {
      return;
    }

    const well = createWell(type, position, type === 'injector' ? 2.0 : 2.0);
    set({
      wells: [...wells, well],
      wellPlacementMode: 'none',
      selectedWellId: well.id,
    });
  },

  removeWell: (id) =>
    set((state) => ({
      wells: state.wells.filter((w) => w.id !== id),
      selectedWellId: state.selectedWellId === id ? null : state.selectedWellId,
    })),

  updateWellRate: (id, rate) =>
    set((state) => ({
      wells: state.wells.map((w) =>
        w.id === id ? { ...w, rate: Math.max(0.1, Math.min(5.0, rate)) } : w
      ),
    })),

  startSimulation: () => {
    const { rockGenerated, wells } = get();
    if (!rockGenerated || wells.length === 0) return;
    set({ isRunning: true });
  },

  pauseSimulation: () => set({ isRunning: false }),

  resetSimulation: () => {
    const { rockParams } = get();
    const { positions, indices, porosityField, permeabilityField, colors } = generateRockMesh(rockParams);
    const { pressure, saturation, velocity } = initSimulation(
      GRID_X, GRID_Y, GRID_Z, porosityField, permeabilityField
    );

    set({
      ...initialState,
      rockParams,
      meshData: { positions, indices, colors },
      porosityField,
      permeabilityField,
      pressureField: pressure,
      saturationField: saturation,
      velocityField: velocity,
      rockGenerated: true,
    });
  },

  stepSim: () => {
    const state = get();
    if (!state.isRunning) return;

    const gridSize = {
      dx: state.rockParams.sizeX / GRID_X,
      dy: state.rockParams.sizeY / GRID_Y,
      dz: state.rockParams.sizeZ / GRID_Z,
    };

    const { newPressure, newSaturation, newVelocity } = stepSimulation(
      state.pressureField,
      state.saturationField,
      state.velocityField,
      state.porosityField,
      state.permeabilityField,
      state.wells,
      state.timeStep,
      gridSize,
      GRID_X, GRID_Y, GRID_Z
    );

    set({
      pressureField: newPressure,
      saturationField: newSaturation,
      velocityField: newVelocity,
      currentTime: state.currentTime + state.timeStep,
    });
  },

  setProbeData: (data, screenPos) =>
    set((state) => ({
      probeData: data,
      probePosition: screenPos || state.probePosition,
    })),

  setProbePosition: (pos) => set({ probePosition: pos }),

  togglePanel: () => set((state) => ({ panelCollapsed: !state.panelCollapsed })),

  setWellPlacementMode: (mode) => set({ wellPlacementMode: mode }),

  selectWell: (id) => set({ selectedWellId: id }),

  exportCSV: () => {
    const { saturationField, pressureField, porosityField, permeabilityField, currentTime } = get();

    let csvContent = 'x,y,z,porosity,permeability,pressure,saturation\n';

    for (let i = 0; i < GRID_X; i++) {
      for (let j = 0; j < GRID_Y; j++) {
        for (let k = 0; k < GRID_Z; k++) {
          csvContent += `${i},${j},${k},${porosityField[i][j][k].toExponential(4)},`;
          csvContent += `${permeabilityField[i][j][k].toExponential(4)},`;
          csvContent += `${pressureField[i][j][k].toExponential(4)},`;
          csvContent += `${saturationField[i][j][k].toFixed(4)}\n`;
        }
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `saturation_field_time_${currentTime.toFixed(2)}s.csv`);
  },
}));

export { GRID_X, GRID_Y, GRID_Z };
