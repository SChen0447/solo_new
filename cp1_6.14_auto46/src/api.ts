import axios from 'axios'
import type { Photo, Category, PhotoUploadData, PhotoUpdateData, SortField, SortOrder } from './types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

export const photoApi = {
  getPhotos: async (params?: {
    categoryIds?: string[]
    page?: number
    limit?: number
    sortField?: SortField
    sortOrder?: SortOrder
  }): Promise<{ photos: Photo[]; total: number }> => {
    const { data } = await api.get('/photos', { params })
    return data
  },

  getPhoto: async (id: string): Promise<Photo> => {
    const { data } = await api.get(`/photos/${id}`)
    return data
  },

  uploadPhoto: async (
    file: File,
    photoData: PhotoUploadData,
    onProgress?: (progress: number) => void
  ): Promise<Photo> => {
    const formData = new FormData()
    formData.append('photo', file)
    Object.entries(photoData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value))
      }
    })

    const { data } = await api.post('/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    })
    return data
  },

  updatePhoto: async (id: string, photoData: PhotoUpdateData): Promise<Photo> => {
    const { data } = await api.put(`/photos/${id}`, photoData)
    return data
  },

  deletePhoto: async (id: string): Promise<void> => {
    await api.delete(`/photos/${id}`)
  }
}

export const categoryApi = {
  getCategories: async (): Promise<Category[]> => {
    const { data } = await api.get('/categories')
    return data
  },

  createCategory: async (name: string, color?: string): Promise<Category> => {
    const { data } = await api.post('/categories', { name, color })
    return data
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`)
  }
}
