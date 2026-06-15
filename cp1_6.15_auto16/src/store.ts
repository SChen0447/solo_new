import { create } from 'zustand'

export type GrowthStage = 'seed' | 'sprout' | 'seedling' | 'flowering'

export interface LeafData {
  id: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  color: string
}

export interface BranchData {
  id: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  length: number
  thickness: number
}

export interface FlowerData {
  id: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  color: string
  petalCount: number
  scale: number
}

export interface PlantStructure {
  stage: GrowthStage
  mainStemHeight: number
  mainStemThickness: number
  branches: BranchData[]
  leaves: LeafData[]
  flowers: FlowerData[]
  stageProgress: number
}

interface PlantState {
  light: number
  humidity: number
  temperature: number
  plantStructure: PlantStructure
  setLight: (value: number) => void
  setHumidity: (value: number) => void
  setTemperature: (value: number) => void
  setPlantStructure: (structure: PlantStructure) => void
  reset: () => void
}

const DEFAULT_PARAM = 50

const initialPlantStructure: PlantStructure = {
  stage: 'seed',
  mainStemHeight: 0,
  mainStemThickness: 0.15,
  branches: [],
  leaves: [],
  flowers: [],
  stageProgress: 0
}

export const usePlantStore = create<PlantState>((set) => ({
  light: DEFAULT_PARAM,
  humidity: DEFAULT_PARAM,
  temperature: DEFAULT_PARAM,
  plantStructure: initialPlantStructure,

  setLight: (value: number) => set({ light: Math.max(0, Math.min(100, value)) }),
  setHumidity: (value: number) => set({ humidity: Math.max(0, Math.min(100, value)) }),
  setTemperature: (value: number) => set({ temperature: Math.max(0, Math.min(100, value)) }),
  setPlantStructure: (structure: PlantStructure) => set({ plantStructure: structure }),

  reset: () => set({
    light: DEFAULT_PARAM,
    humidity: DEFAULT_PARAM,
    temperature: DEFAULT_PARAM,
    plantStructure: initialPlantStructure
  })
}))
