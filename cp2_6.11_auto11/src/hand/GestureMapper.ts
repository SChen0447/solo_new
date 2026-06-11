import * as THREE from 'three'
import { HandData } from './HandTracker'

export interface SculptCommand {
  isActive: boolean
  screenX: number
  screenY: number
  worldPosition: THREE.Vector3 | null
  intensity: number
  gestureType: 'idle' | 'fist' | 'open' | 'pinch'
}

type SculptCommandCallback = (command: SculptCommand) => void

export class GestureMapper {
  private callback: SculptCommandCallback | null = null
  private lastHandData: HandData | null = null
  private isSculpting: boolean = false
  private gestureBuffer: ('idle' | 'fist' | 'open' | 'pinch')[] = []
  private bufferSize: number = 5
  private lastCommandTime: number = 0
  private minCommandInterval: number = 16

  public onSculptCommand(callback: SculptCommandCallback): void {
    this.callback = callback
  }

  public processHandData(
    handData: HandData | null,
    camera: THREE.PerspectiveCamera,
    screenWidth: number,
    screenHeight: number
  ): void {
    const now = performance.now()
    if (now - this.lastCommandTime < this.minCommandInterval) return
    this.lastCommandTime = now

    if (!handData) {
      this.isSculpting = false
      this.gestureBuffer = []
      this.sendIdleCommand()
      return
    }

    this.lastHandData = handData

    const gestureType = this.determineGestureType(handData)
    this.gestureBuffer.push(gestureType)
    if (this.gestureBuffer.length > this.bufferSize) {
      this.gestureBuffer.shift()
    }

    const stableGesture = this.getStableGesture()

    if (stableGesture === 'fist' || stableGesture === 'pinch') {
      this.isSculpting = true
    } else if (stableGesture === 'open') {
      this.isSculpting = false
    }

    const screenPosition = this.handToScreen(handData.palmPosition, screenWidth, screenHeight)
    const worldPosition = this.screenToWorld(
      screenPosition.x,
      screenPosition.y,
      camera,
      screenWidth,
      screenHeight
    )

    let intensity = 0.5
    if (handData.isPinching) {
      intensity = handData.pinchStrength
    } else if (handData.isFist) {
      intensity = 0.8
    }

    const command: SculptCommand = {
      isActive: this.isSculpting,
      screenX: screenPosition.x,
      screenY: screenPosition.y,
      worldPosition,
      intensity,
      gestureType: stableGesture
    }

    if (this.callback) {
      this.callback(command)
    }
  }

  private determineGestureType(handData: HandData): 'idle' | 'fist' | 'open' | 'pinch' {
    if (handData.isFist && !handData.isPinching) {
      return 'fist'
    }
    if (handData.isPinching && !handData.isFist) {
      return 'pinch'
    }
    if (handData.isOpen) {
      return 'open'
    }
    return 'idle'
  }

  private getStableGesture(): 'idle' | 'fist' | 'open' | 'pinch' {
    if (this.gestureBuffer.length === 0) return 'idle'

    const counts: Record<string, number> = {
      idle: 0,
      fist: 0,
      open: 0,
      pinch: 0
    }

    for (const gesture of this.gestureBuffer) {
      counts[gesture]++
    }

    let maxCount = 0
    let stableGesture: 'idle' | 'fist' | 'open' | 'pinch' = 'idle'

    for (const [gesture, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count
        stableGesture = gesture as 'idle' | 'fist' | 'open' | 'pinch'
      }
    }

    const threshold = Math.ceil(this.bufferSize * 0.6)
    if (maxCount >= threshold) {
      return stableGesture
    }

    return this.gestureBuffer[this.gestureBuffer.length - 1] || 'idle'
  }

  private handToScreen(
    handPosition: { x: number; y: number; z: number },
    screenWidth: number,
    screenHeight: number
  ): { x: number; y: number } {
    const mirroredX = 1 - handPosition.x
    return {
      x: mirroredX * screenWidth,
      y: handPosition.y * screenHeight
    }
  }

  private screenToWorld(
    screenX: number,
    screenY: number,
    camera: THREE.PerspectiveCamera,
    screenWidth: number,
    screenHeight: number
  ): THREE.Vector3 {
    const ndcX = (screenX / screenWidth) * 2 - 1
    const ndcY = -(screenY / screenHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)

    const targetDistance = camera.position.z - 5
    const direction = raycaster.ray.direction.clone()
    const origin = raycaster.ray.origin.clone()

    const t = (targetDistance - origin.z) / direction.z
    const worldPos = origin.clone().add(direction.multiplyScalar(t))

    worldPos.x = THREE.MathUtils.clamp(worldPos.x, -10, 10)
    worldPos.y = THREE.MathUtils.clamp(worldPos.y, -10, 10)
    worldPos.z = THREE.MathUtils.clamp(worldPos.z, -5, 5)

    return worldPos
  }

  private sendIdleCommand(): void {
    if (this.callback) {
      this.callback({
        isActive: false,
        screenX: 0,
        screenY: 0,
        worldPosition: null,
        intensity: 0,
        gestureType: 'idle'
      })
    }
  }

  public getLastHandData(): HandData | null {
    return this.lastHandData
  }

  public reset(): void {
    this.lastHandData = null
    this.isSculpting = false
    this.gestureBuffer = []
    this.sendIdleCommand()
  }
}
