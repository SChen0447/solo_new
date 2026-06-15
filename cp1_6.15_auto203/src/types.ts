export interface FontItem {
  id: string;
  name: string;
  fontFamily: string;
  type: 'chinese' | 'english';
  xHeight: number;
  widthRatio: number;
  avgKerning: number;
  previewText: string;
  isGoogleFont?: boolean;
}

export interface StyleParams {
  titleFontSize: number;
  bodyFontSize: number;
  lineHeight: number;
  letterSpacing: number;
  titleColor: string;
  bodyColor: string;
  quoteColor: string;
}

export interface FavoriteItem {
  id: string;
  titleFontId: string;
  bodyFontId: string;
  titleFontName: string;
  bodyFontName: string;
  thumbnail: string;
  createdAt: number;
}

export interface FontStore {
  fontTitle: FontItem;
  fontBody: FontItem;
  styleParams: StyleParams;
  favorites: FavoriteItem[];
  sidebarOpen: boolean;
  modalOpen: boolean;

  updateFontPair: (type: 'title' | 'body', font: FontItem) => void;
  updateStyleParams: (params: Partial<StyleParams>) => void;
  getCompatibilityScore: () => number;
  getCompatibilityAdvice: () => string;
  addFavorite: (item: Omit<FavoriteItem, 'id' | 'createdAt'>) => void;
  removeFavorite: (id: string) => void;
  applyFavorite: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleModal: () => void;
  setModalOpen: (open: boolean) => void;
}
