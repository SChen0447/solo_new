import * as THREE from 'three'
import { v4 as uuidv4 } from 'uuid'
import type { FishState, FishSpecies } from '@/types'
import { FISH_SPECIES, SCENE_CONFIG } from '@/types'

export class FishAI {
  private fishStates: FishState[] = []
  private obstacleMeshes: THREE.Mesh[] = []
  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private tempVector: THREE.Vector3 = new THREE.Vector3()
  private tempVector2: THREE.Vector3 = new THREE.Vector3()

  constructor(obstacleMeshes: THREE.Mesh[]) {
    this.obstacleMeshes = obstacleMeshes
    this.initializeFish()
  }

  private initializeFish(): void {
    FISH_SPECIES.forEach((species: FishSpecies) => {
      for (let i = 0; i < species.count; i++) {
        const fish: FishState = {
          id: uuidv4(),
          speciesId: species.id,
          position: this.getRandomPosition(),
          rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
          pathProgress: 0,
          pathPoints: this.generatePath(),
          isHovered: false,
          hoverScale: 1.0
        }
        this.fishStates.push(fish)
      }
    })
  }

  private getRandomPosition(): THREE.Vector3 {
    const boundary = SCENE_CONFIG.boundary
    return new THREE.Vector3(
      (Math.random() - 0.5) * boundary * 1.5,
      this.lerp(SCENE_CONFIG.minDepth + 5, SCENE_CONFIG.maxDepth - 10, Math.random()),
      (Math.random() - 0.5) * boundary * 1.5
    )
  }

  private generatePath(): THREE.Vector3[] {
    const points: THREE.Vector3[] = []
    const startPos = this.getRandomPosition()
    points.push(startPos)

    for (let i = 0; i < 3; i++) {
      points.push(this.getRandomPosition())
    }

    return points
  }

  private bezierPoint(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    const t2 = t * t
    const t3 = t2 * t

    return this.tempVector.set(
      mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
      mt3 * p0.z + 3 * mt2 * t * p1.z + 3 * mt * t2 * p2.z + t3 * p3.z
    )
  }

  private checkObstacleAvoidance(fish: FishState, direction: THREE.Vector3): THREE.Vector3 {
    const avoidanceRadius = SCENE_CONFIG.fishAvoidanceRadius
    let avoidanceForce = this.tempVector2.set(0, 0, 0)
    let obstacleFound = false

    this.raycaster.set(fish.position, direction)
    this.raycaster.far = avoidanceRadius * 3

    const intersects = this.raycaster.intersectObjects(this.obstacleMeshes, false)

    if (intersects.length > 0) {
      const hit = intersects[0]
      const distance = hit.distance

      if (distance < avoidanceRadius * 3) {
        obstacleFound = true
        const normal = hit.face?.normal || new THREE.Vector3(0, 1, 0)
        const obstaclePosition = hit.point

        const awayFromObstacle = fish.position.clone().sub(obstaclePosition).normalize()
        const strength = (avoidanceRadius * 3 - distance) / (avoidanceRadius * 3)

        avoidanceForce.addScaledVector(awayFromObstacle, strength * 2)
        avoidanceForce.addScaledVector(normal, strength * 0.5)
      }
    }

    if (obstacleFound) {
      avoidanceForce.normalize()
      const combined = direction.clone().add(avoidanceForce.multiplyScalar(0.8)).normalize()
      return combined
    }

    return direction
  }

  private getSpeciesById(speciesId: string): FishSpecies | undefined {
    return FISH_SPECIES.find(s => s.id === speciesId)
  }

