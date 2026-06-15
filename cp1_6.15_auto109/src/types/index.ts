export interface CompositionResult {
  score: number;
  advice: string;
  subjectPosition: {
    x: number;
    y: number;
  };
  gridLines: {
    vertical: number[];
    horizontal: number[];
  };
}

export interface ColorResult {
  histogram: number[];
  palette: string[];
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface PhotoState {
  imageData: ImageData | null;
  imageUrl: string | null;
  imageSize: ImageSize | null;
  composition: CompositionResult | null;
  color: ColorResult | null;
  isAnalyzing: boolean;
  error: string | null;
}

export interface PhotoActions {
  setPhoto: (data: ImageData, url: string, size: ImageSize) => void;
  analyze: () => void;
  reset: () => void;
  setError: (error: string | null) => void;
}

export type PhotoStore = PhotoState & PhotoActions;
