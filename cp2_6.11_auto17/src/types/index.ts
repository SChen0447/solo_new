export type ComponentType = 'text' | 'image' | 'rect' | 'circle';

export interface BaseComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  name: string;
  zIndex: number;
}

export interface TextComponent extends BaseComponent {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string;
}

export interface ImageComponent extends BaseComponent {
  type: 'image';
  src: string;
}

export interface RectComponent extends BaseComponent {
  type: 'rect';
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface CircleComponent extends BaseComponent {
  type: 'circle';
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export type CanvasComponent = TextComponent | ImageComponent | RectComponent | CircleComponent;

export interface Template {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  components: CanvasComponent[];
}

export interface ExportSize {
  id: string;
  name: string;
  width: number;
  height: number;
  selected: boolean;
}

export interface CanvasState {
  width: number;
  height: number;
  components: CanvasComponent[];
  selectedId: string | null;
  zoom: number;
  panX: number;
  panY: number;
}

export type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

export interface DragItemData {
  type: ComponentType;
  id?: string;
  component?: CanvasComponent;
}

export interface LayerDragItem {
  id: string;
  index: number;
}

export const DND_TYPES = {
  COMPONENT: 'component',
  TOOL: 'tool',
  LAYER: 'layer',
} as const;

export const DEFAULT_EXPORT_SIZES: ExportSize[] = [
  { id: 'size-1', name: '1080×1920', width: 1080, height: 1920, selected: true },
  { id: 'size-2', name: '800×1200', width: 800, height: 1200, selected: true },
  { id: 'size-3', name: '600×900', width: 600, height: 900, selected: true },
];

export const FONT_FAMILIES = [
  'Noto Sans SC',
  'Playfair Display',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Microsoft YaHei',
  'SimHei',
  'SimSun',
];
