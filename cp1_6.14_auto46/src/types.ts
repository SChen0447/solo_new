export interface Photo {
  id: string
  title: string
  imageUrl: string
  thumbnailUrl: string
  categoryId: string
  shootDate: string
  cameraModel: string
  aperture: string
  shutterSpeed: string
  iso: number
  createdAt: string
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface PhotoUploadData {
  title: string
  categoryId: string
  newCategoryName?: string
  shootDate: string
  cameraModel: string
  aperture: string
  shutterSpeed: string
  iso: number
}

export interface PhotoUpdateData {
  title?: string
  categoryId?: string
  shootDate?: string
  cameraModel?: string
  aperture?: string
  shutterSpeed?: string
  iso?: number
}

export type SortField = 'title' | 'shootDate' | 'createdAt'
export type SortOrder = 'asc' | 'desc'
