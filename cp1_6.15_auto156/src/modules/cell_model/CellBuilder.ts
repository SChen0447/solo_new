import * as THREE from 'three'
import cellSchema from './cellSchema.json'
import type { CellType, OrganelleId, SimulationParams } from '@/store/Store'

export interface OrganelleMesh {
  id: OrganelleId
  mesh: THREE.Group
  instances: THREE.Mesh[]
  outline: THREE.LineSegments | null
}

interface OrganelleSchema {
  id: OrganelleId
  name: string
  position: [number, number, number]
  size: number
  color: string
  opacity: number
  shape: string
  segments: number
  cellTypes: string[]
  instances?: Array<{ position: [number, number, number]; rotation: [number, number, number] }>
}

export class CellBuilder {
  private cellGroup: THREE.Group
  private organelleMeshes: Map<OrganelleId, OrganelleMesh>
  private currentCellType: CellType
  private params: SimulationParams

  constructor() {
    this.cellGroup = new THREE.Group()
    this.organelleMeshes = new Map()
    this.currentCellType = 'animal'
    this.params = { lightIntensity: 500, glucoseConcentration: 10 }
  }

  public build(cellType: CellType, params: SimulationParams): THREE.Group {
    this.currentCellType = cellType
    this.params = params
    this.cellGroup.clear()
    this.organelleMeshes.clear()

    const organelles = cellSchema.organelles as Record<OrganelleId, OrganelleSchema>

    for (const [id, schema] of Object.entries(organelles)) {
      if (!schema.cellTypes.includes(cellType)) continue
      const organelleMesh = this.createOrganelle(schema)
      this.organelleMeshes.set(id as OrganelleId, organelleMesh)
      this.cellGroup.add(organelleMesh.mesh)
    }

    this.createConnections()
    return this.cellGroup
  }

  public update(cellType: CellType, params: SimulationParams): void {
    if (cellType !== this.currentCellType) {
      this.build(cellType, params)
      return
    }
    this.params = params
    this.updateMaterialParams()
  }

  private createOrganelle(schema: OrganelleSchema): OrganelleMesh {
    const group = new THREE.Group()
    group.name = schema.id
    const instances: THREE.Mesh[] = []

    if (schema.instances && schema.instances.length > 0) {
      for (const inst of schema.instances) {
        const mesh = this.createShape(schema)
        mesh.position.set(...inst.position)
        mesh.rotation.set(...inst.rotation)
        mesh.userData.organelleId = schema.id
        group.add(mesh)
        instances.push(mesh)
      }
    } else {
      const mesh = this.createShape(schema)
      mesh.position.set(...schema.position)
      mesh.userData.organelleId = schema.id
      group.add(mesh)
      instances.push(mesh)
    }

    const outline = this.createOutline(instances[0], schema.color)
    if (outline) {
      outline.visible = false
      group.add(outline)
    }

    return { id: schema.id, mesh: group, instances, outline }
  }

  private createShape(schema: OrganelleSchema): THREE.Mesh {
    let geometry: THREE.BufferGeometry
    const color = new THREE.Color(schema.color)

    switch (schema.shape) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(schema.size, schema.segments, schema.segments)
        break
      case 'ellipsoid':
        geometry = new THREE.SphereGeometry(schema.size, schema.segments, schema.segments)
        geometry.scale(1.5, 0.8, 0.8)
        break
      case 'box':
        geometry = new THREE.BoxGeometry(schema.size * 2, schema.size * 2, schema.size * 2, schema.segments, schema.segments, schema.segments)
        break
      case 'membrane':
        geometry = new THREE.TorusGeometry(schema.size, 0.1, 8, schema.segments)
        geometry.rotateX(Math.PI / 2)
        break
      case 'cisternae':
        geometry = createStackedCisternaeGeometry(schema.size, schema.segments)
        break
      default:
        geometry = new THREE.SphereGeometry(schema.size, schema.segments, schema.segments)
    }

    const gradientMaterial = this.createGradientMaterial(color, schema.opacity)

    const mesh = new THREE.Mesh(geometry, gradientMaterial)
    mesh.castShadow = true
    mesh.receiveShadow = true

