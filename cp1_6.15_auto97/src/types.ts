export type ShapeType = 'circle' | 'triangle' | 'hexagon';

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  targetRadius: number;
  currentRadius: number;
  color: string;
  strokeColor: string;
  lineWidth: number;
  createdAt: number;
  animationStart: number;
}

export interface HistoryItem {
  id: string;
  thumbnail: string;
  shapes: Shape[];
  createdAt: number;
}

export interface CanvasState {
  shapes: Shape[];
  brushSize: number;
  history: HistoryItem[];
  lastClickTime: number;
  maxShapes: number;
  maxHistory: number;

  addShape: (shape: Shape) => void;
  clearShapes: () => void;
  setBrushSize: (size: number) => void;
  saveToHistory: (thumbnail: string, shapes: Shape[]) => void;
  loadFromHistory: (id: string) => Shape[] | null;
  deleteFromHistory: (id: string) => void;
  updateShapeRadius: (id: string, radius: number) => void;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const WARM_COLORS = ['#ff6b6b', '#ffd93d', '#ff8e53', '#c06c84'];

export const SHAPE_TYPES: ShapeType[] = ['circle', 'triangle', 'hexagon'];

export const MIN_RADIUS = 10;
export const MAX_RADIUS = 60;

export const MIN_INTERVAL = 50;
export const MAX_INTERVAL = 2000;

export const ANIMATION_DURATION = 200;
