import { create } from 'zustand'

export type PaletteMode =
  | 'nes'
  | 'gameboy'
  | 'sunny'
  | 'cyberpunk'
  | 'retro'
  | 'watercolor'
  | 'grayscale'
  | 'custom'

export interface RawImage {
  id: string
  name: string
  url: string
  width: number
  height: number
}

export const PRESET_PALETTES: Record<Exclude<PaletteMode, 'custom'>, string[]> = {
  nes: ['#000000', '#FCFCFC', '#F8F8F8', '#BCBCBC', '#7C7C7C', '#A4E4FC', '#3CBCFC', '#0078F8'],
  gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  sunny: [
    '#FFE5B4', '#FFDAB9', '#FFCBA4', '#F4A460',
    '#DEB887', '#D2B48C', '#C19A6B', '#8B7355',
    '#FF8C42', '#FF6347', '#FF4500', '#DC143C',
    '#FFD700', '#FFA500', '#FF8C00', '#CD853F'
  ],
  cyberpunk: [
    '#0D0221', '#0F084B', '#26408B', '#A6CFD5',
    '#C2E7D9', '#FF003C', '#FF00FF', '#00FFFF',
    '#FFFF00', '#39FF14', '#FF1493', '#00CED1'
  ],
  retro: ['#2C1810', '#5C3D2E', '#B98B58', '#EFD6AC', '#8B4513', '#A0522D', '#D2691E', '#F4A460'],
  watercolor: [
    '#E8D4D4', '#F2C4CE', '#F7A8B8', '#F4978E',
    '#F08080', '#CD853F', '#DEB887', '#F5DEB3',
    '#98D8C8', '#7BC8A4', '#87CEEB', '#ADD8E6'
  ],
  grayscale: ['#000000', '#242424', '#484848', '#6C6C6C', '#909090', '#B4B4B4', '#D8D8D8', '#FFFFFF']
}

export const FPS_OPTIONS = [5, 8, 10, 15] as const

interface AppState {
  rawImageList: RawImage[]
  pixelSizePerFrame: number[]
  paletteMode: PaletteMode
  paletteModePerFrame: PaletteMode[]
  paletteColors: string[]
  paletteColorsPerFrame: string[][]
  fps: typeof FPS_OPTIONS[number]
  isPlaying: boolean
  currentFrameIndex: number
  collapsedPanels: Record<string, boolean>
  exportProgress: number
  isExporting: boolean
  gifLoopForever: boolean

  addImage: (image: RawImage) => void
  removeImage: (id: string) => void
  setPixelSize: (frameIndex: number, size: number) => void
  setGlobalPixelSize: (size: number) => void
  setPaletteMode: (mode: PaletteMode) => void
  setPaletteModeForFrame: (frameIndex: number, mode: PaletteMode) => void
  setPaletteColor: (index: number, color: string) => void
  setPaletteColorForFrame: (frameIndex: number, colorIndex: number, color: string) => void
  setFps: (fps: typeof FPS_OPTIONS[number]) => void
  togglePlaying: () => void
  setCurrentFrame: (index: number) => void
  togglePanel: (panel: string) => void
  setExportProgress: (progress: number) => void
  setIsExporting: (exporting: boolean) => void
  setGifLoopForever: (loop: boolean) => void
  getPaletteForFrame: (frameIndex: number) => string[]
  getPixelSizeForFrame: (frameIndex: number) => number
}

const generateId = () => Math.random().toString(36).substr(2, 9)

const DEFAULT_PIXEL_SIZE = 8

