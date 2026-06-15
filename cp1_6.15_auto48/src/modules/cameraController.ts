import * as THREE from 'three'
import { ViewMode } from '../store/useStore'

export interface CameraPosition {
  position: THREE.Vector3
  target: THREE.Vector3
}

export class CameraController {
  private currentPosition: THREE.Vector3
  private currentTarget: THREE.Vector3
  private targetPosition: THREE.Vector3
  private targetTarget: THREE.Vector3
  private transitionProgress: number
  private transitionDuration: number
  private isTransitioning: boolean
  private viewMode: ViewMode
  private orbitAngle: number
  private orbitRadius: number
  private orbitHeight: number

  constructor() {
    this.currentPosition = new THREE.Vector3(0, 2, 6)
    this.currentTarget = new THREE.Vector3(0, 0, 0)
    this.targetPosition = new THREE.Vector3(0, 2, 6)
    this.targetTarget = new THREE.Vector3(0, 0, 0)
    this.transitionProgress = 1
    this.transitionDuration = 0.5
    this.isTransitioning = false
    this.viewMode = 'front'
    this.orbitAngle = 0
    this.orbitRadius = 6
    this.orbitHeight = 2
  }

  public getPresetPosition(mode: ViewMode): CameraPosition {
    switch (mode) {
      case 'front':
        return {
          position: new THREE.Vector3(0, 2, 6),
          target: new THREE.Vector3(0, 0, 0)
        }
      case 'top':
        return {
          position: new THREE.Vector3(0, 10, 0.001),
          target: new THREE.Vector3(0, 0, 0)
        }
      case 'orbit':
        return {
          position: new THREE.Vector3(
            Math.cos(this.orbitAngle) * this.orbitRadius,
            this.orbitHeight,
            Math.sin(this.orbitAngle) * this.orbitRadius
          ),
          target: new THREE.Vector3(0, 0, 0)
        }
      default:
        return {
          position: new THREE.Vector3(0, 2, 6),
          target: new THREE.Vector3(0, 0, 0)
        }
    }
  }

  public setViewMode(mode: ViewMode): void {
    if (this.viewMode === mode && mode !== 'orbit') return

    this.viewMode = mode
    this.isTransitioning = true
    this.transitionProgress = 0

    const preset = this.getPresetPosition(mode)
    this.targetPosition.copy(preset.position)
    this.targetTarget.copy(preset.target)
  }

  public update(deltaTime: number): CameraPosition {
    if (this.viewMode === 'orbit') {
      this.orbitAngle += deltaTime * ((2 * Math.PI) / 30)
      const preset = this.getPresetPosition('orbit')
      this.targetPosition.copy(preset.position)
      this.targetTarget.copy(preset.target)
      this.isTransitioning = true
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / 0.3)
    }

    if (this.isTransitioning && this.transitionProgress < 1) {
      this.transitionProgress += deltaTime / this.transitionDuration
      this.transitionProgress = Math.min(1, this.transitionProgress)

      const t = this.easeInOutCubic(this.transitionProgress)

      this.currentPosition.lerpVectors(
        this.currentPosition,
        this.targetPosition,
        t * deltaTime * 10
      )
      this.currentTarget.lerpVectors(
        this.currentTarget,
        this.targetTarget,
        t * deltaTime * 10
      )

      if (this.transitionProgress >= 1) {
        this.isTransitioning = false
      }
    }

    return {
      position: this.currentPosition.clone(),
      target: this.currentTarget.clone()
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  public getViewMode(): ViewMode {
    return this.viewMode
  }

  public setOrbitParams(radius: number, height: number): void {
    this.orbitRadius = radius
    this.orbitHeight = height
  }
}
