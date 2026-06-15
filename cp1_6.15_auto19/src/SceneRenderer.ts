import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SceneConfig, Customization, ModelConfig, ModelPart, LeatherOption, StitchOption, HardwareOption } from './types'

interface MaterialAnimation {
  material: THREE.MeshStandardMaterial
  targetColor: THREE.Color
  targetRoughness: number
  targetMetalness: number
  startTime: number
  duration: number
  initialColor: THREE.Color
  initialRoughness: number
  initialMetalness: number
}

interface CameraAnimation {
  targetPosition: THREE.Vector3
  startTime: number
  duration: number
  initialPosition: THREE.Vector3
}

export class SceneRenderer {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private productGroup: THREE.Group | null = null
  private materialAnimations: MaterialAnimation[] = []
  private cameraAnimation: CameraAnimation | null = null
  private animationFrameId: number | null = null
  private autoRotate: boolean = true
  private rotateSpeed: number = 0.3
  private currentConfig: SceneConfig | null = null
  private meshMap: Map<string, THREE.Mesh> = new Map()

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    
    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = 2
    bgCanvas.height = 256
    const bgCtx = bgCanvas.getContext('2d')!
    const gradient = bgCtx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#f5ede0')
    gradient.addColorStop(1, '#e8dcc8')
    bgCtx.fillStyle = gradient
    bgCtx.fillRect(0, 0, 2, 256)
    const bgTexture = new THREE.CanvasTexture(bgCanvas)
    this.scene.background = bgTexture

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(3.5, 2, 3.5)

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      preserveDrawingBuffer: true 
    })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 2
    this.controls.maxDistance = 15
    this.controls.maxPolarAngle = Math.PI / 2 + 0.2
    this.controls.autoRotate = this.autoRotate
    this.controls.autoRotateSpeed = this.rotateSpeed

    this.setupLighting()
    this.setupResizeHandler()
    this.startAnimationLoop()
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
    mainLight.position.set(5, 8, 5)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 50
    mainLight.shadow.camera.left = -10
    mainLight.shadow.camera.right = 10
    mainLight.shadow.camera.top = 10
    mainLight.shadow.camera.bottom = -10
    this.scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0xfff0e0, 0.4)
    fillLight.position.set(-5, 3, -5)
    this.scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffeedd, 0.3)
    rimLight.position.set(0, 5, -8)
    this.scene.add(rimLight)
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', this.handleResize)
  }

  private handleResize = (): void => {
    if (!this.container) return
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private createGeometry(part: ModelPart, modelConfig: ModelConfig): THREE.BufferGeometry {
    const { width, height, depth } = modelConfig.dimensions
    const scale = 0.1

    switch (part.geometry) {
      case 'box':
        return new THREE.BoxGeometry(width * scale, height * scale, depth * scale)
      case 'cylinder':
        return new THREE.CylinderGeometry(0.15, 0.15, depth * scale * 0.5, 16)
      case 'torus':
        return new THREE.TorusGeometry(
          Math.max(width, height) * scale * 0.4,
          0.03,
          8,
          32
        )
      case 'sphere':
        return new THREE.SphereGeometry(0.2, 16, 16)
      default:
        return new THREE.BoxGeometry(width * scale, height * scale, depth * scale)
    }
  }

  private createLeatherMaterial(option: LeatherOption): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(option.color),
      roughness: option.roughness,
      metalness: option.metalness
    })
  }

  private createStitchMaterial(option: StitchOption): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(option.color),
      roughness: 0.8,
      metalness: 0.1
    })
  }

  private createHardwareMaterial(option: HardwareOption): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(option.color),
      roughness: option.roughness,
      metalness: option.metalness
    })
  }

  private getMaterialForPart(part: ModelPart, customization: Customization): THREE.MeshStandardMaterial {
    switch (part.materialType) {
      case 'leather':
        return this.createLeatherMaterial(customization.leather)
      case 'stitch':
        return this.createStitchMaterial(customization.stitch)
      case 'hardware':
        return this.createHardwareMaterial(customization.hardware)
      default:
        return this.createLeatherMaterial(customization.leather)
    }
  }

  public renderScene(config: SceneConfig): void {
    this.currentConfig = config
    this.autoRotate = config.autoRotate
    this.rotateSpeed = config.rotateSpeed
    this.controls.autoRotate = this.autoRotate
    this.controls.autoRotateSpeed = this.rotateSpeed

    if (this.productGroup) {
      this.scene.remove(this.productGroup)
      this.meshMap.clear()
    }

    this.productGroup = new THREE.Group()
    const { modelConfig, customization } = config

    modelConfig.parts.forEach((part) => {
      const geometry = this.createGeometry(part, modelConfig)
      const material = this.getMaterialForPart(part, customization)
      const mesh = new THREE.Mesh(geometry, material)
      
      mesh.position.set(
        part.position[0] * 0.1,
        part.position[1] * 0.1,
        part.position[2] * 0.1
      )
      mesh.rotation.set(
        part.rotation[0],
        part.rotation[1],
        part.rotation[2]
      )
      mesh.castShadow = true
      mesh.receiveShadow = true

      this.productGroup!.add(mesh)
      this.meshMap.set(part.id, mesh)
    })

    this.scene.add(this.productGroup)
    this.setCameraPosition(config.cameraPosition, false)
  }

  public updateCustomization(customization: Customization, duration: number = 600): void {
    if (!this.productGroup) return

    this.materialAnimations = []
    const startTime = performance.now()

    this.meshMap.forEach((mesh, partId) => {
      const part = this.currentConfig?.modelConfig.parts.find(p => p.id === partId)
      if (!part) return

      const material = mesh.material as THREE.MeshStandardMaterial
      const targetMaterial = this.getMaterialForPart(part, customization)
      const targetColor = targetMaterial.color.clone()

      this.materialAnimations.push({
        material,
        targetColor,
        targetRoughness: targetMaterial.roughness,
        targetMetalness: targetMaterial.metalness,
        startTime,
        duration,
        initialColor: material.color.clone(),
        initialRoughness: material.roughness,
        initialMetalness: material.metalness
      })
    })
  }

  public setCameraPosition(position: [number, number, number], animate: boolean = true): void {
    const targetPos = new THREE.Vector3(position[0], position[1], position[2])
    
    if (animate) {
      this.cameraAnimation = {
        targetPosition: targetPos,
        startTime: performance.now(),
        duration: 800,
        initialPosition: this.camera.position.clone()
      }
    } else {
      this.camera.position.copy(targetPos)
      this.controls.target.set(0, 0, 0)
      this.controls.update()
    }
  }

  public captureScreenshot(): string {
    this.renderer.render(this.scene, this.camera)
    return this.renderer.domElement.toDataURL('image/png')
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private updateMaterialAnimations(currentTime: number): void {
    this.materialAnimations = this.materialAnimations.filter(anim => {
      const elapsed = currentTime - anim.startTime
      if (elapsed >= anim.duration) {
        anim.material.color.copy(anim.targetColor)
        anim.material.roughness = anim.targetRoughness
        anim.material.metalness = anim.targetMetalness
        return false
      }

      const progress = this.easeInOutCubic(elapsed / anim.duration)
      anim.material.color.lerpColors(anim.initialColor, anim.targetColor, progress)
      anim.material.roughness = anim.initialRoughness + (anim.targetRoughness - anim.initialRoughness) * progress
      anim.material.metalness = anim.initialMetalness + (anim.targetMetalness - anim.initialMetalness) * progress
      return true
    })
  }

  private updateCameraAnimation(currentTime: number): void {
    if (!this.cameraAnimation) return

    const elapsed = currentTime - this.cameraAnimation.startTime
    if (elapsed >= this.cameraAnimation.duration) {
      this.camera.position.copy(this.cameraAnimation.targetPosition)
      this.controls.target.set(0, 0, 0)
      this.controls.update()
      this.cameraAnimation = null
      return
    }

    const progress = this.easeInOutCubic(elapsed / this.cameraAnimation.duration)
    this.camera.position.lerpVectors(
      this.cameraAnimation.initialPosition,
      this.cameraAnimation.targetPosition,
      progress
    )
    this.controls.update()
  }

  private startAnimationLoop(): void {
    const animate = () => {
      const currentTime = performance.now()
      
      this.updateMaterialAnimations(currentTime)
      this.updateCameraAnimation(currentTime)
      
      if (this.autoRotate && !this.cameraAnimation) {
        this.controls.update()
      }

      this.renderer.render(this.scene, this.camera)
      this.animationFrameId = requestAnimationFrame(animate)
    }
    animate()
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize)
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }

    this.meshMap.forEach((mesh) => {
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose())
      } else {
        mesh.material.dispose()
      }
    })

    this.renderer.dispose()
    this.controls.dispose()
    
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }
}
