export type LightType = 'chandelier' | 'spotlight' | 'floor_lamp' | 'wall_lamp'

export interface LightPosition {
  x: number
  y: number
  z: number
}

export interface LightConfig {
  id: string
  type: LightType
  position: LightPosition
  colorTemp: number
  brightness: number
}

export interface LightTypeOption {
  value: LightType
  label: string
}

export const LIGHT_TYPE_OPTIONS: LightTypeOption[] = [
  { value: 'chandelier', label: '吊灯' },
  { value: 'spotlight', label: '射灯' },
  { value: 'floor_lamp', label: '落地灯' },
  { value: 'wall_lamp', label: '壁灯' },
]

export const PRESET_POSITIONS: LightPosition[] = [
  { x: 0, y: 3.5, z: 0 },
  { x: -2.5, y: 3.5, z: -2 },
  { x: 2.5, y: 3.5, z: -2 },
  { x: -2, y: 1.5, z: 2.5 },
  { x: 2, y: 1.5, z: 2.5 },
  { x: -3, y: 2.2, z: 0 },
  { x: 3, y: 2.2, z: 0 },
  { x: 0, y: 3.5, z: -2.5 },
  { x: 0, y: 3.5, z: 2.5 },
]

export const DEFAULT_LIGHT: LightConfig = {
  id: 'light-default',
  type: 'chandelier',
  position: { x: 0, y: 3.5, z: 0 },
  colorTemp: 4000,
  brightness: 60,
}

export const LIGHT_COLOR_CONSTANTS = {
  MIN_TEMP: 2700,
  MAX_TEMP: 6500,
  MIN_BRIGHTNESS: 0,
  MAX_BRIGHTNESS: 100,
}
