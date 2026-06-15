export type ToolType = 'rectangle' | 'circle' | 'polygon' | 'freehand' | 'eyedropper';

export type PaletteType = 'complementary' | 'analogous' | 'triadic';

export interface Point {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  type: ToolType;
  color: string;
  lineWidth: number;
  fill?: string;
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  cx: number;
  cy: number;
  radiusX: number;
  radiusY: number;
}

export interface PolygonShape extends BaseShape {
  type: 'polygon';
  points: Point[];
  isComplete: boolean;
}

export interface FreehandShape extends BaseShape {
  type: 'freehand';
  points: Point[];
}

export type Shape = RectangleShape | CircleShape | PolygonShape | FreehandShape;

export interface Palette {
  name: string;
  colors: string[];
  type: PaletteType;
}

export interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'info' | 'error';
}

export interface CanvasState {
  shapes: Shape[];
  currentTool: ToolType;
  currentColor: string;
  lineWidth: number;
  palettes: Palette[];
  selectedPaletteIndex: number;
  history: Shape[][];
  historyIndex: number;
  isPanning: boolean;
  isSpacePressed: boolean;
  zoom: number;
  offset: Point;
  toast: ToastState;
  isPanelCollapsed: boolean;
  isMobile: boolean;
  isDrawing: boolean;
  previewShape: Shape | null;
}

export interface CanvasActions {
  setTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  addShape: (shape: Shape) => void;
  undo: () => void;
  redo: () => void;
  setZoom: (zoom: number) => void;
  setOffset: (offset: Point) => void;
  setPanning: (isPanning: boolean) => void;
  setSpacePressed: (isPressed: boolean) => void;
  setPalettes: (palettes: Palette[]) => void;
  setSelectedPaletteIndex: (index: number) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  hideToast: () => void;
  togglePanel: () => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setPreviewShape: (shape: Shape | null) => void;
  updateShapes: (shapes: Shape[]) => void;
}

export type UseStore = CanvasState & CanvasActions;