  public update(deltaTime: number, currentSpeed: number): void {
    const startTime = performance.now()

    this.fishStates.forEach((fish) => {
      const species = this.getSpeciesById(fish.speciesId)
      if (!species) return

      const speed = species.speed * (1 + currentSpeed * 0.3) * deltaTime

      if (fish.pathPoints.length >= 4) {
        fish.pathProgress += speed * 0.05

        if (fish.pathProgress >= 1) {
          fish.pathProgress = 0
          fish.pathPoints = this.generatePath()
        }

        const t = fish.pathProgress
        const p0 = fish.pathPoints[0]
        const p1 = fish.pathPoints[1]
        const p2 = fish.pathPoints[2]
        const p3 = fish.pathPoints[3]

        const targetPos = this.bezierPoint(p0, p1, p2, p3, t)
        const nextT = Math.min(1, t + 0.01)
        const nextPos = this.bezierPoint(p0, p1, p2, p3, nextT)

        let direction = nextPos.clone().sub(targetPos).normalize()
        direction = this.checkObstacleAvoidance(fish, direction)

        const flockOffset = this.getFlockOffset(fish)

        fish.position.lerp(targetPos.add(flockOffset), speed * 2)

        const targetRotation = Math.atan2(direction.x, direction.z)
        fish.rotation.y = this.lerpAngle(fish.rotation.y, targetRotation, deltaTime * 5)

        const rollOffset = Math.sin(Date.now() * 0.005 + fish.position.x) * 0.1
        fish.rotation.z = rollOffset
      }

      if (fish.isHovered) {
        fish.hoverScale = Math.min(1.5, fish.hoverScale + deltaTime * 3)
      } else {
        fish.hoverScale = Math.max(1.0, fish.hoverScale - deltaTime * 3)
      }
    })

    const elapsed = performance.now() - startTime
    if (elapsed > 2) {
      console.warn(`FishAI update took ${elapsed.toFixed(2)}ms, target < 2ms`)
    }
  }

  private getFlockOffset(fish: FishState): THREE.Vector3 {
    const offset = this.tempVector.set(0, 0, 0)
    const nearbyFish = this.fishStates.filter(f =>
      f.id !== fish.id &&
      f.speciesId === fish.speciesId &&
      f.position.distanceTo(fish.position) < 5
    )

    if (nearbyFish.length > 0) {
      nearbyFish.forEach(other => {
        const dist = other.position.distanceTo(fish.position)
        if (dist < 2) {
          const repel = fish.position.clone().sub(other.position).normalize()
          offset.addScaledVector(repel, (2 - dist) * 0.3)
        } else {
          offset.addScaledVector(other.position.clone().sub(fish.position).normalize(), 0.1)
        }
      })
    }

    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.5
    )
    offset.add(randomOffset)

    return offset.multiplyScalar(0.3)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private lerpAngle(a: number, b: number, t: number): number {
    const diff = b - a
    const adjusted = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI
    return a + adjusted * t
  }

  public getFishStates(): FishState[] {
    return this.fishStates
  }

  public setFishHovered(fishId: string | null): void {
    this.fishStates.forEach(fish => {
      fish.isHovered = fish.id === fishId
    })
  }

  public checkHover(mouse: THREE.Vector2, camera: THREE.PerspectiveCamera): { fishId: string; speciesId: string } | null {
    const fishBySpecies = new Map<string, FishState[]>()

    this.fishStates.forEach(fish => {
      if (!fishBySpecies.has(fish.speciesId)) {
        fishBySpecies.set(fish.speciesId, [])
      }
      fishBySpecies.get(fish.speciesId)!.push(fish)
    })

    let closestFish: { fish: FishState; distance: number } | null = null

    fishBySpecies.forEach((fishes) => {
      fishes.forEach(fish => {
        const screenPos = fish.position.clone().project(camera)
        const dx = screenPos.x - mouse.x
        const dy = screenPos.y - mouse.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 0.05) {
          if (!closestFish || distance < closestFish.distance) {
            closestFish = { fish, distance }
          }
        }
      })
    })

    return closestFish ? { fishId: closestFish.fish.id, speciesId: closestFish.fish.speciesId } : null
  }

  public getFishWorldPosition(fishId: string): THREE.Vector3 | null {
    const fish = this.fishStates.find(f => f.id === fishId)
    return fish ? fish.position.clone() : null
  }
}
