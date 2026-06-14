import { create } from 'zustand'

interface UIStore {
  currentPage: 'interaction' | 'collection' | 'checkin'
  showDecorationModal: boolean
  decoratingCreatureId: string | null
  setPage: (page: UIStore['currentPage']) => void
  openDecorationModal: (creatureId: string) => void
  closeDecorationModal: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  currentPage: 'interaction',
  showDecorationModal: false,
  decoratingCreatureId: null,

  setPage: (page) => set({ currentPage: page }),
  openDecorationModal: (creatureId) => set({ showDecorationModal: true, decoratingCreatureId: creatureId }),
  closeDecorationModal: () => set({ showDecorationModal: false, decoratingCreatureId: null }),
}))
