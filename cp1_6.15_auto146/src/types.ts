export type ElementType = 'platform' | 'enemy' | 'coin';

export interface LevelElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  canDoubleJump: boolean;
  squishProgress: number;
}

export type EditorTool = 'select' | ElementType;

export interface EditorState {
  elements: LevelElement[];
  selectedIds: string[];
  currentTool: EditorTool;
  snapToGrid: boolean;
  gridSize: number;
}
