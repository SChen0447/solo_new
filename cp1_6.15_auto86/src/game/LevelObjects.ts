import { Body, Bodies, Composite, Engine } from 'matter-js'

export interface MovingPlatform {
  id: string
  body: Body
  startX: number
  endX: number
  currentX: number
  speed: number
  direction: 1 | -1
  width: number
  height: number
}

export interface Spike {
  id: string
  body: Body
  x: number
  y: number
  width: number
  height: number
}

export interface DestructibleBrick {
  id: string
  body: Body
  x: number
  y: number
  width: number
  height: number
  hits: number
  maxHits: number
  isDestroyed: boolean
  destroyAnimation: number
}

export interface Gem {
  id: string
  x: number
  y: number
  radius: number
  collected: boolean
  colorPhase: number
  scale: number
}

export interface BrickDebris {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  rotationSpeed: number
  lifetime: number
  maxLifetime: number
  color: string
}

export class LevelObjects {
  private engine: Engine
  private movingPlatforms: MovingPlatform[] = []
  private spikes: Spike[] = []
  private destructibleBricks: DestructibleBrick[] = []
  private gems: Gem[] = []
  private brickDebris: BrickDebris[] = []
  private gemColors: string[] = ['#ffd700', '#ff69b4', '#ff6347', '#00bfff', '#98fb98']

  constructor(engine: Engine) {
    this.engine = engine
    this.createLevel()
  }

  private createLevel(): void {
    this.createMovingPlatforms()
    this.createSpikes()
    this.createDestructibleBricks()
    this.createGems()
  }

  private createMovingPlatforms(): void {
    const platforms = [
      { x: 300, y: 380, startX: 250, endX: 450 },
      { x: 550, y: 300, startX: 500, endX: 700 },
      { x: 200, y: 220, startX: 150, endX: 350 },
    ]

    platforms.forEach((p, i) => {
      const body = Bodies.rectangle(p.x, p.y, 150, 30, {
        isStatic: true,
        label: `platform-${i}`,
        friction: 1,
        frictionStatic: 1,
      })

      this.movingPlatforms.push({
        id: `platform-${i}`,
        body,
        startX: p.startX,
        endX: p.endX,
        currentX: p.x,
        speed: 2,
        direction: 1,
        width: 150,
        height: 30,
      })

      Composite.add(this.engine.world, body)
    })
  }

  private createSpikes(): void {
    const spikePositions = [
      { x: 400, y: 450 },
      { x: 430, y: 450 },
      { x: 460, y: 450 },
      { x: 600, y: 450 },
      { x: 630, y: 450 },
    ]

    spikePositions.forEach((s, i) => {
      const body = Bodies.rectangle(s.x, s.y, 30, 30, {
        isStatic: true,
        isSensor: true,
        label: `spike-${i}`,
      })

      this.spikes.push({
        id: `spike-${i}`,
        body,
        x: s.x,
        y: s.y,
        width: 30,
        height: 30,
      })

      Composite.add(this.engine.world, body)
    })
  }

  private createDestructibleBricks(): void {
    const bricks = [
      { x: 350, y: 340 },
      { x: 410, y: 340 },
      { x: 350, y: 260 },
      { x: 550, y: 180 },
      { x: 610, y: 180 },
    ]

    bricks.forEach((b, i) => {
      const body = Bodies.rectangle(b.x, b.y, 60, 30, {
        isStatic: true,
        label: `brick-${i}`,
      })

      this.destructibleBricks.push({
        id: `brick-${i}`,
        body,
        x: b.x,
        y: b.y,
        width: 60,
        height: 30,
        hits: 0,
        maxHits: 3,
        isDestroyed: false,
        destroyAnimation: 0,
      })

      Composite.add(this.engine.world, body)
    })
  }

  private createGems(): void {
    const gemPositions = [
      { x: 150, y: 400 },
      { x: 350, y: 320 },
      { x: 600, y: 420 },
      { x: 450, y: 250 },
      { x: 180, y: 150 },
      { x: 380, y: 120 },
      { x: 580, y: 140 },
      { x: 720, y: 280 },
      { x: 680, y: 400 },
      { x: 250, y: 320 },
    ]

    gemPositions.forEach((g, i) => {
      this.gems.push({
        id: `gem-${i}`,
        x: g.x,
        y: g.y,
        radius: 8,
        collected: false,
        colorPhase: Math.random() * Math.PI * 2,
        scale: 1,
      })
    })
  }

