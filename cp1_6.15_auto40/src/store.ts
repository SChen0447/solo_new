import { create } from 'zustand'

export interface FacialExpressions {
  mouthOpen: number
  leftBrowHeight: number
  rightBrowHeight: number
  mouthCurve: number
  leftEyeClosed: number
  rightEyeClosed: number
}

export interface ExpressionWeights {
  mouthOpen: number
  browHeight: number
  mouthCurve: number
  eyeClosed: number
}

export type ColorTheme = 'nebula' | 'fire' | 'emerald'

export interface ParticleState {
  count: number
  colorTheme: ColorTheme
}

export interface AppState {
  expressions: FacialExpressions
  expressionWeights: ExpressionWeights
  particleState: ParticleState
  landmarks: Array<{ x: number; y: number }> | null
  isCameraActive: boolean
  isFaceDetected: boolean
  fps: number
  updateExpressions: (expr: Partial<FacialExpressions>) => void
  updateExpressionWeight: (key: keyof ExpressionWeights, value: number) => void
  updateParticleCount: (count: number) => void
  updateColorTheme: (theme: ColorTheme) => void
  setLandmarks: (points: Array<{ x: number; y: number }> | null) => void
  setCameraActive: (active: boolean) => void
  setFaceDetected: (detected: boolean) => void
  setFps: (fps: number) => void
  resetExpressions: () => void
}

const defaultExpressions: FacialExpressions = {
  mouthOpen: 0,
  leftBrowHeight: 0.5,
  rightBrowHeight: 0.5,
  mouthCurve: 0.5,
  leftEyeClosed: 0,
  rightEyeClosed: 0,
}

const defaultWeights: ExpressionWeights = {
  mouthOpen: 1,
  browHeight: 1,
  mouthCurve: 1,
  eyeClosed: 1,
}

export const colorPalettes: Record<ColorTheme, string[]> = {
  nebula: [
    '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
    '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140',
    '#30cfd0', '#a8edea'
  ],
  fire: [
    '#ff0844', '#ffb199', '#f09819', '#edde5d', '#ff512f',
    '#dd2476', '#ff6e7f', '#bfe9ff', '#fc466b', '#3f5efb',
    '#f12711', '#f5af19'
  ],
  emerald: [
    '#11998e', '#38ef7d', '#56ab2f', '#a8e063', '#00b09b',
    '#96c93d', '#2af598', '#009efd', '#43cea2', '#185a9d',
    '#02aab0', '#00cdac'
  ]
}

export const useAppStore = create<AppState>((set) => ({
  expressions: { ...defaultExpressions },
  expressionWeights: { ...defaultWeights },
  particleState: {
    count: 2000,
    colorTheme: 'nebula'
  },
  landmarks: null,
  isCameraActive: false,
  isFaceDetected: false,
  fps: 60,

  updateExpressions: (expr) => set((state) => ({
    expressions: { ...state.expressions, ...expr }
  })),

  updateExpressionWeight: (key, value) => set((state) => ({
    expressionWeights: { ...state.expressionWeights, [key]: value }
  })),

  updateParticleCount: (count) => set((state) => ({
    particleState: { ...state.particleState, count }
  })),

  updateColorTheme: (theme) => set((state) => ({
    particleState: { ...state.particleState, colorTheme: theme }
  })),

  setLandmarks: (points) => set({ landmarks: points }),

  setCameraActive: (active) => set({ isCameraActive: active }),

  setFaceDetected: (detected) => set({ isFaceDetected: detected }),

  setFps: (fps) => set({ fps }),

  resetExpressions: () => set({
    expressions: { ...defaultExpressions }
  })
}))
