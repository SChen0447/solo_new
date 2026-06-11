import * as THREE from 'three'

export type BrushMode = 'smooth' | 'inflate' | 'deflate' | 'scrape'

export interface DeformResult {
  deformed: boolean
  affectedVertices: number[]
}

interface HistoryState {
  vertices: Float32Array
  affectedVertices: number[]
}

export class MeshDeformer {
  private vertices: Float32Array
  private originalVertices: Float32Array
  private indices: Uint32Array
  private normals: Float32Array
  private adjacencyList: number[][]
  private subdivisionLevel: number
  private baseRadius: number
  private vertexCount: number
  private history: HistoryState[] = []
  private historyIndex: number = -1
  private maxHistory: number = 50

  constructor(subdivisionLevel: number = 3, baseRadius: number = 5) {
    this.subdivisionLevel = Math.min(subdivisionLevel, 4)
    this.baseRadius = baseRadius
    
    const geometry = this.createIcosahedron(this.subdivisionLevel, this.baseRadius)
    
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    this.vertexCount = positionAttr.count
    
    if (this.vertexCount > 2000) {
      console.warn(`Vertex count (${this.vertexCount}) exceeds 2000, reducing subdivision`)
      this.subdivisionLevel = Math.max(1, this.subdivisionLevel - 1)
      const newGeometry = this.createIcosahedron(this.subdivisionLevel, this.baseRadius)
      const newPosAttr = newGeometry.getAttribute('position') as THREE.BufferAttribute
      this.vertexCount = newPosAttr.count
      geometry.dispose()
      this.initFromGeometry(newGeometry)
      newGeometry.dispose()
    } else {
      this.initFromGeometry(geometry)
      geometry.dispose()
    }
    
    console.log(`Mesh initialized with ${this.vertexCount} vertices`)
  }

  private createIcosahedron(subdivisionLevel: number, radius: number): THREE.IcosahedronGeometry {
    return new THREE.IcosahedronGeometry(radius, subdivisionLevel)
  }

  private initFromGeometry(geometry: THREE.IcosahedronGeometry): void {
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const indexAttr = geometry.getIndex() as THREE.BufferAttribute
    
    this.vertices = new Float32Array(positionAttr.array as Float32Array)
    this.originalVertices = new Float32Array(this.vertices)
    this.indices = new Uint32Array(indexAttr.array as Uint32Array)
    this.normals = new Float32Array(this.vertices.length)
    
    this.buildAdjacencyList()
    this.computeNormals()
  }

  private buildAdjacencyList(): void {
    this.adjacencyList = Array.from({ length: this.vertexCount }, () => [] as number[])
    
    for (let i = 0; i < this.indices.length; i += 3) {
      const i0 = this.indices[i]
      const i1 = this.indices[i + 1]
      const i2 = this.indices[i + 2]
      
      this.addAdjacency(i0, i1)
      this.addAdjacency(i1, i0)
      this.addAdjacency(i1, i2)
      this.addAdjacency(i2, i1)
      this.addAdjacency(i2, i0)
      this.addAdjacency(i0, i2)
    }
  }

  private addAdjacency(vertex: number, neighbor: number): void {
    if (!this.adjacencyList[vertex].includes(neighbor)) {
      this.adjacencyList[vertex].push(neighbor)
    }
  }

  private computeNormals(): void {
    this.normals.fill(0)
    
    for (let i = 0; i < this.indices.length; i += 3) {
      const i0 = this.indices[i] * 3
      const i1 = this.indices[i + 1] * 3
      const i2 = this.indices[i + 2] * 3
      
      const v0 = new THREE.Vector3(this.vertices[i0], this.vertices[i0 + 1], this.vertices[i0 + 2])
      const v1 = new THREE.Vector3(this.vertices[i1], this.vertices[i1 + 1], this.vertices[i1 + 2])
      const v2 = new THREE.Vector3(this.vertices[i2], this.vertices[i2 + 1], this.vertices[i2 + 2])
      
      const edge1 = new THREE.Vector3().subVectors(v1, v0)
      const edge2 = new THREE.Vector3().subVectors(v2, v0)
      const faceNormal = new THREE.Vector3().crossVectors(edge1, edge2).normalize()
      
      this.normals[i0] += faceNormal.x
      this.normals[i0 + 1] += faceNormal.y
      this.normals[i0 + 2] += faceNormal.z
      
      this.normals[i1] += faceNormal.x
      this.normals[i1 + 1] += faceNormal.y
      this.normals[i1 + 2] += faceNormal.z
      
      this.normals[i2] += faceNormal.x
      this.normals[i2 + 1] += faceNormal.y
      this.normals[i2 + 2] += faceNormal.z
    }
    
    for (let i = 0; i < this.normals.length; i += 3) {
      const len = Math.sqrt(
        this.normals[i] ** 2 + 
        this.normals[i + 1] ** 2 + 
        this.normals[i + 2] ** 2
      )
      if (len > 0) {
        this.normals[i] /= len
        this.normals[i + 1] /= len
        this.normals[i + 2] /= len
      }
    }
  }

