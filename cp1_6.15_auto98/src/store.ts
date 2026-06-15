import { create } from 'zustand';
import { StyleType } from './modules/styleRenderer';
import { BrushSize, BrushShape } from './modules/drawingTool';
import { EdgeDetectionResult } from './modules/imageProcessing';
import { LayerManagerState } from './modules/layerManager';

interface AppState {
  originalImage: HTMLImageElement | null;
  edges: EdgeDetectionResult | null;
  lowThreshold: number;
  highThreshold: number;
  selectedStyle: StyleType;
  styleSeed: number;
  isAnimating: boolean;
  brushSize: BrushSize;
  brushColor: string;
  brushShape: BrushShape;
  layerState: LayerManagerState;
  errorMessage: string | null;
  sidebarCollapsed: boolean;

  setOriginalImage: (img: HTMLImageElement | null) => void;
  setEdges: (edges: EdgeDetectionResult | null) => void;
  setLowThreshold: (v: number) => void;
  setHighThreshold: (v: number) => void;
  setSelectedStyle: (style: StyleType) => void;
  regenerateStyle: () => void;
  setIsAnimating: (v: boolean) => void;
  setBrushSize: (size: BrushSize) => void;
  setBrushColor: (color: string) => void;
  setBrushShape: (shape: BrushShape) => void;
  setLayerState: (state: LayerManagerState) => void;
  updateLayerVisible: (id: string, visible: boolean) => void;
  updateLayerOpacity: (id: string, opacity: number) => void;
  setErrorMessage: (msg: string | null) => void;
  setSidebarCollapsed: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  originalImage: null,
  edges: null,
  lowThreshold: 50,
  highThreshold: 100,
  selectedStyle: 'hiphop',
  styleSeed: 12345,
  isAnimating: false,
  brushSize: 4,
  brushColor: '#ff3366',
  brushShape: 'line',
  layerState: {
    layers: [
      { id: 'edge', name: '原图边缘层', visible: true, opacity: 100 },
      { id: 'style', name: '风格填充层', visible: true, opacity: 100 },
      { id: 'drawing', name: '手绘层', visible: true, opacity: 100 }
    ]
  },
  errorMessage: null,
  sidebarCollapsed: false,

  setOriginalImage: (img) => set({ originalImage: img }),
  setEdges: (edges) => set({ edges }),
  setLowThreshold: (v) => set({ lowThreshold: Math.max(20, Math.min(80, v)) }),
  setHighThreshold: (v) => set({ highThreshold: Math.max(60, Math.min(180, v)) }),
  setSelectedStyle: (style) => set({ selectedStyle: style }),
  regenerateStyle: () => set({ styleSeed: Math.floor(Math.random() * 1000000) }),
  setIsAnimating: (v) => set({ isAnimating: v }),
  setBrushSize: (size) => set({ brushSize: size }),
  setBrushColor: (color) => set({ brushColor: color }),
  setBrushShape: (shape) => set({ brushShape: shape }),
  setLayerState: (layerState) => set({ layerState }),
  updateLayerVisible: (id, visible) => {
    const state = get();
    const layers = state.layerState.layers.map(l =>
      l.id === id ? { ...l, visible } : l
    );
    set({ layerState: { layers } });
  },
  updateLayerOpacity: (id, opacity) => {
    const state = get();
    const layers = state.layerState.layers.map(l =>
      l.id === id ? { ...l, opacity: Math.max(0, Math.min(100, opacity)) } : l
    );
    set({ layerState: { layers } });
  },
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v })
}));
