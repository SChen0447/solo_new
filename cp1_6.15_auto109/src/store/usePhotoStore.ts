import { create } from 'zustand';
import type { PhotoStore, ImageSize, CompositionResult, ColorResult } from '../types';
import { analyzeComposition } from '../analyzer/CompositionAnalyzer';
import { analyzeColor } from '../analyzer/ColorAnalyzer';

const initialState = {
  imageData: null,
  imageUrl: null,
  imageSize: null,
  composition: null,
  color: null,
  isAnalyzing: false,
  error: null,
};

export const usePhotoStore = create<PhotoStore>((set, get) => ({
  ...initialState,

  setPhoto: (data: ImageData, url: string, size: ImageSize) => {
    set({
      imageData: data,
      imageUrl: url,
      imageSize: size,
      composition: null,
      color: null,
      error: null,
    });
  },

  analyze: () => {
    const { imageData } = get();
    if (!imageData) return;

    set({ isAnalyzing: true });

    try {
      const startTime = performance.now();
      
      const compositionResult: CompositionResult = analyzeComposition(imageData);
      const colorResult: ColorResult = analyzeColor(imageData);
      
      const endTime = performance.now();
      console.log(`分析完成，耗时: ${(endTime - startTime).toFixed(2)}ms`);

      set({
        composition: compositionResult,
        color: colorResult,
        isAnalyzing: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '分析失败',
        isAnalyzing: false,
      });
    }
  },

  reset: () => {
    const { imageUrl } = get();
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    set(initialState);
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
