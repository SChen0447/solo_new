import { create } from 'zustand'

export interface Point {
  x: number
  y: number
  z?: number
}

export type EmotionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'fear' | 'neutral'
export type StyleType = 'minimal' | 'romantic' | 'fantasy'

export const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#ff6b6b',
  sad: '#4ecdc4',
  angry: '#ff4500',
  surprised: '#ffe66d',
  fear: '#6c5ce7',
  neutral: '#dfe6e9',
}

export const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  surprised: '惊讶',
  fear: '害怕',
  neutral: '中性',
}

interface AppState {
  emotion: EmotionType
  confidence: number
  intensity: number
  style: StyleType
  uploadedImage: string | null
  faceLandmarks: Point[]
  isAnalyzing: boolean

  updateEmotion: (emotion: EmotionType, confidence: number) => void
  setIntensity: (intensity: number) => void
  setStyle: (style: StyleType) => void
  setUploadedImage: (image: string | null) => void
  setFaceLandmarks: (landmarks: Point[]) => void
  setIsAnalyzing: (analyzing: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  emotion: 'neutral',
  confidence: 0,
  intensity: 50,
  style: 'minimal',
  uploadedImage: null,
  faceLandmarks: [],
  isAnalyzing: false,

  updateEmotion: (emotion, confidence) => set({ emotion, confidence }),
  setIntensity: (intensity) => set({ intensity }),
  setStyle: (style) => set({ style }),
  setUploadedImage: (uploadedImage) => set({ uploadedImage }),
  setFaceLandmarks: (faceLandmarks) => set({ faceLandmarks }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
}))
