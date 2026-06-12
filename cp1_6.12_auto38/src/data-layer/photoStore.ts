import { create } from 'zustand';
import { Photo, Tag, PRESET_TAGS } from './types';
import {
  getPhotos,
  getAllPhotos,
  addTagToPhoto,
  removeTagFromPhoto,
  getAllTags,
  updatePhotoOrder
} from './api';

interface PhotoState {
  photos: Photo[];
  allPhotos: Photo[];
  tags: Tag[];
  filterTag: string | null;
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  total: number;
  loading: boolean;
  selectMode: boolean;
  selectedPhotoIds: string[];

  initData: () => Promise<void>;
  loadMorePhotos: () => Promise<void>;
  setFilterTag: (tag: string | null) => void;
  addTag: (photoId: string, tagName: string) => Promise<void>;
  removeTag: (photoId: string, tagName: string) => Promise<void>;
  refreshTags: () => Promise<void>;
  reorderPhotos: (photoIds: string[], orders: number[]) => Promise<void>;
  toggleSelectMode: () => void;
  togglePhotoSelection: (photoId: string) => void;
  clearSelection: () => void;
}

export const usePhotoStore = create<PhotoState>((set, get) => ({
  photos: [],
  allPhotos: [],
  tags: PRESET_TAGS,
  filterTag: null,
  currentPage: 0,
  pageSize: 10,
  hasMore: true,
  total: 0,
  loading: false,
  selectMode: false,
  selectedPhotoIds: [],

  initData: async () => {
    set({ loading: true });
    try {
      const [photosData, tags] = await Promise.all([
        getPhotos(1, 10),
        getAllTags()
      ]);
      set({
        photos: photosData.photos,
        allPhotos: [],
        tags,
        currentPage: 1,
        hasMore: photosData.hasMore,
        total: photosData.total,
        loading: false
      });
      getAllPhotos().then(allPhotos => {
        set({ allPhotos });
      });
    } catch (error) {
      console.error('Failed to init data:', error);
      set({ loading: false });
    }
  },

  loadMorePhotos: async () => {
    const { loading, hasMore, currentPage, pageSize, photos } = get();
    if (loading || !hasMore) return;

    set({ loading: true });
    try {
      const nextPage = currentPage + 1;
      const result = await getPhotos(nextPage, pageSize);
      set({
        photos: [...photos, ...result.photos],
        currentPage: nextPage,
        hasMore: result.hasMore,
        total: result.total,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load more photos:', error);
      set({ loading: false });
    }
  },

  setFilterTag: (tag: string | null) => {
    set({ filterTag: tag });
  },

  addTag: async (photoId: string, tagName: string) => {
    const updatedPhoto = await addTagToPhoto(photoId, tagName);
    if (updatedPhoto) {
      set(state => ({
        photos: state.photos.map(p =>
          p.id === photoId ? updatedPhoto : p
        ),
        allPhotos: state.allPhotos.map(p =>
          p.id === photoId ? updatedPhoto : p
        )
      }));
      get().refreshTags();
    }
  },

  removeTag: async (photoId: string, tagName: string) => {
    const updatedPhoto = await removeTagFromPhoto(photoId, tagName);
    if (updatedPhoto) {
      set(state => ({
        photos: state.photos.map(p =>
          p.id === photoId ? updatedPhoto : p
        ),
        allPhotos: state.allPhotos.map(p =>
          p.id === photoId ? updatedPhoto : p
        )
      }));
      get().refreshTags();
    }
  },

  refreshTags: async () => {
    const tags = await getAllTags();
    set({ tags });
  },

  reorderPhotos: async (photoIds: string[], orders: number[]) => {
    await updatePhotoOrder(photoIds, orders);
    const allPhotos = await getAllPhotos();
    const { currentPage, pageSize } = get();
    const sortedPhotos = [...allPhotos].sort((a, b) => a.order - b.order);
    set({
      allPhotos,
      photos: sortedPhotos.slice(0, currentPage * pageSize)
    });
  },

  toggleSelectMode: () => {
    set(state => ({
      selectMode: !state.selectMode,
      selectedPhotoIds: state.selectMode ? [] : state.selectedPhotoIds
    }));
  },

  togglePhotoSelection: (photoId: string) => {
    set(state => {
      const isSelected = state.selectedPhotoIds.includes(photoId);
      return {
        selectedPhotoIds: isSelected
          ? state.selectedPhotoIds.filter(id => id !== photoId)
          : [...state.selectedPhotoIds, photoId]
      };
    });
  },

  clearSelection: () => {
    set({ selectedPhotoIds: [] });
  }
}));
