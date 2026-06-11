import * as THREE from 'three'

interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
  maxLife: number
}

export class SceneManager {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private clayMesh: THREE.Mesh | null = null
  private particles: Particle[] = []
  private animationId: number = 0
  private clock: THREE.Clock
  private externalObjects: Set<THREE.Object3D> = new Set()

  constructor(container: HTMLElement) {
    this.container = container
    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.setupBackground()

    this.camera = new THREE.PerspectiveCamera(
      80,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.z = 15

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x000000, 0)
    this.container.appendChild(this.renderer.domElement)

    this.setupLighting()
    this.setupOrbitControls()
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#1a1a2e')
    gradient.addColorStop(0.5, '#16213e')
    gradient.addColorStop(1, '#0f3460')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 512)

    const texture = new THREE.CanvasTexture(canvas)
    this.scene.background = texture
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6)
    this.scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
    mainLight.position.set(5, 10, 7)
    mainLight.castShadow = true
    this.scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0x00fff5, 0.3)
    fillLight.position.set(-5, 3, -5)
    this.scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x00ff88, 0.4)
    rimLight.position.set(0, -5, 5)
    this.scene.add(rimLight)
  }

  private setupOrbitControls(): void {
    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }
    let targetRotation = { x: 0, y: 0 }
    let currentRotation = { x: 0, y: 0 }

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isDragging = true
        previousMousePosition = { x: e.clientX, y: e.clientY }
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - previousMousePosition.x
      const deltaY = e.clientY - previousMousePosition.y
      targetRotation.y += deltaX * 0.01
      targetRotation.x += deltaY * 0.01
      targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.x))
      previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      isDragging = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      this.camera.position.z += e.deltaY * 0.01
      this.camera.position.z = Math.max(5, Math.min(30, this.camera.position.z))
    }

    const updateRotation = () => {
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1
      
      if (this.clayMesh) {
        this.clayMesh.rotation.x = currentRotation.x
        this.clayMesh.rotation.y = currentRotation.y
      }
    }

    this.container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    this.container.addEventListener('wheel', onWheel, { passive: false })
    this.container.addEventListener('contextmenu', (e) => e.preventDefault())

    const originalRender = this.render.bind(this)
    this.render = () => {
      updateRotation()
      originalRender()
    }
  }

  public initClayMesh(vertices: Float32Array, indices: Uint32Array): void {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.computeVertexNormals()

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.1,
      clearcoat: 0.2,
      clearcoatRoughness: 0.5,
      side: THREE.DoubleSide
    })

    this.clayMesh = new THREE.Mesh(geometry, material)
    this.clayMesh.castShadow = true
    this.clayMesh.receiveShadow = true
    this.scene.add(this.clayMesh)
  }

  public updateClayMesh(vertices: Float32Array): void {
    if (!this.clayMesh) return
    const positionAttribute = this.clayMesh.geometry.getAttribute('position') as THREE.BufferAttribute
    positionAttribute.array.set(vertices)
    positionAttribute.needsUpdate = true
    this.clayMesh.geometry.computeVertexNormals()
    this.clayMesh.geometry.computeBoundingBox()
    this.clayMesh.geometry.computeBoundingSphere()
  }

  public addObject(object: THREE.Object3D): void {
    if (!object || this.externalObjects.has(object)) return
    this.scene.add(object)
    this.externalObjects.add(object)
  }

  public removeObject(object: THREE.Object3D): void {
    if (!object || !this.externalObjects.has(object)) return
    this.scene.remove(object)
    this.externalObjects.delete(object)
    this.disposeObject(object)
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose()
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      }
      if (child instanceof THREE.Points) {
        if (child.geometry) {
          child.geometry.dispose()
        }
        if (child.material) {
          (child.material as THREE.Material).dispose()
        }
      }
      if (child instanceof THREE.Line) {
        if (child.geometry) {
          child.geometry.dispose()
        }
        if (child.material) {
          (child.material as THREE.Material).dispose()
        }
      }
    })
  }

  public addObjects(objects: THREE.Object3D[]): void {
    objects.forEach(obj => this.addObject(obj))
  }

  public removeObjects(objects: THREE.Object3D[]): void {
    objects.forEach(obj => this.removeObject(obj))
  }

  public clearExternalObjects(): void {
    this.externalObjects.forEach(obj => {
      this.scene.remove(obj)
      this.disposeObject(obj)
    })
    this.externalObjects.clear()
  }

  public hasObject(object: THREE.Object3D): boolean {
    return this.externalObjects.has(object)
  }

  public createParticles(position: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 4, 4)
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.3 + Math.random() * 0.2, 0.8, 0.6),
        transparent: true,
        opacity: 0.8
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(position)
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      )
      
      this.particles.push({
        mesh,
        velocity,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5
      })
      
      this.scene.add(mesh)
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      particle.life -= deltaTime / particle.maxLife
      
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh)
        particle.mesh.geometry.dispose()
        ;(particle.mesh.material as THREE.Material).dispose()
        this.particles.splice(i, 1)
        continue
      }
      
      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 10))
      particle.velocity.y -= 0.5 * deltaTime
      ;(particle.mesh.material as THREE.MeshBasicMaterial).opacity = particle.life * 0.8
      particle.mesh.scale.setScalar(particle.life)
    }
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  public getScene(): THREE.Scene {
    return this.scene
  }

  public render(): void {
    const deltaTime = this.clock.getDelta()
    this.updateParticles(deltaTime)
    this.renderer.render(this.scene, this.camera)
  }

  public handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId)
    
    this.clearExternalObjects()
    
    if (this.clayMesh) {
      this.scene.remove(this.clayMesh)
      this.clayMesh.geometry.dispose()
      if (this.clayMesh.material) {
        if (Array.isArray(this.clayMesh.material)) {
          this.clayMesh.material.forEach(m => m.dispose())
        } else {
          this.clayMesh.material.dispose()
        }
      }
      this.clayMesh = null
    }
    
    this.particles.forEach(particle => {
      this.scene.remove(particle.mesh)
      particle.mesh.geometry.dispose()
      if (particle.mesh.material) {
        if (Array.isArray(particle.mesh.material)) {
          particle.mesh.material.forEach(m => m.dispose())
        } else {
          particle.mesh.material.dispose()
        }
      }
    })
    this.particles = []
    
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          if (obj.geometry) {
            obj.geometry.dispose()
          }
        }
      })
    }
    
    this.renderer.dispose()
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
