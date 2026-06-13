import * as THREE from 'three'
import { SimulationManager } from './SimulationManager'
import { RendererModule } from './RendererModule'
import { UIManager } from './UIManager'
import { CameraState, Particle } from './types'
import './style.css'

class App {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private clock: THREE.Clock
  private simulationManager: SimulationManager
  private rendererModule: RendererModule
  private uiManager: UIManager
  private cameraState: CameraState
  private animationFrameId: number | null = null
  private lastFpsUpdate: number = 0
  private frameCount: number = 0
  private currentFps: number = 60
  private isResettingCamera: boolean = false
  private resetStartTime: number = 0
  private resetStartCamera: { theta: number; phi: number; distance: number } | null = null
  private resetTargetCamera: { theta: number; phi: number; distance: number } | null = null

  constructor() {
    this.container = document.getElementById('app')!
    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.cameraState = {
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      currentX: 0,
      currentY: 0,
      currentZ: 0,
      theta: Math.PI / 4,
      phi: Math.PI / 3,
      targetTheta: Math.PI / 4,
      targetPhi: Math.PI / 3,
      distance: 100,
      targetDistance: 100,
      inertia: 0.9
    }

    this.scene = this.initScene()
    this.camera = this.initCamera()
    this.renderer = this.initRenderer()
    this.simulationManager = new SimulationManager()
    this.rendererModule = new RendererModule(this.scene)

    this.uiManager = new UIManager(this.container, {
      onParticleSelect: this.handleParticleSelect.bind(this),
      onCameraRotate: this.handleCameraRotate.bind(this),
      onCameraZoom: this.handleCameraZoom.bind(this),
      onResetCamera: this.handleResetCamera.bind(this),
      onTogglePause: this.handleTogglePause.bind(this),
      onResetScene: this.handleResetScene.bind(this),
      onEnergyThresholdChange: this.handleEnergyThresholdChange.bind(this),
      onDecayIntervalChange: this.handleDecayIntervalChange.bind(this),
      getRaycastTarget: this.getRaycastTarget.bind(this)
    })

    this.initLights()
    this.updateCameraPosition()
    this.animate = this.animate.bind(this)
    this.start()
  }

