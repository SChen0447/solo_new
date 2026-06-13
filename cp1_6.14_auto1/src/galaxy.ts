import * as THREE from 'three'

export type ColorTheme = 'nebula-purple' | 'aurora-green' | 'lava-orange'

interface ThemeConfig {
  name: string
  colors: string[]
}

export const THEMES: Record<ColorTheme, ThemeConfig> = {
  'nebula-purple': {
    name: '星云紫',
    colors: ['#8b5cf6', '#a78bfa', '#c4b5fd']
  },
  'aurora-green': {
    name: '极光绿',
    colors: ['#10b981', '#34d399', '#6ee7b7']
  },
  'lava-orange': {
    name: '熔岩橙',
    colors: ['#f97316', '#fb923c', '#fdba74']
  }
}

interface ParticleData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  alphas: Float32Array
  originalPositions: Float32Array
  angles: Float32Array
  radii: Float32Array
  heights: Float32Array
  speeds: Float32Array
}

export class Galaxy {
  private scene: THREE.Scene
  private theme: ColorTheme
  private particleCount: number = 5000
  private points: THREE.Points | null = null
  private geometry: THREE.BufferGeometry | null = null
  private material: THREE.PointsMaterial | null = null
  private particleData: ParticleData | null = null
  private rotation: number = 0
  private explosionProgress: number = 0
  private explosionDuration: number = 2000
  private isExploding: boolean = false
  private explosionStartTime: number = 0
  private spiralArms: number = 4
  private galaxyRadius: number = 80
  private galaxyThickness: number = 15

  constructor(scene: THREE.Scene, theme: ColorTheme = 'nebula-purple') {
    this.scene = scene
    this.theme = theme
    this.createParticles(this.particleCount)
  }

  private hexToRgb(hex: string): THREE.Color {
    return new THREE.Color(hex)
  }

  private generateSpiralPosition(
    index: number,
    total: number
  ): { x: number; y: number; z: number; angle: number; radius: number; speed: number } {
    const arm = index % this.spiralArms
    const armOffset = (arm / this.spiralArms) * Math.PI * 2
    const progress = Math.floor(index / this.spiralArms) / Math.ceil(total / this.spiralArms)

    const baseAngle = progress * Math.PI * 4 + armOffset
    const radius = progress * this.galaxyRadius + (Math.random() - 0.5) * 10
    const angle = baseAngle + (Math.random() - 0.5) * 0.5

    const heightOffset = Math.sin(progress * Math.PI) * this.galaxyThickness
    const y = (Math.random() - 0.5) * 5 + heightOffset * 0.3

    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    const speed = 0.1 + Math.random() * 0.2

    return { x, y, z, angle, radius, speed }
  }

  private generateParticleData(count: number): ParticleData {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const alphas = new Float32Array(count)
    const originalPositions = new Float32Array(count * 3)
    const angles = new Float32Array(count)
    const radii = new Float32Array(count)
    const heights = new Float32Array(count)
    const speeds = new Float32Array(count)

    const themeColors = THEMES[this.theme].colors.map(c => this.hexToRgb(c))

    for (let i = 0; i < count; i++) {
      const { x, y, z, angle, radius, speed } = this.generateSpiralPosition(i, count)

      const i3 = i * 3
      originalPositions[i3] = x
      originalPositions[i3 + 1] = y
      originalPositions[i3 + 2] = z

      positions[i3] = 0
      positions[i3 + 1] = 0
      positions[i3 + 2] = 0

      const colorIndex = Math.floor(Math.random() * themeColors.length)
      const baseColor = themeColors[colorIndex]
      const variation = 0.2
      colors[i3] = THREE.MathUtils.clamp(baseColor.r + (Math.random() - 0.5) * variation, 0, 1)
      colors[i3 + 1] = THREE.MathUtils.clamp(baseColor.g + (Math.random() - 0.5) * variation, 0, 1)
      colors[i3 + 2] = THREE.MathUtils.clamp(baseColor.b + (Math.random() - 0.5) * variation, 0, 1)

      sizes[i] = Math.random() * 1.5 + 0.5

      const distanceFactor = radius / this.galaxyRadius
      alphas[i] = THREE.MathUtils.clamp(1 - distanceFactor * 0.5 + Math.random() * 0.3, 0.3, 1)

      angles[i] = angle
      radii[i] = radius
      heights[i] = y
      speeds[i] = speed
    }

    return {
      positions,
      colors,
      sizes,
      alphas,
      originalPositions,
      angles,
      radii,
      heights,
      speeds
    }
  }

