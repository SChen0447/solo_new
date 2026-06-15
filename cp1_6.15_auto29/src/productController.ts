import * as THREE from 'three'
import { GestureEvent, GestureType } from './gestureEngine'
import {
  MaterialType, ColorScheme, ViewPreset, MATERIALS, COLOR_SCHEMES
} from './store'

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

const VIEW_PRESETS: Record<ViewPreset, { cameraPos: THREE.Vector3; cameraLook: THREE.Vector3 }> = {
  front:  { cameraPos: new THREE.Vector3(0, 0, 4),     cameraLook: new THREE.Vector3(0, 0, 0) },
  back:   { cameraPos: new THREE.Vector3(0, 0, -4),    cameraLook: new THREE.Vector3(0, 0, 0) },
  left:   { cameraPos: new THREE.Vector3(-4, 0, 0),    cameraLook: new THREE.Vector3(0, 0, 0) },
  right:  { cameraPos: new THREE.Vector3(4, 0, 0),     cameraLook: new THREE.Vector3(0, 0, 0) },
  top:    { cameraPos: new THREE.Vector3(0, 3.5, 1),  cameraLook: new THREE.Vector3(0, 0, 0) },
}

interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
  startTime: number
}

export class ProductController {
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public productGroup: THREE.Group
  public productMeshes: THREE.Mesh[] = []
  public ringMesh: THREE.Mesh | null = null

  private container: HTMLElement
  private clock: THREE.Clock

  private targetRotationX: number = 0
  private targetRotationY: number = 0
  private currentRotationX: number = 0
  private currentRotationY: number = 0
  private dampingFactor: number = 0.08

  private targetScale: number = 1
  private currentScale: number = 1
  private scaleDamping: number = 0.08

  private basePinchDistance: number = 0
  private lastPalmX: number = 0.5
  private lastPalmY: number = 0.5

  private isControlling: boolean = false
  private gestureMode: 'idle' | 'rotating' | 'pinching' = 'idle'

  private autoRotate: boolean = true
  private autoRotateSpeed: number = (2 * Math.PI) / 6

  private animatingCamera: boolean = false
  private cameraAnimStart: number = 0
  private cameraAnimDuration: number = 800
  private cameraFromPos: THREE.Vector3 = new THREE.Vector3()
  private cameraToPos: THREE.Vector3 = new THREE.Vector3()
  private cameraFromLook: THREE.Vector3 = new THREE.Vector3()
  private cameraToLook: THREE.Vector3 = new THREE.Vector3()

  private currentMaterial: MaterialType = 'matte-metal'
  private currentColor: ColorScheme = 'classic-black'

  private materialTransitionStart: number = 0
  private materialTransitionDuration: number = 600
  private isMaterialTransitioning: boolean = false
  private fromMaterialParams = { roughness: 0, metalness: 0 }
  private toMaterialParams = { roughness: 0, metalness: 0 }
  private fromColor = new THREE.Color()
  private toColor = new THREE.Color()

  private particles: Particle[] = []
  private carbonTexture: THREE.CanvasTexture | null = null
  private leatherTexture: THREE.CanvasTexture | null = null

  private animationFrameId: number = 0
  private ringBrightness: number = 0
  private targetRingBrightness: number = 0

  private performanceMode: boolean = false

  constructor(container: HTMLElement) {
    this.container = container
    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000)
    this.camera.position.copy(VIEW_PRESETS.front.cameraPos)
    this.camera.lookAt(VIEW_PRESETS.front.cameraLook)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.productGroup = new THREE.Group()
    this.scene.add(this.productGroup)

    this.initTextures()
    this.initEnvironment()
    this.initLights()
    this.initProduct()
    this.initRing()

