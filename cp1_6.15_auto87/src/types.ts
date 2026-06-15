export type ToolType = 'pen' | 'rect' | 'circle' | 'text' | 'eraser';

export interface User {
  id: string;
  name: string;
  color: string;
  roomId: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: 'pen' | 'rect' | 'circle' | 'text';
  userId: string;
  userName: string;
  userColor: string;
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface PenElement extends BaseElement {
  type: 'pen';
  points: number[];
}

export interface RectElement extends BaseElement {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export type CanvasElement = PenElement | RectElement | CircleElement | TextElement;

export interface DrawEvent {
  id: string;
  type: 'pen' | 'rect' | 'circle' | 'text' | 'delete';
  userId: string;
  userName: string;
  userColor: string;
  timestamp: number;
  data: any;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  userColor: string;
  x: number;
  y: number;
  timestamp: number;
}

export const COLOR_PALETTE = [
  '#e74c3c', '#f39c12', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
  '#795548', '#607d8b', '#2d3436', '#ffffff'
];
