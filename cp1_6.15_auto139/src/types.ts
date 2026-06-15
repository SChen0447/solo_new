export interface CelestialBody {
  id: string;
  index: number;
  name: string;
  x: number;
  y: number;
  position3D: { x: number; y: number; z: number };
  brightness: number;
  color: string;
  size: number;
  radius: number;
  thumbnailDataUrl?: string;
  pixelX: number;
  pixelY: number;
  originalWidth: number;
  originalHeight: number;
}

export type FilterOption = 'all' | 'bright' | 'medium' | 'dim';
export type SortOption = 'brightnessDesc' | 'brightnessAsc' | 'xAsc';

export interface ParsedImageData {
  bodies: CelestialBody[];
  imageWidth: number;
  imageHeight: number;
  originalImage: HTMLImageElement;
}