  private laplacianSmooth(vertexIndex: number, strength: number = 0.5): THREE.Vector3 {
    const neighbors = this.adjacencyList[vertexIndex]
    if (neighbors.length === 0) {
      return new THREE.Vector3(
        this.vertices[vertexIndex * 3],
        this.vertices[vertexIndex * 3 + 1],
        this.vertices[vertexIndex * 3 + 2]
      )
    }
    
    let sumX = 0, sumY = 0, sumZ = 0
    for (const neighbor of neighbors) {
      sumX += this.vertices[neighbor * 3]
      sumY += this.vertices[neighbor * 3 + 1]
      sumZ += this.vertices[neighbor * 3 + 2]
    }
    
    const avgX = sumX / neighbors.length
    const avgY = sumY / neighbors.length
    const avgZ = sumZ / neighbors.length
    
    const currentX = this.vertices[vertexIndex * 3]
    const currentY = this.vertices[vertexIndex * 3 + 1]
    const currentZ = this.vertices[vertexIndex * 3 + 2]
    
    return new THREE.Vector3(
      currentX + (avgX - currentX) * strength,
      currentY + (avgY - currentY) * strength,
      currentZ + (avgZ - currentZ) * strength
    )
  }

  private getBrushFalloff(distance: number, radius: number): number {
    if (distance > radius) return 0
    const normalized = distance / radius
    return Math.pow(1 - normalized, 2)
  }

  public deform(
    brushPosition: THREE.Vector3,
    mode: BrushMode,
    radius: number,
    intensity: number = 1
  ): DeformResult {
    const affectedVertices: number[] = []
    const savedVertices = new Float32Array(this.vertices)
    let deformed = false
    
    const brushStrength = 0.15 * intensity
    
    for (let i = 0; i < this.vertexCount; i++) {
      const vx = this.vertices[i * 3]
      const vy = this.vertices[i * 3 + 1]
      const vz = this.vertices[i * 3 + 2]
      
      const dx = vx - brushPosition.x
      const dy = vy - brushPosition.y
      const dz = vz - brushPosition.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      
      if (distance < radius) {
        const falloff = this.getBrushFalloff(distance, radius)
        const strength = falloff * brushStrength
        
        if (strength > 0.0001) {
          affectedVertices.push(i)
          
          const nx = this.normals[i * 3]
          const ny = this.normals[i * 3 + 1]
          const nz = this.normals[i * 3 + 2]
          
          let displacement: THREE.Vector3
          
          switch (mode) {
            case 'inflate':
              displacement = new THREE.Vector3(nx, ny, nz).multiplyScalar(strength * 3)
              break
            case 'deflate':
              displacement = new THREE.Vector3(-nx, -ny, -nz).multiplyScalar(strength * 3)
              break
            case 'smooth':
              const smoothed = this.laplacianSmooth(i, strength * 2)
              displacement = new THREE.Vector3(
                smoothed.x - vx,
                smoothed.y - vy,
                smoothed.z - vz
              )
              break
            case 'scrape':
              const toCenter = new THREE.Vector3(0, 0, 0)
                .sub(new THREE.Vector3(vx, vy, vz))
                .normalize()
              displacement = toCenter.multiplyScalar(strength * 2)
              break
            default:
              displacement = new THREE.Vector3()
          }
          
          if (displacement.length() > 0.0001) {
            this.vertices[i * 3] += displacement.x
            this.vertices[i * 3 + 1] += displacement.y
            this.vertices[i * 3 + 2] += displacement.z
            deformed = true
          }
        }
      }
    }
    
    if (deformed && affectedVertices.length > 0) {
      this.computeNormals()
      this.saveHistory(savedVertices, affectedVertices)
    }
    
    return { deformed, affectedVertices }
  }

  private saveHistory(vertices: Float32Array, affectedVertices: number[]): void {
    this.history = this.history.slice(0, this.historyIndex + 1)
    this.history.push({
      vertices: new Float32Array(vertices),
      affectedVertices: [...affectedVertices]
    })
    
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    } else {
      this.historyIndex++
    }
  }

  public undo(): boolean {
    if (this.historyIndex <= 0) return false
    
    this.historyIndex--
    const state = this.history[this.historyIndex]
    this.vertices = new Float32Array(state.vertices)
    this.computeNormals()
    
    return true
  }

  public redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) return false
    
    this.historyIndex++
    const state = this.history[this.historyIndex]
    this.vertices = new Float32Array(state.vertices)
    this.computeNormals()
    
    return true
  }

  public canUndo(): boolean {
    return this.historyIndex > 0
  }

  public canRedo(): boolean {
    return this.historyIndex < this.history.length - 1
  }

  public reset(): void {
    this.vertices = new Float32Array(this.originalVertices)
    this.computeNormals()
    this.history = []
    this.historyIndex = -1
  }

  public getVertexArray(): Float32Array {
    return this.vertices
  }

  public getIndexArray(): Uint32Array {
    return this.indices
  }

  public getNormalArray(): Float32Array {
    return this.normals
  }

  public getVertexCount(): number {
    return this.vertexCount
  }

  public getAdjacencyList(): number[][] {
    return this.adjacencyList
  }
}
