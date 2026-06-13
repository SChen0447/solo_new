import * as THREE from 'three'
import { Galaxy, ColorTheme } from './galaxy'
import { GalaxyControls } from './controls'
import { ControlPanel } from './ui'

class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private galaxy: Galaxy
  private controls: GalaxyControls
  private controlPanel: ControlPanel
  private container: HTMLElement
  private clock: THREE.Clock
  private animationId: number = 0
  private speedMultiplier: number = 1
  private fpsCounter: HTMLElement | null = null
  private frameCount: number = 0
  private lastFpsUpdate: number = 0
  private currentFps: number = 60

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement
    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a1a)

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 20, 100)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x0a0a1a, 1)
    this.container.appendChild(this.renderer.domElement)

    this.galaxy = new Galaxy(this.scene, 'nebula-purple')
    this.galaxy.startExplosionAnimation(2000)

    this.controls = new GalaxyControls(this.camera, this.renderer.domElement)
    this.controls.setDampingFactor(0.9)

    this.fpsCounter = document.getElementById('fps-counter')

    this.controlPanel = new ControlPanel({
      onParticleCountChange: this.onParticleCountChange.bind(this),
      onSpeedChange: this.onSpeedChange.bind(this),
      onThemeChange: this.onThemeChange.bind(this)
    })

    this.bindEvents()
    this.animate()
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this))
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this))
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  private onVisibilityChange(): void {
    if (document.hidden) {
      this.stop()
    } else {
      this.clock.start()
      this.animate()
    }
  }

  private onParticleCountChange(count: number): void {
    this.galaxy.updateParticleCount(count)
  }

  private onSpeedChange(speed: number): void {
    this.speedMultiplier = speed
  }

  private onThemeChange(theme: ColorTheme): void {
    this.galaxy.updateTheme(theme)
  }

  private updateFps(currentTime: number): void {
    this.frameCount++

    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate))
      this.frameCount = 0
      this.lastFpsUpdate = currentTime

      if (this.fpsCounter) {
        let color = 'rgba(255, 255, 255, 0.8)'
        if (this.currentFps >= 55) {
          color = '#10b981'
        } else if (this.currentFps >= 45) {
          color = '#f59e0b'
        } else {
          color = '#ef4444'
        }
        this.fpsCounter.style.color = color
        this.fpsCounter.textContent = `FPS: ${this.currentFps}`
      }
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this))

    const deltaTime = this.clock.getDelta()
    const currentTime = performance.now()

    this.updateFps(currentTime)
    this.controls.update(deltaTime)
    this.galaxy.update(deltaTime, this.speedMultiplier)
    this.renderer.render(this.scene, this.camera)
  }

  private stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = 0
    }
  }

  dispose(): void {
    this.stop()
    this.galaxy.dispose()
    this.controls.dispose()
    this.controlPanel.dispose()
    this.renderer.dispose()
    window.removeEventListener('resize', this.onWindowResize.bind(this))
    document.removeEventListener('visibilitychange', this.onVisibilityChange.bind(this))
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }
}

let app: App | null = null

window.addEventListener('DOMContentLoaded', () => {
  app = new App()
})

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose()
    app = null
  }
})
