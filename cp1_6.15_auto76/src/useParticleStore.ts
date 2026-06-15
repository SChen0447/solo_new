import { create } from 'zustand'

export type WeatherType = 'rain' | 'snow' | 'fog' | 'thunderstorm'

export interface ParticleData {
  id: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  size: number
  life: number
  maxLife: number
  alpha: number
  isLightning?: boolean
  flashDuration?: number
  flashTimer?: number
}

interface ParticleState {
  weatherType: WeatherType
  particleCount: number
  particles: ParticleData[]
  setWeatherType: (type: WeatherType) => void
  setParticleCount: (count: number) => void
  setParticles: (particles: ParticleData[]) => void
}

const generateId = (() => {
  let id = 0
  return () => id++
})()

export const useParticleStore = create<ParticleState>((set) => ({
  weatherType: 'rain',
  particleCount: 1000,
  particles: [],
  setWeatherType: (type) => set({ weatherType: type }),
  setParticleCount: (count) => set({ particleCount: count }),
  setParticles: (particles) => set({ particles })
}))

export { generateId }
