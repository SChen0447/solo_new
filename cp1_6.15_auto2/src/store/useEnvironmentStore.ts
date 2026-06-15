import { create } from 'zustand'
import type { EnvironmentParams, HoveredFishInfo } from '@/types'

interface EnvironmentStore extends EnvironmentParams {
  targetLightIntensity: number
  targetWaterTurbidity: number
  targetCurrentSpeed: number
  hoveredFish: HoveredFishInfo | null
  isPanelExpanded: boolean
  setLightIntensity: (value: number) => void
  setWaterTurbidity: (value: number) => void
  setCurrentSpeed: (value: number) => void
  setHoveredFish: (fish: HoveredFishInfo | null) => void
  togglePanel: () => void
  updateTransitions: (deltaTime: number) => void
}

const TRANSITION_DURATION = 0.5

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  lightIntensity: 60,
  waterTurbidity: 20,
  currentSpeed: 1.5,
  targetLightIntensity: 60,
  targetWaterTurbidity: 20,
  targetCurrentSpeed: 1.5,
  hoveredFish: null,
  isPanelExpanded: true,

  setLightIntensity: (value: number) => set({ targetLightIntensity: Math.max(0, Math.min(100, value)) }),
  setWaterTurbidity: (value: number) => set({ targetWaterTurbidity: Math.max(0, Math.min(100, value)) }),
  setCurrentSpeed: (value: number) => set({ targetCurrentSpeed: Math.max(0, Math.min(5, value)) }),
  setHoveredFish: (fish: HoveredFishInfo | null) => set({ hoveredFish: fish }),
  togglePanel: () => set((state) => ({ isPanelExpanded: !state.isPanelExpanded })),

  updateTransitions: (deltaTime: number) => {
    const state = get()
    const lerpFactor = Math.min(1, deltaTime / TRANSITION_DURATION)

    const newLightIntensity = state.lightIntensity + (state.targetLightIntensity - state.lightIntensity) * lerpFactor
    const newWaterTurbidity = state.waterTurbidity + (state.targetWaterTurbidity - state.waterTurbidity) * lerpFactor
    const newCurrentSpeed = state.currentSpeed + (state.targetCurrentSpeed - state.currentSpeed) * lerpFactor

    set({
      lightIntensity: newLightIntensity,
      waterTurbidity: newWaterTurbidity,
      currentSpeed: newCurrentSpeed
    })
  }
}))
