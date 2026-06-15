import { PhysicsEngine } from './PhysicsEngine'
import { TimeRecorder } from './TimeRecorder'
import { PlayerState, useGameStore } from '../stores/gameStore'
import { MovingPlatform } from './LevelObjects'

const COLOR_STATIONARY = '#ff4500'
const COLOR_MOVING = '#87ceeb'
const COLOR_JUMPING = '#32cd32'
const COLOR_TRANSITION_TIME = 0.3

export interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  lifetime: number
  maxLifetime: number
}

export class GameLoop {
  private physicsEngine: PhysicsEngine
  private timeRecorder: TimeRecorder
  private animationFrameId: number | null = null
  private lastTime: number = 0
  private gameTime: number = 0
  private isRunning: boolean = false
  private targetColor: string = COLOR_STATIONARY
  private currentColor: string = COLOR_STATIONARY
  private colorTransitionProgress: number = 1
  private particles: Particle[] = []
  private particleIdCounter: number = 0
  private respawnTimer: number = 0
  private respawnPhase: number = 0
  private screenShakeTimer: number = 0
  private screenShakeX: number = 0
  private screenShakeY: number = 0
  private audioContext: AudioContext | null = null

  constructor() {
    this.physicsEngine = new PhysicsEngine({
      onSpikeCollision: () => this.handleDeath(),
      onBrickCollision: (brickId, fromBelow) =>
        this.handleBrickCollision(brickId, fromBelow),
      onGemCollision: (gemId) => this.handleGemCollision(gemId),
      onPlatformCollision: (platform) => this.handlePlatformCollision(platform),
    })

    this.timeRecorder = new TimeRecorder()
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  stop(): void {
    this.isRunning = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return

    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05)
    this.lastTime = currentTime

    const state = useGameStore.getState()

    if (!state.isPaused && !state.isVictory) {
      this.update(deltaTime)
    }

    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  private update(deltaTime: number): void {
    const state = useGameStore.getState()

    this.gameTime += deltaTime

    if (state.isDead) {
      this.updateRespawn(deltaTime)
      this.updateParticles(deltaTime)
      this.updateScreenShake(deltaTime)
      return
    }

    if (state.isRewinding) {
      this.updateRewind(deltaTime)
    } else {
      this.updateNormal(deltaTime)
    }

    this.updateParticles(deltaTime)
    this.updateScreenShake(deltaTime)
    this.updateStore()
  }

  private updateNormal(deltaTime: number): void {
    const state = useGameStore.getState()

    this.physicsEngine.update(
      deltaTime,
      { left: state.input.left, right: state.input.right, jump: state.input.jump },
      false
    )
    this.physicsEngine.step(deltaTime)

    this.updatePlayerColor(deltaTime)

    const playerState = this.physicsEngine.getPlayerState()
    playerState.color = this.currentColor

    this.timeRecorder.recordSnapshot(playerState, this.gameTime)

    const availableTime = this.timeRecorder.getAvailableRewindTime()
    useGameStore.getState().setRewindTime(Math.min(5, availableTime))

    if (state.input.rewind && !state.isRewinding) {
      this.startRewind()
    }

    if (this.physicsEngine.checkOutOfBounds()) {
      this.handleDeath()
    }

    useGameStore.getState().setGameTime(this.gameTime)
  }

  private updateRewind(deltaTime: number): void {
    const state = useGameStore.getState()
    const playerState = this.physicsEngine.getPlayerState()
    playerState.color = this.currentColor

    const rewoundState = this.timeRecorder.updateRewind(deltaTime, playerState)

    if (rewoundState) {
      this.physicsEngine.setPlayerState(rewoundState)
      this.currentColor = rewoundState.color
      this.targetColor = rewoundState.color
      this.colorTransitionProgress = 1

      this.spawnRewindParticles(rewoundState.x, rewoundState.y)

      if (!this.timeRecorder.getIsRewinding()) {
        useGameStore.getState().setIsRewinding(false)
        this.gameTime = this.timeRecorder['lastSnapshotTime']
      }
    }
  }

  private updatePlayerColor(deltaTime: number): void {
    const state = useGameStore.getState()
    const isGrounded = this.physicsEngine.getIsGrounded()
    const isMoving = state.input.left || state.input.right
    const isJumping = !isGrounded && this.physicsEngine.getPlayerState().vy < 0

    let newTargetColor = COLOR_STATIONARY
    if (isJumping) {
      newTargetColor = COLOR_JUMPING
    } else if (isMoving) {
      newTargetColor = COLOR_MOVING
    }

    if (newTargetColor !== this.targetColor) {
      this.targetColor = newTargetColor
      this.colorTransitionProgress = 0
    }

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress += deltaTime / COLOR_TRANSITION_TIME
      if (this.colorTransitionProgress > 1) this.colorTransitionProgress = 1

      this.currentColor = this.interpolateColor(
        this.currentColor,
        this.targetColor,
        this.colorTransitionProgress
      )
    }
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16)
    const g1 = parseInt(color1.slice(3, 5), 16)
    const b1 = parseInt(color1.slice(5, 7), 16)

