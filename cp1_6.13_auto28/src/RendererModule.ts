import * as THREE from 'three'
import { Particle, PARTICLE_CONFIG, ParticleType } from './types'

interface PooledMesh {
  mesh: THREE.Mesh
  glowInner: THREE.Mesh
  glowOuter: THREE.Mesh
  auraSprite: THREE.Sprite
  trail: THREE.Line
  baseMaterial: THREE.MeshBasicMaterial
  glowInnerMaterial: THREE.MeshBasicMaterial
  glowOuterMaterial: THREE.MeshBasicMaterial
  trailMaterial: THREE.LineBasicMaterial
  particleId: number | null
  active: boolean
}

export class RendererModule {
  private scene: THREE.Scene
  private particleIdToMesh: Map<number, PooledMesh>
  private meshPool: PooledMesh[]
  private geometryCache: Map<string, THREE.SphereGeometry>
  private auraTextureCache: Map<number, THREE.Texture>
  private baseMaterialPool: Map<number, THREE.MeshBasicMaterial>
  private trailMaterialPool: Map<number, THREE.LineBasicMaterial>
  private simulationTime: number = 0
  private readonly POOL_INITIAL_SIZE = 500
  private readonly POOL_GROW_SIZE = 100
  private readonly TRAIL_MAX_LENGTH = 10

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.particleIdToMesh = new Map()
    this.meshPool = []
    this.geometryCache = new Map()
    this.auraTextureCache = new Map()
    this.baseMaterialPool = new Map()
    this.trailMaterialPool = new Map()

