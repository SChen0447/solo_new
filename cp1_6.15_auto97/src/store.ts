import { create } from 'zustand';
import type { Shape, HistoryItem, CanvasState } from './types';

export const useCanvasStore = create<CanvasState>((set, get) => ({
  shapes: [],
  brushSize: 2,
  history: [],
  lastClickTime: 0,
  maxShapes: 500,
  maxHistory: 20,

  addShape: (shape: Shape) => {
    const { shapes, maxShapes } = get();
    const newShapes = [...shapes, shape];
    if (newShapes.length > maxShapes) {
      newShapes.splice(0, newShapes.length - maxShapes);
    }
    set({ shapes: newShapes, lastClickTime: shape.createdAt });
  },

  clearShapes: () => set({ shapes: [] }),

  setBrushSize: (size: number) => set({ brushSize: Math.max(1, Math.min(5, size)) }),

  saveToHistory: (thumbnail: string, shapes: Shape[]) => {
    const { history, maxHistory } = get();
    const newItem: HistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      thumbnail,
      shapes: JSON.parse(JSON.stringify(shapes)),
      createdAt: Date.now(),
    };
    const newHistory = [newItem, ...history];
    if (newHistory.length > maxHistory) {
      newHistory.splice(maxHistory);
    }
    set({ history: newHistory });
  },

  loadFromHistory: (id: string): Shape[] | null => {
    const item = get().history.find((h) => h.id === id);
    if (!item) return null;
    const shapes = JSON.parse(JSON.stringify(item.shapes));
    set({ shapes });
    return shapes;
  },

  deleteFromHistory: (id: string) => {
    set((state) => ({
      history: state.history.filter((h) => h.id !== id),
    }));
  },

  updateShapeRadius: (id: string, radius: number) => {
    set((state) => ({
      shapes: state.shapes.map((s) =>
        s.id === id ? { ...s, currentRadius: radius } : s
      ),
    }));
  },
}));
