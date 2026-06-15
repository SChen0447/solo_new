import { create } from 'zustand'
import { Part, PartType, PartColor, PartPosition } from '@/types'
import { generateId, snapPosition, checkVerticalSnap, getPartHeight } from '@/utils'

const MAX_HISTORY = 20

interface AppState {
  parts: Part[]
  selectedPartId: string | null
  selectedPartType: PartType
  selectedColor: PartColor
  history: Part[][]
  historyIndex: number
  gridSize: number
  isPartsPaletteOpen: boolean
  isRotating: boolean
  hoveredPartId: string | null
}

interface AppActions {
  addPart: (position: PartPosition) => void
  removePart: (id: string) => void
  updatePartPosition: (id: string, position: PartPosition) => void
  setSelectedPartId: (id: string | null) => void
  setSelectedPartType: (type: PartType) => void
  setSelectedColor: (color: PartColor) => void
  undo: () => void
  saveToHistory: () => void
  setPartsPaletteOpen: (open: boolean) => void
  togglePartsPalette: () => void
  setIsRotating: (rotating: boolean) => void
  setHoveredPartId: (id: string | null) => void
  calculateSnappedPosition: (rawPosition: PartPosition) => PartPosition
}

const initialParts: Part[] = []

export const useStore = create<AppState & AppActions>((set, get) => ({
  parts: initialParts,
  selectedPartId: null,
  selectedPartType: 'cube1x1',
  selectedColor: 'red',
  history: [initialParts],
  historyIndex: 0,
  gridSize: 32,
  isPartsPaletteOpen: true,
  isRotating: false,
  hoveredPartId: null,

  addPart: (position) => {
    const { selectedPartType, selectedColor, parts } = get()
    const snappedPos = snapPosition(position)
    const finalPos = checkVerticalSnap(snappedPos, parts, getPartHeight(selectedPartType))

    const newPart: Part = {
      id: generateId(),
      type: selectedPartType,
      color: selectedColor,
      position: finalPos,
      isAnimating: true,
    }

    set((state) => {
      const newParts = [...state.parts, newPart]
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(newParts)
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
      }
      return {
        parts: newParts,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })

    setTimeout(() => {
      set((state) => ({
        parts: state.parts.map((p) =>
          p.id === newPart.id ? { ...p, isAnimating: false } : p
        ),
      }))
    }, 300)
  },

  removePart: (id) => {
    set((state) => {
      const newParts = state.parts.filter((p) => p.id !== id)
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(newParts)
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
      }
      return {
        parts: newParts,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        selectedPartId: state.selectedPartId === id ? null : state.selectedPartId,
      }
    })
  },

  updatePartPosition: (id, position) => {
    set((state) => ({
      parts: state.parts.map((p) =>
        p.id === id ? { ...p, position: snapPosition(position) } : p
      ),
    }))
  },

  setSelectedPartId: (id) => set({ selectedPartId: id }),

  setSelectedPartType: (type) => set({ selectedPartType: type }),

  setSelectedColor: (color) => set({ selectedColor: color }),

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      set({
        parts: history[historyIndex - 1],
        historyIndex: historyIndex - 1,
        selectedPartId: null,
      })
    }
  },

  saveToHistory: () => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(state.parts)
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
      }
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    })
  },

  setPartsPaletteOpen: (open) => set({ isPartsPaletteOpen: open }),

  togglePartsPalette: () => set((state) => ({ isPartsPaletteOpen: !state.isPartsPaletteOpen })),

  setIsRotating: (rotating) => set({ isRotating: rotating }),

  setHoveredPartId: (id) => set({ hoveredPartId: id }),

  calculateSnappedPosition: (rawPosition) => {
    const { parts, selectedPartType } = get()
    const snapped = snapPosition(rawPosition)
    return checkVerticalSnap(snapped, parts, getPartHeight(selectedPartType))
  },
}))
