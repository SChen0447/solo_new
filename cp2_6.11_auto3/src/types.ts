export type SliderValues = [number, number, number, number];

export interface ColorStop {
  color: string;
  position: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  color: string;
  brightness: number;
  twinkleSpeed: number;
}

export interface Favorite {
  id: string;
  name: string;
  colors: string[];
  colorStops: ColorStop[];
  sliderValues: SliderValues;
  createdAt: number;
}

export interface ExportData {
  version: string;
  exportedAt: number;
  favorites: Favorite[];
}
