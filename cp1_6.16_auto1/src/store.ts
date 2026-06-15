import { create } from 'zustand';
import type { ColorStore, ThemeObject } from './types';
import { generateTheme } from './colorAlgorithm';

const defaultTheme: ThemeObject = {
  light: '#F5F5F5',
  dark: '#333333',
  accent1: '#2196F3',
  accent2: '#FF9800',
  accent3: '#4CAF50',
};

export const useColorStore = create<ColorStore>((set, get) => ({
  extractedColors: [],
  theme: defaultTheme,
  isExtracting: false,
  progress: 0,
  mode: 'light',
  thumbnailUrl: null,
  toastColor: null,

  setExtractedColors: (colors: string[]) => {
    const theme = generateTheme(colors);
    set({ extractedColors: colors, theme });
  },

  setTheme: (theme: ThemeObject) => set({ theme }),

  setIsExtracting: (val: boolean) => set({ isExtracting: val }),

  setProgress: (val: number) => set({ progress: val }),

  setMode: (mode: 'light' | 'dark') => set({ mode }),

  setThumbnailUrl: (url: string | null) => set({ thumbnailUrl: url }),

  showToast: (color: string) => set({ toastColor: color }),

  hideToast: () => set({ toastColor: null }),

  updateThemeColor: (key: keyof ThemeObject, color: string) => {
    const currentTheme = get().theme;
    const newTheme = { ...currentTheme, [key]: color };
    set({ theme: newTheme });
  },
}));
