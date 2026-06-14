import * as THREE from 'three'
import type { CityNode, DataFlow } from '../store'

export interface BezierCurvePoints {
  start: THREE.Vector3
  control1: THREE.Vector3
  control2: THREE.Vector3
  end: THREE.Vector3
}

export interface ParticleData {
  position: THREE.Vector3
  progress: number
  speed: number
  trail: THREE.Vector3[]
}

export type LoadLevel = 'low' | 'medium' | 'high'

export interface LoadState {
  level: LoadLevel
  description: string
  pulseSpeed: number
  rotationSpeed: number
  particleEmitRate: number
  particleCount: number
  opacityRange: [number, number]
}

export function generateBezierCurve(
  sourcePos: [number, number, number],
  targetPos: [number, number, number]
): BezierCurvePoints {
  const start = new THREE.Vector3(...sourcePos)
  const end = new THREE.Vector3(...targetPos)
  
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  
  const distance = start.distanceTo(end)
  const liftHeight = Math.min(10, Math.max(5, distance * 0.3))
  
  const control1 = new THREE.Vector3(
    start.x + (mid.x - start.x) * 0.5,
    mid.y + liftHeight,
    start.z + (mid.z - start.z) * 0.5
  )
  
  const control2 = new THREE.Vector3(
    end.x + (mid.x - end.x) * 0.5,
    mid.y + liftHeight,
    end.z + (mid.z - end.z) * 0.5
  )
  
  return { start, control1, control2, end }
}

export function getPointOnBezier(
  curve: BezierCurvePoints,
  t: number
): THREE.Vector3 {
  const { start, control1, control2, end } = curve
  
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t
  
  const point = new THREE.Vector3()
  point.x = mt3 * start.x + 3 * mt2 * t * control1.x + 3 * mt * t2 * control2.x + t3 * end.x
  point.y = mt3 * start.y + 3 * mt2 * t * control1.y + 3 * mt * t2 * control2.y + t3 * end.y
  point.z = mt3 * start.z + 3 * mt2 * t * control1.z + 3 * mt * t2 * control2.z + t3 * end.z
  
  return point
}

export function getBezierLength(curve: BezierCurvePoints, segments: number = 50): number {
  let length = 0
  let prevPoint = getPointOnBezier(curve, 0)
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const point = getPointOnBezier(curve, t)
    length += point.distanceTo(prevPoint)
    prevPoint = point
  }
  
  return length
}

export function generateDataFlow(
  sourceNode: CityNode,
  targetNode: CityNode,
  rate: number
): { curve: BezierCurvePoints; particles: ParticleData[]; baseSpeed: number } {
  const curve = generateBezierCurve(sourceNode.position, targetNode.position)
  const curveLength = getBezierLength(curve)
  
  const particleCount = Math.floor(curveLength / 0.5)
  const particles: ParticleData[] = []
  
  const baseSpeed = 0.05 + (rate / 100) * 0.05
  
  for (let i = 0; i < particleCount; i++) {
    const progress = i / particleCount
    const position = getPointOnBezier(curve, progress)
    const trail: THREE.Vector3[] = []
    
    const trailLength = 0.3
    const trailSteps = 5
    for (let j = 1; j <= trailSteps; j++) {
      const trailProgress = Math.max(0, progress - (trailLength * j) / trailSteps / curveLength)
      trail.push(getPointOnBezier(curve, trailProgress))
    }
    
    particles.push({
      position,
      progress,
      speed: baseSpeed,
      trail,
    })
  }
  
  return { curve, particles, baseSpeed }
}

export function updateParticle(
  particle: ParticleData,
  curve: BezierCurvePoints,
  rate: number,
  deltaTime: number
): ParticleData {
  const baseSpeed = 0.05 + (rate / 100) * 0.05
  const speed = baseSpeed * deltaTime * 60
  
  let newProgress = particle.progress + speed
  if (newProgress > 1) {
    newProgress = newProgress - 1
  }
  
  const newPosition = getPointOnBezier(curve, newProgress)
  
  const curveLength = getBezierLength(curve)
  const trailLength = 0.3
  const trailSteps = 5
  const newTrail: THREE.Vector3[] = []
  
  for (let j = 1; j <= trailSteps; j++) {
    const trailProgress = Math.max(0, newProgress - (trailLength * j) / trailSteps / curveLength)
    newTrail.push(getPointOnBezier(curve, trailProgress))
  }
  
  return {
    ...particle,
    position: newPosition,
    progress: newProgress,
    speed: baseSpeed,
    trail: newTrail,
  }
}

export function getRateColor(rate: number): THREE.Color {
  if (rate <= 30) {
    const t = rate / 30
    return new THREE.Color().lerpColors(
      new THREE.Color(0x4fc3f7),
      new THREE.Color(0x7c4dff),
      t
    )
  } else if (rate <= 70) {
    const t = (rate - 30) / 40
    return new THREE.Color().lerpColors(
      new THREE.Color(0x7c4dff),
      new THREE.Color(0xff5252),
      t
    )
  } else {
    const t = Math.min(1, (rate - 70) / 30)
    return new THREE.Color().lerpColors(
      new THREE.Color(0xff5252),
      new THREE.Color(0xff1744),
      t
    )
  }
}

export function calculateLoadState(load: number): LoadState {
  if (load < 30) {
    return {
      level: 'low',
      description: '低负载 - 运行平稳',
      pulseSpeed: 1,
      rotationSpeed: 0,
      particleEmitRate: 0,
      particleCount: 0,
      opacityRange: [0.6, 0.8],
    }
  } else if (load < 70) {
    return {
      level: 'medium',
      description: '中负载 - 正常运行',
      pulseSpeed: 0,
      rotationSpeed: 0.5,
      particleEmitRate: 0.5,
      particleCount: 3,
      opacityRange: [0.7, 0.7],
    }
  } else {
    return {
      level: 'high',
      description: '高负载 - 繁忙运行',
      pulseSpeed: 5,
      rotationSpeed: 0,
      particleEmitRate: 10,
      particleCount: 5,
      opacityRange: [0.3, 1.0],
    }
  }
}

export function getNodeTypeColor(type: string): string {
  switch (type) {
    case 'commercial':
      return '#2196f3'
    case 'residential':
      return '#4caf50'
    case 'industrial':
      return '#ff9800'
    default:
      return '#9e9e9e'
  }
}

export function getLoadColor(load: number): string {
  if (load < 30) return '#4caf50'
  if (load < 70) return '#ffc107'
  return '#f44336'
}
