import { create } from 'zustand';

export interface WatercolorParams {
  intensity: number;
  colorSpread: number;
  brushSize: number;
}

export interface HistoryItem {
  id: string;
  thumbnail: string;
  params: WatercolorParams;
  imageData: ImageData;
  originalImageData: ImageData;
  brushStrokes: BrushStroke[];
  timestamp: number;
}

export interface BrushStroke {
  x: number;
  y: number;
  size: number;
  mode: 'enhance' | 'reduce';
}

export type BrushMode = 'enhance' | 'reduce';

interface AppState {
  originalImage: HTMLImageElement | null;
  originalImageData: ImageData | null;
  processedImageData: ImageData | null;
  previewCanvas: HTMLCanvasElement | null;
  params: WatercolorParams;
  brushMode: BrushMode;
  brushSize: number;
  brushStrokes: BrushStroke[];
  history: HistoryItem[];
  isProcessing: boolean;
  isImageLoaded: boolean;

  setOriginalImage: (img: HTMLImageElement | null) => void;
  setOriginalImageData: (data: ImageData | null) => void;
  setProcessedImageData: (data: ImageData | null) => void;
  setPreviewCanvas: (canvas: HTMLCanvasElement | null) => void;
  setParams: (params: Partial<WatercolorParams>) => void;
  setBrushMode: (mode: BrushMode) => void;
  setBrushSize: (size: number) => void;
  addBrushStroke: (stroke: BrushStroke) => void;
  setBrushStrokes: (strokes: BrushStroke[]) => void;
  addHistoryItem: (item: HistoryItem) => void;
  setHistory: (history: HistoryItem[]) => void;
  setIsProcessing: (processing: boolean) => void;
  setIsImageLoaded: (loaded: boolean) => void;
  resetState: () => void;
}

const defaultParams: WatercolorParams = {
  intensity: 60,
  colorSpread: 50,
  brushSize: 5
};

export const useStore = create<AppState>((set) => ({
  originalImage: null,
  originalImageData: null,
  processedImageData: null,
  previewCanvas: null,
  params: defaultParams,
  brushMode: 'enhance',
  brushSize: 25,
  brushStrokes: [],
  history: [],
  isProcessing: false,
  isImageLoaded: false,

  setOriginalImage: (img) => set({ originalImage: img }),
  setOriginalImageData: (data) => set({ originalImageData: data }),
  setProcessedImageData: (data) => set({ processedImageData: data }),
  setPreviewCanvas: (canvas) => set({ previewCanvas: canvas }),
  setParams: (newParams) => set((state) => ({ params: { ...state.params, ...newParams } })),
  setBrushMode: (mode) => set({ brushMode: mode }),
  setBrushSize: (size) => set({ brushSize: size }),
  addBrushStroke: (stroke) => set((state) => ({ brushStrokes: [...state.brushStrokes, stroke] })),
  setBrushStrokes: (strokes) => set({ brushStrokes: strokes }),
  addHistoryItem: (item) => set((state) => {
    const newHistory = [item, ...state.history].slice(0, 10);
    return { history: newHistory };
  }),
  setHistory: (history) => set({ history }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setIsImageLoaded: (loaded) => set({ isImageLoaded: loaded }),
  resetState: () => set({
    originalImage: null,
    originalImageData: null,
    processedImageData: null,
    brushStrokes: [],
    params: defaultParams,
    isImageLoaded: false
  })
}));
