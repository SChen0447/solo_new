import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class GalaxyControls {
  private controls: OrbitControls
  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  private dampingFactor: number = 0.9
  private targetRotationX: number = 0
  private targetRotationY: number = 0
  private currentRotationX: number = 0
  private currentRotationY: number = 0
  private isDragging: boolean = false
  private lastMouseX: number = 0
  private lastMouseY: number = 0
  private targetZoom: number = 100
  private currentZoom: number = 100

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement

    this.controls = new OrbitControls(camera, domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = this.dampingFactor
    this.controls.enablePan = false
    this.controls.minDistance = 30
    this.controls.maxDistance = 300
    this.controls.autoRotate = false
    this.controls.autoRotateSpeed = 0.5

    this.currentZoom = camera.position.length()
    this.targetZoom = this.currentZoom

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this))
    this.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this))
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false })

    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false })
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false })
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this))
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true
    this.lastMouseX = event.clientX
    this.lastMouseY = event.clientY
    this.domElement.style.cursor = 'grabbing'
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) {
      this.domElement.style.cursor = 'grab'
      return
    }

    const deltaX = event.clientX - this.lastMouseX
    const deltaY = event.clientY - this.lastMouseY

    this.targetRotationY += deltaX * 0.005
    this.targetRotationX += deltaY * 0.005

    this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX))

    this.lastMouseX = event.clientX
    this.lastMouseY = event.clientY
  }

  private onMouseUp(): void {
    this.isDragging = false
    this.domElement.style.cursor = 'grab'
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault()

    const zoomSpeed = 0.001
    const delta = event.deltaY * zoomSpeed

    this.targetZoom = THREE.MathUtils.clamp(
      this.targetZoom * (1 + delta),
      this.controls.minDistance,
      this.controls.maxDistance
    )
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault()

    if (event.touches.length === 1) {
      this.isDragging = true
      this.lastMouseX = event.touches[0].clientX
      this.lastMouseY = event.touches[0].clientY
    } else if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX
      const dy = event.touches[0].clientY - event.touches[1].clientY
      this.targetZoom = Math.sqrt(dx * dx + dy * dy) * 0.5
      this.targetZoom = THREE.MathUtils.clamp(
        this.targetZoom,
        this.controls.minDistance,
        this.controls.maxDistance
      )
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault()

    if (event.touches.length === 1 && this.isDragging) {
      const deltaX = event.touches[0].clientX - this.lastMouseX
      const deltaY = event.touches[0].clientY - this.lastMouseY

      this.targetRotationY += deltaX * 0.005
      this.targetRotationX += deltaY * 0.005

      this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX))

      this.lastMouseX = event.touches[0].clientX
      this.lastMouseY = event.touches[0].clientY
    } else if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX
      const dy = event.touches[0].clientY - event.touches[1].clientY
      const currentPinch = Math.sqrt(dx * dx + dy * dy) * 0.5

      const zoomDelta = (this.targetZoom - currentPinch) * 0.01
      this.targetZoom = THREE.MathUtils.clamp(
        this.currentZoom + zoomDelta * 10,
        this.controls.minDistance,
        this.controls.maxDistance
      )
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false
  }

  update(_deltaTime: number): void {
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * (1 - this.dampingFactor)
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * (1 - this.dampingFactor)

    this.currentZoom += (this.targetZoom - this.currentZoom) * (1 - this.dampingFactor)

    const x = Math.sin(this.currentRotationY) * Math.cos(this.currentRotationX) * this.currentZoom
    const y = Math.sin(this.currentRotationX) * this.currentZoom
    const z = Math.cos(this.currentRotationY) * Math.cos(this.currentRotationX) * this.currentZoom

    this.camera.position.set(x, y, z)
    this.camera.lookAt(0, 0, 0)

    this.controls.update()
  }

  setDampingFactor(factor: number): void {
    this.dampingFactor = THREE.MathUtils.clamp(factor, 0.1, 0.99)
    this.controls.dampingFactor = this.dampingFactor
  }

  reset(): void {
    this.targetRotationX = 0
    this.targetRotationY = 0
    this.targetZoom = 100
    this.currentRotationX = 0
    this.currentRotationY = 0
    this.currentZoom = 100
  }

  dispose(): void {
    this.controls.dispose()
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this))
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this))
    this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this))
    this.domElement.removeEventListener('mouseleave', this.onMouseUp.bind(this))
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this))
    this.domElement.removeEventListener('touchstart', this.onTouchStart.bind(this))
    this.domElement.removeEventListener('touchmove', this.onTouchMove.bind(this))
    this.domElement.removeEventListener('touchend', this.onTouchEnd.bind(this))
  }
}
