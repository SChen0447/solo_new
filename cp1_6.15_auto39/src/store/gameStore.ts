import { create } from 'zustand';
import type { SnakeState } from '../game/Snake';

export interface GameStats {
  huntCount: number;
  totalDistance: number;
  survivalTime: number;
  aiState: SnakeState;
  speed: string;
  nearestPreyDistance: number;
  headX: number;
  headY: number;
  alivePreys: number;
}

interface GameStore {
  stats: GameStats;
  setStats: (stats: Partial<GameStats>) => void;
  manualOverride: boolean;
  setManualOverride: (v: boolean) => void;
  manualDirection: { up: boolean; down: boolean; left: boolean; right: boolean };
  setManualDirection: (dir: Partial<{ up: boolean; down: boolean; left: boolean; right: boolean }>) => void;
  resetTrigger: number;
  triggerReset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  stats: {
    huntCount: 0,
    totalDistance: 0,
    survivalTime: 0,
    aiState: 'patrol',
    speed: '2.0',
    nearestPreyDistance: -1,
    headX: 0,
    headY: 0,
    alivePreys: 3
  },
  setStats: (newStats) =>
    set((state) => ({
      stats: { ...state.stats, ...newStats }
    })),
  manualOverride: false,
  setManualOverride: (v) => set({ manualOverride: v }),
  manualDirection: { up: false, down: false, left: false, right: false },
  setManualDirection: (dir) =>
    set((state) => ({
      manualDirection: { ...state.manualDirection, ...dir }
    })),
  resetTrigger: 0,
  triggerReset: () => set((state) => ({ resetTrigger: state.resetTrigger + 1 }))
}));
