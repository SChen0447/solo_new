import { create } from 'zustand'
import {
  LightConfig,
  LightType,
  LightPosition,
  DEFAULT_LIGHT,
  PRESET_POSITIONS,
} from './types'

interface LightStore {
  lights: LightConfig[]
  selectedId: string
  addLight: (type: LightType) => void
  removeLight: (id: string) => void
  updateLight: (id: string, patch: Partial<LightConfig>) => void
  selectLight: (id: string) => void
  resetLights: () => void
}

let idCounter = 1
const nextId = () => `light-${Date.now()}-${idCounter++}`

export const useLightStore = create<LightStore>((set, get) => ({
  lights: [DEFAULT_LIGHT],
  selectedId: DEFAULT_LIGHT.id,

  addLight: (type: LightType) => {
    const lights = get().lights
    const usedPositions = lights.map((l) => JSON.stringify(l.position))
    let position: LightPosition | undefined

    for (const pos of PRESET_POSITIONS) {
      const key = JSON.stringify(pos)
      if (!usedPositions.includes(key)) {
        position = pos
        break
      }
    }

    if (!position) {
      position = {
        x: (Math.random() - 0.5) * 5,
        y: 2 + Math.random() * 1.5,
        z: (Math.random() - 0.5) * 5,
      }
    }

    const newLight: LightConfig = {
      id: nextId(),
      type,
      position,
      colorTemp: 4000,
      brightness: 60,
    }

    set((state) => ({
      lights: [...state.lights, newLight],
      selectedId: newLight.id,
    }))
  },

  removeLight: (id: string) => {
    set((state) => {
      const lights = state.lights.filter((l) => l.id !== id)
      if (lights.length === 0) {
        return { lights: [DEFAULT_LIGHT], selectedId: DEFAULT_LIGHT.id }
      }
      return {
        lights,
        selectedId: state.selectedId === id ? lights[0].id : state.selectedId,
      }
    })
  },

  updateLight: (id: string, patch: Partial<LightConfig>) => {
    set((state) => ({
      lights: state.lights.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }))
  },

  selectLight: (id: string) => {
    set({ selectedId: id })
  },

  resetLights: () => {
    set({ lights: [DEFAULT_LIGHT], selectedId: DEFAULT_LIGHT.id })
  },
}))
