import { create } from 'zustand'

export type PatternType = 'rotatingSnake' | 'hermannGrid' | 'scintillatingGrid'

export interface PatternParams {
  speed: number
  density: number
  colorShift: number
}

interface IllusionState {
  currentPattern: PatternType
  params: PatternParams
  setCurrentPattern: (pattern: PatternType) => void
  setSpeed: (speed: number) => void
  setDensity: (density: number) => void
  setColorShift: (colorShift: number) => void
  setParams: (params: Partial<PatternParams>) => void
}

export const patternNames: Record<PatternType, string> = {
  rotatingSnake: '旋转蛇',
  hermannGrid: '赫曼栅格',
  scintillatingGrid: '闪烁光点阵'
}

export const useIllusionStore = create<IllusionState>((set) => ({
  currentPattern: 'rotatingSnake',
  params: {
    speed: 5,
    density: 15,
    colorShift: 0
  },
  setCurrentPattern: (pattern) => set({ currentPattern: pattern }),
  setSpeed: (speed) => set((state) => ({ params: { ...state.params, speed } })),
  setDensity: (density) => set((state) => ({ params: { ...state.params, density } })),
  setColorShift: (colorShift) => set((state) => ({ params: { ...state.params, colorShift } })),
  setParams: (newParams) => set((state) => ({ params: { ...state.params, ...newParams } }))
}))
