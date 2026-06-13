import { create } from 'zustand';
import type { AppState, GalleryItem } from './types';
import { artworks as initialArtworks } from './utils/artworks';

export const useGalleryStore = create<AppState>((set, get) => ({
  currentIndex: 0,
  artworks: initialArtworks,
  scores: {},
  notes: {},
  isSortedByRating: false,
  isAnimating: false,
  isInitialized: false,

  next: () => {
    const { currentIndex, artworks, isAnimating } = get();
    if (isAnimating) return;
    if (currentIndex < artworks.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  prev: () => {
    const { currentIndex, isAnimating } = get();
    if (isAnimating) return;
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
    }
  },

  goTo: (index: number) => {
    const { artworks, isAnimating } = get();
    if (isAnimating) return;
    if (index >= 0 && index < artworks.length) {
      set({ currentIndex: index });
    }
  },

  setNote: (id: number, note: string) => {
    set((state) => ({
      notes: { ...state.notes, [id]: note }
    }));
  },

  setScore: (id: number, score: number) => {
    set((state) => ({
      scores: { ...state.scores, [id]: score }
    }));
  },

  resetCurrent: () => {
    const { currentIndex, artworks } = get();
    const currentArtwork = artworks[currentIndex];
    if (currentArtwork) {
      set((state) => ({
        scores: { ...state.scores, [currentArtwork.id]: 0 },
        notes: { ...state.notes, [currentArtwork.id]: '' }
      }));
    }
  },

  toggleSortOrder: () => {
    const { isSortedByRating, artworks, scores, currentIndex } = get();
    
    if (!isSortedByRating) {
      const sorted = [...artworks].sort((a, b) => {
        const scoreA = scores[a.id] || 0;
        const scoreB = scores[b.id] || 0;
        return scoreB - scoreA;
      });
      set({ artworks: sorted, isSortedByRating: true, currentIndex: 0 });
    } else {
      const sorted = [...artworks].sort((a, b) => a.id - b.id);
      const currentArtworkId = artworks[currentIndex]?.id;
      const newIndex = sorted.findIndex((a) => a.id === currentArtworkId);
      set({
        artworks: sorted,
        isSortedByRating: false,
        currentIndex: newIndex >= 0 ? newIndex : 0
      });
    }
  },

  setAnimating: (animating: boolean) => {
    set({ isAnimating: animating });
  },

  initialize: () => {
    set({ isInitialized: true });
  }
}));
