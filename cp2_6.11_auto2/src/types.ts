export type NoteColor = 'red' | 'blue' | 'yellow' | 'purple' | 'green'

export interface Submarine {
  x: number
  y: number
  width: number
  height: number
  speed: number
  baseSpeed: number
  hitFlashTimer: number
  slowTimer: number
  propellerAngle: number
  windowPulse: number
}

export interface SoundBall {
  id: number
  x: number
  y: number
  baseX: number
  color: NoteColor
  radius: number
  speed: number
  wobblePhase: number
  wobbleAmp: number
  collected: boolean
  spawnTime: number
}

export interface TrailParticle {
  x: number
  y: number
  radius: number
  color: string
  alpha: number
  life: number
  maxLife: number
}

export interface Shockwave {
  x: number
  y: number
  color: string
  radius: number
  maxRadius: number
  alpha: number
  life: number
  maxLife: number
}

export interface Obstacle {
  id: number
  type: 'reef' | 'fish'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  speed: number
}

export interface FishSchool {
  id: number
  x: number
  y: number
  baseX: number
  fishCount: number
  phase: number
  amplitude: number
  period: number
  speed: number
}

export interface Jellyfish {
  x: number
  y: number
  radius: number
  alpha: number
  pulsePhase: number
  speed: number
}

export interface TrackLayer {
  color: NoteColor
  layer: number
  targetWidth: number
  currentWidth: number
  fadeTimer: number
}

export interface CollectedNote {
  color: NoteColor
  layer: number
  time: number
}

export interface GameState {
  status: 'playing' | 'gameover'
  lives: number
  score: number
  submarine: Submarine
  soundBalls: SoundBall[]
  obstacles: Obstacle[]
  fishSchools: FishSchool[]
  jellyfish: Jellyfish[]
  trailParticles: TrailParticle[]
  shockwaves: Shockwave[]
  trackLayers: Map<NoteColor, TrackLayer>
  currentColorChain: NoteColor | null
  collectedNotes: CollectedNote[]
  spawnTimer: number
  obstacleTimer: number
  fishTimer: number
  jellyfishTimer: number
  scrollOffset: number
}

export type InstrumentType = 'piano' | 'violin' | 'drum' | 'harp' | 'flute'
