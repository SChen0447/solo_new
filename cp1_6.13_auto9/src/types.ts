export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  color: string;
  width: number;
  isEraser: boolean;
  eraserSize?: number;
  points: Point[];
}

export interface Note {
  id: string;
  name: string;
  thumbnail: string;
  canvasData: Stroke[];
  createdAt: number;
  updatedAt: number;
}

export const PRESET_COLORS = [
  '#333333',
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F1C40F',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#34495E',
  '#16A085',
  '#C0392B',
  '#8E44AD',
];

export const STROKE_WIDTHS = [1, 3, 6, 10] as const;

export const ERASER_SIZES = [
  { label: '小', value: 20 },
  { label: '中', value: 40 },
  { label: '大', value: 60 },
] as const;

export const MAX_UNDO_STEPS = 50;
