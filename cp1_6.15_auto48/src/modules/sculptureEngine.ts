import * as THREE from 'three'
import { BandData, BAND_COLORS } from '../store/useStore'

export interface CubeData {
  basePosition: THREE.Vector3
  direction: THREE.Vector3
  baseDistance: number
  colorOffset: number
}

export class SculptureEngine {
  private cubeCount: number
  private sphereRadius: number
  private cubeSize: number
  private maxOffset: number
  private cubes: CubeData[]
  private positions: Float32Array
  private colors: Float32Array

  constructor(cubeCount = 2000, sphereRadius = 3, cubeSize = 0.05, maxOffset = 0.3) {
    this.cubeCount = cubeCount
    this.sphereRadius = sphereRadius
    this.cubeSize = cubeSize
    this.maxOffset = maxOffset
    this.cubes = []
    this.positions = new Float32Array(cubeCount * 3)
    this.colors = new Float32Array(cubeCount * 3)
    this.generateCubes()
  }

  private generateCubes(): void {
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < this.cubeCount; i++) {
      const y = 1 - (i / (this.cubeCount - 1)) * 2
      const radius = Math.sqrt(1 - y * y)
      const theta = goldenAngle * i

      const x = Math.cos(theta) * radius
      const z = Math.sin(theta) * radius

      const r = Math.cbrt(Math.random()) * this.sphereRadius
      const direction = new THREE.Vector3(x, y, z).normalize()

      const basePosition = direction.clone().multiplyScalar(r)
      const baseDistance = basePosition.length()

      this.cubes.push({
        basePosition,
        direction,
        baseDistance,
        colorOffset: Math.random() * 0.2 - 0.1
      })

      this.positions[i * 3] = basePosition.x
      this.positions[i * 3 + 1] = basePosition.y
      this.positions[i * 3 + 2] = basePosition.z

      const color = this.getColorForDistance(baseDistance, 0.5)
      this.colors[i * 3] = color.r
      this.colors[i * 3 + 1] = color.g
      this.colors[i * 3 + 2] = color.b
    }
  }

  private getColorForDistance(distance: number, intensity: number): THREE.Color {
    const normalizedDist = distance / this.sphereRadius

    const warmColor = new THREE.Color(0xff6b35)
    const coolColor = new THREE.Color(0x4a90e2)

    const t = Math.min(1, Math.max(0, normalizedDist))
    const baseColor = warmColor.clone().lerp(coolColor, t)

    const brightness = 0.6 + intensity * 0.4
    baseColor.multiplyScalar(brightness)

    return baseColor
  }

  public update(bandData: BandData, time: number): void {
    const alphaWeight = bandData.alpha * 0.3
    const betaWeight = bandData.beta * 0.25
    const thetaWeight = bandData.theta * 0.25
    const deltaWeight = bandData.delta * 0.2

    const totalWeight = alphaWeight + betaWeight + thetaWeight + deltaWeight

    const dominantBand = this.getDominantBand(bandData)
    const dominantColor = new THREE.Color(BAND_COLORS[dominantBand])

    for (let i = 0; i < this.cubeCount; i++) {
      const cube = this.cubes[i]

      const waveOffset =
        Math.sin(cube.baseDistance * 2 + time * 1.5) * 0.1 +
        Math.sin(cube.baseDistance * 4 - time * 2) * 0.05

      const offsetMagnitude =
        (totalWeight * this.maxOffset + waveOffset * this.maxOffset * 0.3) *
        (0.7 + cube.colorOffset * 0.6)

      const offset = cube.direction.clone().multiplyScalar(offsetMagnitude)

      const twistAngle = totalWeight * 0.3 * Math.sin(cube.baseDistance * 1.5 + time * 0.5)
      const twistAxis = new THREE.Vector3(0, 1, 0)
      const twistedOffset = offset.clone().applyAxisAngle(twistAxis, twistAngle)

      const newPos = cube.basePosition.clone().add(twistedOffset)

      this.positions[i * 3] = newPos.x
      this.positions[i * 3 + 1] = newPos.y
      this.positions[i * 3 + 2] = newPos.z

      const distance = newPos.length()
      const baseColor = this.getColorForDistance(distance, totalWeight)

      const blendFactor = Math.min(1, totalWeight * 1.5) * (0.5 + cube.colorOffset * 0.5)
      const finalColor = baseColor.clone().lerp(dominantColor, blendFactor * 0.3)

      this.colors[i * 3] = finalColor.r
      this.colors[i * 3 + 1] = finalColor.g
      this.colors[i * 3 + 2] = finalColor.b
    }
  }

  private getDominantBand(bandData: BandData): keyof BandData {
    const bands: (keyof BandData)[] = ['alpha', 'beta', 'theta', 'delta']
    let maxBand: keyof BandData = 'alpha'
    let maxValue = 0

    for (const band of bands) {
      if (bandData[band] > maxValue) {
        maxValue = bandData[band]
        maxBand = band
      }
    }

    return maxBand
  }

  public getPositions(): Float32Array {
    return this.positions
  }

  public getColors(): Float32Array {
    return this.colors
  }

  public getCubeCount(): number {
    return this.cubeCount
  }

  public getCubeSize(): number {
    return this.cubeSize
  }
}