    this.preallocatePool(this.POOL_INITIAL_SIZE)
    this.createAmbientParticles()
  }

  private createAuraTexture(color: number): THREE.Texture {
    if (this.auraTextureCache.has(color)) {
      return this.auraTextureCache.get(color)!
    }

    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    const r = ((color >> 16) & 255) / 255
    const g = ((color >> 8) & 255) / 255
    const b = (color & 255) / 255

    gradient.addColorStop(0, `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.8)`)
    gradient.addColorStop(0.3, `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.4)`)
    gradient.addColorStop(0.6, `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.1)`)
    gradient.addColorStop(1, `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0)`)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    this.auraTextureCache.set(color, texture)
    return texture
  }

  private getOrCreateBaseMaterial(color: number): THREE.MeshBasicMaterial {
    if (this.baseMaterialPool.has(color)) {
      return this.baseMaterialPool.get(color)!
    }
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1.0,
      depthWrite: false
    })
    this.baseMaterialPool.set(color, mat)
    return mat
  }

  private getOrCreateTrailMaterial(color: number): THREE.LineBasicMaterial {
    if (this.trailMaterialPool.has(color)) {
      return this.trailMaterialPool.get(color)!
    }
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    })
    this.trailMaterialPool.set(color, mat)
    return mat
  }

  private getGeometry(size: number): THREE.SphereGeometry {
    const key = size.toFixed(2)
    if (!this.geometryCache.has(key)) {
      this.geometryCache.set(key, new THREE.SphereGeometry(size, 12, 12))
    }
    return this.geometryCache.get(key)!
  }

  private createPooledMesh(): PooledMesh {
    const baseGeom = this.getGeometry(1.0)
    const baseMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      depthWrite: false
    })
    const mesh = new THREE.Mesh(baseGeom, baseMat)
    mesh.visible = false
    this.scene.add(mesh)

    const glowInnerGeom = this.getGeometry(1.5)
    const glowInnerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
      depthWrite: false
    })
    const glowInner = new THREE.Mesh(glowInnerGeom, glowInnerMat)
    glowInner.visible = false
    this.scene.add(glowInner)

    const glowOuterGeom = this.getGeometry(2.5)
    const glowOuterMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      depthWrite: false
    })
    const glowOuter = new THREE.Mesh(glowOuterGeom, glowOuterMat)
    glowOuter.visible = false
    this.scene.add(glowOuter)

    const auraMat = new THREE.SpriteMaterial({
      map: this.createAuraTexture(0xffffff),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const auraSprite = new THREE.Sprite(auraMat)
    auraSprite.visible = false
    auraSprite.scale.set(8, 8, 8)
    this.scene.add(auraSprite)

    const trailGeom = new THREE.BufferGeometry()
    const trailPositions = new Float32Array(this.TRAIL_MAX_LENGTH * 3)
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
    const trailMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    })
    const trail = new THREE.Line(trailGeom, trailMat)
    trail.visible = false
    this.scene.add(trail)

    return {
      mesh,
      glowInner,
      glowOuter,
      auraSprite,
      trail,
      baseMaterial: baseMat,
      glowInnerMaterial: glowInnerMat,
      glowOuterMaterial: glowOuterMat,
      trailMaterial: trailMat,
      particleId: null,
      active: false
    }
  }

  private preallocatePool(count: number): void {
    for (let i = 0; i < count; i++) {
      this.meshPool.push(this.createPooledMesh())
    }
  }

  private acquireMesh(): PooledMesh {
    if (this.meshPool.length === 0) {
      this.preallocatePool(this.POOL_GROW_SIZE)
    }
    const pooled = this.meshPool.pop()!
    pooled.active = true
    pooled.mesh.visible = true
    pooled.glowInner.visible = true
    pooled.glowOuter.visible = true
    pooled.trail.visible = true
    return pooled
  }

  private releaseMesh(pooled: PooledMesh): void {
    pooled.active = false
    pooled.particleId = null
    pooled.mesh.visible = false
    pooled.glowInner.visible = false
    pooled.glowOuter.visible = false
    pooled.auraSprite.visible = false
    pooled.auraSprite.material.opacity = 0
    pooled.trail.visible = false
    this.meshPool.push(pooled)
  }

  private createAmbientParticles(): void {
    const starGeometry = new THREE.BufferGeometry()
    const starCount = 3000
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 150 + Math.random() * 200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i + 2] = radius * Math.cos(phi)

      const brightness = 0.2 + Math.random() * 0.8
      colors[i] = brightness * 0.6
      colors[i + 1] = brightness * 0.7
      colors[i + 2] = brightness
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const starMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    })

    const stars = new THREE.Points(starGeometry, starMaterial)
    this.scene.add(stars)
  }

  update(particles: Particle[], simulationTime: number): void {
    this.simulationTime = simulationTime
    const currentIds = new Set(particles.map(p => p.id))

    for (const [id, pooled] of this.particleIdToMesh) {
      if (!currentIds.has(id)) {
        this.releaseMesh(pooled)
        this.particleIdToMesh.delete(id)
      }
    }

    for (const particle of particles) {
      let pooled = this.particleIdToMesh.get(particle.id)
      if (!pooled) {
        pooled = this.acquireMesh()
        pooled.particleId = particle.id
        this.setupParticleMesh(particle, pooled)
        this.particleIdToMesh.set(particle.id, pooled)
      }
      this.updatePooledMesh(particle, pooled)
    }
  }

  private setupParticleMesh(particle: Particle, pooled: PooledMesh): void {
    const config = PARTICLE_CONFIG[particle.type]
    
    pooled.baseMaterial.color.setHex(config.color)
    pooled.glowInnerMaterial.color.setHex(config.color)
    pooled.glowOuterMaterial.color.setHex(config.color)
    pooled.trailMaterial.color.setHex(config.color)
    
    const auraMat = pooled.auraSprite.material as THREE.SpriteMaterial
    auraMat.map = this.createAuraTexture(config.color)
    auraMat.color.setHex(config.color)
  }

  private updatePooledMesh(particle: Particle, pooled: PooledMesh): void {
    const config = PARTICLE_CONFIG[particle.type]
    
    let opacity = 1.0
    let baseScale = particle.size
    let glowInnerOpacity = 0.35
    let glowOuterOpacity = 0.15
    let auraOpacity = 0
    let auraScale = particle.size * 6

    if (particle.fadeStartTime !== null) {
      const fadeProgress = Math.min(1, (this.simulationTime - particle.fadeStartTime) * 2)
      opacity = 1 - fadeProgress
      baseScale = particle.size * (1 - fadeProgress * 0.6)
      glowInnerOpacity = 0.35 * (1 - fadeProgress)
      glowOuterOpacity = 0.15 * (1 - fadeProgress)
    }

    if (particle.energy < 0.5) {
      const energyFactor = Math.max(0.3, particle.energy / 0.5)
      opacity *= energyFactor
    }

    if (particle.isSelected) {
      const pulse = 1 + Math.sin(this.simulationTime * 5) * 0.12
      baseScale = particle.size * 1.5 * pulse
      glowInnerOpacity = 0.6
      glowOuterOpacity = 0.35
      auraOpacity = 0.5 + Math.sin(this.simulationTime * 3) * 0.2
      auraScale = particle.size * 12 * pulse
    }

    pooled.mesh.position.set(particle.position.x, particle.position.y, particle.position.z)
    pooled.mesh.scale.setScalar(baseScale)
    pooled.baseMaterial.opacity = opacity

    pooled.glowInner.position.copy(pooled.mesh.position)
    pooled.glowInner.scale.setScalar(baseScale * 1.6)
    pooled.glowInnerMaterial.opacity = glowInnerOpacity

    pooled.glowOuter.position.copy(pooled.mesh.position)
    pooled.glowOuter.scale.setScalar(baseScale * 2.8)
    pooled.glowOuterMaterial.opacity = glowOuterOpacity

    const auraMat = pooled.auraSprite.material as THREE.SpriteMaterial
    pooled.auraSprite.position.copy(pooled.mesh.position)
    pooled.auraSprite.scale.set(auraScale, auraScale, auraScale)
    if (auraOpacity > 0.01) {
      pooled.auraSprite.visible = true
      auraMat.opacity = auraOpacity
    } else {
      pooled.auraSprite.visible = false
    }

    this.updateTrail(particle, pooled, opacity)
  }

  private updateTrail(particle: Particle, pooled: PooledMesh, baseOpacity: number): void {
    const positions = pooled.trail.geometry.attributes.position.array as Float32Array
    const trailLength = Math.min(particle.trail.length, this.TRAIL_MAX_LENGTH)

    for (let i = 0; i < trailLength && i < particle.trail.length; i++) {
      const pos = particle.trail[i]
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z
    }

    for (let i = trailLength; i < this.TRAIL_MAX_LENGTH; i++) {
      positions[i * 3] = particle.position.x
      positions[i * 3 + 1] = particle.position.y
      positions[i * 3 + 2] = particle.position.z
    }

    pooled.trail.geometry.attributes.position.needsUpdate = true
    pooled.trailMaterial.opacity = baseOpacity * 0.35
  }

  getMeshes(): THREE.Mesh[] {
    const result: THREE.Mesh[] = []
    for (const pooled of this.particleIdToMesh.values()) {
      result.push(pooled.mesh)
    }
    return result
  }

  getParticleIdFromMesh(mesh: THREE.Mesh): number | null {
    for (const [id, pooled] of this.particleIdToMesh) {
      if (pooled.mesh === mesh) {
        return id
      }
    }
    return null
  }

  getActiveCount(): number {
    return this.particleIdToMesh.size
  }

  getPoolSize(): number {
    return this.meshPool.length
  }

  dispose(): void {
    for (const pooled of this.particleIdToMesh.values()) {
      this.scene.remove(pooled.mesh)
      this.scene.remove(pooled.glowInner)
      this.scene.remove(pooled.glowOuter)
      this.scene.remove(pooled.auraSprite)
      this.scene.remove(pooled.trail)
    }
    this.particleIdToMesh.clear()

    for (const pooled of this.meshPool) {
      this.scene.remove(pooled.mesh)
      this.scene.remove(pooled.glowInner)
      this.scene.remove(pooled.glowOuter)
      this.scene.remove(pooled.auraSprite)
      this.scene.remove(pooled.trail)
      pooled.baseMaterial.dispose()
      pooled.glowInnerMaterial.dispose()
      pooled.glowOuterMaterial.dispose()
      ;(pooled.auraSprite.material as THREE.SpriteMaterial).dispose()
      pooled.trailMaterial.dispose()
    }
    this.meshPool = []

    for (const geo of this.geometryCache.values()) {
      geo.dispose()
    }
    this.geometryCache.clear()

    for (const tex of this.auraTextureCache.values()) {
      tex.dispose()
    }
    this.auraTextureCache.clear()

    for (const mat of this.baseMaterialPool.values()) {
      mat.dispose()
    }
    this.baseMaterialPool.clear()

    for (const mat of this.trailMaterialPool.values()) {
      mat.dispose()
    }
    this.trailMaterialPool.clear()
  }
}
