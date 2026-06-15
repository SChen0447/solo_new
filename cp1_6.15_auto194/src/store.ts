import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import eventBus from './eventBus'

export interface StrokePoint {
  x: number
  y: number
  timestamp: number
}

export interface Stroke {
  id: string
  color: string
  size: number
  points: StrokePoint[]
}

export interface Artwork {
  id: string
  title: string
  imageData: string
  thumbnail: string
  strokes: Stroke[]
  createdAt: number
  likes: number
  ratings: number[]
  author: string
  isTemplate: boolean
}

interface GraffitiStore {
  currentColor: string
  currentSize: number
  strokes: Stroke[]
  currentStroke: Stroke | null
  artworks: Artwork[]
  templateId: string | null
  setColor: (color: string) => void
  setSize: (size: number) => void
  startStroke: (x: number, y: number) => void
  addPointToStroke: (x: number, y: number) => void
  endStroke: () => void
  clearCanvas: () => void
  saveArtwork: (imageData: string, thumbnail: string, title?: string) => void
  deleteArtwork: (id: string) => void
  setTemplate: (id: string | null) => void
  loadStrokes: (strokes: Stroke[]) => void
  likeArtwork: (id: string) => void
  rateArtwork: (id: string, rating: number) => void
  submitToGallery: (id: string) => void
}

const PRESET_COLORS = [
  '#ff00ff', '#ff6600', '#00ffff', '#ff0066', '#33ff33',
  '#ffff00', '#ff3300', '#9900ff', '#00ff99', '#ff9900',
  '#0066ff', '#ff0099', '#ccff00', '#6600ff', '#00ffcc',
  '#ffcc00', '#ff0033', '#00ccff', '#ff66ff', '#66ff66',
  '#ffffff', '#000000', '#333333', '#666666', '#999999',
  '#cccccc', '#8B4513', '#228B22', '#4169E1', '#DC143C',
  '#FF1493', '#00CED1'
]

export { PRESET_COLORS }

export const useGraffitiStore = create<GraffitiStore>((set, get) => ({
  currentColor: '#ff00ff',
  currentSize: 16,
  strokes: [],
  currentStroke: null,
  artworks: [],
  templateId: null,

  setColor: (color: string) => set({ currentColor: color }),

  setSize: (size: number) => set({ currentSize: size }),

  startStroke: (x: number, y: number) => {
    const { currentColor, currentSize } = get()
    const stroke: Stroke = {
      id: uuidv4(),
      color: currentColor,
      size: currentSize,
      points: [{ x, y, timestamp: Date.now() }]
    }
    set({ currentStroke: stroke })
  },

  addPointToStroke: (x: number, y: number) => {
    const { currentStroke } = get()
    if (!currentStroke) return
    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, { x, y, timestamp: Date.now() }]
    }
    set({ currentStroke: updatedStroke })
  },

  endStroke: () => {
    const { currentStroke, strokes } = get()
    if (!currentStroke) return
    set({
      strokes: [...strokes, currentStroke],
      currentStroke: null
    })
  },

  clearCanvas: () => set({ strokes: [], currentStroke: null }),

  saveArtwork: (imageData: string, thumbnail: string, title?: string) => {
    const { strokes } = get()
    const artwork: Artwork = {
      id: uuidv4(),
      title: title || `作品 ${new Date().toLocaleString('zh-CN')}`,
      imageData,
      thumbnail,
      strokes: JSON.parse(JSON.stringify(strokes)),
      createdAt: Date.now(),
      likes: 0,
      ratings: [],
      author: '匿名艺术家',
      isTemplate: false
    }
    set((state) => ({
      artworks: [artwork, ...state.artworks]
    }))
    eventBus.emit('artwork:saved', artwork)
  },

  deleteArtwork: (id: string) => {
    set((state) => ({
      artworks: state.artworks.filter((a) => a.id !== id),
      templateId: state.templateId === id ? null : state.templateId
    }))
  },

  setTemplate: (id: string | null) => {
    set({ templateId: id })
  },

  loadStrokes: (strokes: Stroke[]) => {
    set({ strokes: JSON.parse(JSON.stringify(strokes)), currentStroke: null })
  },

  likeArtwork: (id: string) => {
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === id ? { ...a, likes: a.likes + 1 } : a
      )
    }))
    eventBus.emit('artwork:liked', id)
  },

  rateArtwork: (id: string, rating: number) => {
    set((state) => ({
      artworks: state.artworks.map((a) =>
        a.id === id ? { ...a, ratings: [...a.ratings, rating] } : a
      )
    }))
    eventBus.emit('artwork:rated', { id, rating })
  },

  submitToGallery: (id: string) => {
    eventBus.emit('artwork:submitted', id)
  }
}))
