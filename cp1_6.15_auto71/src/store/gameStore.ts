import { create } from 'zustand';

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  createdAt: number;
}

interface GameState {
  power: number;
  isDragging: boolean;
  score: number;
  throwCount: number;
  floatingTexts: FloatingText[];
  setPower: (power: number) => void;
  setIsDragging: (dragging: boolean) => void;
  addScore: (points: number) => void;
  incrementThrowCount: () => void;
  addFloatingText: (x: number, y: number, text: string) => void;
  removeFloatingText: (id: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  power: 0,
  isDragging: false,
  score: 0,
  throwCount: 0,
  floatingTexts: [],
  setPower: (power) => set({ power: Math.max(0, Math.min(100, power)) }),
  setIsDragging: (isDragging) => set({ isDragging }),
  addScore: (points) => set((state) => ({ score: state.score + points }),
  incrementThrowCount: () => set((state) => ({ throwCount: state.throwCount + 1 }),
  addFloatingText: (x, y, text) => set((state) => ({
    floatingTexts: [...state.floatingTexts, {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      text,
      createdAt: Date.now(),
    }],
  })),
  removeFloatingText: (id) => set((state) => ({
    floatingTexts: state.floatingTexts.filter((t) => t.id !== id),
  })),
  reset: () => set({ power: 0, isDragging: false }),
}));
