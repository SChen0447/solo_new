import { create } from 'zustand'

export type MaterialType = 'matte-metal' | 'glossy-plastic' | 'carbon-fiber' | 'leather'

export type ColorScheme = 'classic-black' | 'space-silver' | 'flame-red' | 'ocean-blue' | 'forest-green' | 'sunrise-gold'

export type ViewPreset = 'front' | 'back' | 'left' | 'right' | 'top'

export interface MaterialConfig {
  roughness: number
  metalness: number
  name: string
  label: string
  hasTexture: boolean
}

export interface ColorConfig {
  hex: string
  label: string
  gradientStart: string
  gradientEnd: string
}

export const MATERIALS: Record<MaterialType, MaterialConfig> = {
  'matte-metal': { roughness: 0.5, metalness: 0.9, name: 'matte-metal', label: '磨砂金属', hasTexture: false },
  'glossy-plastic': { roughness: 0.1, metalness: 0.2, name: 'glossy-plastic', label: '亮面塑料', hasTexture: false },
  'carbon-fiber': { roughness: 0.8, metalness: 0.3, name: 'carbon-fiber', label: '碳纤维', hasTexture: true },
  'leather': { roughness: 0.9, metalness: 0.1, name: 'leather', label: '皮革', hasTexture: true },
}

export const COLOR_SCHEMES: Record<ColorScheme, ColorConfig> = {
  'classic-black': { hex: '#1a1a1a', label: '经典黑', gradientStart: '#0a0a0a', gradientEnd: '#2a2a2a' },
  'space-silver': { hex: '#c0c0c0', label: '太空银', gradientStart: '#8a8a8a', gradientEnd: '#e8e8e8' },
  'flame-red': { hex: '#e63946', label: '烈焰红', gradientStart: '#8b0000', gradientEnd: '#ff6b35' },
  'ocean-blue': { hex: '#1d3557', label: '海洋蓝', gradientStart: '#0d1b2a', gradientEnd: '#3a86ff' },
  'forest-green': { hex: '#2d6a4f', label: '森林绿', gradientStart: '#1b4332', gradientEnd: '#52b788' },
  'sunrise-gold': { hex: '#d4a017', label: '日出金', gradientStart: '#8b6914', gradientEnd: '#f4d03f' },
}

export interface GestureState {
  isControlling: boolean
  gestureMode: 'idle' | 'rotating' | 'pinching'
  palmX: number
  palmY: number
  pinchDistance: number
  ringBrightness: number
}

interface Store {
  material: MaterialType
  colorScheme: ColorScheme
  viewPreset: ViewPreset
  autoRotate: boolean
  gesture: GestureState
  setMaterial: (m: MaterialType) => void
  setColorScheme: (c: ColorScheme) => void
  setViewPreset: (v: ViewPreset) => void
  setAutoRotate: (v: boolean) => void
  setGesture: (g: Partial<GestureState>) => void
  triggerPosterGeneration: boolean
  setTriggerPosterGeneration: (v: boolean) => void
}

export const useStore = create<Store>((set) => ({
  material: 'matte-metal',
  colorScheme: 'classic-black',
  viewPreset: 'front',
  autoRotate: true,
  gesture: {
    isControlling: false,
    gestureMode: 'idle',
    palmX: 0,
    palmY: 0,
    pinchDistance: 0,
    ringBrightness: 0,
  },
  triggerPosterGeneration: false,
  setMaterial: (m) => set({ material: m }),
  setColorScheme: (c) => set({ colorScheme: c }),
  setViewPreset: (v) => set({ viewPreset: v, autoRotate: false }),
  setAutoRotate: (v) => set({ autoRotate: v }),
  setGesture: (g) => set((state) => ({ gesture: { ...state.gesture, ...g } })),
  setTriggerPosterGeneration: (v) => set({ triggerPosterGeneration: v }),
}))
