import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  GeologicalLayerData,
  AnnotationData,
  ViewportState,
  SavedViewpoint,
  PerformanceMode,
} from './types'
import { generateLayerData } from './data'

interface GeoStore {
  layers: GeologicalLayerData[]
  annotations: AnnotationData[]
  viewport: ViewportState
  selectedLayerId: string | null
  hoveredLayerId: string | null
  savedViewpoints: SavedViewpoint[]
  performanceMode: PerformanceMode
  fps: number
  sliceEnabled: boolean
  showAnnotationBubble: string | null
  animatingCamera: boolean

  setLayers: (layers: GeologicalLayerData[]) => void
  selectLayer: (id: string | null) => void
  hoverLayer: (id: string | null) => void
  addAnnotation: (annotation: Omit<AnnotationData, 'id' | 'createdAt'>) => void
  removeAnnotation: (id: string) => void
  setSliceX: (value: number) => void
  setSliceZ: (value: number) => void
  setSliceEnabled: (enabled: boolean) => void
  setCameraPosition: (pos: [number, number, number]) => void
  setViewport: (viewport: Partial<ViewportState>) => void
  saveViewpoint: (name: string, thumbnail: string) => void
  removeViewpoint: (id: string) => void
  setFps: (fps: number) => void
  setPerformanceMode: (mode: PerformanceMode) => void
  setShowAnnotationBubble: (id: string | null) => void
  setAnimatingCamera: (animating: boolean) => void
  resetView: () => void
}

const INITIAL_CAMERA: [number, number, number] = [8, 6, 8]

export const useGeoStore = create<GeoStore>((set, get) => ({
  layers: generateLayerData(),
  annotations: [],
  viewport: {
    cameraPosition: INITIAL_CAMERA,
    sliceX: 2.5,
    sliceZ: 2.5,
    selectedLayerId: null,
  },
  selectedLayerId: null,
  hoveredLayerId: null,
  savedViewpoints: [],
  performanceMode: 'normal',
  fps: 60,
  sliceEnabled: false,
  showAnnotationBubble: null,
  animatingCamera: false,

  setLayers: (layers) => set({ layers }),

  selectLayer: (id) => {
    set({ selectedLayerId: id })
    set((state) => ({
      viewport: { ...state.viewport, selectedLayerId: id },
    }))
  },

  hoverLayer: (id) => set({ hoveredLayerId: id }),

  addAnnotation: (annotation) => {
    const newAnnotation: AnnotationData = {
      ...annotation,
      id: uuidv4(),
      createdAt: Date.now(),
    }
    set((state) => ({
      annotations: [newAnnotation, ...state.annotations],
    }))
  },

  removeAnnotation: (id) => {
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
    }))
  },

  setSliceX: (value) => {
    set((state) => ({
      viewport: { ...state.viewport, sliceX: value },
    }))
  },

  setSliceZ: (value) => {
    set((state) => ({
      viewport: { ...state.viewport, sliceZ: value },
    }))
  },

  setSliceEnabled: (enabled) => set({ sliceEnabled: enabled }),

  setCameraPosition: (pos) => {
    set((state) => ({
      viewport: { ...state.viewport, cameraPosition: pos },
    }))
  },

  setViewport: (partial) => {
    set((state) => ({
      viewport: { ...state.viewport, ...partial },
    }))
  },

  saveViewpoint: (name, thumbnail) => {
    const state = get()
    if (state.savedViewpoints.length >= 3) return
    const viewpoint: SavedViewpoint = {
      id: uuidv4(),
      name,
      cameraPosition: [...state.viewport.cameraPosition],
      sliceX: state.viewport.sliceX,
      sliceZ: state.viewport.sliceZ,
      selectedLayerId: state.selectedLayerId,
      thumbnail,
    }
    set((state) => ({
      savedViewpoints: [...state.savedViewpoints, viewpoint],
    }))
  },

  removeViewpoint: (id) => {
    set((state) => ({
      savedViewpoints: state.savedViewpoints.filter((v) => v.id !== id),
    }))
  },

  setFps: (fps) => {
    set({ fps })
    if (fps < 30 && get().performanceMode !== 'optimized') {
      set({ performanceMode: 'optimized' })
    } else if (fps >= 30 && get().performanceMode !== 'normal') {
      set({ performanceMode: 'normal' })
    }
  },

  setPerformanceMode: (mode) => set({ performanceMode: mode }),

  setShowAnnotationBubble: (id) => set({ showAnnotationBubble: id }),

  setAnimatingCamera: (animating) => set({ animatingCamera: animating }),

  resetView: () => {
    set({
      viewport: {
        cameraPosition: INITIAL_CAMERA,
        sliceX: 2.5,
        sliceZ: 2.5,
        selectedLayerId: null,
      },
      selectedLayerId: null,
      sliceEnabled: false,
      animatingCamera: true,
    })
    setTimeout(() => set({ animatingCamera: false }), 1100)
  },
}))
