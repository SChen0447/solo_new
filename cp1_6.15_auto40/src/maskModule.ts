import * as THREE from 'three'
import { FacialExpressions, ExpressionWeights } from './store'

export class MaskModule {
  public mesh: THREE.Mesh
  public geometry: THREE.BufferGeometry
  public material: THREE.MeshPhysicalMaterial
  private basePositions: Float32Array
  private targetPositions: Float32Array
  private currentPositions: Float32Array
  private vertexCount: number
  private springDamping: number = 0.3
  private transitionSpeed: number = 4.0
  private jawVertices: number[] = []
  private browVertices: number[] = []
  private mouthCornerVertices: number[] = []
  private eyelidVertices: number[] = []
  private cheekVertices: number[] = []

  constructor() {
    this.geometry = this.createFaceGeometry()
    this.vertexCount = this.geometry.attributes.position.count
    this.basePositions = new Float32Array(this.geometry.attributes.position.array as Float32Array)
    this.targetPositions = new Float32Array(this.basePositions.length)
    this.currentPositions = new Float32Array(this.basePositions.length)
    this.currentPositions.set(this.basePositions)
    
    this.classifyVertices()

    this.material = new THREE.MeshPhysicalMaterial({
      color: 0xd0d0d8,
      transparent: true,
      opacity: 0.85,
      roughness: 0.35,
      metalness: 0.15,
      transmission: 0.2,
      thickness: 0.5,
      emissive: 0x202040,
      emissiveIntensity: 0.1,
      side: THREE.DoubleSide,
      flatShading: false
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
  }

  private createFaceGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.IcosahedronGeometry(1.5, 5)
    const positions = geometry.attributes.position.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      const len = Math.sqrt(x * x + y * y + z * z)
      const nx = x / len
      const ny = y / len
      const nz = z / len
      
      const faceFactor = 1.0 - Math.abs(nz) * 0.15
      positions[i] = nx * 1.2 * faceFactor + (nz > 0 ? nz * 0.15 : 0)
      positions[i + 1] = ny * 1.5
      positions[i + 2] = nz * 1.3
      
      if (ny > 0.5) {
        positions[i + 1] *= 0.92
      }
      
      if (Math.abs(nx) < 0.35 && ny > -0.15 && ny < 0.35 && nz > 0.3) {
        const eyeFactor = 1.0 - Math.exp(-Math.pow((nx * 3.5), 2)) * 0.08
        positions[i + 2] *= eyeFactor
      }
      
      if (Math.abs(nx) < 0.55 && ny > -0.55 && ny < -0.15 && nz > 0.2) {
        const noseBump = Math.exp(-Math.pow(nx * 2.5, 2) - Math.pow((ny + 0.3) * 3, 2)) * 0.2
        positions[i + 2] += noseBump
      }
      
      if (ny < -0.5) {
        const chinFactor = 1.0 + (ny + 0.5) * 0.4
        positions[i + 1] *= chinFactor
      }
    }
    
    geometry.computeVertexNormals()
    return geometry
  }

