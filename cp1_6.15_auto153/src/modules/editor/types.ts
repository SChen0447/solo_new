export type ElementType = 'rect' | 'circle' | 'line' | 'polygon' | 'text' | 'path';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  opacity: number;
  stroke: string;
  strokeWidth: number;
  rotation: number;
  scale: number;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  rx?: number;
  ry?: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  r: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PolygonElement extends BaseElement {
  type: 'polygon';
  points: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
}

export interface PathElement extends BaseElement {
  type: 'path';
  d: string;
}

export type SvgElement = RectElement | CircleElement | LineElement | PolygonElement | TextElement | PathElement;

export type ToolType = 'select' | 'rect' | 'circle' | 'line' | 'polygon' | 'text';

export interface EditorState {
  elements: SvgElement[];
  selectedId: string | null;
  currentTool: ToolType;
  history: SvgElement[][];
  historyIndex: number;
  zoom: number;
  panX: number;
  panY: number;
  gridSize: number;
  snapToGrid: boolean;
  snapDistance: number;
  isDragging: boolean;
  isCreating: boolean;
  dragStartX: number;
  dragStartY: number;
  previewElement: SvgElement | null;
  flashElementId: string | null;
}
