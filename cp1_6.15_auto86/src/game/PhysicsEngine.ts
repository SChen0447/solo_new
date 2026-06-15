import {
  Engine,
  Bodies,
  Composite,
  Body,
  Events,
  Runner,
  Vector,
  Pair,
} from 'matter-js'
import { PlayerState } from '../stores/gameStore'
import { LevelObjects, MovingPlatform } from './LevelObjects'

export const CANVAS_WIDTH = 800
export const CANVAS_HEIGHT = 500
export const GROUND_Y = 465
const GRAVITY = 0.8
const PLAYER_WIDTH = 40
const PLAYER_HEIGHT = 40
const MOVE_SPEED = 4
const JUMP_FORCE = -10

export interface CollisionCallbacks {
  onSpikeCollision: () => void
  onBrickCollision: (brickId: string, fromBelow: boolean) => void
  onGemCollision: (gemId: string) => void
  onPlatformCollision: (platform: MovingPlatform) => void
}

export class PhysicsEngine {
  private engine: Engine
  private playerBody: Body
  private ground: Body
  private leftWall: Body
  private rightWall: Body
  private levelObjects: LevelObjects
  private isGrounded: boolean = false
  private currentPlatform: MovingPlatform | null = null
  private callbacks: CollisionCallbacks

  constructor(callbacks: CollisionCallbacks) {
    this.callbacks = callbacks
    this.engine = Engine.create({
      gravity: { x: 0, y: GRAVITY, scale: 0.001 },
    })

    this.ground = Bodies.rectangle(CANVAS_WIDTH / 2, GROUND_Y, CANVAS_WIDTH, 70, {
      isStatic: true,
      label: 'ground',
      friction: 1,
      frictionStatic: 1,
    })

    this.leftWall = Bodies.rectangle(-10, CANVAS_HEIGHT / 2, 20, CANVAS_HEIGHT, {
      isStatic: true,
      label: 'wall',
    })

    this.rightWall = Bodies.rectangle(CANVAS_WIDTH + 10, CANVAS_HEIGHT / 2, 20, CANVAS_HEIGHT, {
      isStatic: true,
      label: 'wall',
    })

    this.playerBody = Bodies.rectangle(100, 350, PLAYER_WIDTH, PLAYER_HEIGHT, {
      label: 'player',
      friction: 0.1,
      frictionStatic: 0.5,
      restitution: 0,
      inertia: Infinity,
    })

    this.levelObjects = new LevelObjects(this.engine)

    Composite.add(this.engine.world, [
      this.ground,
      this.leftWall,
      this.rightWall,
      this.playerBody,
    ])

    this.setupCollisionHandlers()
  }

  private setupCollisionHandlers(): void {
    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        this.handleCollision(pair, true)
      })
    })

    Events.on(this.engine, 'collisionActive', (event) => {
      event.pairs.forEach((pair) => {
        this.handleCollision(pair, false)
      })
    })

    Events.on(this.engine, 'collisionEnd', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair
        if (bodyA.label === 'player' || bodyB.label === 'player') {
          const other = bodyA.label === 'player' ? bodyB : bodyA
          if (other.label.startsWith('platform-')) {
            this.currentPlatform = null
          }
        }
      })
    })
  }

  private handleCollision(pair: Pair, isStart: boolean): void {
    const { bodyA, bodyB } = pair

    if (bodyA.label === 'player' || bodyB.label === 'player') {
      const playerBody = bodyA.label === 'player' ? bodyA : bodyB
      const otherBody = bodyA.label === 'player' ? bodyB : bodyA

      const collisionData = pair.collision as { normal: { x: number; y: number } }
      const normal = collisionData.normal
      const isPlayerBodyA = bodyA.label === 'player'
      const adjustedNormal = isPlayerBodyA ? normal : Vector.neg(normal)

      if (adjustedNormal.y < -0.5) {
        this.isGrounded = true
      }

      if (otherBody.label.startsWith('spike-')) {
        this.callbacks.onSpikeCollision()
      } else if (otherBody.label.startsWith('brick-')) {
        const fromBelow = adjustedNormal.y > 0.5
        this.callbacks.onBrickCollision(otherBody.label, fromBelow)
      } else if (otherBody.label.startsWith('platform-')) {
        const platform = this.levelObjects
          .getMovingPlatforms()
          .find((p) => p.body === otherBody)
        if (platform) {
          this.currentPlatform = platform
          this.callbacks.onPlatformCollision(platform)
        }
      }

      this.levelObjects.getGems().forEach((gem) => {
        const dx = this.playerBody.position.x - gem.x
        const dy = this.playerBody.position.y - gem.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        if (distance < gem.radius + 20) {
          this.callbacks.onGemCollision(gem.id)
        }
      })
    }
  }

  update(deltaTime: number, input: { left: boolean; right: boolean; jump: boolean }, isRewinding: boolean): void {
    if (!isRewinding) {
      let vx = 0
      if (input.left) vx -= MOVE_SPEED
      if (input.right) vx += MOVE_SPEED

      if (this.currentPlatform) {
        const platformVel = this.levelObjects.getPlatformVelocity(this.currentPlatform)
        vx += platformVel.vx
      }

      Body.setVelocity(this.playerBody, {
        x: vx,
        y: this.playerBody.velocity.y,
      })

      if (input.jump && this.isGrounded) {
        Body.setVelocity(this.playerBody, {
          x: this.playerBody.velocity.x,
          y: JUMP_FORCE,
        })
        this.isGrounded = false
      }
    }

    this.levelObjects.update(deltaTime)
    this.checkGrounded()
    this.checkGemCollisions()
  }

  private checkGrounded(): void {
    if (this.playerBody.velocity.y > 0.1) {
      this.isGrounded = false
    }
  }

  private checkGemCollisions(): void {
    this.levelObjects.getGems().forEach((gem) => {
      const dx = this.playerBody.position.x - gem.x
      const dy = this.playerBody.position.y - gem.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < gem.radius + 20) {
        this.callbacks.onGemCollision(gem.id)
      }
    })
  }

  step(deltaTime: number): void {
    Engine.update(this.engine, deltaTime * 1000)
  }

  getPlayerState(): PlayerState {
    return {
      x: this.playerBody.position.x,
      y: this.playerBody.position.y,
      vx: this.playerBody.velocity.x,
      vy: this.playerBody.velocity.y,
      color: '#ff4500',
      opacity: 1,
    }
  }

  setPlayerState(state: PlayerState): void {
    Body.setPosition(this.playerBody, { x: state.x, y: state.y })
    Body.setVelocity(this.playerBody, { x: state.vx, y: state.vy })
  }

  resetPlayer(): void {
    Body.setPosition(this.playerBody, { x: 100, y: 350 })
    Body.setVelocity(this.playerBody, { x: 0, y: 0 })
    this.isGrounded = false
    this.currentPlatform = null
  }

  getIsGrounded(): boolean {
    return this.isGrounded
  }

  getLevelObjects(): LevelObjects {
    return this.levelObjects
  }

  getEngine(): Engine {
    return this.engine
  }

  checkOutOfBounds(): boolean {
    return (
      this.playerBody.position.y > CANVAS_HEIGHT + 100 ||
      this.playerBody.position.x < -50 ||
      this.playerBody.position.x > CANVAS_WIDTH + 50
    )
  }

  reset(): void {
    this.resetPlayer()
    this.levelObjects.reset()
    this.isGrounded = false
    this.currentPlatform = null
  }
}
