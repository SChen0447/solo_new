import { create } from 'zustand'
import { Device, SortOrder } from './types'

interface FilterState {
  searchQuery: string
  category: string
  sortOrder: SortOrder
  setSearchQuery: (q: string) => void
  setCategory: (c: string) => void
  setSortOrder: (s: SortOrder) => void
  filterDevices: (devices: Device[]) => Device[]
}

export const useFilterStore = create<FilterState>((set, get) => ({
  searchQuery: '',
  category: 'all',
  sortOrder: 'default',

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCategory: (c) => set({ category: c }),
  setSortOrder: (s) => set({ sortOrder: s }),

  filterDevices: (devices) => {
    const { searchQuery, category, sortOrder } = get()
    let result = [...devices]

    if (category !== 'all') {
      result = result.filter(d => d.category === category)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        d => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
      )
    }

    if (sortOrder === 'price-asc') {
      result.sort((a, b) => a.dailyPrice - b.dailyPrice)
    } else if (sortOrder === 'price-desc') {
      result.sort((a, b) => b.dailyPrice - a.dailyPrice)
    }

    return result
  }
}))
