import { create } from 'zustand';

export type TrafficLightColor = 'red' | 'yellow' | 'green';
export type Direction = 'north' | 'south' | 'east' | 'west';
export type PedestrianDensity = 'low' | 'medium' | 'high';
export type PedestrianState = 'waiting' | 'crossing' | 'disappearing';

export interface Vehicle {
  id: string;
  position: { x: number; y: number; z: number };
  direction: Direction;
  speed: number;
  maxSpeed: number;
  color: string;
  acceleration: number;
  isStopped: boolean;
  distanceToNextVehicle: number;
  distanceToIntersection: number;
}

export interface Pedestrian {
  id: string;
  position: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number };
  direction: Direction;
  speed: number;
  state: PedestrianState;
  waitTime: number;
  crosswalkId: string;
}

export interface TrafficLight {
  id: string;
  position: { x: number; y: number; z: number };
  intersection: { x: number; y: number };
  nsColor: TrafficLightColor;
  ewColor: TrafficLightColor;
  phase: number;
  cycleProgress: number;
  remainingTime: number;
}

export interface Building {
  id: string;
  position: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
  color: string;
}

export interface SimulationParams {
  vehicleDensity: number;
  pedestrianDensity: PedestrianDensity;
  lightCycleSpeed: number;
}

export interface SimulationStats {
  vehicleCount: number;
  avgSpeed: number;
  pedestrianCount: number;
  activeIntersections: number;
  fps: number;
}

export interface SimulationSnapshot {
  vehicles: Vehicle[];
  pedestrians: Pedestrian[];
  trafficLights: TrafficLight[];
  buildings: Building[];
  timestamp: number;
  frame: number;
}

interface SimulationState {
  params: SimulationParams;
  stats: SimulationStats;
  snapshot: SimulationSnapshot;
  isRunning: boolean;
  needsReset: boolean;
  resetCountdown: number;
  gridConfig: {
    cols: number;
    rows: number;
    streetWidth: number;
    blockSize: number;
  };

  setParams: (params: Partial<SimulationParams>) => void;
  setStats: (stats: Partial<SimulationStats>) => void;
  updateSnapshot: (snapshot: Partial<SimulationSnapshot>) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  scheduleReset: () => void;
  confirmReset: () => void;
  decrementResetCountdown: (delta: number) => void;
}

const GRID_COLS = 8;
const GRID_ROWS = 6;
const STREET_WIDTH = 2;
const BLOCK_SIZE = 6;

const initialParams: SimulationParams = {
  vehicleDensity: 5,
  pedestrianDensity: 'medium',
  lightCycleSpeed: 30,
};

const initialStats: SimulationStats = {
  vehicleCount: 0,
  avgSpeed: 0,
  pedestrianCount: 0,
  activeIntersections: GRID_COLS * GRID_ROWS,
  fps: 0,
};

const initialSnapshot: SimulationSnapshot = {
  vehicles: [],
  pedestrians: [],
  trafficLights: [],
  buildings: [],
  timestamp: 0,
  frame: 0,
};

export const useSimulationStore = create<SimulationState>((set) => ({
  params: initialParams,
  stats: initialStats,
  snapshot: initialSnapshot,
  isRunning: true,
  needsReset: false,
  resetCountdown: 0,
  gridConfig: {
    cols: GRID_COLS,
    rows: GRID_ROWS,
    streetWidth: STREET_WIDTH,
    blockSize: BLOCK_SIZE,
  },

  setParams: (params) =>
    set((state) => ({
      params: { ...state.params, ...params },
    })),

  setStats: (stats) =>
    set((state) => ({
      stats: { ...state.stats, ...stats },
    })),

  updateSnapshot: (snapshot) =>
    set((state) => ({
      snapshot: { ...state.snapshot, ...snapshot },
    })),

  startSimulation: () => set({ isRunning: true }),

  stopSimulation: () => set({ isRunning: false }),

  scheduleReset: () => set({ needsReset: true, resetCountdown: 5 }),

  confirmReset: () =>
    set({
      needsReset: false,
      resetCountdown: 0,
      snapshot: { ...initialSnapshot, buildings: [] },
    }),

  decrementResetCountdown: (delta) =>
    set((state) => {
      const newCountdown = Math.max(0, state.resetCountdown - delta);
      return { resetCountdown: newCountdown };
    }),
}));

export const getPedestrianSpawnRate = (density: PedestrianDensity): number => {
  const rates: Record<PedestrianDensity, number> = {
    low: 0.5,
    medium: 1.5,
    high: 3.0,
  };
  return rates[density];
};
