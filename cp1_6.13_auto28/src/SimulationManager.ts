import { Particle, ParticleType, PARTICLE_CONFIG, SimulationState } from './types'

export class SimulationManager {
  private state: SimulationState
  private particleIdCounter: number
  private lastDecayCheck: Map<number, number>
  private readonly INITIAL_PARTICLE_COUNT = 300
  private readonly MAX_PARTICLES = 3000
  private readonly SPHERE_RADIUS = 40
  private readonly ROTATION_PERIOD = 30

  constructor() {
    this.particleIdCounter = 0
    this.lastDecayCheck = new Map()
    this.state = {
      particles: [],
      isPaused: false,
      energyThreshold: 0.5,
      decayInterval: 2,
      time: 0
    }
    this.generateInitialParticles()
  }

  private generateInitialParticles(): void {
    const types: ParticleType[] = ['muon', 'kaon', 'pion']
    
    for (let i = 0; i < this.INITIAL_PARTICLE_COUNT; i++) {
      const type = types[Math.floor(Math.random() * types.length)]
      this.state.particles.push(this.createParticle(type, this.getRandomPosition()))
    }
  }

  private getRandomPosition(): { x: number; y: number; z: number } {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const radius = Math.cbrt(Math.random()) * this.SPHERE_RADIUS
    
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi)
    }
  }

  private createParticle(
    type: ParticleType,
    position: { x: number; y: number; z: number },
    velocity?: { x: number; y: number; z: number },
    energy?: number
  ): Particle {
    const config = PARTICLE_CONFIG[type]
    const size = config.baseSize * (0.5 + Math.random() * 1.0)
    
    return {
      id: this.particleIdCounter++,
      type,
      position: { ...position },
      velocity: velocity || {
        x: (Math.random() - 0.5) * 0.1,
        y: (Math.random() - 0.5) * 0.1,
        z: (Math.random() - 0.5) * 0.1
      },
      energy: energy ?? (0.1 + Math.random() * 9.9),
      size,
      age: 0,
      decayCount: 0,
      isSelected: false,
      trail: [],
      fadeStartTime: null
    }
  }

  update(deltaTime: number, clockTime: number): Particle[] {
    if (this.state.isPaused) return this.state.particles

    this.state.time += deltaTime
    const rotationAngle = (this.state.time / this.ROTATION_PERIOD) * Math.PI * 2

    const particlesToAdd: Particle[] = []
    const particlesToRemove: number[] = []
    const effectiveDecayInterval = this.state.decayInterval

    for (const particle of this.state.particles) {
      if (particle.fadeStartTime !== null) {
        const fadeProgress = (this.state.time - particle.fadeStartTime) * 2
        if (fadeProgress >= 1) {
          particlesToRemove.push(particle.id)
          continue
        }
      }

      this.updateParticleRotation(particle, rotationAngle, deltaTime)
      this.updateParticleTrail(particle)
      this.updateParticleFade(particle)

      if (particle.isSelected) {
        const lastCheck = this.lastDecayCheck.get(particle.id) ?? clockTime
        const timeSinceLastCheck = clockTime - lastCheck

        if (timeSinceLastCheck >= effectiveDecayInterval) {
          this.lastDecayCheck.set(particle.id, clockTime)
          if (this.checkDecay(particle)) {
            const childParticles = this.performDecay(particle)
            particlesToAdd.push(...childParticles)
            particlesToRemove.push(particle.id)
          }
        }
      } else {
        this.lastDecayCheck.delete(particle.id)
      }
    }

    this.state.particles = this.state.particles.filter(p => !particlesToRemove.includes(p.id))
    
    if (this.state.particles.length + particlesToAdd.length <= this.MAX_PARTICLES) {
      this.state.particles.push(...particlesToAdd)
    }

    return this.state.particles
  }

  private updateParticleRotation(
    particle: Particle,
    rotationAngle: number,
    deltaTime: number
  ): void {
    const angleIncrement = (deltaTime / this.ROTATION_PERIOD) * Math.PI * 2
    const cosA = Math.cos(angleIncrement)
    const sinA = Math.sin(angleIncrement)

    const { x, y, z } = particle.position
    particle.position.x = x * cosA - z * sinA
    particle.position.z = x * sinA + z * cosA

    particle.position.x += particle.velocity.x * deltaTime
    particle.position.y += particle.velocity.y * deltaTime
    particle.position.z += particle.velocity.z * deltaTime

    particle.velocity.x *= 0.999
    particle.velocity.y *= 0.999
    particle.velocity.z *= 0.999

    particle.age += deltaTime
  }

  private updateParticleTrail(particle: Particle): void {
    particle.trail.unshift({ ...particle.position })
    if (particle.trail.length > 10) {
      particle.trail.pop()
    }
  }

  private updateParticleFade(particle: Particle): void {
    if (particle.energy < this.state.energyThreshold && particle.fadeStartTime === null) {
      particle.fadeStartTime = this.state.time
    }
  }

  private checkDecay(particle: Particle): boolean {
    const config = PARTICLE_CONFIG[particle.type]
    if (config.decayProbability === 0) return false
    if (particle.energy < this.state.energyThreshold) return false
    return Math.random() < config.decayProbability
  }

  private performDecay(particle: Particle): Particle[] {
    const childCount = 2 + Math.floor(Math.random() * 2)
    const childTypes: ParticleType[] = ['pion', 'electron', 'photon', 'muon']
    const children: Particle[] = []

    for (let i = 0; i < childCount; i++) {
      const childType = childTypes[Math.floor(Math.random() * childTypes.length)]
      const direction = this.getRandomUnitVector()
      const speed = 5 + Math.random() * 10
      const energyReduction = 0.2 + Math.random() * 0.3
      const childEnergy = particle.energy * energyReduction

      const velocity = {
        x: direction.x * speed + particle.velocity.x,
        y: direction.y * speed + particle.velocity.y,
        z: direction.z * speed + particle.velocity.z
      }

      const child = this.createParticle(childType, particle.position, velocity, childEnergy)
      child.decayCount = particle.decayCount + 1
      children.push(child)
    }

    return children
  }

  private getRandomUnitVector(): { x: number; y: number; z: number } {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    return {
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.sin(phi) * Math.sin(theta),
      z: Math.cos(phi)
    }
  }

  selectParticle(particleId: number): void {
    for (const p of this.state.particles) {
      p.isSelected = p.id === particleId
    }
  }

  deselectParticle(): void {
    for (const p of this.state.particles) {
      p.isSelected = false
    }
  }

  getSelectedParticle(): Particle | undefined {
    return this.state.particles.find(p => p.isSelected)
  }

  reset(): void {
    this.state.particles = []
    this.particleIdCounter = 0
    this.lastDecayCheck.clear()
    this.generateInitialParticles()
  }

  setEnergyThreshold(value: number): void {
    this.state.energyThreshold = value
  }

  setDecayInterval(value: number): void {
    this.state.decayInterval = value
  }

  getDecayInterval(): number {
    return this.state.decayInterval
  }

  togglePause(): void {
    this.state.isPaused = !this.state.isPaused
  }

  setPaused(paused: boolean): void {
    this.state.isPaused = paused
  }

  isPaused(): boolean {
    return this.state.isPaused
  }

  getParticles(): Particle[] {
    return this.state.particles
  }

  getState(): SimulationState {
    return { ...this.state }
  }
}
