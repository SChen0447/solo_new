import { create } from 'zustand';
import type { Shape, Palette, ToolType, Point, ToastState, UseStore } from '../types';

const MAX_HISTORY = 50;
const DEFAULT_COLOR = '#3b82f6';
const DEFAULT_LINE_WIDTH = 3;

const initialState = {
  shapes: [],
  currentTool: 'rectangle' as ToolType,
  currentColor: DEFAULT_COLOR,
  lineWidth: DEFAULT_LINE_WIDTH,
  palettes: [],
  selectedPaletteIndex: 0,
  history: [[]],
  historyIndex: 0,
  isPanning: false,
  isSpacePressed: false,
  zoom: 1,
  offset: { x: 0, y: 0 } as Point,
  toast: {
    visible: false,
    message: '',
    type: 'success' as const,
  },
  isPanelCollapsed: false,
  isMobile: false,
  isDrawing: false,
  previewShape: null,
};

export const useStore = create<UseStore>((set, get) => ({
  ...initialState,

  setTool: (tool: ToolType) => {
    set({ currentTool: tool });
  },

  setColor: (color: string) => {
    set({ currentColor: color });
  },

  setLineWidth: (width: number) => {
    set({ lineWidth: width });
  },

  addShape: (shape: Shape) => {
    const state = get();
    const newShapes = [...state.shapes, shape];
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newShapes);
    
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    
    set({
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  updateShapes: (shapes: Shape[]) => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(shapes);
    
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    
    set({
      shapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      set({
        shapes: state.history[newIndex],
        historyIndex: newIndex,
      });
      state.showToast('已撤销', 'success');
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      set({
        shapes: state.history[newIndex],
        historyIndex: newIndex,
      });
      state.showToast('已重做', 'success');
    }
  },

  setZoom: (zoom: number) => {
    const clampedZoom = Math.max(0.5, Math.min(5, zoom));
    set({ zoom: clampedZoom });
  },

  setOffset: (offset: Point) => {
    set({ offset });
  },

  setPanning: (isPanning: boolean) => {
    set({ isPanning });
  },

  setSpacePressed: (isSpacePressed: boolean) => {
    set({ isSpacePressed });
  },

  setPalettes: (palettes: Palette[]) => {
    set({ palettes });
  },

  setSelectedPaletteIndex: (index: number) => {
    set({ selectedPaletteIndex: index });
  },

  showToast: (message: string, type: ToastState['type'] = 'success') => {
    set({
      toast: {
        visible: true,
        message,
        type,
      },
    });
    
    setTimeout(() => {
      get().hideToast();
    }, 2000);
  },

  hideToast: () => {
    set({
      toast: {
        ...get().toast,
        visible: false,
      },
    });
  },

  togglePanel: () => {
    set((state) => ({ isPanelCollapsed: !state.isPanelCollapsed }));
  },

  setIsMobile: (isMobile: boolean) => {
    set({ isMobile });
  },

  setIsDrawing: (isDrawing: boolean) => {
    set({ isDrawing });
  },

  setPreviewShape: (shape: Shape | null) => {
    set({ previewShape: shape });
  },
}));
