export type ToolType = 'pen' | 'rectangle' | 'circle' | 'line' | 'sticky' | 'image' | 'select' | 'eraser';

export interface Point {
  x: number;
  y: number;
}

export interface DrawPath {
  id: string;
  type: 'pen';
  points: Point[];
  color: string;
  thickness: number;
  userId: string;
}

export interface DrawShape {
  id: string;
  type: 'rectangle' | 'circle' | 'line';
  start: Point;
  end: Point;
  color: string;
  thickness: number;
  userId: string;
}

export type DrawElement = DrawPath | DrawShape;

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  borderColor: string;
  userId: string;
}

export interface CanvasImage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  userId: string;
}

export interface UserCursor {
  userId: string;
  x: number;
  y: number;
  color: string;
  name: string;
}

export interface HistoryVersion {
  id: string;
  timestamp: number;
  drawings: DrawElement[];
  stickies: StickyNote[];
  images: CanvasImage[];
}

export interface CanvasState {
  drawings: DrawElement[];
  stickies: StickyNote[];
  images: CanvasImage[];
}

export type ServerMessage =
  | { type: 'init'; state: CanvasState; userId: string; versions: HistoryVersion[] }
  | { type: 'draw'; element: DrawElement }
  | { type: 'draw-update'; element: DrawElement }
  | { type: 'draw-finish'; element: DrawElement }
  | { type: 'sticky-add'; sticky: StickyNote }
  | { type: 'sticky-update'; sticky: StickyNote }
  | { type: 'sticky-delete'; id: string }
  | { type: 'image-add'; image: CanvasImage }
  | { type: 'image-update'; image: CanvasImage }
  | { type: 'image-delete'; id: string }
  | { type: 'cursor-move'; cursor: UserCursor }
  | { type: 'cursor-leave'; userId: string }
  | { type: 'version-saved'; version: HistoryVersion }
  | { type: 'version-restore'; state: CanvasState; versionId: string }
  | { type: 'versions-list'; versions: HistoryVersion[] }
  | { type: 'user-joined'; userId: string; color: string; name: string }
  | { type: 'user-left'; userId: string }
  | { type: 'clear-canvas' };

export type ClientMessage =
  | { type: 'draw'; element: DrawElement }
  | { type: 'draw-update'; element: DrawElement }
  | { type: 'draw-finish'; element: DrawElement }
  | { type: 'sticky-add'; sticky: StickyNote }
  | { type: 'sticky-update'; sticky: StickyNote }
  | { type: 'sticky-delete'; id: string }
  | { type: 'image-add'; image: CanvasImage }
  | { type: 'image-update'; image: CanvasImage }
  | { type: 'image-delete'; id: string }
  | { type: 'cursor-move'; cursor: UserCursor }
  | { type: 'restore-version'; versionId: string }
  | { type: 'get-versions' }
  | { type: 'clear-canvas' };
