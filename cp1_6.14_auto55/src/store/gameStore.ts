import { create } from 'zustand'

export type ElementType = 'platform' | 'trap' | 'flag'

export interface LevelElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
}

export interface Notification {
  id: string
  type: 'success' | 'error'
  message: string
  dismissible: boolean
}

export type ToolType = 'platform' | 'trap' | 'flag'

interface GameState {
  elements: LevelElement[]
  selectedTool: ToolType
  isSimulationRunning: boolean
  isSimulationPaused: boolean
  simulationResetKey: number
  notifications: Notification[]
  addElement: (element: LevelElement) => void
  updateElement: (id: string, updates: Partial<LevelElement>) => void
  removeElement: (id: string) => void
  removeElements: (ids: string[]) => void
  clearElements: () => void
  setElements: (elements: LevelElement[]) => void
  setSelectedTool: (tool: ToolType) => void
  startSimulation: () => void
  pauseSimulation: () => void
  resumeSimulation: () => void
  stopSimulation: () => void
  resetSimulation: () => void
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
}

export const LEVEL_WIDTH = 2000
export const LEVEL_HEIGHT = 600

export const useGameStore = create<GameState>((set) => ({
  elements: [],
  selectedTool: 'platform',
  isSimulationRunning: false,
  isSimulationPaused: false,
  simulationResetKey: 0,
  notifications: [],

  addElement: (element) =>
    set((state) => ({ elements: [...state.elements, element] })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      )
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id)
    })),

  removeElements: (ids) =>
    set((state) => ({
      elements: state.elements.filter((el) => !ids.includes(el.id))
    })),

  clearElements: () => set({ elements: [] }),

  setElements: (elements) => set({ elements }),

  setSelectedTool: (tool) => set({ selectedTool: tool }),

  startSimulation: () =>
    set({ isSimulationRunning: true, isSimulationPaused: false }),

  pauseSimulation: () => set({ isSimulationPaused: true }),

  resumeSimulation: () => set({ isSimulationPaused: false }),

  stopSimulation: () =>
    set({ isSimulationRunning: false, isSimulationPaused: false }),

  resetSimulation: () =>
    set((state) => ({ simulationResetKey: state.simulationResetKey + 1 })),

  addNotification: (notification) => {
    const id = Math.random().toString(36).substring(2, 11)
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }]
    }))
    if (!notification.dismissible) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id)
        }))
      }, 3000)
    }
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }))
}))
