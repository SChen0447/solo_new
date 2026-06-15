import * as THREE from 'three'
import { WeatherType, ParticleData, generateId } from './useParticleStore'

export const WEATHER_COLORS: Record<WeatherType, number> = {
  rain: 0x4fc3f7,
  snow: 0xffffff,
  fog: 0xbdbdbd,
  thunderstorm: 0x4fc3f7
}

export const WEATHER_THEME_COLORS: Record<WeatherType, string> = {
  rain: '#4fc3f7',
  snow: '#e0e0e0',
  fog: '#bdbdbd',
  thunderstorm: '#ff8a65'
}

const RAIN_COUNT = 1000
const SNOW_COUNT = 1500
const FOG_COUNT = 2000
const THUNDERSTORM_RAIN_COUNT = 800
const THUNDERSTORM_LIGHTNING_COUNT = 200

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function createRainParticle(id: number): ParticleData {
  return {
    id,
    x: randRange(-15, 15),
    y: randRange(-5, 20),
    z: randRange(-15, 15),
    vx: 0,
    vy: -10,
    vz: 0,
    size: randRange(3, 4),
    life: randRange(0, 2.5),
    maxLife: 2.5,
    alpha: 0.6
  }
}

function createSnowParticle(id: number): ParticleData {
  return {
    id,
    x: randRange(-15, 15),
    y: randRange(-3, 20),
    z: randRange(-15, 15),
    vx: randRange(-0.5, 0.5),
    vy: randRange(-4, -2),
    vz: randRange(-0.5, 0.5),
    size: randRange(2, 5),
    life: randRange(0, 10),
    maxLife: 10,
    alpha: 0.8
  }
}

function createFogParticle(id: number): ParticleData {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.random() * Math.PI * 2
  const speed = randRange(0.1, 0.5)
  return {
    id,
    x: randRange(-15, 15),
    y: randRange(0, 8),
    z: randRange(-15, 15),
    vx: Math.sin(theta) * Math.cos(phi) * speed,
    vy: Math.sin(phi) * speed * 0.5,
    vz: Math.cos(theta) * Math.cos(phi) * speed,
    size: randRange(8, 15),
    life: randRange(0, 30),
    maxLife: 30,
    alpha: 0.3
  }
}

function createThunderstormRainParticle(id: number): ParticleData {
  return {
    id,
    x: randRange(-15, 15),
    y: randRange(-5, 20),
    z: randRange(-15, 15),
    vx: 0,
    vy: -12,
    vz: 0,
    size: randRange(3, 4),
    life: randRange(0, 2.1),
    maxLife: 2.1,
    alpha: 0.7
  }
}

function createLightningParticle(id: number): ParticleData {
  return {
    id,
    x: randRange(-15, 15),
    y: randRange(5, 15),
    z: randRange(-10, 10),
    vx: 0,
    vy: 0,
    vz: 0,
    size: 6,
    life: randRange(1, 3),
    maxLife: 3,
    alpha: 0,
    isLightning: true,
    flashDuration: randRange(0.1, 0.3),
    flashTimer: randRange(0.5, 2)
  }
}

export function generateParticlesForWeather(type: WeatherType, count?: number): ParticleData[] {
  const particles: ParticleData[] = []
  let id = 0

  switch (type) {
    case 'rain': {
      const n = count ?? RAIN_COUNT
      for (let i = 0; i < n; i++) {
        particles.push(createRainParticle(id++))
      }
      break
    }
    case 'snow': {
      const n = count ?? SNOW_COUNT
      for (let i = 0; i < n; i++) {
        particles.push(createSnowParticle(id++))
      }
      break
    }
    case 'fog': {
      const n = count ?? FOG_COUNT
      for (let i = 0; i < n; i++) {
        particles.push(createFogParticle(id++))
      }
      break
    }
    case 'thunderstorm': {
      const rainCount = count ?? THUNDERSTORM_RAIN_COUNT
      for (let i = 0; i < rainCount; i++) {
        particles.push(createThunderstormRainParticle(id++))
      }
      for (let i = 0; i < THUNDERSTORM_LIGHTNING_COUNT; i++) {
        particles.push(createLightningParticle(id++))
      }
      break
    }
  }
  return particles
}

