import { create } from 'zustand'
import type { Photo, Category, SortField, SortOrder } from './types'
import { photoApi, categoryApi } from './api'

interface PhotoState {
  photos: Photo[]
  total: number
  categories: Category[]
  selectedCategoryIds: string[]
  currentPhoto: Photo | null
  isSlideshowOpen: boolean
  sortField: SortField
  sortOrder: SortOrder
  page: number
  limit: number
  isLoading: boolean
  error: string | null

  fetchPhotos: () => Promise<void>
  fetchMorePhotos: () => Promise<void>
  fetchCategories: () => Promise<void>
  toggleCategory: (categoryId: string) => void
  clearCategoryFilter: () => void
  setCurrentPhoto: (photo: Photo | null) => void
  openSlideshow: (photo: Photo) => void
  closeSlideshow: () => void
  setSort: (field: SortField, order: SortOrder) => void
  addPhoto: (photo: Photo) => void
  updatePhoto: (photo: Photo) => void
  removePhoto: (id: string) => void
  addCategory: (category: Category) => void
}

export const usePhotoStore = create<PhotoState>((set, get) => ({
  photos: [],
  total: 0,
  categories: [],
  selectedCategoryIds: [],
  currentPhoto: null,
  isSlideshowOpen: false,
  sortField: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
  isLoading: false,
  error: null,

  fetchPhotos: async () => {
    set({ isLoading: true, error: null })
    try {
      const { selectedCategoryIds, sortField, sortOrder, limit } = get()
      const { photos, total } = await photoApi.getPhotos({
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        page: 1,
        limit,
        sortField,
        sortOrder
      })
      set({ photos, total, page: 1, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || '获取作品失败', isLoading: false })
    }
  },

  fetchMorePhotos: async () => {
    const { isLoading, page, limit, total, photos } = get()
    if (isLoading || photos.length >= total) return

    set({ isLoading: true, error: null })
    try {
      const { selectedCategoryIds, sortField, sortOrder } = get()
      const nextPage = page + 1
      const { photos: newPhotos } = await photoApi.getPhotos({
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        page: nextPage,
        limit: 10,
        sortField,
        sortOrder
      })
      set((state) => ({
        photos: [...state.photos, ...newPhotos],
        page: nextPage,
        isLoading: false
      }))
    } catch (error: any) {
      set({ error: error.message || '加载更多失败', isLoading: false })
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await categoryApi.getCategories()
      set({ categories })
    } catch (error: any) {
      set({ error: error.message || '获取分类失败' })
    }
  },

  toggleCategory: (categoryId: string) => {
    set((state) => {
      const isSelected = state.selectedCategoryIds.includes(categoryId)
      const newSelected = isSelected
        ? state.selectedCategoryIds.filter((id) => id !== categoryId)
        : [...state.selectedCategoryIds, categoryId]
      return { selectedCategoryIds: newSelected }
    })
  },

  clearCategoryFilter: () => {
    set({ selectedCategoryIds: [] })
  },

  setCurrentPhoto: (photo: Photo | null) => {
    set({ currentPhoto: photo })
  },

  openSlideshow: (photo: Photo) => {
    set({ currentPhoto: photo, isSlideshowOpen: true })
  },

  closeSlideshow: () => {
    set({ isSlideshowOpen: false })
  },

  setSort: (field: SortField, order: SortOrder) => {
    set({ sortField: field, sortOrder: order })
  },

  addPhoto: (photo: Photo) => {
    set((state) => ({
      photos: [photo, ...state.photos],
      total: state.total + 1
    }))
  },

  updatePhoto: (photo: Photo) => {
    set((state) => ({
      photos: state.photos.map((p) => (p.id === photo.id ? photo : p)),
      currentPhoto: state.currentPhoto?.id === photo.id ? photo : state.currentPhoto
    }))
  },

  removePhoto: (id: string) => {
    set((state) => ({
      photos: state.photos.filter((p) => p.id !== id),
      total: state.total - 1,
      currentPhoto: state.currentPhoto?.id === id ? null : state.currentPhoto
    }))
  },

  addCategory: (category: Category) => {
    set((state) => ({
      categories: [...state.categories, category]
    }))
  }
}))
