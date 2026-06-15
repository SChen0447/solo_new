import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PerlinNoise } from './utils/PerlinNoise'
import type { EnvironmentParams, FishState, CoralConfig, SeaweedConfig, PlanktonParticle, FishSpecies } from '@/types'
import { SCENE_CONFIG, FISH_SPECIES } from '@/types'

export class SceneManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private container: HTMLElement

  private terrain!: THREE.Mesh
  private coralGroup: THREE.Group = new THREE.Group()
  private seaweedGroup: THREE.Group = new THREE.Group()
  private rockGroup: THREE.Group = new THREE.Group()
  private fishMeshes: Map<string, THREE.InstancedMesh> = new Map()
  private fishHalos: Map<string, THREE.InstancedMesh> = new Map()
  private plankton!: THREE.Points

  private ambientLight!: THREE.HemisphereLight
  private directionalLight!: THREE.DirectionalLight
  private lightBeams: THREE.SpotLight[] = []
  private fog!: THREE.FogExp2

  private perlinNoise: PerlinNoise
  private coralConfigs: CoralConfig[] = []
  private seaweedConfigs: SeaweedConfig[] = []
  private planktonParticles: PlanktonParticle[] = []
  private obstacleMeshes: THREE.Mesh[] = []

  private targetZoom: number = 40
  private zoomAnimationTime: number = 0
  private isZooming: boolean = false

  private clock: THREE.Clock = new THREE.Clock()
  private dummy: THREE.Object3D = new THREE.Object3D()

  constructor(container: HTMLElement) {
    this.container = container
    this.perlinNoise = new PerlinNoise(12345)

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)

    this.init()
  }

  private init(): void {
    this.setupRenderer()
    this.setupCamera()
    this.setupControls()
    this.setupLighting()
    this.createTerrain()
    this.createCorals()
    this.createSeaweed()
    this.createRocks()
    this.createPlankton()
    this.createLightBeams()
    this.createFishMeshes()
    this.setupFog()

    this.scene.add(this.coralGroup, this.seaweedGroup, this.rockGroup)
  }

  private setupRenderer(): void {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.container.appendChild(this.renderer.domElement)

    window.addEventListener('resize', this.handleResize)
  }

  private setupCamera(): void {
    this.camera.position.set(0, 10, 40)
    this.camera.lookAt(0, -15, 0)
  }

  private setupControls(): void {
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.enablePan = false
    this.controls.minDistance = 10
    this.controls.maxDistance = 80
    this.controls.target.set(0, -15, 0)
    this.controls.addEventListener('start', () => {
      this.isZooming = false
    })
  }

  private setupLighting(): void {
    this.ambientLight = new THREE.HemisphereLight(0x87ceeb, 0x0a2a4a, 0.6)
    this.scene.add(this.ambientLight)

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    this.directionalLight.position.set(20, 50, 20)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 200
    this.directionalLight.shadow.camera.left = -60
    this.directionalLight.shadow.camera.right = 60
    this.directionalLight.shadow.camera.top = 60
    this.directionalLight.shadow.camera.bottom = -60
    this.scene.add(this.directionalLight)
  }

  private setupFog(): void {
    this.fog = new THREE.FogExp2(0x0a2a4a, 0.008)
    this.scene.fog = this.fog
  }

  private createTerrain(): void {
    const size = SCENE_CONFIG.terrainSize
    const resolution = SCENE_CONFIG.terrainResolution
    const geometry = new THREE.PlaneGeometry(size, size, resolution - 1, resolution - 1)
    geometry.rotateX(-Math.PI / 2)

    const positions = geometry.attributes.position
    const colors = new Float32Array(positions.count * 3)

    const color1 = new THREE.Color(0x1a5276)
    const color2 = new THREE.Color(0x0b3d60)

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)

      const noiseValue = this.perlinNoise.octaveNoise2D(x * 0.02, z * 0.02, 4, 0.5)
      const depth = this.lerp(SCENE_CONFIG.maxDepth, SCENE_CONFIG.minDepth, (noiseValue + 1) / 2)
      positions.setY(i, depth)

      const colorT = (depth - SCENE_CONFIG.minDepth) / (SCENE_CONFIG.maxDepth - SCENE_CONFIG.minDepth)
      const color = color1.clone().lerp(color2, colorT)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.computeVertexNormals()

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    })

    this.terrain = new THREE.Mesh(geometry, material)
    this.terrain.receiveShadow = true
    this.scene.add(this.terrain)
  }

  private getTerrainHeight(x: number, z: number): number {
    const noiseValue = this.perlinNoise.octaveNoise2D(x * 0.02, z * 0.02, 4, 0.5)
    return this.lerp(SCENE_CONFIG.maxDepth, SCENE_CONFIG.minDepth, (noiseValue + 1) / 2)
  }

  private createCorals(): void {
    const coralGeometries = [
      this.createCoralGeometry(0),
      this.createCoralGeometry(1),
      this.createCoralGeometry(2)
    ]

    const coralMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xff6b9d, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x9c27b0, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0xff9800, roughness: 0.8 })
    ]

    for (let i = 0; i < SCENE_CONFIG.coralCount; i++) {
      const type = Math.floor(Math.random() * 3)
      const x = (Math.random() - 0.5) * 80
      const z = (Math.random() - 0.5) * 80
      const y = this.getTerrainHeight(x, z)
      const scale = 0.8 + Math.random() * 1.5
      const rotation = Math.random() * Math.PI * 2

      const coral = new THREE.Mesh(coralGeometries[type], coralMaterials[type])
      coral.position.set(x, y + 0.1, z)
      coral.scale.setScalar(scale)
      coral.rotation.y = rotation
      coral.castShadow = true
      coral.receiveShadow = true
      this.coralGroup.add(coral)
      this.obstacleMeshes.push(coral)

      this.coralConfigs.push({ type, position: new THREE.Vector3(x, y, z), scale, rotation })
    }
  }

  private createCoralGeometry(type: number): THREE.BufferGeometry {
    if (type === 0) {
      const geometry = new THREE.ConeGeometry(1, 3, 6)
      geometry.translate(0, 1.5, 0)
      return geometry
    } else if (type === 1) {
      const geometry = new THREE.SphereGeometry(1.2, 8, 6)
      const positions = geometry.attributes.position
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i)
        if (y > 0) {
          positions.setY(i, y * 1.5)
        }
      }
      geometry.translate(0, 0.8, 0)
      geometry.computeVertexNormals()
      return geometry
    } else {
      const group = new THREE.Group()
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2
        const finger = new THREE.CylinderGeometry(0.2, 0.3, 2, 6)
        finger.translate(Math.cos(angle) * 0.5, 1, Math.sin(angle) * 0.5)
        finger.rotateX(0.3)
        finger.rotateZ(angle)
        group.add(finger)
      }
      const base = new THREE.SphereGeometry(0.8, 8, 6)
      group.add(base)
      return new THREE.BufferGeometry().setFromObject(group)
    }
  }

  private createSeaweed(): void {
    for (let i = 0; i < SCENE_CONFIG.seaweedCount; i++) {
      const x = (Math.random() - 0.5) * 90
      const z = (Math.random() - 0.5) * 90
      const y = this.getTerrainHeight(x, z)
      const height = 2 + Math.random() * 4
      const frequency = 0.8 + Math.random() * 0.7
      const phase = Math.random() * Math.PI * 2

      const segments = 8
      const geometry = new THREE.PlaneGeometry(0.3, height, 1, segments)
      geometry.translate(0, height / 2, 0)

      const material = new THREE.MeshStandardMaterial({
        color: 0x2e7d32,
        side: THREE.DoubleSide,
        roughness: 0.9,
        transparent: true,
        opacity: 0.9
      })

      const seaweed = new THREE.Mesh(geometry, material)
      seaweed.position.set(x, y + 0.1, z)
      seaweed.castShadow = true
      this.seaweedGroup.add(seaweed)

      this.seaweedConfigs.push({
        position: new THREE.Vector3(x, y, z),
        height,
        swayFrequency: frequency,
        swayPhase: phase
      })
    }
  }

  private createRocks(): void {
    for (let i = 0; i < SCENE_CONFIG.rockCount; i++) {
      const x = (Math.random() - 0.5) * 85
      const z = (Math.random() - 0.5) * 85
      const y = this.getTerrainHeight(x, z)
      const scale = 1 + Math.random() * 2.5

      const geometry = new THREE.DodecahedronGeometry(1, 1)
      const positions = geometry.attributes.position
      for (let j = 0; j < positions.count; j++) {
        const px = positions.getX(j)
        const py = positions.getY(j)
        const pz = positions.getZ(j)
        const noise = this.perlinNoise.noise2D(px * 2, pz * 2) * 0.3
        positions.setX(j, px + noise)
        positions.setY(j, py + noise * 0.5)
        positions.setZ(j, pz + noise)
      }
      geometry.computeVertexNormals()

      const material = new THREE.MeshStandardMaterial({
        color: 0x5d6d7e,
        roughness: 0.95,
        metalness: 0.1
      })

      const rock = new THREE.Mesh(geometry, material)
      rock.position.set(x, y + 0.2, z)
      rock.scale.setScalar(scale)
      rock.rotation.set(Math.random(), Math.random(), Math.random())
      rock.castShadow = true
      rock.receiveShadow = true
      this.rockGroup.add(rock)
      this.obstacleMeshes.push(rock)
    }
  }

  private createPlankton(): void {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(SCENE_CONFIG.planktonCount * 3)
    const colors = new Float32Array(SCENE_CONFIG.planktonCount * 3)
    const sizes = new Float32Array(SCENE_CONFIG.planktonCount)

    for (let i = 0; i < SCENE_CONFIG.planktonCount; i++) {
      const x = (Math.random() - 0.5) * 100
      const y = this.lerp(SCENE_CONFIG.minDepth, SCENE_CONFIG.maxDepth - 5, Math.random())
      const z = (Math.random() - 0.5) * 100

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      const brightness = 0.6 + Math.random() * 0.4
      colors[i * 3] = 0.5 * brightness
      colors[i * 3 + 1] = 0.8 * brightness
      colors[i * 3 + 2] = 1.0 * brightness

      sizes[i] = 2 + Math.random() * 4

      this.planktonParticles.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.2
        ),
        size: sizes[i],
        opacity: 0.3 + Math.random() * 0.3
      })
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })

    this.plankton = new THREE.Points(geometry, material)
    this.scene.add(this.plankton)
  }

  private createLightBeams(): void {
    for (let i = 0; i < 5; i++) {
      const x = (Math.random() - 0.5) * 80
      const z = (Math.random() - 0.5) * 80

      const beam = new THREE.SpotLight(0x88ccff, 0.3, 60, Math.PI / 8, 0.5, 1)
      beam.position.set(x, 5, z)
      beam.target.position.set(x, SCENE_CONFIG.minDepth + 5, z)
      beam.castShadow = false
      this.scene.add(beam)
      this.scene.add(beam.target)
      this.lightBeams.push(beam)
    }
  }

  private createFishGeometry(): THREE.BufferGeometry {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.quadraticCurveTo(0.5, 0.2, 1, 0)
    shape.quadraticCurveTo(0.5, -0.2, 0, 0)

    const extrudeSettings = { depth: 0.3, bevelEnabled: false }
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geometry.center()
    geometry.rotateY(Math.PI / 2)

    const tailGeometry = new THREE.ConeGeometry(0.3, 0.4, 4)
    tailGeometry.rotateZ(Math.PI / 2)
    tailGeometry.translate(-0.7, 0, 0)

    const mergedGeometry = new THREE.BufferGeometry().setFromObject(
      new THREE.Group().add(
        new THREE.Mesh(geometry),
        new THREE.Mesh(tailGeometry)
      )
    )

    return mergedGeometry
  }

  private createFishMeshes(): void {
    const fishGeometry = this.createFishGeometry()

    FISH_SPECIES.forEach((species: FishSpecies) => {
      const material = new THREE.MeshStandardMaterial({
        color: species.color,
        roughness: 0.4,
        metalness: 0.3
      })

      const instancedMesh = new THREE.InstancedMesh(fishGeometry, material, species.count)
      instancedMesh.castShadow = true
      instancedMesh.receiveShadow = true
      this.scene.add(instancedMesh)
      this.fishMeshes.set(species.id, instancedMesh)

      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide
      })
      const haloMesh = new THREE.InstancedMesh(fishGeometry, haloMaterial, species.count)
      haloMesh.scale.setScalar(1.5)
      this.scene.add(haloMesh)
      this.fishHalos.set(species.id, haloMesh)
    })
  }

  public getObstacleMeshes(): THREE.Mesh[] {
    return this.obstacleMeshes
  }

  public getScene(): THREE.Scene {
    return this.scene
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer
  }

  public getControls(): OrbitControls {
    return this.controls
  }

  public updateEnvironment(params: EnvironmentParams): void {
    const intensityFactor = params.lightIntensity / 100
    this.ambientLight.intensity = 0.4 * intensityFactor
    this.directionalLight.intensity = 1.0 * intensityFactor
    this.lightBeams.forEach(beam => {
      beam.intensity = 0.4 * intensityFactor
    })

    const turbidityFactor = params.waterTurbidity / 100
    this.fog.density = 0.005 + turbidityFactor * 0.02
    this.scene.background = new THREE.Color().lerpColors(
      new THREE.Color(0x0a2a4a),
      new THREE.Color(0x1a4a6a),
      turbidityFactor * 0.5
    )
    this.plankton.material.opacity = 0.3 + (1 - turbidityFactor) * 0.4

    this.renderer.toneMappingExposure = 0.8 + intensityFactor * 0.6
  }

  public updateFishStates(fishStates: FishState[]): void {
    const speciesMap = new Map<string, { states: FishState[], index: number }>()

    FISH_SPECIES.forEach((species: FishSpecies) => {
      speciesMap.set(species.id, { states: [], index: 0 })
    })

    fishStates.forEach(state => {
      const speciesData = speciesMap.get(state.speciesId)
      if (speciesData) {
        speciesData.states.push(state)
      }
    })

    speciesMap.forEach((data, speciesId) => {
      const mesh = this.fishMeshes.get(speciesId)
      const halo = this.fishHalos.get(speciesId)
      if (!mesh || !halo) return

      data.states.forEach((state, i) => {
        this.dummy.position.copy(state.position)
        this.dummy.rotation.copy(state.rotation)
        const scale = state.hoverScale
        this.dummy.scale.set(scale, scale, scale)
        this.dummy.updateMatrix()
        mesh.setMatrixAt(i, this.dummy.matrix)
        halo.setMatrixAt(i, this.dummy.matrix)
      })

      mesh.instanceMatrix.needsUpdate = true
      halo.instanceMatrix.needsUpdate = true

      const haloMaterial = halo.material as THREE.MeshBasicMaterial
      data.states.forEach((state, i) => {
        haloMaterial.opacity = state.isHovered ? 0.4 : 0
      })
    })
  }

  private updateSeaweed(time: number): void {
    this.seaweedGroup.children.forEach((seaweed, i) => {
      const config = this.seaweedConfigs[i]
      if (!config) return

      const mesh = seaweed as THREE.Mesh
      const geometry = mesh.geometry as THREE.PlaneGeometry
      const positions = geometry.attributes.position

      for (let j = 0; j < positions.count; j++) {
        const y = positions.getY(j)
        const swayAmount = (y / config.height) * 0.8
        const sway = Math.sin(time * config.swayFrequency + config.swayPhase) * swayAmount
        positions.setX(j, sway)
      }
      positions.needsUpdate = true
      geometry.computeVertexNormals()
    })
  }

  private updatePlankton(deltaTime: number, currentSpeed: number): void {
    const positions = this.plankton.geometry.attributes.position as THREE.BufferAttribute

    this.planktonParticles.forEach((particle, i) => {
      particle.position.addScaledVector(particle.velocity, deltaTime * currentSpeed)
      particle.position.y += Math.sin(Date.now() * 0.001 + i) * deltaTime * 0.5

      if (particle.position.x > 50) particle.position.x = -50
      if (particle.position.x < -50) particle.position.x = 50
      if (particle.position.z > 50) particle.position.z = -50
      if (particle.position.z < -50) particle.position.z = 50
      if (particle.position.y > SCENE_CONFIG.maxDepth - 5) particle.position.y = SCENE_CONFIG.minDepth
      if (particle.position.y < SCENE_CONFIG.minDepth) particle.position.y = SCENE_CONFIG.maxDepth - 5

      positions.setXYZ(i, particle.position.x, particle.position.y, particle.position.z)
    })

    positions.needsUpdate = true
  }

  private updateLightBeams(time: number): void {
    this.lightBeams.forEach((beam, i) => {
      const offset = Math.sin(time * 0.5 + i) * 2
      beam.position.x += offset * 0.01
      beam.target.position.x += offset * 0.01
    })
  }

  private updateCameraZoom(deltaTime: number): void {
    if (this.isZooming && this.zoomAnimationTime < 0.6) {
      this.zoomAnimationTime += deltaTime
      const t = this.zoomAnimationTime / 0.6
      const easeOut = 1 - Math.pow(1 - t, 3)

      const currentDistance = this.camera.position.distanceTo(this.controls.target)
      const newDistance = currentDistance + (this.targetZoom - currentDistance) * easeOut

      const direction = this.camera.position.clone().sub(this.controls.target).normalize()
      this.camera.position.copy(this.controls.target.clone().add(direction.multiplyScalar(newDistance)))

      if (this.zoomAnimationTime >= 0.6) {
        this.isZooming = false
      }
    }
  }

  public handleWheel = (event: WheelEvent): void => {
    event.preventDefault()
    const currentDistance = this.camera.position.distanceTo(this.controls.target)
    const delta = event.deltaY * 0.05
    this.targetZoom = Math.max(10, Math.min(80, currentDistance + delta))
    this.isZooming = true
    this.zoomAnimationTime = 0
  }

  private handleResize = (): void => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  public update(deltaTime: number, currentSpeed: number): void {
    const time = this.clock.getElapsedTime()

    this.updateSeaweed(time)
    this.updatePlankton(deltaTime, currentSpeed)
    this.updateLightBeams(time)
    this.updateCameraZoom(deltaTime)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize)
    this.renderer.domElement.removeEventListener('wheel', this.handleWheel)
    this.controls.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
