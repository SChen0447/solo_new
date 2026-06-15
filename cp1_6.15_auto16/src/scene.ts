import * as THREE from 'three'
import type { PlantStructure, GrowthStage, LeafData, BranchData, FlowerData } from './store'

export class PlantScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private container: HTMLElement
  private plantGroup: THREE.Group
  private animationId: number | null = null
  private isRotating: boolean = false
  private previousMouseX: number = 0
  private previousMouseY: number = 0
  private cameraAngleX: number = 0
  private cameraAngleY: number = 0.3
  private cameraDistance: number = 6
  private targetPlantStructure: PlantStructure | null = null
  private currentPlantStructure: PlantStructure | null = null
  private morphStartTime: number = 0
  private morphDuration: number = 500
  private isMorphing: boolean = false
  private stageTransitionStartTime: number = 0
  private stageTransitionDuration: number = 800
  private isStageTransitioning: boolean = false
  private leafMeshes: Map<string, THREE.Mesh> = new Map()
  private branchMeshes: Map<string, THREE.Mesh> = new Map()
  private flowerGroups: Map<string, THREE.Group> = new Map()
  private mainStemMesh: THREE.Mesh | null = null
  private seedMesh: THREE.Mesh | null = null
  private sproutMesh: THREE.Mesh | null = null
  private leafGeometry: THREE.SphereGeometry
  private branchGeometry: THREE.CylinderGeometry
  private flowerPetalGeometry: THREE.SphereGeometry

  constructor(container: HTMLElement) {
    this.container = container
    this.scene = new THREE.Scene()
    this.plantGroup = new THREE.Group()

    this.leafGeometry = new THREE.SphereGeometry(1, 16, 12)
    this.branchGeometry = new THREE.CylinderGeometry(1, 1, 1, 8)
    this.flowerPetalGeometry = new THREE.SphereGeometry(1, 12, 12)

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    container.appendChild(this.renderer.domElement)

    this.setupSkybox()
    this.setupGround()
    this.setupLighting()
    this.setupCamera()
    this.scene.add(this.plantGroup)

    this.setupMouseControls()
    window.addEventListener('resize', this.handleResize)
  }

  private setupSkybox(): void {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#87ceeb')
    gradient.addColorStop(1, '#f0e68c')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 256)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const geometry = new THREE.SphereGeometry(50, 32, 32)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide
    })

    const skybox = new THREE.Mesh(geometry, material)
    this.scene.add(skybox)
  }

  private setupGround(): void {
    const groundGeometry = new THREE.CircleGeometry(20, 64)
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x90ee90,
      transparent: true,
      opacity: 0.3,
      shininess: 30,
      side: THREE.DoubleSide
    })

    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    this.scene.add(ground)

    const reflectorGeometry = new THREE.CircleGeometry(8, 64)
    const reflectorMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      shininess: 100,
      side: THREE.DoubleSide
    })

    const reflector = new THREE.Mesh(reflectorGeometry, reflectorMaterial)
    reflector.rotation.x = -Math.PI / 2
    reflector.position.y = 0
    this.scene.add(reflector)
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const spotLight = new THREE.SpotLight(0xffffff, 1.2)
    spotLight.position.set(-5, 8, 3)
    spotLight.angle = Math.PI / 6
    spotLight.penumbra = 0.3
    spotLight.decay = 2
    spotLight.distance = 15
    spotLight.castShadow = true
    spotLight.shadow.mapSize.width = 1024
    spotLight.shadow.mapSize.height = 1024
    spotLight.shadow.camera.near = 0.5
    spotLight.shadow.camera.far = 20

    this.scene.add(spotLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(3, 4, -2)
    this.scene.add(fillLight)
  }

  private setupCamera(): void {
    this.updateCameraPosition()
    this.camera.lookAt(0, 1, 0)
  }

  private updateCameraPosition(): void {
    const x = Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance
    const y = Math.sin(this.cameraAngleY) * this.cameraDistance + 1
    const z = Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance

    this.camera.position.set(x, y, z)
    this.camera.lookAt(0, 1, 0)
  }

  private setupMouseControls(): void {
    const canvas = this.renderer.domElement

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isRotating = true
        this.previousMouseX = e.clientX
        this.previousMouseY = e.clientY
      }
    })

    canvas.addEventListener('mousemove', (e) => {
      if (this.isRotating) {
        const deltaX = e.clientX - this.previousMouseX
        const deltaY = e.clientY - this.previousMouseY

        this.cameraAngleX -= deltaX * 0.01
        this.cameraAngleY += deltaY * 0.01
        this.cameraAngleY = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraAngleY))

        this.updateCameraPosition()

        this.previousMouseX = e.clientX
        this.previousMouseY = e.clientY
      }
    })

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRotating = false
      }
    })

    canvas.addEventListener('mouseleave', () => {
      this.isRotating = false
    })

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault()
    })
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
  }

  public updatePlantStructure(structure: PlantStructure): void {
    if (!this.currentPlantStructure) {
      this.currentPlantStructure = structure
      this.buildPlant(structure)
      return
    }

    if (this.currentPlantStructure.stage !== structure.stage) {
      this.isStageTransitioning = true
      this.stageTransitionStartTime = performance.now()
    }

    this.targetPlantStructure = structure
    this.morphStartTime = performance.now()
    this.isMorphing = true
  }

  private buildPlant(structure: PlantStructure): void {
    while (this.plantGroup.children.length > 0) {
      const child = this.plantGroup.children[0]
      this.plantGroup.remove(child)
    }
    this.leafMeshes.clear()
    this.branchMeshes.clear()
    this.flowerGroups.clear()
    this.mainStemMesh = null
    this.seedMesh = null
    this.sproutMesh = null

    switch (structure.stage) {
      case 'seed':
        this.buildSeed(structure)
        break
      case 'sprout':
        this.buildSprout(structure)
        break
      case 'seedling':
        this.buildSeedling(structure)
        break
      case 'flowering':
        this.buildFlowering(structure)
        break
    }
  }

  private buildSeed(_structure: PlantStructure): void {
    const seedGeometry = new THREE.SphereGeometry(0.15, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2)
    const seedMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      shininess: 30
    })

    this.seedMesh = new THREE.Mesh(seedGeometry, seedMaterial)
    this.seedMesh.position.y = 0.15
    this.seedMesh.castShadow = true
    this.plantGroup.add(this.seedMesh)
  }

  private buildSprout(_structure: PlantStructure): void {
    const sproutHeight = 0.5
    const sproutGeometry = new THREE.ConeGeometry(0.1, sproutHeight, 16)
    const sproutMaterial = new THREE.MeshPhongMaterial({
      color: 0x4caf50,
      shininess: 50
    })

    this.sproutMesh = new THREE.Mesh(sproutGeometry, sproutMaterial)
    this.sproutMesh.position.y = sproutHeight / 2
    this.sproutMesh.castShadow = true
    this.plantGroup.add(this.sproutMesh)
  }

  private buildSeedling(structure: PlantStructure): void {
    this.buildMainStem(structure)
    this.buildBranches(structure.branches)
    this.buildLeaves(structure.leaves)
  }

  private buildFlowering(structure: PlantStructure): void {
    this.buildMainStem(structure)
    this.buildBranches(structure.branches)
    this.buildLeaves(structure.leaves)
    this.buildFlowers(structure.flowers)
  }

  private buildMainStem(structure: PlantStructure): void {
    const stemGeometry = new THREE.CylinderGeometry(
      structure.mainStemThickness * 0.8,
      structure.mainStemThickness,
      structure.mainStemHeight,
      12
    )
    const stemMaterial = new THREE.MeshPhongMaterial({
      color: 0x5d4037,
      shininess: 20
    })

    this.mainStemMesh = new THREE.Mesh(stemGeometry, stemMaterial)
    this.mainStemMesh.position.y = structure.mainStemHeight / 2
    this.mainStemMesh.castShadow = true
    this.plantGroup.add(this.mainStemMesh)
  }

  private buildBranches(branches: BranchData[]): void {
    const branchMaterial = new THREE.MeshPhongMaterial({
      color: 0x6d4c41,
      shininess: 20
    })

    branches.forEach((branch) => {
      const mesh = new THREE.Mesh(this.branchGeometry, branchMaterial.clone())
      mesh.scale.set(branch.thickness, branch.length, branch.thickness)
      mesh.position.set(branch.position.x, branch.position.y, branch.position.z)
      mesh.rotation.set(branch.rotation.x, branch.rotation.y, branch.rotation.z)
      mesh.castShadow = true
      this.branchMeshes.set(branch.id, mesh)
      this.plantGroup.add(mesh)
    })
  }

  private buildLeaves(leaves: LeafData[]): void {
    leaves.forEach((leaf) => {
      const leafMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(leaf.color),
        shininess: 40,
        side: THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(this.leafGeometry, leafMaterial)
      mesh.scale.set(leaf.scale.x, leaf.scale.y, leaf.scale.z)
      mesh.position.set(leaf.position.x, leaf.position.y, leaf.position.z)
      mesh.rotation.set(leaf.rotation.x, leaf.rotation.y, leaf.rotation.z)
      mesh.castShadow = true
      this.leafMeshes.set(leaf.id, mesh)
      this.plantGroup.add(mesh)
    })
  }

  private buildFlowers(flowers: FlowerData[]): void {
    flowers.forEach((flower) => {
      const group = new THREE.Group()
      group.position.set(flower.position.x, flower.position.y, flower.position.z)
      group.rotation.set(flower.rotation.x, flower.rotation.y, flower.rotation.z)

      const centerGeometry = new THREE.SphereGeometry(flower.scale * 0.4, 12, 12)
      const centerMaterial = new THREE.MeshPhongMaterial({
        color: 0xffeb3b,
        shininess: 60
      })
      const center = new THREE.Mesh(centerGeometry, centerMaterial)
      group.add(center)

      for (let i = 0; i < flower.petalCount; i++) {
        const angle = (i / flower.petalCount) * Math.PI * 2
        const petalMaterial = new THREE.MeshPhongMaterial({
          color: new THREE.Color(flower.color),
          transparent: true,
          opacity: 0.7,
          shininess: 80,
          side: THREE.DoubleSide
        })

        const petal = new THREE.Mesh(this.flowerPetalGeometry, petalMaterial)
        petal.scale.set(flower.scale * 0.6, flower.scale * 0.3, flower.scale * 0.8)
        petal.position.set(
          Math.sin(angle) * flower.scale * 0.5,
          0,
          Math.cos(angle) * flower.scale * 0.5
        )
        petal.rotation.y = angle
        petal.rotation.x = Math.random() * 0.3 - 0.15

        group.add(petal)
      }

      this.flowerGroups.set(flower.id, group)
      this.plantGroup.add(group)
    })
  }

  private elasticOut(t: number): number {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  private updateMorph(now: number): void {
    if (!this.isMorphing || !this.targetPlantStructure || !this.currentPlantStructure) return

    const elapsed = now - this.morphStartTime
    const t = Math.min(1, elapsed / this.morphDuration)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    if (this.targetPlantStructure.stage === this.currentPlantStructure.stage) {
      this.morphPlantGeometry(eased)
    }

    if (t >= 1) {
      this.isMorphing = false
      this.currentPlantStructure = this.targetPlantStructure
      this.buildPlant(this.targetPlantStructure)
    }
  }

  private morphPlantGeometry(t: number): void {
    if (!this.currentPlantStructure || !this.targetPlantStructure) return

    const current = this.currentPlantStructure
    const target = this.targetPlantStructure

    if (this.mainStemMesh) {
      const newHeight = this.lerp(current.mainStemHeight, target.mainStemHeight, t)
      const newThickness = this.lerp(current.mainStemThickness, target.mainStemThickness, t)

      this.mainStemMesh.scale.y = newHeight / current.mainStemHeight
      this.mainStemMesh.scale.x = newThickness / current.mainStemThickness
      this.mainStemMesh.scale.z = newThickness / current.mainStemThickness
      this.mainStemMesh.position.y = newHeight / 2
    }

    if (current.stage === 'seedling' || current.stage === 'flowering') {
      this.morphLeaves(t)
      this.morphBranches(t)
    }

    if (current.stage === 'flowering' && target.stage === 'flowering') {
      this.morphFlowers(t)
    }
  }

  private morphLeaves(t: number): void {
    if (!this.currentPlantStructure || !this.targetPlantStructure) return

    const currentLeaves = this.currentPlantStructure.leaves
    const targetLeaves = this.targetPlantStructure.leaves

    currentLeaves.forEach((leaf, index) => {
      const mesh = this.leafMeshes.get(leaf.id)
      if (!mesh) return

      if (index < targetLeaves.length) {
        const target = targetLeaves[index]
        mesh.position.x = this.lerp(leaf.position.x, target.position.x, t)
        mesh.position.y = this.lerp(leaf.position.y, target.position.y, t)
        mesh.position.z = this.lerp(leaf.position.z, target.position.z, t)
        mesh.scale.x = this.lerp(leaf.scale.x, target.scale.x, t)
        mesh.scale.y = this.lerp(leaf.scale.y, target.scale.y, t)
        mesh.scale.z = this.lerp(leaf.scale.z, target.scale.z, t)

        const currentColor = new THREE.Color(leaf.color)
        const targetColor = new THREE.Color(target.color)
        ;(mesh.material as THREE.MeshPhongMaterial).color.lerpColors(
          currentColor,
          targetColor,
          t
        )
      } else {
        const fadeT = (t - (targetLeaves.length / currentLeaves.length)) / (1 - targetLeaves.length / currentLeaves.length)
        if (fadeT > 0) {
          mesh.scale.setScalar(1 - fadeT)
          ;(mesh.material as THREE.MeshPhongMaterial).opacity = 1 - fadeT
          ;(mesh.material as THREE.MeshPhongMaterial).transparent = true
        }
      }
    })
  }

  private morphBranches(t: number): void {
    if (!this.currentPlantStructure || !this.targetPlantStructure) return

    const currentBranches = this.currentPlantStructure.branches
    const targetBranches = this.targetPlantStructure.branches

    currentBranches.forEach((branch, index) => {
      const mesh = this.branchMeshes.get(branch.id)
      if (!mesh) return

      if (index < targetBranches.length) {
        const target = targetBranches[index]
        mesh.position.x = this.lerp(branch.position.x, target.position.x, t)
        mesh.position.y = this.lerp(branch.position.y, target.position.y, t)
        mesh.position.z = this.lerp(branch.position.z, target.position.z, t)
        mesh.rotation.x = this.lerp(branch.rotation.x, target.rotation.x, t)
        mesh.rotation.y = this.lerp(branch.rotation.y, target.rotation.y, t)
        mesh.rotation.z = this.lerp(branch.rotation.z, target.rotation.z, t)
        mesh.scale.x = this.lerp(branch.thickness, target.thickness, t) / branch.thickness * mesh.scale.x
        mesh.scale.y = this.lerp(branch.length, target.length, t) / branch.length * mesh.scale.y
        mesh.scale.z = this.lerp(branch.thickness, target.thickness, t) / branch.thickness * mesh.scale.z
      }
    })
  }

  private morphFlowers(t: number): void {
    if (!this.currentPlantStructure || !this.targetPlantStructure) return

    const currentFlowers = this.currentPlantStructure.flowers
    const targetFlowers = this.targetPlantStructure.flowers

    currentFlowers.forEach((flower, index) => {
      const group = this.flowerGroups.get(flower.id)
      if (!group) return

      if (index < targetFlowers.length) {
        const target = targetFlowers[index]
        group.position.x = this.lerp(flower.position.x, target.position.x, t)
        group.position.y = this.lerp(flower.position.y, target.position.y, t)
        group.position.z = this.lerp(flower.position.z, target.position.z, t)
        group.rotation.x = this.lerp(flower.rotation.x, target.rotation.x, t)
        group.rotation.y = this.lerp(flower.rotation.y, target.rotation.y, t)
        group.rotation.z = this.lerp(flower.rotation.z, target.rotation.z, t)

        const scaleRatio = this.lerp(flower.scale, target.scale, t) / flower.scale
        group.scale.setScalar(scaleRatio)

        group.children.forEach((child, i) => {
          if (i > 0) {
            const targetColor = new THREE.Color(target.color)
            const currentColor = new THREE.Color(flower.color)
            const material = (child as THREE.Mesh).material as THREE.MeshPhongMaterial
            material.color.lerpColors(currentColor, targetColor, t)
          }
        })
      }
    })
  }

  private updateStageTransition(now: number): void {
    if (!this.isStageTransitioning || !this.targetPlantStructure) return

    const elapsed = now - this.stageTransitionStartTime
    const t = Math.min(1, elapsed / this.stageTransitionDuration)
    const scale = this.elasticOut(t)

    this.plantGroup.scale.setScalar(scale)

    if (t >= 1) {
      this.isStageTransitioning = false
      this.plantGroup.scale.setScalar(1)
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)

    const now = performance.now()

    if (!this.isRotating) {
      this.plantGroup.rotation.y += (1 / 15) * (Math.PI * 2) / 60
    }

    this.updateMorph(now)
    this.updateStageTransition(now)

    this.renderer.render(this.scene, this.camera)
  }

  public start(): void {
    if (this.animationId === null) {
      this.animate()
    }
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  public dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.handleResize)

    this.leafGeometry.dispose()
    this.branchGeometry.dispose()
    this.flowerPetalGeometry.dispose()

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry && obj.geometry !== this.leafGeometry && obj.geometry !== this.branchGeometry && obj.geometry !== this.flowerPetalGeometry) {
          obj.geometry.dispose()
        }
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })

    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }
}
