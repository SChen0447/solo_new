import { create } from 'zustand'
import type {
  TimeEntry,
  CompletedItem,
  BlockerItem,
  SummaryData,
  TemplateType,
  TimeRange,
  ViewTab,
} from '../types'

interface AppState {
  entries: TimeEntry[]
  summary: SummaryData | null
  completedItems: CompletedItem[]
  blockerItems: BlockerItem[]
  timeRange: TimeRange
  startDate: string
  endDate: string
  activeTab: ViewTab
  template: TemplateType
  projectName: string
  exporterName: string
  loading: boolean

  setTimeRange: (range: TimeRange) => void
  setStartDate: (date: string) => void
  setEndDate: (date: string) => void
  setActiveTab: (tab: ViewTab) => void
  setTemplate: (tpl: TemplateType) => void
  setProjectName: (name: string) => void
  setExporterName: (name: string) => void

  fetchEntries: () => Promise<void>
  addEntry: (entry: Omit<TimeEntry, 'id'>) => Promise<TimeEntry | null>
  deleteEntry: (id: string) => Promise<boolean>
  fetchSummary: () => Promise<void>
  fetchCompletedItems: () => Promise<void>
  addCompletedItem: (item: Omit<CompletedItem, 'id'>) => Promise<CompletedItem | null>
  updateCompletedItem: (id: string, updates: Partial<CompletedItem>) => Promise<boolean>
  deleteCompletedItem: (id: string) => Promise<boolean>
  fetchBlockerItems: () => Promise<void>
  addBlockerItem: (item: Omit<BlockerItem, 'id'>) => Promise<BlockerItem | null>
  updateBlockerItem: (id: string, updates: Partial<BlockerItem>) => Promise<boolean>
  deleteBlockerItem: (id: string) => Promise<boolean>
  exportReport: () => Promise<string | null>
}

const today = new Date()
const weekAgo = new Date(today)
weekAgo.setDate(weekAgo.getDate() - 6)

const fmt = (d: Date) => d.toISOString().slice(0, 10)

function adjustDateRange(range: TimeRange, start: string, end: string) {
  const now = new Date()
  if (range === 'day') {
    return { startDate: fmt(now), endDate: fmt(now) }
  } else if (range === 'week') {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 6)
    return { startDate: fmt(weekStart), endDate: fmt(now) }
  } else if (range === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return { startDate: fmt(monthStart), endDate: fmt(now) }
  }
  return { startDate: start, endDate: end }
}

export const useAppStore = create<AppState>((set, get) => ({
  entries: [],
  summary: null,
  completedItems: [],
  blockerItems: [],
  timeRange: 'week',
  startDate: fmt(weekAgo),
  endDate: fmt(today),
  activeTab: 'time',
  template: 'business',
  projectName: '我的项目',
  exporterName: '张三',
  loading: false,

  setTimeRange: (range) => {
    const adjusted = adjustDateRange(range, get().startDate, get().endDate)
    set({ timeRange: range, ...adjusted })
    get().fetchEntries()
    get().fetchSummary()
  },

  setStartDate: (date) => {
    set({ startDate: date, timeRange: 'custom' })
    get().fetchEntries()
    get().fetchSummary()
  },

  setEndDate: (date) => {
    set({ endDate: date, timeRange: 'custom' })
    get().fetchEntries()
    get().fetchSummary()
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setTemplate: (tpl) => set({ template: tpl }),
  setProjectName: (name) => set({ projectName: name }),
  setExporterName: (name) => set({ exporterName: name }),

  fetchEntries: async () => {
    const { startDate, endDate } = get()
    set({ loading: true })
    try {
      const res = await fetch(`/api/entries?startDate=${startDate}&endDate=${endDate}`)
      const data = await res.json()
      set({ entries: data })
    } finally {
      set({ loading: false })
    }
  },

  addEntry: async (entry) => {
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      const data = await res.json()
      if (data.success) {
        get().fetchEntries()
        get().fetchSummary()
        return data.entry
      }
      return null
    } catch {
      return null
    }
  },

  deleteEntry: async (id) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        get().fetchEntries()
        get().fetchSummary()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  fetchSummary: async () => {
    const { startDate, endDate } = get()
    set({ loading: true })
    try {
      const res = await fetch(`/api/summary?startDate=${startDate}&endDate=${endDate}`)
      const data = await res.json()
      set({ summary: data })
    } finally {
      set({ loading: false })
    }
  },

  fetchCompletedItems: async () => {
    try {
      const res = await fetch('/api/completed')
      const data = await res.json()
      set({ completedItems: data })
    } catch {
      // ignore
    }
  },

  addCompletedItem: async (item) => {
    try {
      const res = await fetch('/api/completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      const data = await res.json()
      if (data.success) {
        get().fetchCompletedItems()
        get().fetchSummary()
        return data.item
      }
      return null
    } catch {
      return null
    }
  },

  updateCompletedItem: async (id, updates) => {
    try {
      const res = await fetch(`/api/completed/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.success) {
        get().fetchCompletedItems()
        get().fetchSummary()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  deleteCompletedItem: async (id) => {
    try {
      const res = await fetch(`/api/completed/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        get().fetchCompletedItems()
        get().fetchSummary()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  fetchBlockerItems: async () => {
    try {
      const res = await fetch('/api/blockers')
      const data = await res.json()
      set({ blockerItems: data })
    } catch {
      // ignore
    }
  },

  addBlockerItem: async (item) => {
    try {
      const res = await fetch('/api/blockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      const data = await res.json()
      if (data.success) {
        get().fetchBlockerItems()
        get().fetchSummary()
        return data.item
      }
      return null
    } catch {
      return null
    }
  },

  updateBlockerItem: async (id, updates) => {
    try {
      const res = await fetch(`/api/blockers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.success) {
        get().fetchBlockerItems()
        get().fetchSummary()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  deleteBlockerItem: async (id) => {
    try {
      const res = await fetch(`/api/blockers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        get().fetchBlockerItems()
        get().fetchSummary()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  exportReport: async () => {
    const { summary, template, projectName, exporterName, startDate, endDate } = get()
    if (!summary) return null
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, template, projectName, exporterName, startDate, endDate }),
      })
      const data = await res.json()
      return data.html as string
    } catch {
      return null
    }
  },
}))
