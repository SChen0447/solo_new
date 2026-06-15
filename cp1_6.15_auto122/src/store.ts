import { create } from 'zustand';
import { colorSchemes, ColorSchemeKey } from './utils/colorSchemes';

export interface FractalParams {
  iterations: number;
  scale: number;
  heightDecay: number;
  seed: number;
  detailSeed: number;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info' | 'loading';
}

interface TerrainState {
  params: FractalParams;
  colorScheme: ColorSchemeKey;
  detailOverlay: boolean;
  heightMap: Float32Array | null;
  detailHeightMap: Float32Array | null;
  isGenerating: boolean;
  isMobile: boolean;
  sidebarCollapsed: boolean;
  toasts: Toast[];
  flashAnimation: boolean;

  setIterations: (v: number) => void;
  setScale: (v: number) => void;
  setHeightDecay: (v: number) => void;
  setColorScheme: (key: ColorSchemeKey) => void;
  toggleDetailOverlay: () => void;
  setHeightMap: (data: Float32Array | null) => void;
  setDetailHeightMap: (data: Float32Array | null) => void;
  setIsGenerating: (v: boolean) => void;
  setIsMobile: (v: boolean) => void;
  toggleSidebar: () => void;
  regenerateSeed: () => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: number) => void;
  triggerFlash: () => void;
}

let toastIdCounter = 0;

export const useStore = create<TerrainState>((set, get) => ({
  params: {
    iterations: 6,
    scale: 1.5,
    heightDecay: 0.5,
    seed: 42,
    detailSeed: 1337,
  },
  colorScheme: 'classic',
  detailOverlay: false,
  heightMap: null,
  detailHeightMap: null,
  isGenerating: false,
  isMobile: false,
  sidebarCollapsed: false,
  toasts: [],
  flashAnimation: false,

  setIterations: (v) =>
    set((s) => ({ params: { ...s.params, iterations: Math.round(v) } })),
  setScale: (v) => set((s) => ({ params: { ...s.params, scale: v } })),
  setHeightDecay: (v) =>
    set((s) => ({ params: { ...s.params, heightDecay: v } })),
  setColorScheme: (key) => set({ colorScheme: key }),
  toggleDetailOverlay: () =>
    set((s) => ({ detailOverlay: !s.detailOverlay })),
  setHeightMap: (data) => set({ heightMap: data }),
  setDetailHeightMap: (data) => set({ detailHeightMap: data }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setIsMobile: (v) => set({ isMobile: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  regenerateSeed: () =>
    set((s) => ({
      params: {
        ...s.params,
        seed: Math.floor(Math.random() * 100000),
        detailSeed: Math.floor(Math.random() * 100000),
      },
    })),

  addToast: (message, type = 'info') => {
    const id = ++toastIdCounter;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  triggerFlash: () => {
    set({ flashAnimation: true });
    setTimeout(() => set({ flashAnimation: false }), 500);
  },
}));

export { colorSchemes };
