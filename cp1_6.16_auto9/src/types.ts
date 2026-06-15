export type PartType = 'plate2x2' | 'brick2x4' | 'cube1x1' | 'slope'

export type PartColor = 'red' | 'blue' | 'yellow' | 'green'

export interface PartPosition {
  x: number
  y: number
  z: number
}

export interface Part {
  id: string
  type: PartType
  color: PartColor
  position: PartPosition
  isAnimating?: boolean
}

export const COLOR_MAP: Record<PartColor, string> = {
  red: '#e53935',
  blue: '#1e88e5',
  yellow: '#fdd835',
  green: '#43a047',
}

export const PART_DIMENSIONS: Record<PartType, { width: number; height: number; depth: number }> = {
  plate2x2: { width: 64, height: 8, depth: 64 },
  brick2x4: { width: 128, height: 32, depth: 64 },
  cube1x1: { width: 32, height: 32, depth: 32 },
  slope: { width: 64, height: 32, depth: 64 },
}

export const PART_LABELS: Record<PartType, string> = {
  plate2x2: '2x2 平板',
  brick2x4: '2x4 长条',
  cube1x1: '1x1 方块',
  slope: '斜坡块',
}

export const COLOR_LABELS: Record<PartColor, string> = {
  red: '红色',
  blue: '蓝色',
  yellow: '黄色',
  green: '绿色',
}
