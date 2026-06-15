export interface ColorSwatch {
  id: string;
  hex: string;
  name?: string;
  isFavorite?: boolean;
  createdAt: number;
}

export interface Palette {
  id: string;
  name: string;
  type: 'preset' | 'custom' | 'favorite';
  colors: ColorSwatch[];
}

export type SvgLayerId = 'background' | 'skin' | 'hair' | 'shirt' | 'pants' | 'shoes';

export interface SvgLayer {
  id: SvgLayerId;
  name: string;
  fillType: 'fill' | 'stroke';
  adjacency: SvgLayerId[];
}

export interface ColorMapping {
  [key: string]: string;
}

export interface ContrastWarning {
  layer1: SvgLayerId;
  layer2: SvgLayerId;
  contrast: number;
}

export interface AppToast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export type ExportFormat = 'json' | 'css';
