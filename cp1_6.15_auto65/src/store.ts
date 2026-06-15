import { create } from 'zustand';
import {
  LandscapeElement,
  AnalysisResult,
  RippleEffect,
  ElementTemplate,
  GRID_SIZE,
} from './types';
import { analyzeLayout } from './utils/analysisEngine';

interface GardenStore {
  elements: LandscapeElement[];
  selectedId: string | null;
  analysisResult: AnalysisResult | null;
  ripples: RippleEffect[];
  toolbarOpen: boolean;
  analyzing: boolean;

  addElement: (template: ElementTemplate, x: number, y: number) => void;
  removeElement: (id: string) => void;
  moveElement: (id: string, x: number, y: number) => void;
  selectElement: (id: string | null) => void;
  triggerAnalysis: () => void;
  addRipple: (x: number, y: number) => void;
  clearRipples: () => void;
  toggleToolbar: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  clearCanvas: () => void;
}

const STORAGE_KEY = 'courtyard-design-board';

const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

let idCounter = 0;
const generateId = (): string => {
  idCounter += 1;
  return `el_${Date.now()}_${idCounter}`;
};

export const useGardenStore = create<GardenStore>((set, get) => ({
  elements: [],
  selectedId: null,
  analysisResult: null,
  ripples: [],
  toolbarOpen: false,
  analyzing: false,

  addElement: (template, x, y) => {
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);
    const newElement: LandscapeElement = {
      id: generateId(),
      category: template.category,
      name: template.name,
      icon: template.icon,
      x: snappedX,
      y: snappedY,
    };
    set((state) => ({
      elements: [...state.elements, newElement],
      analysisResult: null,
    }));
    get().addRipple(snappedX, snappedY);
    get().saveToStorage();
  },

  removeElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      analysisResult: null,
    }));
    get().saveToStorage();
  },

  moveElement: (id, x, y) => {
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, x: snappedX, y: snappedY } : el
      ),
      analysisResult: null,
    }));
    get().addRipple(snappedX, snappedY);
    get().saveToStorage();
  },

  selectElement: (id) => {
    set({ selectedId: id });
  },

  triggerAnalysis: () => {
    set({ analyzing: true });
    requestAnimationFrame(() => {
      const { elements } = get();
      const result = analyzeLayout(elements);
      set({ analysisResult: result, analyzing: false });
    });
  },

  addRipple: (x, y) => {
    const ripple: RippleEffect = {
      id: generateId(),
      x,
      y,
      timestamp: Date.now(),
    };
    set((state) => ({ ripples: [...state.ripples, ripple] }));
    setTimeout(() => {
      set((state) => ({
        ripples: state.ripples.filter((r) => r.id !== ripple.id),
      }));
    }, 600);
  },

  clearRipples: () => {
    set({ ripples: [] });
  },

  toggleToolbar: () => {
    set((state) => ({ toolbarOpen: !state.toolbarOpen }));
  },

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.elements && Array.isArray(data.elements)) {
          set({ elements: data.elements });
        }
      }
    } catch {
      // ignore
    }
  },

  saveToStorage: () => {
    try {
      const { elements } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ elements }));
    } catch {
      // ignore
    }
  },

  clearCanvas: () => {
    set({ elements: [], selectedId: null, analysisResult: null, ripples: [] });
    get().saveToStorage();
  },
}));
