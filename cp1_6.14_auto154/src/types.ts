export type ToolType = 'pencil' | 'airbrush' | 'marker';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export interface Stroke {
  id: string;
  tool: ToolType;
  color: string;
  size: number;
  points: Point[];
  opacity?: number;
}

export interface CanvasView {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface VirtualUser {
  id: string;
  name: string;
  color: string;
  cursor: Point | null;
  isDrawing: boolean;
  isVisible: boolean;
  opacity: number;
}

export interface CanvasState {
  strokes: Stroke[];
  history: Stroke[][];
  historyIndex: number;
  maxHistory: number;
  currentTool: ToolType;
  currentColor: string;
  currentSize: number;
  view: CanvasView;
  virtualUser: VirtualUser;
  isExporting: boolean;
  exportProgress: number;
}

export interface CanvasActions {
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  addStroke: (stroke: Stroke) => void;
  updateLastStroke: (points: Point[]) => void;
  undo: () => void;
  redo: () => void;
  setView: (view: Partial<CanvasView>) => void;
  setVirtualUserCursor: (point: Point | null) => void;
  setVirtualUserVisible: (visible: boolean) => void;
  startExport: () => void;
  setExportProgress: (progress: number) => void;
  finishExport: () => void;
  clearCanvas: () => void;
}

export type CanvasStore = CanvasState & CanvasActions;