    const r2 = parseInt(color2.slice(1, 3), 16)
    const g2 = parseInt(color2.slice(3, 5), 16)
    const b2 = parseInt(color2.slice(5, 7), 16)

    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  private startRewind(): void {
    const success = this.timeRecorder.startRewind(() => {})
    if (success) {
      useGameStore.getState().setIsRewinding(true)
      const playerPos = this.physicsEngine.getPlayerState()
      for (let i = 0; i < 20; i++) {
        this.spawnRewindParticle(playerPos.x, playerPos.y)
      }
    }
  }

  private spawnRewindParticles(x: number, y: number): void {
    if (Math.random() < 0.3) {
      this.spawnRewindParticle(x, y)
    }
  }

  private spawnRewindParticle(x: number, y: number): void {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 2
    this.particles.push({
      id: `particle-${this.particleIdCounter++}`,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 2,
      color: '#00bfff',
      lifetime: 1,
      maxLifetime: 1,
    })
  }

  private updateParticles(deltaTime: number): void {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.1
      p.lifetime -= deltaTime
      return p.lifetime > 0
    })
  }

  private updateScreenShake(deltaTime: number): void {
    if (this.screenShakeTimer > 0) {
      this.screenShakeTimer -= deltaTime
      if (this.screenShakeTimer <= 0) {
        this.screenShakeX = 0
        this.screenShakeY = 0
        useGameStore.getState().triggerScreenShake(0, 0, 0)
      }
    }
  }

  private handleDeath(): void {
    const state = useGameStore.getState()
    if (state.isDead || state.isRewinding) return

    useGameStore.getState().setIsDead(true)
    useGameStore.getState().setIsRespawning(true)
    this.respawnTimer = 0
    this.respawnPhase = 0
    this.triggerDeathShake()
  }

  private updateRespawn(deltaTime: number): void {
    this.respawnTimer += deltaTime

    const blinkPhase = Math.floor(this.respawnTimer / 0.2)
    const opacity = blinkPhase % 2 === 0 ? 0.3 : 1.0

    useGameStore.getState().setPlayerOpacity(opacity)

    if (this.respawnTimer >= 1.2) {
      useGameStore.getState().setIsDead(false)
      useGameStore.getState().setIsRespawning(false)
      useGameStore.getState().setPlayerOpacity(1)
      this.physicsEngine.resetPlayer()
      this.timeRecorder.clear()
      this.gameTime = 0
      useGameStore.getState().setGameTime(0)
    }
  }

  private triggerDeathShake(): void {
    this.screenShakeTimer = 0.15
    this.screenShakeX = 5
    useGameStore.getState().triggerScreenShake(5, 0, 0.15)
  }

  private handleBrickCollision(brickId: string, fromBelow: boolean): void {
    if (fromBelow) {
      const destroyed = this.physicsEngine.getLevelObjects().hitBrick(brickId)
      if (destroyed) {
        this.triggerBrickShake()
      }
    }
  }

  private triggerBrickShake(): void {
    this.screenShakeTimer = 0.1
    this.screenShakeY = 2
    useGameStore.getState().triggerScreenShake(0, 2, 0.1)
  }

  private handleGemCollision(gemId: string): void {
    const collected = this.physicsEngine.getLevelObjects().collectGem(gemId)
    if (collected) {
      useGameStore.getState().addGem()
      this.playGemSound()
    }
  }

  private handlePlatformCollision(platform: MovingPlatform): void {
    // Platform velocity is handled in PhysicsEngine
  }

  private playGemSound(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const ctx = this.audioContext
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(400, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15)

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.15)
  }

  private updateStore(): void {
    const playerState = this.physicsEngine.getPlayerState()
    const state = useGameStore.getState()

    useGameStore.getState().setPlayerPosition(playerState.x, playerState.y)
    useGameStore.getState().setPlayerVelocity(playerState.vx, playerState.vy)
    useGameStore.getState().setPlayerColor(this.currentColor)

    const shake = state.screenShake
    if (shake.duration > 0) {
      const elapsed = 1 - shake.duration / 0.15
      const shakeX = Math.sin(elapsed * Math.PI * 6) * shake.x
      const shakeY = Math.sin(elapsed * Math.PI * 2) * shake.y
      useGameStore.setState({
        screenShake: {
          ...shake,
          duration: Math.max(0, shake.duration - 1 / 60),
        },
      })
    }
  }

  getPhysicsEngine(): PhysicsEngine {
    return this.physicsEngine
  }

  getParticles(): Particle[] {
    return this.particles
  }

  reset(): void {
    this.physicsEngine.reset()
    this.timeRecorder.clear()
    this.gameTime = 0
    this.particles = []
    this.currentColor = COLOR_STATIONARY
    this.targetColor = COLOR_STATIONARY
    this.colorTransitionProgress = 1
    useGameStore.getState().resetGame()
  }
}