  createParticles(count: number): void {
    this.dispose()

    this.particleCount = count
    this.particleData = this.generateParticleData(count)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.particleData.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.particleData.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.particleData.sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.points)

    this.isExploding = true
    this.explosionStartTime = performance.now()
    this.explosionProgress = 0
  }

  startExplosionAnimation(duration: number = 2000): void {
    this.explosionDuration = duration
    this.isExploding = true
    this.explosionStartTime = performance.now()
    this.explosionProgress = 0

    if (this.particleData) {
      this.particleData.positions.fill(0)
      if (this.geometry) {
        const positionAttribute = this.geometry.getAttribute('position') as THREE.BufferAttribute
        positionAttribute.needsUpdate = true
      }
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  update(deltaTime: number, speedMultiplier: number = 1): void {
    if (!this.points || !this.particleData || !this.geometry) return

    const currentTime = performance.now()

    if (this.isExploding) {
      const elapsed = currentTime - this.explosionStartTime
      this.explosionProgress = Math.min(elapsed / this.explosionDuration, 1)

      if (this.explosionProgress >= 1) {
        this.isExploding = false
        this.explosionProgress = 1
      }
    }

    this.rotation += deltaTime * 0.1 * speedMultiplier

    const { positions, originalPositions, angles, radii, heights, speeds } = this.particleData
    const explosionEase = this.easeOutCubic(this.explosionProgress)

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      const angle = angles[i] + this.rotation * speeds[i]
      const radius = radii[i]

      let x = Math.cos(angle) * radius
      let z = Math.sin(angle) * radius
      let y = heights[i]

      if (this.isExploding) {
        x = originalPositions[i3] * explosionEase
        y = originalPositions[i3 + 1] * explosionEase
        z = originalPositions[i3 + 2] * explosionEase
      }

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z
    }

    const positionAttribute = this.geometry.getAttribute('position') as THREE.BufferAttribute
    positionAttribute.needsUpdate = true
  }

  updateTheme(theme: ColorTheme): void {
    if (this.theme === theme || !this.particleData || !this.geometry) return

    this.theme = theme
    const themeColors = THEMES[theme].colors.map(c => this.hexToRgb(c))
    const { colors } = this.particleData
    const variation = 0.2

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      const colorIndex = Math.floor(Math.random() * themeColors.length)
      const baseColor = themeColors[colorIndex]

      colors[i3] = THREE.MathUtils.clamp(baseColor.r + (Math.random() - 0.5) * variation, 0, 1)
      colors[i3 + 1] = THREE.MathUtils.clamp(baseColor.g + (Math.random() - 0.5) * variation, 0, 1)
      colors[i3 + 2] = THREE.MathUtils.clamp(baseColor.b + (Math.random() - 0.5) * variation, 0, 1)
    }

    const colorAttribute = this.geometry.getAttribute('color') as THREE.BufferAttribute
    colorAttribute.needsUpdate = true
  }

  updateParticleCount(count: number): void {
    if (count === this.particleCount) return
    this.createParticles(count)
  }

  getParticleCount(): number {
    return this.particleCount
  }

  getTheme(): ColorTheme {
    return this.theme
  }

  dispose(): void {
    if (this.points) {
      this.scene.remove(this.points)
      this.points = null
    }

    if (this.geometry) {
      this.geometry.dispose()
      this.geometry = null
    }

    if (this.material) {
      this.material.dispose()
      this.material = null
    }

    this.particleData = null
  }
}
