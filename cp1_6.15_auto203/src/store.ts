import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FontStore, FontItem, StyleParams, FavoriteItem } from './types';
import {
  defaultTitleFont,
  defaultBodyFont,
  calculateCompatibilityScore,
  getCompatibilityAdvice,
  allFonts,
} from './fonts';

const defaultStyleParams: StyleParams = {
  titleFontSize: 24,
  bodyFontSize: 16,
  lineHeight: 1.6,
  letterSpacing: 0.02,
  titleColor: '#1a1a2e',
  bodyColor: '#444444',
  quoteColor: '#666666',
};

export const useFontStore = create<FontStore>()(
  persist(
    (set, get) => ({
      fontTitle: defaultTitleFont,
      fontBody: defaultBodyFont,
      styleParams: defaultStyleParams,
      favorites: [],
      sidebarOpen: true,
      modalOpen: false,

      updateFontPair: (type: 'title' | 'body', font: FontItem) => {
        if (type === 'title') {
          set({ fontTitle: font });
        } else {
          set({ fontBody: font });
        }
      },

      updateStyleParams: (params: Partial<StyleParams>) => {
        set((state) => ({
          styleParams: { ...state.styleParams, ...params },
        }));
      },

      getCompatibilityScore: () => {
        const { fontTitle, fontBody } = get();
        return calculateCompatibilityScore(fontTitle, fontBody);
      },

      getCompatibilityAdvice: () => {
        const { fontTitle, fontBody } = get();
        return getCompatibilityAdvice(fontTitle, fontBody);
      },

      addFavorite: (item: Omit<FavoriteItem, 'id' | 'createdAt'>) => {
        const newFavorite: FavoriteItem = {
          ...item,
          id: `fav-${Date.now()}`,
          createdAt: Date.now(),
        };
        set((state) => ({
          favorites: [newFavorite, ...state.favorites],
        }));
      },

      removeFavorite: (id: string) => {
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        }));
      },

      applyFavorite: (id: string) => {
        const favorite = get().favorites.find((f) => f.id === id);
        if (favorite) {
          const titleFont = allFonts.find((f) => f.id === favorite.titleFontId);
          const bodyFont = allFonts.find((f) => f.id === favorite.bodyFontId);
          if (titleFont) {
            set({ fontTitle: titleFont });
          }
          if (bodyFont) {
            set({ fontBody: bodyFont });
          }
        }
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      toggleModal: () => {
        set((state) => ({ modalOpen: !state.modalOpen }));
      },

      setModalOpen: (open: boolean) => {
        set({ modalOpen: open });
      },
    }),
    {
      name: 'typepair-favorites',
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
);
