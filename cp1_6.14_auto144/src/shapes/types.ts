export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'star' | 'heart' | 'arrow' | 'group';

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  visible: boolean;
  locked: boolean;
  name?: string;
  parentId?: string | null;
}

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  borderRadius?: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
}

export interface TriangleShape extends BaseShape {
  type: 'triangle';
}

export interface StarShape extends BaseShape {
  type: 'star';
  points: number;
  outerRadius: number;
  innerRadius: number;
}

export interface HeartShape extends BaseShape {
  type: 'heart';
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  arrowHeadWidth: number;
  arrowHeadHeight: number;
  tailWidth: number;
}

export interface GroupShape extends BaseShape {
  type: 'group';
  childIds: string[];
}

export type ShapeUnion = RectangleShape | CircleShape | TriangleShape | StarShape | HeartShape | ArrowShape | GroupShape;

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  width: number;
  height: number;
}

export interface SelectionState {
  selectedIds: string[];
  editingGroupId: string | null;
}

export type CommandType = 'add' | 'delete' | 'update' | 'group' | 'ungroup' | 'align' | 'distribute';

export interface HistoryState {
  shapes: ShapeUnion[];
  selection: SelectionState;
}

export interface ICommand {
  type: CommandType;
  execute(): void;
  undo(): void;
}

export interface ShapesManagerState {
  shapes: ShapeUnion[];
  selection: SelectionState;
  history: HistoryState[];
  historyIndex: number;
  maxHistory: number;
}

export type AlignType = 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v';
export type DistributeType = 'h' | 'v';

export const DEFAULT_FILL_COLOR = '#4A90D9';
export const DEFAULT_STROKE_COLOR = '#2C2C2C';
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_WIDTH = 100;
export const DEFAULT_HEIGHT = 100;
