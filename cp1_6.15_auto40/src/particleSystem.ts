import * as THREE from 'three'
import { FacialExpressions, ColorTheme, colorPalettes } from './store'

export class ParticleSystem {
  public points: THREE.Points
  public geometry: THREE.BufferGeometry
  public material: THREE.PointsMaterial
  private particleCount: number
  private basePositions: Float32Array
  private positions: Float32Array
  private velocities: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private lifetimes: Float32Array
  private targetRadii: Float32Array
  private baseAngles: Float32Array
  private baseHeights: Float32Array
  private maxCount: number = 4000
  private currentTheme: ColorTheme = 'nebula'
  private time: number = 0
  private lastMouthOpen: number = 0
  private explosionPhase: number = 0

  constructor(initialCount: number = 2000) {
    this.particleCount = initialCount
    this.maxCount = Math.max(4000, initialCount * 2)
    
    this.basePositions = new Float32Array(this.maxCount * 3)
    this.positions = new Float32Array(this.maxCount * 3)
    this.velocities = new Float32Array(this.maxCount * 3)
    this.colors = new Float32Array(this.maxCount * 3)
    this.sizes = new Float32Array(this.maxCount)
    this.lifetimes = new Float32Array(this.maxCount)
    this.targetRadii = new Float32Array(this.maxCount)
    this.baseAngles = new Float32Array(this.maxCount)
    this.baseHeights = new Float32Array(this.maxCount)
    
    this.initializeParticles()
    
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setDrawRange(0, this.particleCount)
    
    this.material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })
    
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
  }

  private initializeParticles(): void {
    const palette = colorPalettes[this.currentTheme]
    
    for (let i = 0; i < this.maxCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 1.8 + Math.random() * 1.5
      
      this.baseAngles[i] = angle
      this.baseHeights[i] = Math.cos(phi)
      
      const baseRadius = radius
      this.targetRadii[i] = baseRadius
      
      const x = baseRadius * Math.sin(phi) * Math.cos(angle)
      const y = baseRadius * this.baseHeights[i]
      const z = baseRadius * Math.sin(phi) * Math.sin(angle)
      
      this.basePositions[i * 3] = x
      this.basePositions[i * 3 + 1] = y
      this.basePositions[i * 3 + 2] = z
      
      this.positions[i * 3] = x
      this.positions[i * 3 + 1] = y
      this.positions[i * 3 + 2] = z
      
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.01
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01
      
      const colorIdx = Math.floor(Math.random() * palette.length)
      const color = new THREE.Color(palette[colorIdx])
      this.colors[i * 3] = color.r
      this.colors[i * 3 + 1] = color.g
      this.colors[i * 3 + 2] = color.b
      
      this.sizes[i] = 0.05 + Math.random() * 0.1
      
      this.lifetimes[i] = Math.random() * 2
    }
  }

  public setCount(count: number): void {
    const newCount = Math.min(this.maxCount, Math.max(1000, count))
    if (newCount !== this.particleCount) {
      this.particleCount = newCount
      this.geometry.setDrawRange(0, this.particleCount)
      this.geometry.attributes.position.needsUpdate = true
      this.geometry.attributes.color.needsUpdate = true
      this.geometry.attributes.size.needsUpdate = true
    }
  }

  public setColorTheme(theme: ColorTheme): void {
    if (theme === this.currentTheme) return
    this.currentTheme = theme
    
    const palette = colorPalettes[theme]
    for (let i = 0; i < this.maxCount; i++) {
      const colorIdx = Math.floor(Math.random() * palette.length)
      const color = new THREE.Color(palette[colorIdx])
      this.colors[i * 3] = color.r
      this.colors[i * 3 + 1] = color.g
      this.colors[i * 3 + 2] = color.b
    }
    this.geometry.attributes.color.needsUpdate = true
  }

  public update(expressions: FacialExpressions, deltaTime: number): void {
    this.time += deltaTime
    
    const mouthOpen = expressions.mouthOpen
    const leftBrow = expressions.leftBrowHeight
    const rightBrow = expressions.rightBrowHeight
    const mouthCurve = expressions.mouthCurve
    const avgBrowHeight = (leftBrow + rightBrow) / 2
    const isFrowning = avgBrowHeight < 0.3
    
    if (mouthOpen > 0.5 && this.lastMouthOpen <= 0.5) {
      this.explosionPhase = 1
    }
    this.lastMouthOpen = mouthOpen
    
    if (this.explosionPhase > 0) {
      this.explosionPhase = Math.max(0, this.explosionPhase - deltaTime * 1.2)
    }
    
    const explosionBoost = Math.sin(this.explosionPhase * Math.PI) * 4
    
    const palette = colorPalettes[this.currentTheme]
    const frownColor = new THREE.Color('#ff4444')
    const baseColor = new THREE.Color(palette[0])
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      
      this.lifetimes[i] -= deltaTime
      if (this.lifetimes[i] <= 0) {
        this.lifetimes[i] = 2
        const angle = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        this.baseAngles[i] = angle
        this.baseHeights[i] = Math.cos(phi)
        
        const colorIdx = Math.floor(Math.random() * palette.length)
        const color = new THREE.Color(palette[colorIdx])
        this.colors[i3] = color.r
        this.colors[i3 + 1] = color.g
        this.colors[i3 + 2] = color.b
      }
      
      let targetRadius: number
      
      if (mouthOpen > 0.5) {
        const breathPulse = Math.sin(this.time * 3 + i * 0.01) * 0.3
        targetRadius = 8 * mouthOpen + explosionBoost + breathPulse
      } else if (isFrowning) {
        const contractAmount = (0.3 - avgBrowHeight) / 0.3
        targetRadius = 1.5 - contractAmount * 0.8
      } else {
        targetRadius = 2 + Math.sin(this.time * 1.5 + i * 0.02) * 0.2
      }
      
      const radiusLerp = 1 - Math.exp(-deltaTime * 3)
      this.targetRadii[i] += (targetRadius - this.targetRadii[i]) * radiusLerp
      
      const smileRotation = (mouthCurve - 0.5) * 2
      const rotationSpeed = 0.5 + smileRotation * 2.5
      this.baseAngles[i] += deltaTime * rotationSpeed * 0.3
      
      if (Math.abs(smileRotation) > 0.1) {
        const smileArc = Math.sin(this.baseAngles[i] * 2) * smileRotation * 0.3
        this.baseHeights[i] += Math.sin(this.time + i * 0.05) * deltaTime * 0.1 * smileRotation
        this.baseHeights[i] = Math.max(-1, Math.min(1, this.baseHeights[i] + smileArc * 0.1))
      }
      
      const r = this.targetRadii[i]
      const sinPhi = Math.sqrt(Math.max(0, 1 - this.baseHeights[i] * this.baseHeights[i]))
      const targetX = r * sinPhi * Math.cos(this.baseAngles[i])
      const targetY = r * this.baseHeights[i]
      const targetZ = r * sinPhi * Math.sin(this.baseAngles[i])
      
      this.velocities[i3] += (targetX - this.positions[i3]) * deltaTime * 4
      this.velocities[i3 + 1] += (targetY - this.positions[i3 + 1]) * deltaTime * 4
      this.velocities[i3 + 2] += (targetZ - this.positions[i3 + 2]) * deltaTime * 4
      
      this.velocities[i3] *= 0.92
      this.velocities[i3 + 1] *= 0.92
      this.velocities[i3 + 2] *= 0.92
      
      this.positions[i3] += this.velocities[i3]
      this.positions[i3 + 1] += this.velocities[i3 + 1]
      this.positions[i3 + 2] += this.velocities[i3 + 2]
      
      const targetSize = 0.05 + mouthOpen * 0.1 + Math.abs(smileRotation) * 0.05
      this.sizes[i] += (targetSize - this.sizes[i]) * deltaTime * 5
      
      if (isFrowning) {
        const frownBlend = (0.3 - avgBrowHeight) / 0.3
        this.colors[i3] = this.colors[i3] * (1 - frownBlend * 0.02) + frownColor.r * frownBlend * 0.02
        this.colors[i3 + 1] = this.colors[i3 + 1] * (1 - frownBlend * 0.02) + frownColor.g * frownBlend * 0.02
        this.colors[i3 + 2] = this.colors[i3 + 2] * (1 - frownBlend * 0.02) + frownColor.b * frownBlend * 0.02
      } else if (mouthOpen > 0.7) {
        const warmBlend = (mouthOpen - 0.7) / 0.3
        this.colors[i3] += warmBlend * deltaTime * 0.3
        this.colors[i3 + 1] += warmBlend * deltaTime * 0.1
      } else {
        const colorIdx = Math.floor((i / this.particleCount) * palette.length) % palette.length
        const origColor = new THREE.Color(palette[colorIdx])
        this.colors[i3] += (origColor.r - this.colors[i3]) * deltaTime * 0.3
        this.colors[i3 + 1] += (origColor.g - this.colors[i3 + 1]) * deltaTime * 0.3
        this.colors[i3 + 2] += (origColor.b - this.colors[i3 + 2]) * deltaTime * 0.3
      }
      
      this.colors[i3] = Math.max(0, Math.min(1, this.colors[i3]))
      this.colors[i3 + 1] = Math.max(0, Math.min(1, this.colors[i3 + 1]))
      this.colors[i3 + 2] = Math.max(0, Math.min(1, this.colors[i3 + 2]))
    }
    
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    
    const avgSize = (0.05 + mouthOpen * 0.1)
    this.material.size = avgSize
    
    const opacity = 0.6 + mouthOpen * 0.3
    this.material.opacity = opacity
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