  private initScene(): THREE.Scene {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0f)
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.003)
    return scene
  }

  private initCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.updateCameraPosition()
    return camera
  }

  private initRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    this.container.appendChild(renderer.domElement)

    window.addEventListener('resize', () => this.onWindowResize())
    return renderer
  }

  private initLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 50, 50)
    this.scene.add(directionalLight)

    const pointLight1 = new THREE.PointLight(0x3b82f6, 1, 200)
    pointLight1.position.set(50, 0, 50)
    this.scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xa855f7, 1, 200)
    pointLight2.position.set(-50, 0, -50)
    this.scene.add(pointLight2)
  }

  private updateCameraPosition(): void {
    const { theta, phi, distance } = this.cameraState
    
    this.camera.position.x = distance * Math.sin(phi) * Math.cos(theta)
    this.camera.position.y = distance * Math.cos(phi)
    this.camera.position.z = distance * Math.sin(phi) * Math.sin(theta)
    
    this.camera.lookAt(
      this.cameraState.currentX,
      this.cameraState.currentY,
      this.cameraState.currentZ
    )
  }

  private handleParticleSelect(particleId: number | null): void {
    if (particleId !== null) {
      this.simulationManager.selectParticle(particleId)
      const selected = this.simulationManager.getSelectedParticle()
      this.uiManager.updateParticleInfo(selected || null)
    } else {
      this.simulationManager.deselectParticle()
      this.uiManager.updateParticleInfo(null)
    }
  }

  private handleCameraRotate(deltaX: number, deltaY: number): void {
    this.cameraState.targetTheta -= deltaX * 0.005
    this.cameraState.targetPhi -= deltaY * 0.005
    this.cameraState.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraState.targetPhi))
    this.isResettingCamera = false
  }

  private handleCameraZoom(delta: number): void {
    const zoomSpeed = 0.001
    this.cameraState.targetDistance += delta * zoomSpeed * this.cameraState.targetDistance
    this.cameraState.targetDistance = Math.max(30, Math.min(300, this.cameraState.targetDistance))
    this.isResettingCamera = false
  }

  private handleResetCamera(): void {
    this.resetStartCamera = {
      theta: this.cameraState.theta,
      phi: this.cameraState.phi,
      distance: this.cameraState.distance
    }
    this.resetTargetCamera = {
      theta: Math.PI / 4,
      phi: Math.PI / 3,
      distance: 100
    }
    this.resetStartTime = performance.now()
    this.isResettingCamera = true
  }

  private handleTogglePause(): void {
    this.simulationManager.togglePause()
    this.uiManager.updatePauseState(this.simulationManager.isPaused())
  }

  private handleResetScene(): void {
    this.simulationManager.reset()
    this.uiManager.updateParticleInfo(null)
  }

  private handleEnergyThresholdChange(value: number): void {
    this.simulationManager.setEnergyThreshold(value)
  }

  private handleDecayIntervalChange(value: number): void {
    this.simulationManager.setDecayInterval(value)
  }

  private getRaycastTarget(clientX: number, clientY: number): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const meshes = this.rendererModule.getMeshes()
    const intersects = this.raycaster.intersectObjects(meshes)

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh
      return this.rendererModule.getParticleIdFromMesh(mesh)
    }
    return null
  }

  private updateCamera(deltaTime: number): void {
    const { inertia } = this.cameraState

    if (this.isResettingCamera && this.resetStartCamera && this.resetTargetCamera) {
      const elapsed = (performance.now() - this.resetStartTime) / 1000
      const duration = 0.5
      
      if (elapsed >= duration) {
        this.cameraState.theta = this.resetTargetCamera.theta
        this.cameraState.phi = this.resetTargetCamera.phi
        this.cameraState.distance = this.resetTargetCamera.distance
        this.cameraState.targetTheta = this.resetTargetCamera.theta
        this.cameraState.targetPhi = this.resetTargetCamera.phi
        this.cameraState.targetDistance = this.resetTargetCamera.distance
        this.isResettingCamera = false
        this.resetStartCamera = null
        this.resetTargetCamera = null
      } else {
        const t = elapsed / duration
        const easeT = 1 - Math.pow(1 - t, 3)
        
        this.cameraState.theta = this.lerpAngle(
          this.resetStartCamera.theta,
          this.resetTargetCamera.theta,
          easeT
        )
        this.cameraState.phi = this.lerp(
          this.resetStartCamera.phi,
          this.resetTargetCamera.phi,
          easeT
        )
        this.cameraState.distance = this.lerp(
          this.resetStartCamera.distance,
          this.resetTargetCamera.distance,
          easeT
        )
      }
    } else {
      this.cameraState.theta += (this.cameraState.targetTheta - this.cameraState.theta) * (1 - inertia)
      this.cameraState.phi += (this.cameraState.targetPhi - this.cameraState.phi) * (1 - inertia)
      this.cameraState.distance += (this.cameraState.targetDistance - this.cameraState.distance) * (1 - inertia)
    }

    this.cameraState.currentX += (this.cameraState.targetX - this.cameraState.currentX) * (1 - inertia)
    this.cameraState.currentY += (this.cameraState.targetY - this.cameraState.currentY) * (1 - inertia)
    this.cameraState.currentZ += (this.cameraState.targetZ - this.cameraState.currentZ) * (1 - inertia)

    this.updateCameraPosition()
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private lerpAngle(a: number, b: number, t: number): number {
    const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
    return a + diff * t
  }

  private updateFps(now: number): void {
    this.frameCount++
    if (now - this.lastFpsUpdate >= 500) {
      this.currentFps = (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      this.frameCount = 0
      this.lastFpsUpdate = now
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate)

    const deltaTime = Math.min(this.clock.getDelta(), 0.1)
    const elapsedTime = this.clock.getElapsedTime()
    const now = performance.now()

    this.updateFps(now)
    this.updateCamera(deltaTime)

    const startTime = performance.now()
    const particles = this.simulationManager.update(deltaTime, elapsedTime)
    const physicsTime = performance.now() - startTime

    if (physicsTime > 5) {
      console.warn(`Physics update took ${physicsTime.toFixed(2)}ms, exceeds 5ms limit`)
    }

    this.rendererModule.update(particles, elapsedTime)
    this.renderer.render(this.scene, this.camera)

    const selectedParticle = this.simulationManager.getSelectedParticle()
    if (selectedParticle) {
      this.uiManager.updateParticleInfo(selectedParticle)
    }

    this.uiManager.updateStats(particles.length, this.currentFps)
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  public start(): void {
    this.clock.start()
    this.animate()
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  public dispose(): void {
    this.stop()
    this.uiManager.dispose()
    this.rendererModule.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}

let app: App | null = null

document.addEventListener('DOMContentLoaded', () => {
  app = new App()
})

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose()
  }
})

export { App }