export function updateParticle(p: ParticleData, dt: number, type: WeatherType, time: number): ParticleData {
  const updated = { ...p }

  if (updated.isLightning) {
    updated.flashTimer! -= dt
    if (updated.flashTimer! <= 0) {
      updated.alpha = 1.0
      updated.flashTimer = randRange(1, 3)
      updated.flashDuration = randRange(0.1, 0.3)
      updated.x = randRange(-15, 15)
      updated.y = randRange(5, 15)
      updated.z = randRange(-10, 10)
    } else {
      updated.flashDuration! -= dt
      if (updated.flashDuration! <= 0) {
        updated.alpha = Math.max(0, updated.alpha - dt * 5)
      }
    }
    return updated
  }

  updated.x += updated.vx * dt
  updated.y += updated.vy * dt
  updated.z += updated.vz * dt
  updated.life += dt

  switch (type) {
    case 'rain': {
      updated.x += Math.sin(time * 2 + p.id) * 0.5 * dt
      if (updated.y < -5) {
        updated.y = 20
        updated.x = randRange(-15, 15)
        updated.z = randRange(-15, 15)
        updated.life = 0
      }
      break
    }
    case 'snow': {
      const windX = Math.sin(time * 1.3 + p.id * 0.1) * 2
      const windZ = Math.cos(time * 1.1 + p.id * 0.15) * 2
      updated.vx = windX * 0.5 + Math.sin(time * 1 + p.id) * 2
      updated.vz = windZ * 0.5 + Math.cos(time * 0.8 + p.id) * 2
      if (updated.y < -3) {
        updated.y = 20
        updated.x = randRange(-15, 15)
        updated.z = randRange(-15, 15)
        updated.life = 0
      }
      break
    }
    case 'fog': {
      if (updated.y < 0) updated.vy = Math.abs(updated.vy)
      if (updated.y > 8) updated.vy = -Math.abs(updated.vy)
      if (updated.x < -15 || updated.x > 15) updated.vx *= -1
      if (updated.z < -15 || updated.z > 15) updated.vz *= -1
      break
    }
    case 'thunderstorm': {
      updated.x += Math.sin(time * 2.5 + p.id) * 0.6 * dt
      if (updated.y < -5) {
        updated.y = 20
        updated.x = randRange(-15, 15)
        updated.z = randRange(-15, 15)
        updated.life = 0
      }
      break
    }
  }

  return updated
}

export class ParticleRenderer {
  private scene: THREE.Scene
  private points: THREE.Points | null = null
  private geometry: THREE.BufferGeometry | null = null
  private material: THREE.PointsMaterial | null = null
  private lightningLight: THREE.PointLight | null = null
  private currentType: WeatherType = 'rain'
  private transitionAlpha: number = 1
  private targetAlpha: number = 1

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.initLightningLight()
  }

  private initLightningLight(): void {
    this.lightningLight = new THREE.PointLight(0xffffff, 0, 50)
    this.lightningLight.position.set(0, 10, 0)
    this.scene.add(this.lightningLight)
  }

  setWeatherType(type: WeatherType): void {
    if (this.currentType !== type) {
      this.currentType = type
      this.transitionAlpha = 0
    }
  }

  rebuild(particles: ParticleData[], type: WeatherType): void {
    this.dispose()
    this.currentType = type

    this.geometry = new THREE.BufferGeometry()
    const count = particles.length
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const alphas = new Float32Array(count)

    const color = new THREE.Color(WEATHER_COLORS[type])
    const lightningColor = new THREE.Color(0xffffff)

    for (let i = 0; i < count; i++) {
      const p = particles[i]
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z

      if (p.isLightning) {
        colors[i * 3] = lightningColor.r
        colors[i * 3 + 1] = lightningColor.g
        colors[i * 3 + 2] = lightningColor.b
      } else {
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      }

      sizes[i] = p.size
      alphas[i] = p.alpha
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.points)
  }

  update(particles: ParticleData[], dt: number, cameraDistance: number): { isFlashing: boolean } {
    if (!this.geometry || !this.points) return { isFlashing: false }

    const positions = this.geometry.attributes.position.array as Float32Array
    const alphas = this.geometry.attributes.alpha.array as Float32Array
    const sizes = this.geometry.attributes.size.array as Float32Array
    const colors = this.geometry.attributes.color.array as Float32Array

    let lightningFlash = false
    let maxLightningAlpha = 0
    let flashX = 0, flashY = 0, flashZ = 0

    const distanceScale = cameraDistance / 15

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z

      let finalAlpha = p.alpha * this.transitionAlpha

      if (this.currentType === 'fog' && !p.isLightning) {
        let nearbyCount = 0
        for (let j = Math.max(0, i - 10); j < Math.min(particles.length, i + 10); j++) {
          if (j === i) continue
          const other = particles[j]
          if (other.isLightning) continue
          const dx = p.x - other.x
          const dy = p.y - other.y
          const dz = p.z - other.z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (dist < 3) nearbyCount++
        }
        finalAlpha = Math.max(0.1, 0.3 - nearbyCount * 0.02) * this.transitionAlpha
      }

      alphas[i] = finalAlpha

      let sizeMultiplier = 1
      if (this.currentType === 'fog' || this.currentType === 'snow') {
        sizeMultiplier = distanceScale
      }
      sizes[i] = p.size * sizeMultiplier * 0.08

      if (p.isLightning && p.alpha > 0.5) {
        lightningFlash = true
        if (p.alpha > maxLightningAlpha) {
          maxLightningAlpha = p.alpha
          flashX = p.x
          flashY = p.y
          flashZ = p.z
        }
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 1.0
        colors[i * 3 + 2] = 1.0
      }
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.alpha.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true

    if (this.lightningLight) {
      this.lightningLight.position.set(flashX, flashY, flashZ)
      this.lightningLight.intensity = maxLightningAlpha * 5
    }

    this.transitionAlpha += (this.targetAlpha - this.transitionAlpha) * Math.min(1, dt / 0.8)

    return { isFlashing: lightningFlash && maxLightningAlpha > 0.8 }
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
  }

  disposeAll(): void {
    this.dispose()
    if (this.lightningLight) {
      this.scene.remove(this.lightningLight)
      this.lightningLight = null
    }
  }
}
