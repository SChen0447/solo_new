import { create } from 'zustand'

interface User {
  id: string
  name: string
  avatar: string
  role: 'member' | 'trainer' | 'admin'
}

interface Toast {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

interface AppState {
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  toasts: Toast[]
  addToast: (message: string, type?: 'error' | 'success' | 'info') => void
  removeToast: (id: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  currentUser: { id: 'm1', name: '周小明', avatar: '', role: 'member' },
  setCurrentUser: (user) => set({ currentUser: user }),
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now().toString()
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 3000)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
