export type StockStatus = 'in_stock' | 'out_of_stock' | 'restocking'

export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  category: string
  status: StockStatus
  description?: string
  price?: number
}

export interface SearchQuery {
  keyword: string
  category?: string
  status?: StockStatus
}

export interface BacklogItem {
  id: string
  bookId: string
  bookTitle: string
  date: string
  requestCount: number
}

export interface NotifyRequest {
  bookId: string
  email: string
}

export interface NotifyResponse {
  success: boolean
  notifyTime: string
  bookTitle: string
  message: string
}

export interface SearchSuggestion {
  type: 'title' | 'author'
  value: string
}

export const StockStatusLabel: Record<StockStatus, string> = {
  in_stock: '在架',
  out_of_stock: '缺货',
  restocking: '待补货',
}
