export interface Point {
  x: number;
  y: number;
}

export type MakeupCategory = 'lipstick' | 'eyeshadow' | 'blush';

export interface MakeupColors {
  lipstick: string | null;
  eyeshadow: string | null;
  blush: string | null;
}

export interface FaceLandmarks {
  leftEye: Point;
  rightEye: Point;
  mouth: Point[];
  leftCheek: Point;
  rightCheek: Point;
}

export interface AlbumItem {
  id: string;
  dataUrl: string;
  thumbnailUrl: string;
  colors: MakeupColors;
  opacity: number;
  createdAt: number;
}

export interface ColorOption {
  name: string;
  hex: string;
}
