export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy'

export interface GameTime {
  hour: number
  minute: number
  day: number
}

export interface PlayerStats {
  hunger: number
  temperature: number
  water: number
}

export interface Recipe {
  id: string
  name: string
  icon: string
  materials: Record<string, number>
  output: Record<string, number>
}

export interface TickEvent {
  time: GameTime
  weather: WeatherType
  deltaTime: number
}

export interface WeatherChangeEvent {
  from: WeatherType
  to: WeatherType
}

export type EventCallback<T = any> = (data: T) => void

export interface GameOverEvent {
  reason: string
}