  update(deltaTime: number): void {
    this.updateMovingPlatforms(deltaTime)
    this.updateGems(deltaTime)
    this.updateBrickDebris(deltaTime)
  }

  private updateMovingPlatforms(deltaTime: number): void {
    this.movingPlatforms.forEach((platform) => {
      platform.currentX += platform.speed * platform.direction

      if (platform.currentX >= platform.endX) {
        platform.direction = -1
        platform.currentX = platform.endX
      } else if (platform.currentX <= platform.startX) {
        platform.direction = 1
        platform.currentX = platform.startX
      }

      Body.setPosition(platform.body, {
        x: platform.currentX,
        y: platform.body.position.y,
      })
    })
  }

  private updateGems(deltaTime: number): void {
    this.gems.forEach((gem) => {
      if (!gem.collected) {
        gem.colorPhase += deltaTime * Math.PI * 2
        gem.scale = 0.9 + Math.sin(gem.colorPhase * 2) * 0.1
      }
    })
  }

  private updateBrickDebris(deltaTime: number): void {
    this.brickDebris = this.brickDebris.filter((debris) => {
      debris.x += debris.vx
      debris.y += debris.vy
      debris.vy += 0.5
      debris.rotation += debris.rotationSpeed
      debris.lifetime -= deltaTime

      return debris.lifetime > 0
    })
  }

  hitBrick(brickId: string): boolean {
    const brick = this.destructibleBricks.find((b) => b.id === brickId)
    if (!brick || brick.isDestroyed) return false

    brick.hits++

    if (brick.hits >= brick.maxHits) {
      this.destroyBrick(brick)
      return true
    }

    return false
  }

  private destroyBrick(brick: DestructibleBrick): void {
    brick.isDestroyed = true
    Composite.remove(this.engine.world, brick.body)

    const colors = ['#8b4513', '#a0522d', '#cd853f', '#d2691e']
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      this.brickDebris.push({
        id: `debris-${brick.id}-${i}`,
        x: brick.x,
        y: brick.y,
        vx: Math.cos(angle) * (3 + Math.random() * 2),
        vy: Math.sin(angle) * (3 + Math.random() * 2) - 3,
        size: 15,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        lifetime: 0.4,
        maxLifetime: 0.4,
        color: colors[i],
      })
    }
  }

  collectGem(gemId: string): boolean {
    const gem = this.gems.find((g) => g.id === gemId)
    if (!gem || gem.collected) return false

    gem.collected = true
    return true
  }

  getMovingPlatforms(): MovingPlatform[] {
    return this.movingPlatforms
  }

  getSpikes(): Spike[] {
    return this.spikes
  }

  getDestructibleBricks(): DestructibleBrick[] {
    return this.destructibleBricks.filter((b) => !b.isDestroyed)
  }

  getGems(): Gem[] {
    return this.gems.filter((g) => !g.collected)
  }

  getBrickDebris(): BrickDebris[] {
    return this.brickDebris
  }

  getGemColor(gem: Gem): string {
    const index = Math.floor(((gem.colorPhase / (Math.PI * 2)) * this.gemColors.length) % this.gemColors.length)
    return this.gemColors[index]
  }

  getPlatformVelocity(platform: MovingPlatform): { vx: number; vy: number } {
    return { vx: platform.speed * platform.direction, vy: 0 }
  }

  reset(): void {
    this.movingPlatforms.forEach((p) => Composite.remove(this.engine.world, p.body))
    this.spikes.forEach((s) => Composite.remove(this.engine.world, s.body))
    this.destructibleBricks.forEach((b) => {
      if (!b.isDestroyed) Composite.remove(this.engine.world, b.body)
    })

    this.movingPlatforms = []
    this.spikes = []
    this.destructibleBricks = []
    this.gems = []
    this.brickDebris = []

    this.createLevel()
  }
}
