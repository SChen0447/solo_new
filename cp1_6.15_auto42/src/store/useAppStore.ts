import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Point {
  x: number;
  y: number;
}

export interface ShapeStyle {
  backgroundColor: string;
  borderRadius: number;
}

export interface Shape {
  id: string;
  type: 'rectangle' | 'circle' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  points: Point[];
  style: ShapeStyle;
  text?: string;
}

interface AppState {
  shapes: Shape[];
  generatedCode: string;
  selectedShapeId: string | null;
  isDrawing: boolean;
  codeGenerated: boolean;
  history: Shape[][];
  historyIndex: number;

  addShape: (shape: Omit<Shape, 'id'>) => string;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  setShapes: (shapes: Shape[]) => void;
  setGeneratedCode: (code: string) => void;
  selectShape: (id: string | null) => void;
  setIsDrawing: (val: boolean) => void;
  setCodeGenerated: (val: boolean) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  shapes: [],
  generatedCode: '',
  selectedShapeId: null,
  isDrawing: false,
  codeGenerated: false,
  history: [[]],
  historyIndex: 0,

  addShape: (shapeData) => {
    const id = uuidv4();
    const newShape: Shape = { ...shapeData, id };
    const newShapes = [...get().shapes, newShape];
    const { historyIndex, history } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newShapes);
    set({
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      codeGenerated: false,
    });
    return id;
  },

  updateShape: (id, updates) => {
    const newShapes = get().shapes.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    const { historyIndex, history } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newShapes);
    set({
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  setShapes: (shapes) => {
    set({ shapes });
  },

  setGeneratedCode: (code) => {
    set({ generatedCode: code, codeGenerated: true });
  },

  selectShape: (id) => {
    set({ selectedShapeId: id });
  },

  setIsDrawing: (val) => {
    set({ isDrawing: val });
  },

  setCodeGenerated: (val) => {
    set({ codeGenerated: val });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        shapes: history[newIndex],
        historyIndex: newIndex,
        codeGenerated: false,
      });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        shapes: history[newIndex],
        historyIndex: newIndex,
        codeGenerated: false,
      });
    }
  },

  clear: () => {
    const newHistory = [[]];
    set({
      shapes: [],
      generatedCode: '',
      selectedShapeId: null,
      codeGenerated: false,
      history: newHistory,
      historyIndex: 0,
    });
  },
}));
