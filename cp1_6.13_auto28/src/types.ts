export type ParticleType = 'muon' | 'kaon' | 'pion' | 'electron' | 'photon'

export interface ParticleConfig {
  color: number
  name: string
  nameCN: string
  baseSize: number
  decayProbability: number
}

export const PARTICLE_CONFIG: Record<ParticleType, ParticleConfig> = {
  muon: {
    color: 0x3b82f6,
    name: 'Muon',
    nameCN: 'μ子',
    baseSize: 1.0,
    decayProbability: 0.3
  },
  kaon: {
    color: 0xa855f7,
    name: 'Kaon',
    nameCN: 'K介子',
    baseSize: 1.2,
    decayProbability: 0.3
  },
  pion: {
    color: 0xef4444,
    name: 'Pion',
    nameCN: 'π介子',
    baseSize: 0.9,
    decayProbability: 0.3
  },
  electron: {
    color: 0x22c55e,
    name: 'Electron',
    nameCN: '电子',
    baseSize: 0.5,
    decayProbability: 0.0
  },
  photon: {
    color: 0xfbbf24,
    name: 'Photon',
    nameCN: '光子',
    baseSize: 0.4,
    decayProbability: 0.0
  }
}

export interface Particle {
  id: number
  type: ParticleType
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  energy: number
  size: number
  age: number
  decayCount: number
  isSelected: boolean
  trail: Array<{ x: number; y: number; z: number }>
  fadeStartTime: number | null
}

export interface SimulationState {
  particles: Particle[]
  isPaused: boolean
  energyThreshold: number
  decayInterval: number
  time: number
}

export interface UIControls {
  energyThreshold: number
  decayInterval: number
  isPaused: boolean
}

export interface CameraState {
  targetX: number
  targetY: number
  targetZ: number
  currentX: number
  currentY: number
  currentZ: number
  theta: number
  phi: number
  targetTheta: number
  targetPhi: number
  distance: number
  targetDistance: number
  inertia: number
}
