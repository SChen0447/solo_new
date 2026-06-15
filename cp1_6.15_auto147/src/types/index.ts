export type AnnotationType = 'arrow' | 'rectangle' | 'text';

export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  endX: number;
  endY: number;
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle';
  width: number;
  height: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
}

export type Annotation = ArrowAnnotation | RectangleAnnotation | TextAnnotation;

export interface VersionSnapshot {
  id: string;
  artworkId: string;
  name: string;
  createdAt: number;
  imageUrl: string;
  annotations: Annotation[];
  thumbnail: string;
}

export interface Artwork {
  id: string;
  name: string;
  createdAt: number;
  originalImageUrl: string;
  versions: VersionSnapshot[];
}

export interface DiffPixel {
  x: number;
  y: number;
  rgbDiff: { r: number; g: number; b: number };
}

export interface DiffResult {
  diffPixels: DiffPixel[];
  totalDiffPixels: number;
  diffPercentage: number;
}
