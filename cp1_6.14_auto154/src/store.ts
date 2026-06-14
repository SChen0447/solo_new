import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasStore, Stroke, Point, CanvasView, VirtualUser, ToolType } from './types';

const COLORS = [
  '#ffffff', '#000000', '#ff4757', '#ff6b81',
  '#ffa502', '#ffdd59', '#2ed573', '#1e90ff',
  '#5352ed', '#a55eea', '#ff6348', '#70a1ff',
];

const generateVirtualUser = (): VirtualUser => {
  const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  return {
    id: uuidv4(),
    name: `用户${Math.floor(Math.random() * 1000)}`,
    color: randomColor,
    cursor: null,
    isDrawing: false,
    isVisible: false,
    opacity: 0,
  };
};

const initialView: CanvasView = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  strokes: [],
  history: [[]],
  historyIndex: 0,
  maxHistory: 50,
  currentTool: 'pencil',
  currentColor: '#ffffff',
  currentSize: 4,
  view: initialView,
  virtualUser: generateVirtualUser(),
  isExporting: false,
  exportProgress: 0,

  setTool: (tool: ToolType) => set({ currentTool: tool }),

  setColor: (color: string) => set({ currentColor: color }),

  setSize: (size: number) => set({ currentSize: size }),

  addStroke: (stroke: Stroke) => {
    const { strokes, history, historyIndex, maxHistory } = get();
    const newStrokes = [...strokes, stroke];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newStrokes);
    if (newHistory.length > maxHistory + 1) {
      newHistory.shift();
    }
    set({
      strokes: newStrokes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  updateLastStroke: (points: Point[]) => {
    const { strokes } = get();
    if (strokes.length === 0) return;
    const newStrokes = [...strokes];
    newStrokes[newStrokes.length - 1] = {
      ...newStrokes[newStrokes.length - 1],
      points,
    };
    set({ strokes: newStrokes });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({
      historyIndex: newIndex,
      strokes: history[newIndex] || [],
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({
      historyIndex: newIndex,
      strokes: history[newIndex] || [],
    });
  },

  setView: (view: Partial<CanvasView>) =>
    set((state) => ({ view: { ...state.view, ...view } })),

  setVirtualUserCursor: (point: Point | null) =>
    set((state) => ({
      virtualUser: { ...state.virtualUser, cursor: point },
    })),

  setVirtualUserVisible: (visible: boolean) =>
    set((state) => ({
      virtualUser: {
        ...state.virtualUser,
        isVisible: visible,
        opacity: visible ? 1 : 0,
      },
    })),

  startExport: () => set({ isExporting: true, exportProgress: 0 }),

  setExportProgress: (progress: number) => set({ exportProgress: progress }),

  finishExport: () => set({ isExporting: false, exportProgress: 0 }),

  clearCanvas: () => {
    const { history, historyIndex, maxHistory, strokes } = get();
    if (strokes.length === 0) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([]);
    if (newHistory.length > maxHistory + 1) {
      newHistory.shift();
    }
    set({
      strokes: [],
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },
}));

export { COLORS };
