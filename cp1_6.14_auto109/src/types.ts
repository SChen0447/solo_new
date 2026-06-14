export interface GeologicalLayerData {
  id: string
  name: string
  thickness: number
  color: string
  lithology: string
  era: string
  yPosition: number
}

export interface AnnotationData {
  id: string
  layerId: string
  text: string
  color: string
  importance: 1 | 2 | 3
  position: [number, number, number]
  createdAt: number
}

export interface ViewportState {
  cameraPosition: [number, number, number]
  sliceX: number
  sliceZ: number
  selectedLayerId: string | null
}

export interface SavedViewpoint {
  id: string
  name: string
  cameraPosition: [number, number, number]
  sliceX: number
  sliceZ: number
  selectedLayerId: string | null
  thumbnail: string
}

export type PerformanceMode = 'normal' | 'optimized'

export const ANNOTATION_COLORS = [
  { name: '红', value: '#f44336' },
  { name: '橙', value: '#ff9800' },
  { name: '黄', value: '#ffeb3b' },
  { name: '绿', value: '#4caf50' },
  { name: '青', value: '#00bcd4' },
  { name: '蓝', value: '#2196f3' },
  { name: '紫', value: '#9c27b0' },
  { name: '灰', value: '#9e9e9e' },
] as const

export const LAYER_WIDTH = 5
export const LAYER_DEPTH = 5
