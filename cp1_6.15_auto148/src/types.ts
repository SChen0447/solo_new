export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorData {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  name?: string;
  percentage?: number;
}

export interface VariantParams {
  hueShift: number;
  saturationShift: number;
  lightnessShift: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  thumbnail: string;
  extractedColors: ColorData[];
  selectedColorIndex: number;
  variantParams: VariantParams;
  variants: ColorData[];
}

export type ExportFormat = 'json' | 'css' | 'sketch';
