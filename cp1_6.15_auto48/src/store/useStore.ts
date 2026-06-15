import { create } from 'zustand'

export type BandType = 'alpha' | 'beta' | 'theta' | 'delta'

export interface BandData {
  alpha: number
  beta: number
  theta: number
  delta: number
}

export type ViewMode = 'front' | 'top' | 'orbit'

interface EEGState {
  bandData: BandData
  speedMultiplier: number
  viewMode: ViewMode
  fps: number
  cubeCount: number
  setBandData: (data: Partial<BandData>) => void
  setSpeedMultiplier: (speed: number) => void
  setViewMode: (mode: ViewMode) => void
  setFps: (fps: number) => void
  setCubeCount: (count: number) => void
}

export const useEEGStore = create<EEGState>((set) => ({
  bandData: {
    alpha: 0.5,
    beta: 0.5,
    theta: 0.5,
    delta: 0.5
  },
  speedMultiplier: 1,
  viewMode: 'front',
  fps: 60,
  cubeCount: 2000,
  setBandData: (data) =>
    set((state) => ({
      bandData: { ...state.bandData, ...data }
    })),
  setSpeedMultiplier: (speed) => set({ speedMultiplier: speed }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFps: (fps) => set({ fps }),
  setCubeCount: (count) => set({ cubeCount: count })
}))

export const BAND_COLORS: Record<BandType, string> = {
  alpha: '#4a90e2',
  beta: '#e67e22',
  theta: '#27ae60',
  delta: '#8e44ad'
}

export const BAND_LABELS: Record<BandType, string> = {
  alpha: 'Alpha',
  beta: 'Beta',
  theta: 'Theta',
  delta: 'Delta'
}
