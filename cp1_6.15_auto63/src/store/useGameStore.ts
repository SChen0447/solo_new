import { create } from 'zustand';
import type { ToolMode } from '../engine/InteractionSystem';

interface GameState {
  toolMode: ToolMode;
  placedBlockCount: number;
  timeOfDay: number;
  timeString: string;
  isPaused: boolean;
  hoveredVoxel: { x: number; y: number; z: number } | null;
  setToolMode: (mode: ToolMode) => void;
  setPlacedBlockCount: (count: number) => void;
  setTimeOfDay: (time: number, timeString: string) => void;
  togglePause: () => void;
  setHoveredVoxel: (voxel: { x: number; y: number; z: number } | null) => void;
  incrementPlacedCount: () => void;
  decrementPlacedCount: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  toolMode: 'place',
  placedBlockCount: 0,
  timeOfDay: 0.25,
  timeString: '06:00',
  isPaused: false,
  hoveredVoxel: null,

  setToolMode: (mode: ToolMode) => set({ toolMode: mode }),

  setPlacedBlockCount: (count: number) => set({ placedBlockCount: count }),

  setTimeOfDay: (time: number, timeString: string) => set({
    timeOfDay: time,
    timeString: timeString
  }),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  setHoveredVoxel: (voxel: { x: number; y: number; z: number } | null) => set({
    hoveredVoxel: voxel
  }),

  incrementPlacedCount: () => set((state) => ({
    placedBlockCount: state.placedBlockCount + 1
  })),

  decrementPlacedCount: () => set((state) => ({
    placedBlockCount: Math.max(0, state.placedBlockCount - 1)
  }))
}));
