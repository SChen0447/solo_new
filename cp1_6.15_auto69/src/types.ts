export type PixelMatrix = (string | null)[][]; // [row: 64][col: 96]

export const PIXEL_WIDTH = 96;
export const PIXEL_HEIGHT = 64;
export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 400;
export const PIXEL_CELL_SIZE = 6; // 预览区每个像素的显示大小
export const FRAME_COUNT = 36;
export const FPS = 8;
export const FRAME_DURATION = 1000 / FPS; // 125ms

export const PALETTE_COLORS: string[] = [
  '#e74c3c',
  '#f39c12',
  '#f1c40f',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#e91e63',
  '#2d3436',
];

export interface Artwork {
  id: string;
  name: string;
  createdAt: string;
  thumbnail: string;
  baseMatrix: PixelMatrix;
  animationFrames: PixelMatrix[];
  canvasSnapshot?: string;
}

export interface PixelColorPickerState {
  x: number; // 屏幕坐标
  y: number;
  pixelX: number; // 像素坐标
  pixelY: number;
}

export interface ToastState {
  message: string;
  type: 'success' | 'info' | 'error';
  id: number;
}

export type ViewMode = 'drawing' | 'pixel-grid';
