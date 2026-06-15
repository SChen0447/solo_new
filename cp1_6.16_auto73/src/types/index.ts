export type FilterType = 'none' | 'vintage' | 'monochrome' | 'cool' | 'warm' | 'film';

export type AspectRatio = '1:1' | '4:3' | '16:9';

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
}

export interface ImageItem {
  id: string;
  file: File;
  originalUrl: string;
  editedUrl: string | null;
  originalBlob: Blob | null;
  editedBlob: Blob | null;
  name: string;
  width: number;
  height: number;
  dominantColor: string;
  colorName: string;
  filterType: FilterType;
  cropData: CropData | null;
  selected: boolean;
  order: number;
}

export interface AppState {
  images: ImageItem[];
  currentEditingId: string | null;
  sortedIds: string[];
  isLoading: boolean;
  viewMode: 'waterfall' | 'gallery';
}

export interface AppContextType {
  state: AppState;
  addImages: (files: File[]) => Promise<void>;
  updateImage: (id: string, updates: Partial<ImageItem>) => void;
  selectImage: (id: string, selected: boolean) => void;
  selectAllImages: (selected: boolean) => void;
  reorderImages: (startIndex: number, endIndex: number) => void;
  setEditingImage: (id: string | null) => void;
  setViewMode: (mode: 'waterfall' | 'gallery') => void;
  generateExhibition: () => string;
  setLoading: (loading: boolean) => void;
}

export const FILTER_PRESETS: Record<FilterType, { name: string; icon: string }> = {
  none: { name: '原图', icon: 'original' },
  vintage: { name: '复古', icon: 'vintage' },
  monochrome: { name: '黑白', icon: 'monochrome' },
  cool: { name: '冷色调', icon: 'cool' },
  warm: { name: '暖色调', icon: 'warm' },
  film: { name: '胶片', icon: 'film' }
};

export const ASPECT_RATIOS: Record<AspectRatio, { value: number; label: string }> = {
  '1:1': { value: 1, label: '1:1' },
  '4:3': { value: 4 / 3, label: '4:3' },
  '16:9': { value: 16 / 9, label: '16:9' }
};
