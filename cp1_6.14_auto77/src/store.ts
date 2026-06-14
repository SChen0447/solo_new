import { create } from 'zustand'
import type { Book, SearchQuery, StockStatus, BacklogItem } from './types'
import { searchBooks, fetchBacklog, addToBacklog, deleteBacklogItem } from './api'

interface BookStore {
  books: Book[]
  searchQuery: SearchQuery
  categories: string[]
  backlog: BacklogItem[]
  loading: boolean
  error: string | null

  setSearchQuery: (query: Partial<SearchQuery>) => void
  setCategories: (cats: string[]) => void
  doSearch: (query: SearchQuery) => Promise<void>
  loadBacklog: () => Promise<void>
  addBookToBacklog: (bookId: string, bookTitle: string) => Promise<void>
  removeBacklogItem: (id: string) => Promise<void>
}

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  searchQuery: { keyword: '' },
  categories: [],
  backlog: [],
  loading: false,
  error: null,

  setSearchQuery: (query) =>
    set((state) => ({
      searchQuery: { ...state.searchQuery, ...query },
    })),

  setCategories: (cats) => set({ categories: cats }),

  doSearch: async (query: SearchQuery) => {
    set({ loading: true, error: null })
    try {
      const results = await searchBooks(query)
      set({ books: results, loading: false })
    } catch (err) {
      set({ error: '搜索失败，请稍后重试', loading: false })
    }
  },

  loadBacklog: async () => {
    try {
      const list = await fetchBacklog()
      set({ backlog: list })
    } catch {
      // silently fail
    }
  },

  addBookToBacklog: async (bookId, bookTitle) => {
    try {
      await addToBacklog(bookId, bookTitle)
      await get().loadBacklog()
    } catch {
      // silently fail
    }
  },