  private classifyVertices(): void {
    const positions = this.basePositions
    
    for (let i = 0; i < positions.length; i += 3) {
      const idx = i / 3
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]
      
      const distFromCenter = Math.sqrt(x * x + z * z)
      
      if (y < -0.4 && distFromCenter < 0.8 && z > -0.3) {
        this.jawVertices.push(idx)
      }
      
      if (y > 0.5 && y < 1.1 && distFromCenter < 0.9) {
        this.browVertices.push(idx)
      }
      
      if (y > -0.45 && y < -0.05 && Math.abs(x) > 0.25 && Math.abs(x) < 0.85 && z > 0.1) {
        this.mouthCornerVertices.push(idx)
      }
      
      if ((Math.abs(x) > 0.22 && Math.abs(x) < 0.55) && (y > -0.05 && y < 0.45) && z > 0.25) {
        this.eyelidVertices.push(idx)
      }
      
      if (y > -0.6 && y < 0.3 && Math.abs(x) > 0.45 && Math.abs(x) < 1.1 && z > 0) {
        this.cheekVertices.push(idx)
      }
    }
  }

  public update(
    expressions: FacialExpressions,
    weights: ExpressionWeights,
    deltaTime: number
  ): void {
    this.targetPositions.set(this.basePositions)
    
    const mouthOpen = expressions.mouthOpen * weights.mouthOpen
    const leftBrow = (expressions.leftBrowHeight - 0.5) * 2 * weights.browHeight
    const rightBrow = (expressions.rightBrowHeight - 0.5) * 2 * weights.browHeight
    const mouthCurve = (expressions.mouthCurve - 0.5) * 2 * weights.mouthCurve
    const leftEyeClosed = expressions.leftEyeClosed * weights.eyeClosed
    const rightEyeClosed = expressions.rightEyeClosed * weights.eyeClosed
    
    for (const idx of this.jawVertices) {
      const i = idx * 3
      const y = this.basePositions[i + 1]
      const z = this.basePositions[i + 2]
      const jawFactor = Math.min(1, Math.max(0, (-y - 0.4) / 0.6))
      
      this.targetPositions[i + 1] -= mouthOpen * jawFactor * 0.8
      this.targetPositions[i + 2] -= mouthOpen * jawFactor * 0.35
      
      const spreadFactor = jawFactor * 0.25
      if (this.basePositions[i] > 0) {
        this.targetPositions[i] += mouthOpen * spreadFactor
      } else {
        this.targetPositions[i] -= mouthOpen * spreadFactor
      }
    }
    
    for (const idx of this.browVertices) {
      const i = idx * 3
      const x = this.basePositions[i]
      const sideFactor = x > 0 ? rightBrow : leftBrow
      const vertFactor = Math.min(1, Math.max(0, (this.basePositions[i + 1] - 0.5) / 0.6))
      
      this.targetPositions[i + 1] += sideFactor * vertFactor * 0.35
      this.targetPositions[i + 2] += sideFactor * vertFactor * 0.1
    }
    
    for (const idx of this.mouthCornerVertices) {
      const i = idx * 3
      const x = this.basePositions[i]
      const side = x > 0 ? 1 : -1
      const distFromCenter = Math.abs(x)
      const cornerFactor = Math.min(1, Math.max(0, (distFromCenter - 0.25) / 0.6))
      
      this.targetPositions[i + 1] += mouthCurve * cornerFactor * 0.45
      this.targetPositions[i + 2] += mouthCurve * cornerFactor * 0.15
      
      if (mouthCurve > 0) {
        this.targetPositions[i] -= side * mouthCurve * cornerFactor * 0.08
      } else {
        this.targetPositions[i] += side * Math.abs(mouthCurve) * cornerFactor * 0.12
      }
    }
    
    for (const idx of this.eyelidVertices) {
      const i = idx * 3
      const x = this.basePositions[i]
      const isLeftSide = x < 0
      const closeFactor = isLeftSide ? leftEyeClosed : rightEyeClosed
      const y = this.basePositions[i + 1]
      const verticalFactor = 1 - Math.abs((y - 0.15) / 0.3)
      const effectiveFactor = Math.max(0, verticalFactor) * closeFactor
      
      if (y > 0.15) {
        this.targetPositions[i + 1] -= effectiveFactor * 0.25
      } else {
        this.targetPositions[i + 1] += effectiveFactor * 0.2
      }
      this.targetPositions[i + 2] += effectiveFactor * 0.12
    }
    
    for (const idx of this.cheekVertices) {
      const i = idx * 3
      const x = this.basePositions[i]
      const isLeftSide = x < 0
      const cheekLift = Math.max(0, mouthCurve)
      const browFrown = Math.min(0, isLeftSide ? leftBrow : rightBrow) * -1
      const y = this.basePositions[i + 1]
      const cheekFactor = Math.exp(-Math.pow((y + 0.1) * 2.5, 2))
      
      this.targetPositions[i + 1] += cheekLift * cheekFactor * 0.25
      this.targetPositions[i + 2] += cheekLift * cheekFactor * 0.15
      this.targetPositions[i + 1] -= browFrown * cheekFactor * 0.1
    }
    
    const lerpFactor = 1 - Math.exp(-this.transitionSpeed * deltaTime * (1 - this.springDamping))
    
    for (let i = 0; i < this.currentPositions.length; i++) {
      this.currentPositions[i] += (this.targetPositions[i] - this.currentPositions[i]) * lerpFactor
    }
    
    const posAttr = this.geometry.attributes.position
    posAttr.array.set(this.currentPositions)
    posAttr.needsUpdate = true
    
    this.geometry.computeVertexNormals()
    
    const emissiveIntensity = 0.1 + mouthOpen * 0.35 + mouthCurve * 0.15
    this.material.emissiveIntensity = emissiveIntensity
    
    const colorHue = 0.62 + mouthOpen * 0.06 - (leftBrow + rightBrow) * 0.02
    const colorSat = 0.12 + mouthCurve * 0.08
    this.material.color.setHSL(colorHue, colorSat, 0.78)
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