    return mesh
  }

  private createGradientMaterial(baseColor: THREE.Color, opacity: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: baseColor },
        opacity: { value: opacity },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform float opacity;
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 color = baseColor * (0.5 + intensity * 0.8);
          gl_FragColor = vec4(color, opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  }

  private createOutline(mesh: THREE.Mesh, color: string): THREE.LineSegments | null {
    try {
      const edges = new THREE.EdgesGeometry(mesh.geometry)
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color('#00ffff'),
        linewidth: 2,
        transparent: true,
        opacity: 0,
      })
      const outline = new THREE.LineSegments(edges, material)
      outline.userData.baseColor = new THREE.Color(color)
      outline.userData.pulsePhase = 0
      return outline
    } catch {
      return null
    }
  }

  private createConnections(): void {
    const connections = cellSchema.connections as Array<{ from: OrganelleId; to: OrganelleId; type: string }>

    for (const conn of connections) {
      const from = this.organelleMeshes.get(conn.from)
      const to = this.organelleMeshes.get(conn.to)

      if (!from || !to) continue

      const fromPos = from.instances[0].position
      const toPos = to.instances[0].position

      const curve = new THREE.QuadraticBezierCurve3(
        fromPos,
        new THREE.Vector3(
          (fromPos.x + toPos.x) / 2,
          (fromPos.y + toPos.y) / 2 + 0.5,
          (fromPos.z + toPos.z) / 2
        ),
        toPos
      )

      const points = curve.getPoints(20)
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.3,
      })
      const line = new THREE.Line(geometry, material)
      this.cellGroup.add(line)
    }
  }

  private updateMaterialParams(): void {
    this.organelleMeshes.forEach((organelle) => {
      organelle.instances.forEach((mesh) => {
        const material = mesh.material as THREE.ShaderMaterial
        if (material.uniforms) {
          const lightFactor = this.params.lightIntensity / 1000
          const glucoseFactor = this.params.glucoseConcentration / 20

          if (organelle.id === 'chloroplast') {
            material.uniforms.opacity.value = 0.3 + lightFactor * 0.2
          } else if (organelle.id === 'mitochondria') {
            material.uniforms.opacity.value = 0.3 + glucoseFactor * 0.2
          }
        }
      })
    })
  }

  public highlightOrganelle(id: OrganelleId | null): void {
    this.organelleMeshes.forEach((organelle, organelleId) => {
      const isSelected = organelleId === id
      const hasSelection = id !== null

      organelle.instances.forEach((mesh) => {
        const material = mesh.material as THREE.ShaderMaterial
        if (material.uniforms) {
          if (isSelected) {
            material.uniforms.opacity.value = 0.7
          } else if (hasSelection) {
            material.uniforms.opacity.value = 0.15
          } else {
            const schema = cellSchema.organelles[organelleId as keyof typeof cellSchema.organelles] as OrganelleSchema
            material.uniforms.opacity.value = schema?.opacity || 0.4
          }
        }
      })

      if (organelle.outline) {
        organelle.outline.visible = isSelected
        const mat = organelle.outline.material as THREE.LineBasicMaterial
        if (isSelected) {
          mat.opacity = 1
        }
      }

      if (isSelected) {
        this.animateSelection(organelle)
      } else {
        organelle.mesh.scale.set(1, 1, 1)
      }
    })
  }

  private animateSelection(organelle: OrganelleMesh): void {
    const startTime = Date.now()
    const duration = 300
    const startScale = 1
    const endScale = 1.2

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const scale = startScale + (endScale - startScale) * eased
      organelle.mesh.scale.set(scale, scale, scale)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        this.startPulseAnimation(organelle)
      }
    }
    animate()
  }

  private startPulseAnimation(organelle: OrganelleMesh): void {
    if (!organelle.outline) return

    const animate = () => {
      if (!organelle.outline || organelle.outline.parent === null) return

      const time = Date.now() * 0.001
      const pulse = Math.sin(time * Math.PI * 2 / 1.5) * 0.5 + 0.5

      const mat = organelle.outline.material as THREE.LineBasicMaterial
      mat.opacity = 0.5 + pulse * 0.5

      const baseColor = organelle.outline.userData.baseColor as THREE.Color
      const pulseColor = new THREE.Color('#00ffff')
      mat.color.lerpColors(baseColor, pulseColor, pulse)

      requestAnimationFrame(animate)
    }
    animate()
  }

  public getOrganelleMeshes(): Map<OrganelleId, OrganelleMesh> {
    return this.organelleMeshes
  }

  public dispose(): void {
    this.organelleMeshes.forEach((organelle) => {
      organelle.instances.forEach((mesh) => {
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose())
        } else {
          mesh.material.dispose()
        }
      })
      if (organelle.outline) {
        organelle.outline.geometry.dispose()
        if (Array.isArray(organelle.outline.material)) {
          organelle.outline.material.forEach((m) => m.dispose())
        } else {
          organelle.outline.material.dispose()
        }
      }
    })
    this.organelleMeshes.clear()
    this.cellGroup.clear()
  }
}

function createStackedCisternaeGeometry(size: number, segments: number): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const cisternaCount = 5
  let indexOffset = 0

  for (let i = 0; i < cisternaCount; i++) {
    const yOffset = (i - cisternaCount / 2) * 0.15
    const scale = 1 - Math.abs(i - cisternaCount / 2) * 0.15
    const radiusTop = size * scale * 0.9
    const radiusBottom = size * scale
    const height = 0.08

    const cylGeo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)
    const positionAttr = cylGeo.attributes.position
    const normalAttr = cylGeo.attributes.normal
    const indexAttr = cylGeo.index

    const rotationMatrix = new THREE.Matrix4().makeRotationX(Math.PI / 6)
    const translationMatrix = new THREE.Matrix4().makeTranslation(0, yOffset, 0)
    const matrix = translationMatrix.multiply(rotationMatrix)

    for (let j = 0; j < positionAttr.count; j++) {
      const v = new THREE.Vector3(
        positionAttr.getX(j),
        positionAttr.getY(j),
        positionAttr.getZ(j)
      )
      v.applyMatrix4(matrix)
      positions.push(v.x, v.y, v.z)

      const n = new THREE.Vector3(
        normalAttr.getX(j),
        normalAttr.getY(j),
        normalAttr.getZ(j)
      )
      n.applyMatrix4(matrix)
      normals.push(n.x, n.y, n.z)
    }

    if (indexAttr) {
      for (let j = 0; j < indexAttr.count; j++) {
        indices.push(indexAttr.getX(j) + indexOffset)
      }
    } else {
      for (let j = 0; j < positionAttr.count; j++) {
        indices.push(j + indexOffset)
      }
    }

    indexOffset += positionAttr.count
    cylGeo.dispose()
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}
