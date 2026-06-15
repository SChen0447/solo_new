import { create } from 'zustand';
import type { Color } from './colorExtractor';
import type { HarmonySet } from './colorHarmony';

export interface FavoritePalette {
  id: string;
  name: string;
  colors: Color[];
  harmonies: HarmonySet[];
  createdAt: string;
}

export interface FontSettings {
  titleFont: string;
  bodyFont: string;
  fontSize: number;
  lineHeight: number;
}

interface AppState {
  extractedColors: Color[];
  harmonies: HarmonySet[];
  selectedHarmonyIndex: number;
  imageUrl: string | null;
  fontSettings: FontSettings;
  favorites: FavoritePalette[];
  isDragging: boolean;

  setExtractedColors: (colors: Color[], harmonies: HarmonySet[]) => void;
  setImageUrl: (url: string | null) => void;
  setSelectedHarmonyIndex: (index: number) => void;
  setFontSettings: (settings: Partial<FontSettings>) => void;
  addFavorite: (palette: Omit<FavoritePalette, 'id' | 'createdAt'>) => void;
  removeFavorite: (id: string) => void;
  updateFavoriteName: (id: string, name: string) => void;
  loadFavorite: (id: string) => void;
  setIsDragging: (dragging: boolean) => void;
  reorderColors: (fromIndex: number, toIndex: number) => void;
}

const FONTS = [
  'Noto Sans SC',
  'Playfair Display',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Source Han Serif SC',
  'Ma Shan Zheng',
  'ZCOOL XiaoWei',
  'Long Cang'
];

const loadFavoritesFromStorage = (): FavoritePalette[] => {
  try {
    const stored = localStorage.getItem('photo-palette-favorites');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  extractedColors: [],
  harmonies: [],
  selectedHarmonyIndex: 0,
  imageUrl: null,
  fontSettings: {
    titleFont: FONTS[1],
    bodyFont: FONTS[0],
    fontSize: 16,
    lineHeight: 1.6
  },
  favorites: loadFavoritesFromStorage(),
  isDragging: false,

  setExtractedColors: (colors, harmonies) => {
    set({ extractedColors: colors, harmonies, selectedHarmonyIndex: 0 });
  },

  setImageUrl: (url) => set({ imageUrl: url }),

  setSelectedHarmonyIndex: (index) => set({ selectedHarmonyIndex: index }),

  setFontSettings: (settings) => set((state) => ({
    fontSettings: { ...state.fontSettings, ...settings }
  })),

  addFavorite: (palette) => {
    const newFavorite: FavoritePalette = {
      ...palette,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    set((state) => {
      const favorites = [newFavorite, ...state.favorites];
      localStorage.setItem('photo-palette-favorites', JSON.stringify(favorites));
      return { favorites };
    });
  },

  removeFavorite: (id) => {
    set((state) => {
      const favorites = state.favorites.filter(f => f.id !== id);
      localStorage.setItem('photo-palette-favorites', JSON.stringify(favorites));
      return { favorites };
    });
  },

  updateFavoriteName: (id, name) => {
    set((state) => {
      const favorites = state.favorites.map(f =>
        f.id === id ? { ...f, name } : f
      );
      localStorage.setItem('photo-palette-favorites', JSON.stringify(favorites));
      return { favorites };
    });
  },

  loadFavorite: (id) => {
    const favorite = get().favorites.find(f => f.id === id);
    if (favorite) {
      set({
        extractedColors: favorite.colors,
        harmonies: favorite.harmonies,
        selectedHarmonyIndex: 0
      });
    }
  },

  setIsDragging: (dragging) => set({ isDragging: dragging }),

  reorderColors: (fromIndex, toIndex) => {
    set((state) => {
      const colors = [...state.extractedColors];
      const [removed] = colors.splice(fromIndex, 1);
      colors.splice(toIndex, 0, removed);
      return { extractedColors: colors };
    });
  }
}));

export { FONTS };
