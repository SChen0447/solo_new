import * as THREE from 'three'
import { Particle, PARTICLE_CONFIG } from './types'

interface ParticleMeshData {
  mesh: THREE.Mesh
  glow: THREE.Mesh
  trail: THREE.Line
  userData: { particleId: number }
}

export class RendererModule {
  private scene: THREE.Scene
  private particleMeshes: Map<number, ParticleMeshData>
  private geometryCache: Map<string, THREE.SphereGeometry>
  private materialCache: Map<number, THREE.MeshBasicMaterial>
  private glowMaterialCache: Map<number, THREE.MeshBasicMaterial>
  private simulationTime: number = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.particleMeshes = new Map()
    this.geometryCache = new Map()
    this.materialCache = new Map()
    this.glowMaterialCache = new Map()
    this.createAmbientParticles()
  }

  private createAmbientParticles(): void {
    const starGeometry = new THREE.BufferGeometry()
    const starCount = 2000
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 200 + Math.random() * 100
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i + 2] = radius * Math.cos(phi)

      const brightness = 0.3 + Math.random() * 0.7
      colors[i] = brightness * 0.6
      colors[i + 1] = brightness * 0.7
      colors[i + 2] = brightness
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const starMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    })

    const stars = new THREE.Points(starGeometry, starMaterial)
    this.scene.add(stars)
  }

  private getGeometry(size: number): THREE.SphereGeometry {
    const key = size.toFixed(2)
    if (!this.geometryCache.has(key)) {
      this.geometryCache.set(key, new THREE.SphereGeometry(size, 16, 16))
    }
    return this.geometryCache.get(key)!
  }

  private getMaterial(color: number, isSelected: boolean, opacity: number): THREE.MeshBasicMaterial {
    const key = color | (isSelected ? 0x1000000 : 0) | Math.round(opacity * 255) << 25
    if (!this.materialCache.has(key)) {
      this.materialCache.set(
        key,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity
        })
      )
    }
    const material = this.materialCache.get(key)!
    material.opacity = opacity
    return material
  }

  private getGlowMaterial(color: number, intensity: number): THREE.MeshBasicMaterial {
    const key = color | Math.round(intensity * 255) << 24
    if (!this.glowMaterialCache.has(key)) {
      this.glowMaterialCache.set(
        key,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.4 * intensity,
          side: THREE.BackSide
        })
      )
    }
    const material = this.glowMaterialCache.get(key)!
    material.opacity = 0.4 * intensity
    return material
  }

  private createParticleMesh(particle: Particle): ParticleMeshData {
    const config = PARTICLE_CONFIG[particle.type]
    const geometry = this.getGeometry(particle.size)
    const material = this.getMaterial(config.color, particle.isSelected, 1)

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(particle.position.x, particle.position.y, particle.position.z)
    mesh.userData = { particleId: particle.id }

    const glowGeometry = this.getGeometry(particle.size * 1.5)
    const glowMaterial = this.getGlowMaterial(config.color, 0.5)
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.copy(mesh.position)

    const trailGeometry = new THREE.BufferGeometry()
    const trailPositions = new Float32Array(30)
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
    
    const trailMaterial = new THREE.LineBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.6
    })
    const trail = new THREE.Line(trailGeometry, trailMaterial)

    this.scene.add(mesh)
    this.scene.add(glow)
    this.scene.add(trail)

    return { mesh, glow, trail, userData: { particleId: particle.id } }
  }

  update(particles: Particle[], simulationTime: number): void {
    this.simulationTime = simulationTime
    const currentIds = new Set(particles.map(p => p.id))

    for (const [id, meshData] of this.particleMeshes) {
      if (!currentIds.has(id)) {
        this.scene.remove(meshData.mesh)
        this.scene.remove(meshData.glow)
        this.scene.remove(meshData.trail)
        this.particleMeshes.delete(id)
      }
    }

    for (const particle of particles) {
      let meshData = this.particleMeshes.get(particle.id)
      if (!meshData) {
        meshData = this.createParticleMesh(particle)
        this.particleMeshes.set(particle.id, meshData)
      }

      this.updateParticleMesh(particle, meshData)
    }
  }

  private updateParticleMesh(particle: Particle, meshData: ParticleMeshData): void {
    const config = PARTICLE_CONFIG[particle.type]
    
    let opacity = 1
    let scale = 1
    let glowIntensity = 0.3

    if (particle.fadeStartTime !== null) {
      const fadeProgress = Math.min(1, (this.simulationTime - particle.fadeStartTime) * 2)
      opacity = 1 - fadeProgress
      scale = 1 - fadeProgress * 0.5
    }

    if (particle.energy < 0.5) {
      opacity *= 0.6
    }

    if (particle.isSelected) {
      scale *= 1.5
      glowIntensity = 0.8
      const pulse = Math.sin(this.simulationTime * 4) * 0.1 + 1
      scale *= pulse
    }

    meshData.mesh.position.set(particle.position.x, particle.position.y, particle.position.z)
    meshData.mesh.scale.setScalar(scale)
    meshData.mesh.material = this.getMaterial(config.color, particle.isSelected, opacity)

    meshData.glow.position.copy(meshData.mesh.position)
    meshData.glow.scale.setScalar(scale * 1.5)
    meshData.glow.material = this.getGlowMaterial(config.color, glowIntensity)

    this.updateTrail(particle, meshData.trail, opacity)
  }

  private updateTrail(particle: Particle, trail: THREE.Line, opacity: number): void {
    const positions = trail.geometry.attributes.position.array as Float32Array
    const trailLength = Math.min(particle.trail.length, 10)

    for (let i = 0; i < trailLength && i < particle.trail.length; i++) {
      const pos = particle.trail[i]
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z
    }

    for (let i = trailLength; i < 10; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
    }

    trail.geometry.attributes.position.needsUpdate = true
    const trailMaterial = trail.material as THREE.LineBasicMaterial
    trailMaterial.opacity = opacity * 0.4
  }

  getMeshes(): THREE.Mesh[] {
    return Array.from(this.particleMeshes.values()).map(d => d.mesh)
  }

  getParticleIdFromMesh(mesh: THREE.Mesh): number | null {
    const meshData = this.particleMeshes.get(mesh.userData.particleId)
    if (meshData && meshData.mesh === mesh) {
      return mesh.userData.particleId
    }
    return null
  }

  dispose(): void {
    for (const meshData of this.particleMeshes.values()) {
      this.scene.remove(meshData.mesh)
      this.scene.remove(meshData.glow)
      this.scene.remove(meshData.trail)
    }
    this.particleMeshes.clear()
    this.geometryCache.clear()
    this.materialCache.clear()
    this.glowMaterialCache.clear()
  }
}
