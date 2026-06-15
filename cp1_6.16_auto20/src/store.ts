import { create } from 'zustand'

interface AudioState {
  file: File | null
  fileName: string
  duration: number
  
  separationProgress: number
  isSeparating: boolean
  isSeparated: boolean
  
  originalWaveform: number[]
  vocalWaveform: number[]
  accompanimentWaveform: number[]
  
  vocalVolume: number
  accompanimentVolume: number
  
  qualityScore: number
  
  setFile: (file: File | null) => void
  setFileName: (name: string) => void
  setDuration: (duration: number) => void
  
  setOriginalWaveform: (data: number[]) => void
  setVocalWaveform: (data: number[]) => void
  setAccompanimentWaveform: (data: number[]) => void
  
  setVocalVolume: (volume: number) => void
  setAccompanimentVolume: (volume: number) => void
  
  startSeparation: () => void
  setSeparationProgress: (progress: number) => void
  completeSeparation: () => void
  
  setQualityScore: (score: number) => void
  
  reset: () => void
}

export const useAudioStore = create<AudioState>((set) => ({
  file: null,
  fileName: '',
  duration: 0,
  
  separationProgress: 0,
  isSeparating: false,
  isSeparated: false,
  
  originalWaveform: [],
  vocalWaveform: [],
  accompanimentWaveform: [],
  
  vocalVolume: 80,
  accompanimentVolume: 80,
  
  qualityScore: 0,
  
  setFile: (file) => set({ file }),
  setFileName: (name) => set({ fileName: name }),
  setDuration: (duration) => set({ duration }),
  
  setOriginalWaveform: (data) => set({ originalWaveform: data }),
  setVocalWaveform: (data) => set({ vocalWaveform: data }),
  setAccompanimentWaveform: (data) => set({ accompanimentWaveform: data }),
  
  setVocalVolume: (volume) => set({ vocalVolume: volume }),
  setAccompanimentVolume: (volume) => set({ accompanimentVolume: volume }),
  
  startSeparation: () => set({ isSeparating: true, separationProgress: 0, isSeparated: false }),
  setSeparationProgress: (progress) => set({ separationProgress: progress }),
  completeSeparation: () => set({ isSeparating: false, isSeparated: true, separationProgress: 100 }),
  
  setQualityScore: (score) => set({ qualityScore: score }),
  
  reset: () => set({
    file: null,
    fileName: '',
    duration: 0,
    separationProgress: 0,
    isSeparating: false,
    isSeparated: false,
    originalWaveform: [],
    vocalWaveform: [],
    accompanimentWaveform: [],
    qualityScore: 0,
  }),
}))