    window.addEventListener('resize', this.onResize.bind(this))
  }

  private initTextures(): void {
    const carbonCanvas = document.createElement('canvas')
    carbonCanvas.width = this.performanceMode ? 512 : 1024
    carbonCanvas.height = this.performanceMode ? 512 : 1024
    const cctx = carbonCanvas.getContext('2d')!
    const cw = carbonCanvas.width
    const ch = carbonCanvas.height
    cctx.fillStyle = '#1a1a1a'
    cctx.fillRect(0, 0, cw, ch)
    for (let i = 0; i < ch; i += 4) {
      cctx.fillStyle = i % 8 === 0 ? '#2a2a2a' : '#0a0a0a'
      cctx.fillRect(0, i, cw, 2)
    }
    for (let y = 0; y < ch; y += 16) {
      for (let x = (y / 16) % 2 === 0 ? 0 : 16; x < cw; x += 32) {
        cctx.fillStyle = '#333'
        cctx.fillRect(x, y, 14, 14)
      }
    }
    this.carbonTexture = new THREE.CanvasTexture(carbonCanvas)
    this.carbonTexture.wrapS = THREE.RepeatWrapping
    this.carbonTexture.wrapT = THREE.RepeatWrapping
    this.carbonTexture.repeat.set(4, 4)

    const leatherCanvas = document.createElement('canvas')
    leatherCanvas.width = this.performanceMode ? 512 : 1024
    leatherCanvas.height = this.performanceMode ? 512 : 1024
    const lctx = leatherCanvas.getContext('2d')!
    lctx.fillStyle = '#4a2c1a'
    lctx.fillRect(0, 0, leatherCanvas.width, leatherCanvas.height)
    for (let i = 0; i < 3000; i++) {
      lctx.fillStyle = `rgba(${60 + Math.random() * 30}, ${40 + Math.random() * 20}, ${20 + Math.random() * 20}, 0.5)`
      const r = 1 + Math.random() * 3
      lctx.beginPath()
      lctx.arc(Math.random() * leatherCanvas.width, Math.random() * leatherCanvas.height, r, 0, Math.PI * 2)
      lctx.fill()
    }
    for (let i = 0; i < 1000; i++) {
      lctx.strokeStyle = 'rgba(20,10,5,0.3)'
      lctx.lineWidth = 0.5
      lctx.beginPath()
      lctx.moveTo(Math.random() * leatherCanvas.width, Math.random() * leatherCanvas.height)
      lctx.lineTo(Math.random() * leatherCanvas.width, Math.random() * leatherCanvas.height)
      lctx.stroke()
    }
    this.leatherTexture = new THREE.CanvasTexture(leatherCanvas)
    this.leatherTexture.wrapS = THREE.RepeatWrapping
    this.leatherTexture.wrapT = THREE.RepeatWrapping
    this.leatherTexture.repeat.set(2, 2)
  }

  private initEnvironment(): void {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer)
    const envScene = new THREE.Scene()
    const colors = [0x333344, 0x444455, 0x222233, 0x556677]
    let idx = 0
    for (let x = -1; x <= 1; x += 2) {
      for (let y = -1; y <= 1; y += 2) {
        for (let z = -1; z <= 1; z += 2) {
          const light = new THREE.PointLight(colors[idx % colors.length], 0.5, 50)
          light.position.set(x * 10, y * 10, z * 10)
          envScene.add(light)
          idx++
        }
      }
    }
    this.scene.environment = pmremGenerator.fromScene(envScene, 0.04).texture
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0)
    keyLight.position.set(5, 5, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    this.scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.4)
    fillLight.position.set(-5, 3, -5)
    this.scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xffaa66, 0.3)
    rimLight.position.set(0, 5, -5)
    this.scene.add(rimLight)
  }

  private initProduct(): void {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLOR_SCHEMES['classic-black'].hex),
      roughness: MATERIALS['matte-metal'].roughness,
      metalness: MATERIALS['matte-metal'].metalness,
      envMapIntensity: 1,
    })

    const mainBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.9, 0.2),
      bodyMaterial
    )
    mainBody.castShadow = true
    mainBody.receiveShadow = true
    mainBody.name = 'mainBody'
    this.productGroup.add(mainBody)
    this.productMeshes.push(mainBody)

    const edgeGeo = new THREE.BoxGeometry(1.44, 0.94, 0.02)
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.3,
      metalness: 1,
    })
    const edges = new THREE.Mesh(edgeGeo, edgeMat)
    edges.castShadow = true
    this.productGroup.add(edges)
    this.productMeshes.push(edges)

    const topPanel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.15, 64),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(COLOR_SCHEMES['classic-black'].hex),
        roughness: 0.1,
        metalness: 1,
      })
    )
    topPanel.rotation.x = Math.PI / 2
    topPanel.position.set(0, 0.25, 0.22)
    topPanel.castShadow = true
    this.productGroup.add(topPanel)
    this.productMeshes.push(topPanel)

    const screenGeo = new THREE.BoxGeometry(1.2, 0.7, 0.01)
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.05,
      metalness: 0.9,
    })
    const screen = new THREE.Mesh(screenGeo, screenMat)
    screen.position.z = 0.05
    this.productGroup.add(screen)

    for (let i = 0; i < 4; i++) {
      const btnMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(COLOR_SCHEMES['classic-black'].hex),
        roughness: 0.2,
        metalness: 1,
      })
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 32))
      btn.rotation.x = Math.PI / 2
      const xOff = (i % 2 === 0 ? -1 : 1) * 0.45
      const yOff = (Math.floor(i / 2) === 0 ? 1 : -1) * 0.25
      btn.position.set(xOff, yOff, 0.11)
      this.productGroup.add(btn)
      this.productMeshes.push(btn)
    }
  }

  private initRing(): void {
    const ringGeo = new THREE.TorusGeometry(1.1, 0.02, 16, 100)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    })
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat)
    this.ringMesh.rotation.x = Math.PI / 2
    this.ringMesh.position.y = -0.6
    this.scene.add(this.ringMesh)
  }

  public handleGesture(event: GestureEvent): void {
    const { type, palmX, palmY, pinchDistance } = event

    if (type === 'enter-control') {
      this.isControlling = true
      this.autoRotate = false
      this.basePinchDistance = pinchDistance
      this.lastPalmX = palmX
      this.lastPalmY = palmY
      this.gestureMode = 'idle'
      this.targetRingBrightness = 0.6
      return
    }

    if (type === 'exit-control') {
      this.isControlling = false
      this.autoRotate = true
      this.gestureMode = 'idle'
      this.targetRingBrightness = 0
      return
    }

    if (!this.isControlling) return

    if (type === 'pinch') {
      this.gestureMode = 'pinching'
      if (this.basePinchDistance <= 0) this.basePinchDistance = pinchDistance
      const ratio = pinchDistance / this.basePinchDistance
      this.targetScale = Math.max(0.5, Math.min(3, ratio * 1))
      this.targetRingBrightness = 0.8
    } else if (type === 'rotate') {
      this.gestureMode = 'rotating'
      const dx = palmX - this.lastPalmX
      const dy = palmY - this.lastPalmY
      this.targetRotationY += dx * 4
      this.targetRotationX += dy * 3
      this.lastPalmX = palmX
      this.lastPalmY = palmY
      this.targetRingBrightness = 0.4
    }
  }

  public setMaterial(material: MaterialType): void {
    const cfg = MATERIALS[material]
    this.fromMaterialParams = this.getCurrentMaterialParams()
    this.toMaterialParams = { roughness: cfg.roughness, metalness: cfg.metalness }
    this.fromColor = this.getCurrentColor().clone()
    this.toColor = new THREE.Color(COLOR_SCHEMES[this.currentColor].hex)
    this.materialTransitionStart = performance.now()
    this.isMaterialTransitioning = true
    this.currentMaterial = material

    this.spawnParticles(50)

    this.productMeshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (cfg.hasTexture) {
        mat.map = material === 'carbon-fiber' ? this.carbonTexture : this.leatherTexture
        mat.needsUpdate = true
      } else {
        mat.map = null
        mat.needsUpdate = true
      }
    })
  }

  public setColorScheme(color: ColorScheme): void {
    this.fromColor = this.getCurrentColor().clone()
    this.toColor = new THREE.Color(COLOR_SCHEMES[color].hex)
    this.fromMaterialParams = this.getCurrentMaterialParams()
    this.toMaterialParams = {
      roughness: MATERIALS[this.currentMaterial].roughness,
      metalness: MATERIALS[this.currentMaterial].metalness,
    }
    this.materialTransitionStart = performance.now()
    this.isMaterialTransitioning = true
    this.currentColor = color

    this.spawnParticles(50)
  }

  public setViewPreset(view: ViewPreset): void {
    this.autoRotate = false
    const preset = VIEW_PRESETS[view]
    this.cameraFromPos.copy(this.camera.position)
    this.cameraToPos.copy(preset.cameraPos)
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    this.cameraFromLook.copy(this.camera.position).add(dir.multiplyScalar(4))
    this.cameraToLook.copy(preset.cameraLook)
    this.cameraAnimStart = performance.now()
    this.animatingCamera = true
  }

  public setAutoRotate(value: boolean): void {
    this.autoRotate = value
  }

  private getCurrentMaterialParams(): { roughness: number; metalness: number } {
    const mesh = this.productMeshes[0]
    if (!mesh) return { roughness: 0.5, metalness: 0.9 }
    const mat = mesh.material as THREE.MeshStandardMaterial
    return { roughness: mat.roughness, metalness: mat.metalness }
  }

  private getCurrentColor(): THREE.Color {
    const mesh = this.productMeshes[0]
    if (!mesh) return new THREE.Color(COLOR_SCHEMES[this.currentColor].hex)
    const mat = mesh.material as THREE.MeshStandardMaterial
    return mat.color.clone()
  }

  private spawnParticles(count: number): void {
    const particleGeo = new THREE.SphereGeometry(0.02, 8, 8)
    for (let i = 0; i < count; i++) {
      const particleMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(COLOR_SCHEMES[this.currentColor].hex),
        transparent: true,
        opacity: 1,
      })
      const mesh = new THREE.Mesh(particleGeo, particleMat)
      const angle = Math.random() * Math.PI * 2
      const radius = 0.6 + Math.random() * 0.4
      mesh.position.set(
        Math.cos(angle) * radius * 0.7,
        (Math.random() - 0.5) * 0.9,
        Math.sin(angle) * radius * 0.1,
      )
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.03,
        Math.random() * 0.04 + 0.01,
        (Math.random() - 0.5) * 0.03,
      )
      this.particles.push({ mesh, velocity, life: 1000, startTime: performance.now() })
      this.scene.add(mesh)
    }
  }

  private updateParticles(): void {
    const now = performance.now()
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      const elapsed = now - p.startTime
      if (elapsed >= p.life) {
        this.scene.remove(p.mesh)
        ;(p.mesh.material as THREE.Material).dispose()
        this.particles.splice(i, 1)
        continue
      }
      const t = 1 - elapsed / p.life
      p.mesh.position.add(p.velocity)
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = t
    }
  }

  private updateMaterialTransition(): void {
    if (!this.isMaterialTransitioning) return
    const now = performance.now()
    const t = Math.min((now - this.materialTransitionStart) / this.materialTransitionDuration, 1)
    const eased = easeOutCubic(t)

    const r = this.fromMaterialParams.roughness + (this.toMaterialParams.roughness - this.fromMaterialParams.roughness) * eased
    const m = this.fromMaterialParams.metalness + (this.toMaterialParams.metalness - this.fromMaterialParams.metalness) * eased
    const color = this.fromColor.clone().lerp(this.toColor, eased)

    const cfg = MATERIALS[this.currentMaterial]

    this.productMeshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.roughness = r
      mat.metalness = m
      if (mesh.name !== '' || true) {
        if (cfg.hasTexture) {
          mat.color.set(color)
        } else {
          mat.color.set(color)
        }
      }
      mat.needsUpdate = true
    })

    if (t >= 1) {
      this.isMaterialTransitioning = false
      this.productMeshes.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.roughness = cfg.roughness
        mat.metalness = cfg.metalness
        mat.color.set(new THREE.Color(COLOR_SCHEMES[this.currentColor].hex))
      })
    }
  }

  private updateCameraAnimation(): void {
    if (!this.animatingCamera) return
    const now = performance.now()
    const t = Math.min((now - this.cameraAnimStart) / this.cameraAnimDuration, 1)
    const eased = easeOutCubic(t)
    this.camera.position.lerpVectors(this.cameraFromPos, this.cameraToPos, eased)
    const look = this.cameraFromLook.clone().lerp(this.cameraToLook, eased)
    this.camera.lookAt(look)
    if (t >= 1) this.animatingCamera = false
  }

  public startRenderLoop(): void {
    const animate = () => {
      const delta = this.clock.getDelta()

      if (this.autoRotate && !this.isControlling && !this.animatingCamera) {
        this.targetRotationY += this.autoRotateSpeed * delta
      }

      this.currentRotationX += (this.targetRotationX - this.currentRotationX) * this.dampingFactor
      this.currentRotationY += (this.targetRotationY - this.currentRotationY) * this.dampingFactor
      this.currentScale += (this.targetScale - this.currentScale) * this.scaleDamping

      this.productGroup.rotation.x = this.currentRotationX
      this.productGroup.rotation.y = this.currentRotationY
      this.productGroup.scale.setScalar(this.currentScale)

      this.ringBrightness += (this.targetRingBrightness - this.ringBrightness) * 0.1
      if (this.ringMesh) {
        const mat = this.ringMesh.material as THREE.MeshBasicMaterial
        mat.opacity = this.ringBrightness
        this.ringMesh.rotation.z += delta * 0.5
      }

      this.updateCameraAnimation()
      this.updateMaterialTransition()
      this.updateParticles()

      this.renderer.render(this.scene, this.camera)
      this.animationFrameId = requestAnimationFrame(animate)
    }
    animate()
  }

  public stopRenderLoop(): void {
    cancelAnimationFrame(this.animationFrameId)
  }

  public captureScreenshot(width = 1920, height = 1080): string {
    const prevW = this.renderer.domElement.width
    const prevH = this.renderer.domElement.height
    this.renderer.setSize(width, height, false)
    this.renderer.render(this.scene, this.camera)
    const data = this.renderer.domElement.toDataURL('image/png')
    this.renderer.setSize(prevW, prevH, false)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    return data
  }

  private onResize(): void {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  public getCurrentInfo(): { material: string; materialLabel: string; color: string; colorLabel: string } {
    return {
      material: this.currentMaterial,
      materialLabel: MATERIALS[this.currentMaterial].label,
      color: this.currentColor,
      colorLabel: COLOR_SCHEMES[this.currentColor].label,
    }
  }

  public getGradientColors(): { start: string; end: string } {
    const c = COLOR_SCHEMES[this.currentColor]
    return { start: c.gradientStart, end: c.gradientEnd }
  }

  public destroy(): void {
    this.stopRenderLoop()
    window.removeEventListener('resize', this.onResize.bind(this))
    this.productGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose()
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[]
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat.dispose()
      }
    })
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }
}
