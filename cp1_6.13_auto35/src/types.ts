export interface GalleryItem {
  id: number;
  title: string;
  artist: string;
  description: string;
  imageUrl: string;
  rating: number;
  note: string;
}

export interface AppState {
  currentIndex: number;
  artworks: GalleryItem[];
  scores: Record<number, number>;
  notes: Record<number, string>;
  isSortedByRating: boolean;
  isAnimating: boolean;
  isInitialized: boolean;

  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  setNote: (id: number, note: string) => void;
  setScore: (id: number, score: number) => void;
  resetCurrent: () => void;
  toggleSortOrder: () => void;
  setAnimating: (animating: boolean) => void;
  initialize: () => void;
}
