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
  private edgeWeights: number[][]
  private valence: number[]
  private subdivisionLevel: number
  private baseRadius: number
  private vertexCount: number
  private history: HistoryState[] = []
  private historyIndex: number = -1
  private maxHistory: number = 50
  private maxSmoothIterations: number = 5
  private smoothConvergenceThreshold: number = 0.001

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
    this.edgeWeights = []
    this.valence = []
    
    this.buildAdjacencyList()
    this.computeEdgeWeights()
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

  private computeEdgeWeights(): void {
    this.edgeWeights = Array.from({ length: this.vertexCount }, () => [] as number[])
    this.valence = new Array(this.vertexCount).fill(0)

    for (let i = 0; i < this.vertexCount; i++) {
      const neighbors = this.adjacencyList[i]
      this.valence[i] = neighbors.length
      const weights: number[] = []

      for (let j = 0; j < neighbors.length; j++) {
        const neighbor = neighbors[j]
        const distance = this.getVertexDistance(i, neighbor)
        const weight = distance > 0 ? 1.0 / distance : 1.0
        weights.push(weight)
      }

      const weightSum = weights.reduce((sum, w) => sum + w, 0)
      for (let j = 0; j < weights.length; j++) {
        weights[j] = weights[j] / weightSum
      }

      this.edgeWeights[i] = weights
    }
  }

  private getVertexDistance(i: number, j: number): number {
    const dx = this.vertices[i * 3] - this.vertices[j * 3]
    const dy = this.vertices[i * 3 + 1] - this.vertices[j * 3 + 1]
    const dz = this.vertices[i * 3 + 2] - this.vertices[j * 3 + 2]
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
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

  private laplacianSmooth(
    vertexIndex: number,
    strength: number = 0.5,
    iterations: number = 3
  ): THREE.Vector3 {
    const neighbors = this.adjacencyList[vertexIndex]
    const weights = this.edgeWeights[vertexIndex]
    
    if (neighbors.length === 0 || weights.length === 0) {
      return new THREE.Vector3(
        this.vertices[vertexIndex * 3],
        this.vertices[vertexIndex * 3 + 1],
        this.vertices[vertexIndex * 3 + 2]
      )
    }

    let result = new THREE.Vector3(
      this.vertices[vertexIndex * 3],
      this.vertices[vertexIndex * 3 + 1],
      this.vertices[vertexIndex * 3 + 2]
    )

    const tempPositions: THREE.Vector3[] = []
    for (let i = 0; i < this.vertexCount; i++) {
      tempPositions.push(new THREE.Vector3(
        this.vertices[i * 3],
        this.vertices[i * 3 + 1],
        this.vertices[i * 3 + 2]
      ))
    }

    const maxIter = Math.min(iterations, this.maxSmoothIterations)
    
    for (let iter = 0; iter < maxIter; iter++) {
      const prevPos = result.clone()
      
      let laplacianX = 0
      let laplacianY = 0
      let laplacianZ = 0
      
      for (let j = 0; j < neighbors.length; j++) {
        const neighborIdx = neighbors[j]
        const weight = weights[j]
        laplacianX += tempPositions[neighborIdx].x * weight
        laplacianY += tempPositions[neighborIdx].y * weight
        laplacianZ += tempPositions[neighborIdx].z * weight
      }
      
      const displacement = new THREE.Vector3(
        (laplacianX - result.x) * strength,
        (laplacianY - result.y) * strength,
        (laplacianZ - result.z) * strength
      )
      
      result.add(displacement)
      
      const delta = result.distanceTo(prevPos)
      if (delta < this.smoothConvergenceThreshold) {
        break
      }
      
      tempPositions[vertexIndex] = result.clone()
    }

    return result
  }

  private smoothRegion(
    affectedVertices: number[],
    strength: number = 0.5
  ): void {
    const tempVertices = new Float32Array(this.vertices)
    const convergenceThreshold = this.smoothConvergenceThreshold * strength
    const maxIter = Math.min(3, this.maxSmoothIterations)

    for (let iter = 0; iter < maxIter; iter++) {
      let maxDelta = 0

      for (const vertexIdx of affectedVertices) {
        const neighbors = this.adjacencyList[vertexIdx]
        const weights = this.edgeWeights[vertexIdx]

        if (neighbors.length === 0) continue

        let smoothX = 0, smoothY = 0, smoothZ = 0

        for (let j = 0; j < neighbors.length; j++) {
          const neighborIdx = neighbors[j]
          const weight = weights[j]
          smoothX += tempVertices[neighborIdx * 3] * weight
          smoothY += tempVertices[neighborIdx * 3 + 1] * weight
          smoothZ += tempVertices[neighborIdx * 3 + 2] * weight
        }

        const idx = vertexIdx * 3
        const currentX = tempVertices[idx]
        const currentY = tempVertices[idx + 1]
        const currentZ = tempVertices[idx + 2]

        const newX = currentX + (smoothX - currentX) * strength
        const newY = currentY + (smoothY - currentY) * strength
        const newZ = currentZ + (smoothZ - currentZ) * strength

        const delta = Math.sqrt(
          (newX - currentX) ** 2 +
          (newY - currentY) ** 2 +
          (newZ - currentZ) ** 2
        )
        maxDelta = Math.max(maxDelta, delta)

        tempVertices[idx] = newX
        tempVertices[idx + 1] = newY
        tempVertices[idx + 2] = newZ
      }

      if (maxDelta < convergenceThreshold) {
        break
      }
    }

    for (const vertexIdx of affectedVertices) {
      const idx = vertexIdx * 3
      this.vertices[idx] = tempVertices[idx]
      this.vertices[idx + 1] = tempVertices[idx + 1]
      this.vertices[idx + 2] = tempVertices[idx + 2]
    }
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
    
    const brushStrength = 0.12 * intensity
    
    if (mode === 'smooth') {
      const smoothStrength = 0.3 * intensity
      const tempVertices = new Float32Array(this.vertices)
      
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
          const strength = falloff * smoothStrength
          
          if (strength > 0.001) {
            affectedVertices.push(i)
            
            const neighbors = this.adjacencyList[i]
            const weights = this.edgeWeights[i]
            
            if (neighbors.length > 0 && weights.length > 0) {
              let smoothX = 0, smoothY = 0, smoothZ = 0
              
              for (let j = 0; j < neighbors.length; j++) {
                const neighborIdx = neighbors[j]
                const weight = weights[j]
                smoothX += this.vertices[neighborIdx * 3] * weight
                smoothY += this.vertices[neighborIdx * 3 + 1] * weight
                smoothZ += this.vertices[neighborIdx * 3 + 2] * weight
              }
              
              const idx = i * 3
              tempVertices[idx] = vx + (smoothX - vx) * strength
              tempVertices[idx + 1] = vy + (smoothY - vy) * strength
              tempVertices[idx + 2] = vz + (smoothZ - vz) * strength
              
              deformed = true
            }
          }
        }
      }
      
      if (deformed) {
        for (const vertexIdx of affectedVertices) {
          const idx = vertexIdx * 3
          this.vertices[idx] = tempVertices[idx]
          this.vertices[idx + 1] = tempVertices[idx + 1]
          this.vertices[idx + 2] = tempVertices[idx + 2]
        }
      }
    } else {
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
                displacement = new THREE.Vector3(nx, ny, nz).multiplyScalar(strength * 2.5)
                break
              case 'deflate':
                displacement = new THREE.Vector3(-nx, -ny, -nz).multiplyScalar(strength * 2.5)
                break
              case 'scrape':
                const toCenter = new THREE.Vector3(vx, vy, vz).normalize()
                displacement = toCenter.multiplyScalar(-strength * 2)
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
    }
    
    if (deformed && affectedVertices.length > 0) {
      this.computeNormals()
      this.updateEdgeWeights(affectedVertices)
      this.saveHistory(savedVertices, affectedVertices)
    }
    
    return { deformed, affectedVertices }
  }

  private updateEdgeWeights(affectedVertices: number[]): void {
    for (const vertexIdx of affectedVertices) {
      const neighbors = this.adjacencyList[vertexIdx]
      const weights: number[] = []
      
      for (let j = 0; j < neighbors.length; j++) {
        const neighbor = neighbors[j]
        const distance = this.getVertexDistance(vertexIdx, neighbor)
        const weight = distance > 0 ? 1.0 / distance : 1.0
        weights.push(weight)
      }
      
      const weightSum = weights.reduce((sum, w) => sum + w, 0)
      if (weightSum > 0) {
        for (let j = 0; j < weights.length; j++) {
          weights[j] = weights[j] / weightSum
        }
      }
      
      this.edgeWeights[vertexIdx] = weights
    }
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
