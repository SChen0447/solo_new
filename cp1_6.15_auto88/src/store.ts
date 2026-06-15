import { create } from 'zustand'

export type Priority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  name: string
  startDate: string
  endDate: string
  progress: number
  priority: Priority
  groupId: string
}

export interface Group {
  id: string
  name: string
  collapsed: boolean
}

interface StoreState {
  tasks: Task[]
  groups: Group[]
  leftWidth: number
  searchQuery: string
  progressFilter: [number, number]
  ocrLoading: boolean
  exporting: boolean
  editingTaskId: string | null

  addTask: (task: Task) => void
  addTasks: (tasks: Task[]) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  addGroup: (group: Group) => void
  toggleGroup: (id: string) => void
  removeGroup: (id: string) => void
  setLeftWidth: (width: number) => void
  setSearchQuery: (query: string) => void
  setProgressFilter: (range: [number, number]) => void
  setOcrLoading: (loading: boolean) => void
  setExporting: (exporting: boolean) => void
  setEditingTaskId: (id: string | null) => void
}

const defaultGroups: Group[] = [
  { id: 'default', name: '默认分组', collapsed: false },
]

export const useStore = create<StoreState>((set) => ({
  tasks: [],
  groups: defaultGroups,
  leftWidth: 50,
  searchQuery: '',
  progressFilter: [0, 100],
  ocrLoading: false,
  exporting: false,
  editingTaskId: null,

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),

  addTasks: (tasks) =>
    set((state) => ({ tasks: [...state.tasks, ...tasks] })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  addGroup: (group) =>
    set((state) => ({ groups: [...state.groups, group] })),

  toggleGroup: (id) =>
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === id ? { ...g, collapsed: !g.collapsed } : g
      ),
    })),

  removeGroup: (id) =>
    set((state) => ({ groups: state.groups.filter((g) => g.id !== id) })),

  setLeftWidth: (width) => set({ leftWidth: width }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setProgressFilter: (range) => set({ progressFilter: range }),
  setOcrLoading: (loading) => set({ ocrLoading: loading }),
  setExporting: (exporting) => set({ exporting }),
  setEditingTaskId: (id) => set({ editingTaskId: id }),
}))
