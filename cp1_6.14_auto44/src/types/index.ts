export type Category = '文学' | '科技' | '艺术' | '教育' | '生活' | '其他'

export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  category: Category
  price: number
  stock: number
  description: string
  coverUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Sale {
  id: string
  bookId: string
  bookTitle: string
  quantity: number
  unitPrice: number
  totalPrice: number
  createdAt: string
}

export interface BookFilters {
  search: string
  category: Category | ''
}