export const useAppStore = create<AppState>((set, get) => ({
  rawImageList: [],
  pixelSizePerFrame: [],
  paletteMode: 'nes',
  paletteModePerFrame: [],
  paletteColors: [...PRESET_PALETTES.nes],
  paletteColorsPerFrame: [],
  fps: 10,
  isPlaying: false,
  currentFrameIndex: 0,
  collapsedPanels: { upload: false, pixel: false, palette: false, animation: false },
  exportProgress: 0,
  isExporting: false,
  gifLoopForever: true,

  addImage: (image) =>
    set((state) => {
      const newList = [...state.rawImageList, { ...image, id: image.id || generateId() }]
      return {
        rawImageList: newList,
        pixelSizePerFrame: [...state.pixelSizePerFrame, DEFAULT_PIXEL_SIZE],
        paletteModePerFrame: [...state.paletteModePerFrame, state.paletteMode],
        paletteColorsPerFrame: [...state.paletteColorsPerFrame, [...state.paletteColors]],
        currentFrameIndex: newList.length - 1
      }
    }),

  removeImage: (id) =>
    set((state) => {
      const idx = state.rawImageList.findIndex((img) => img.id === id)
      if (idx === -1) return {}
      const newList = state.rawImageList.filter((_, i) => i !== idx)
      return {
        rawImageList: newList,
        pixelSizePerFrame: state.pixelSizePerFrame.filter((_, i) => i !== idx),
        paletteModePerFrame: state.paletteModePerFrame.filter((_, i) => i !== idx),
        paletteColorsPerFrame: state.paletteColorsPerFrame.filter((_, i) => i !== idx),
        currentFrameIndex:
          newList.length === 0
            ? 0
            : Math.min(state.currentFrameIndex, newList.length - 1),
        isPlaying: newList.length < 2 ? false : state.isPlaying
      }
    }),

  setPixelSize: (frameIndex, size) =>
    set((state) => {
      const newSizes = [...state.pixelSizePerFrame]
      newSizes[frameIndex] = size
      return { pixelSizePerFrame: newSizes }
    }),

  setGlobalPixelSize: (size) =>
    set((state) => ({
      pixelSizePerFrame: state.rawImageList.map(() => size)
    })),

  setPaletteMode: (mode) =>
    set((state) => {
      const colors = mode === 'custom' ? state.paletteColors : [...PRESET_PALETTES[mode]]
      return {
        paletteMode: mode,
        paletteColors: colors,
        paletteModePerFrame: state.rawImageList.map(() => mode),
        paletteColorsPerFrame: state.rawImageList.map(() => [...colors])
      }
    }),

  setPaletteModeForFrame: (frameIndex, mode) =>
    set((state) => {
      const newModes = [...state.paletteModePerFrame]
      const newColors = [...state.paletteColorsPerFrame]
      newModes[frameIndex] = mode
      newColors[frameIndex] =
        mode === 'custom' ? newColors[frameIndex] : [...PRESET_PALETTES[mode]]
      return { paletteModePerFrame: newModes, paletteColorsPerFrame: newColors }
    }),

  setPaletteColor: (index, color) =>
    set((state) => {
      const newColors = [...state.paletteColors]
      newColors[index] = color
      return {
        paletteColors: newColors,
        paletteMode: 'custom',
        paletteModePerFrame: state.rawImageList.map(() => 'custom'),
        paletteColorsPerFrame: state.rawImageList.map(() => [...newColors])
      }
    }),

  setPaletteColorForFrame: (frameIndex, colorIndex, color) =>
    set((state) => {
      const newColors = state.paletteColorsPerFrame.map((c) => [...c])
      newColors[frameIndex][colorIndex] = color
      const newModes = [...state.paletteModePerFrame]
      newModes[frameIndex] = 'custom'
      return { paletteColorsPerFrame: newColors, paletteModePerFrame: newModes }
    }),

  setFps: (fps) => set({ fps }),

  togglePlaying: () =>
    set((state) => ({
      isPlaying: state.rawImageList.length >= 2 ? !state.isPlaying : false
    })),

  setCurrentFrame: (index) => set({ currentFrameIndex: index }),

  togglePanel: (panel) =>
    set((state) => ({
      collapsedPanels: {
        ...state.collapsedPanels,
        [panel]: !state.collapsedPanels[panel]
      }
    })),

  setExportProgress: (progress) => set({ exportProgress: progress }),

  setIsExporting: (exporting) => set({ isExporting: exporting, exportProgress: exporting ? 0 : 100 }),

  setGifLoopForever: (loop) => set({ gifLoopForever: loop }),

  getPaletteForFrame: (frameIndex) => {
    const state = get()
    if (state.rawImageList.length === 0) return state.paletteColors
    return state.paletteColorsPerFrame[frameIndex] || state.paletteColors
  },

  getPixelSizeForFrame: (frameIndex) => {
    const state = get()
    if (state.rawImageList.length === 0) return DEFAULT_PIXEL_SIZE
    return state.pixelSizePerFrame[frameIndex] || DEFAULT_PIXEL_SIZE
  }
}))
