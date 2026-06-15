import { create } from 'zustand'
import type {
  FilterType,
  FrameType,
  WatermarkPosition,
} from '@/types'
import { loadImageFromFile, exportHDImage, downloadBlob } from '@/modules/imageEngine'
import { v4 as uuidv4 } from 'uuid'

interface EditorState {
  originalImage: HTMLImageElement | null
  originalImageDataUrl: string | null
  imageName: string
  imageWidth: number
  imageHeight: number

  currentFilter: FilterType
  filterIntensity: number

  currentFrame: FrameType
  frameOpacity: number

  watermarkText: string
  watermarkOpacity: number
  watermarkPosition: WatermarkPosition

  isExporting: boolean
  exportProgress: number
  uploadError: string | null
  isDragging: boolean

  collapsedPanels: Record<string, boolean>
  rightPanelCollapsed: boolean

  previewVersion: number

  setOriginalImage: (file: File) => Promise<void>
  clearImage: () => void
  setFilter: (f: FilterType) => void
  setFilterIntensity: (v: number) => void
  setFrame: (f: FrameType) => void
  setFrameOpacity: (v: number) => void
  setWatermarkText: (t: string) => void
  setWatermarkOpacity: (v: number) => void
  setWatermarkPosition: (p: WatermarkPosition) => void
  togglePanel: (key: string) => void
  toggleRightPanel: () => void
  setDragging: (v: boolean) => void
  clearUploadError: () => void
  exportImage: () => Promise<void>
  bumpPreview: () => void
}

const initialCollapsed = {
  filter: false,
  frame: false,
  watermark: false,
}

export const useEditorStore = create<EditorState>((set, get) => ({
  originalImage: null,
  originalImageDataUrl: null,
  imageName: '',
  imageWidth: 0,
  imageHeight: 0,

  currentFilter: 'none',
  filterIntensity: 0.8,

  currentFrame: 'none',
  frameOpacity: 1.0,

  watermarkText: '',
  watermarkOpacity: 0.6,
  watermarkPosition: 'br',

  isExporting: false,
  exportProgress: 0,
  uploadError: null,
  isDragging: false,

  collapsedPanels: initialCollapsed,
  rightPanelCollapsed: false,
  previewVersion: 0,

  setOriginalImage: async (file: File) => {
    try {
      set({ uploadError: null })
      const result = await loadImageFromFile(file)
      set({
        originalImage: result.element,
        originalImageDataUrl: result.dataUrl,
        imageName: file.name || `image-${uuidv4().slice(0, 8)}.png`,
        imageWidth: result.width,
        imageHeight: result.height,
        previewVersion: Date.now(),
      })
    } catch (e) {
      set({
        uploadError: e instanceof Error ? e.message : '图片加载失败',
      })
    }
  },

  clearImage: () =>
    set({
      originalImage: null,
      originalImageDataUrl: null,
      imageName: '',
      imageWidth: 0,
      imageHeight: 0,
      previewVersion: Date.now(),
    }),

  setFilter: (f) => set({ currentFilter: f, previewVersion: Date.now() }),
  setFilterIntensity: (v) =>
    set({
      filterIntensity: Math.max(0, Math.min(1, v)),
      previewVersion: Date.now(),
    }),

  setFrame: (f) => set({ currentFrame: f, previewVersion: Date.now() }),
  setFrameOpacity: (v) =>
    set({
      frameOpacity: Math.max(0, Math.min(1, v)),
      previewVersion: Date.now(),
    }),

  setWatermarkText: (t) =>
    set({
      watermarkText: t.slice(0, 20),
      previewVersion: Date.now(),
    }),
  setWatermarkOpacity: (v) =>
    set({
      watermarkOpacity: Math.max(0, Math.min(1, v)),
      previewVersion: Date.now(),
    }),
  setWatermarkPosition: (p) =>
    set({ watermarkPosition: p, previewVersion: Date.now() }),

  togglePanel: (key) =>
    set((s) => ({
      collapsedPanels: {
        ...s.collapsedPanels,
        [key]: !s.collapsedPanels[key],
      },
    })),

  toggleRightPanel: () =>
    set((s) => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),

  setDragging: (v) => set({ isDragging: v }),
  clearUploadError: () => set({ uploadError: null }),

  bumpPreview: () => set({ previewVersion: Date.now() }),

  exportImage: async () => {
    const state = get()
    if (!state.originalImage) return

    set({ isExporting: true, exportProgress: 0 })

    try {
      const onProgress = (p: number) => set({ exportProgress: p })
      const blob = await exportHDImage(
        state.originalImage,
        {
          filter: state.currentFilter,
          filterIntensity: state.filterIntensity,
          frame: state.currentFrame,
          frameOpacity: state.frameOpacity,
          watermarkText: state.watermarkText,
          watermarkOpacity: state.watermarkOpacity,
          watermarkPosition: state.watermarkPosition,
        },
        onProgress
      )
      const baseName = state.imageName.replace(/\.[^.]+$/, '') || 'artstudio'
      const suffix = state.currentFilter !== 'none' ? `-${state.currentFilter}` : ''
      downloadBlob(blob, `${baseName}${suffix}-${Date.now()}.png`)
    } catch (e) {
      console.error('导出失败:', e)
    } finally {
      setTimeout(() => {
        set({ isExporting: false, exportProgress: 0 })
      }, 600)
    }
  },
}))
