export type AnnotationType = 'rectangle' | 'circle' | 'arrow' | 'brush';

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[];
  color: string;
  strokeWidth: number;
  note?: string;
}

export interface ImageItem {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  createdAt: number;
}

export interface ToolState {
  type: AnnotationType | 'select';
  color: string;
  strokeWidth: number;
}

export const PRESET_COLORS = [
  '#e74c3c',
  '#e67e22',
  '#f1c40f',
  '#2ecc71',
  '#1abc9c',
  '#3498db',
  '#4a90d9',
  '#9b59b6',
  '#34495e',
  '#ffffff',
];

export const MAX_HISTORY = 20;
