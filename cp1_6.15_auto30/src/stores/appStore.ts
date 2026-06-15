import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type LayoutStyle = 'balanced' | 'focus' | 'diagonal' | 'radial' | 'stacked' | 'scattered';
export type FilterType = 'none' | 'vintage' | 'cool' | 'soft';
export type FrameType = 'none' | 'white' | 'doubleBlack' | 'felt' | 'goldEmboss' | 'matteWood';

export interface CollageImage {
  id: string;
  keyword: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  zIndex: number;
  originalWidth: number;
  originalHeight: number;
}

export interface ImageTag {
  id: string;
  text: string;
}

interface AppState {
  text: string;
  imageTags: ImageTag[];
  images: CollageImage[];
  layoutStyle: LayoutStyle;
  filter: FilterType;
  frame: FrameType;
  selectedImageId: string | null;
  isAnalyzing: boolean;
  canvasWidth: number;
  canvasHeight: number;

  setText: (text: string) => void;
  setImageTags: (tags: ImageTag[]) => void;
  removeImageTag: (id: string) => void;
  reorderImageTag: (fromIndex: number, toIndex: number) => void;
  setImages: (images: CollageImage[]) => void;
  updateImagePosition: (id: string, x: number, y: number) => void;
  updateImageRotation: (id: string, rotation: number) => void;
  updateImageScale: (id: string, scale: number) => void;
  moveImageLayerUp: (id: string) => void;
  moveImageLayerDown: (id: string) => void;
  setLayoutStyle: (style: LayoutStyle) => void;
  setFilter: (filter: FilterType) => void;
  setFrame: (frame: FrameType) => void;
  setSelectedImageId: (id: string | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  addImageForTag: (keyword: string, url: string, originalWidth: number, originalHeight: number) => void;
  resetImages: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  text: '',
  imageTags: [],
  images: [],
  layoutStyle: 'balanced',
  filter: 'none',
  frame: 'none',
  selectedImageId: null,
  isAnalyzing: false,
  canvasWidth: 800,
  canvasHeight: 600,

  setText: (text) => set({ text }),

  setImageTags: (tags) => set({ imageTags: tags }),

  removeImageTag: (id) => {
    const { imageTags, images } = get();
    const tag = imageTags.find((t) => t.id === id);
    set({
      imageTags: imageTags.filter((t) => t.id !== id),
      images: tag ? images.filter((img) => img.keyword !== tag.text) : images,
    });
  },

  reorderImageTag: (fromIndex, toIndex) => {
    const { imageTags } = get();
    const newTags = [...imageTags];
    const [removed] = newTags.splice(fromIndex, 1);
    newTags.splice(toIndex, 0, removed);
    set({ imageTags: newTags });
  },

  setImages: (images) => set({ images }),

  updateImagePosition: (id, x, y) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, x, y } : img
      ),
    })),

  updateImageRotation: (id, rotation) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, rotation: rotation % 360 } : img
      ),
    })),

  updateImageScale: (id, scale) => {
    const clampedScale = Math.max(0.5, Math.min(2, scale));
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, scale: clampedScale } : img
      ),
    }));
  },

  moveImageLayerUp: (id) => {
    const { images } = get();
    const index = images.findIndex((img) => img.id === id);
    if (index < images.length - 1) {
      const newImages = [...images];
      const maxZ = Math.max(...newImages.map((i) => i.zIndex));
      newImages[index] = { ...newImages[index], zIndex: maxZ + 1 };
      newImages.sort((a, b) => a.zIndex - b.zIndex);
      newImages.forEach((img, i) => (img.zIndex = i));
      set({ images: newImages });
    }
  },

  moveImageLayerDown: (id) => {
    const { images } = get();
    const index = images.findIndex((img) => img.id === id);
    if (index > 0) {
      const newImages = [...images];
      const minZ = Math.min(...newImages.map((i) => i.zIndex));
      newImages[index] = { ...newImages[index], zIndex: minZ - 1 };
      newImages.sort((a, b) => a.zIndex - b.zIndex);
      newImages.forEach((img, i) => (img.zIndex = i));
      set({ images: newImages });
    }
  },

  setLayoutStyle: (style) => set({ layoutStyle: style }),

  setFilter: (filter) => set({ filter }),

  setFrame: (frame) => set({ frame }),

  setSelectedImageId: (id) => set({ selectedImageId: id }),

  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

  addImageForTag: (keyword, url, originalWidth, originalHeight) => {
    const { images } = get();
    const newImage: CollageImage = {
      id: uuidv4(),
      keyword,
      url,
      x: 0,
      y: 0,
      width: 150,
      height: 150,
      rotation: 0,
      scale: 1,
      zIndex: images.length,
      originalWidth,
      originalHeight,
    };
    set({ images: [...images, newImage] });
  },

  resetImages: () => set({ images: [] }),
}));
