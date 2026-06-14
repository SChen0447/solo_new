import { create } from 'zustand';

export interface Point {
  x: number;
  y: number;
}

export type ShapeType = 'line' | 'rect' | 'circle';
export type ColorType = 'green' | 'blue' | 'gray' | 'brown';
export type StrokeWidth = 'thin' | 'medium' | 'thick';

interface BaseShape {
  id: string;
  type: ShapeType;
  color: ColorType;
  strokeWidth: StrokeWidth;
}

export interface LineShape extends BaseShape {
  type: 'line';
  points: Point[];
}

export interface RectShape extends BaseShape {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  height3d: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  cx: number;
  cy: number;
  radius: number;
}

export type Shape = LineShape | RectShape | CircleShape;

interface SketchState {
  shapes: Shape[];
  selectedTool: ShapeType;
  selectedColor: ColorType;
  selectedStrokeWidth: StrokeWidth;
  isGenerated: boolean;
  updatedShapeIds: Set<string>;
  removedShapeIds: Set<string>;
  addShape: (shape: Shape) => void;
  removeShape: (id: string) => void;
  clearShapes: () => void;
  setTool: (tool: ShapeType) => void;
  setColor: (color: ColorType) => void;
  setStrokeWidth: (width: StrokeWidth) => void;
  setGenerated: (gen: boolean) => void;
  clearUpdateFlags: () => void;
}

export const colorMap: Record<ColorType, string> = {
  green: '#22c55e',
  blue: '#3b82f6',
  gray: '#6b7280',
  brown: '#92400e',
};

export const strokeWidthMap: Record<StrokeWidth, number> = {
  thin: 2,
  medium: 4,
  thick: 8,
};

export const GRID_SIZE = 10;

export const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

let idCounter = 0;
export const generateId = (): string => {
  idCounter += 1;
  return `shape_${Date.now()}_${idCounter}`;
};

export const useSketchStore = create<SketchState>((set) => ({
  shapes: [],
  selectedTool: 'line',
  selectedColor: 'green',
  selectedStrokeWidth: 'medium',
  isGenerated: false,
  updatedShapeIds: new Set<string>(),
  removedShapeIds: new Set<string>(),

  addShape: (shape: Shape) =>
    set((state) => ({
      shapes: [...state.shapes, shape],
      updatedShapeIds: new Set([...state.updatedShapeIds, shape.id]),
    })),

  removeShape: (id: string) =>
    set((state) => ({
      shapes: state.shapes.filter((s) => s.id !== id),
      removedShapeIds: new Set([...state.removedShapeIds, id]),
    })),

  clearShapes: () =>
    set((state) => ({
      shapes: [],
      removedShapeIds: new Set(state.shapes.map((s) => s.id)),
    })),

  setTool: (tool: ShapeType) => set({ selectedTool: tool }),

  setColor: (color: ColorType) => set({ selectedColor: color }),

  setStrokeWidth: (width: StrokeWidth) => set({ selectedStrokeWidth: width }),

  setGenerated: (gen: boolean) => set({ isGenerated: gen }),

  clearUpdateFlags: () =>
    set({
      updatedShapeIds: new Set<string>(),
      removedShapeIds: new Set<string>(),
    }),
}));
