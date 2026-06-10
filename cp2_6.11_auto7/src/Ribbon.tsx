import React, { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export interface ControlPoint {
  id: string
  x: number
  y: number
  z: number
}

export interface RibbonProps {
  id: string
  points: ControlPoint[]
  colorStart: string
  colorEnd: string
  windStrength: number
  maxWidth?: number
  emissiveIntensity?: number
  onPointsChange: (points: ControlPoint[]) => void
  isSelected?: boolean
}

const SEGMENTS_PER_POINT = 10
const TUBE_RADIAL_SEGMENTS = 8
const LINKAGE_MAX_DISTANCE = 2.5

function catmullRom(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
  const t2 = t * t
  const t3 = t2 * t
  return new THREE.Vector3(
    0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)
  )
}

function buildSplinePoints(controls: ControlPoint[]): THREE.Vector3[] {
  if (controls.length < 2) return controls.map(p => new THREE.Vector3(p.x, p.y, p.z))
  const result: THREE.Vector3[] = []
  const pts = controls.map(p => new THREE.Vector3(p.x, p.y, p.z))
  const extended = [pts[0].clone(), ...pts, pts[pts.length - 1].clone()]
  for (let i = 0; i < extended.length - 3; i++) {
    for (let j = 0; j < SEGMENTS_PER_POINT; j++) {
      result.push(catmullRom(extended[i], extended[i + 1], extended[i + 2], extended[i + 3], j / SEGMENTS_PER_POINT))
    }
  }
  result.push(extended[extended.length - 2].clone())
  return result
}

function makeGlowTexture(color: string): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.3, color + '88')
  gradient.addColorStop(0.6, color + '33')
  gradient.addColorStop(1, color + '00')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const Ribbon: React.FC<RibbonProps> = ({
  id,
  points,
  colorStart,
  colorEnd,
  windStrength,
  maxWidth = 0.5,
  emissiveIntensity = 0.3,
  onPointsChange,
  isSelected = false
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const basePositionsRef = useRef<Float32Array | null>(null)
  const phasesRef = useRef<Float32Array | null>(null)
  const { camera, gl } = useThree()
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const mouseNdc = useRef(new THREE.Vector2())
  const dragPlane = useRef(new THREE.Plane())
  const dragOffset = useRef(new THREE.Vector3())
  const glowTexture = useMemo(() => makeGlowTexture(colorStart), [colorStart])

  const tubeGeometry = useMemo(() => {
    const splinePts = buildSplinePoints(points)
    const curve = new THREE.CatmullRomCurve3(splinePts, false, 'catmullrom', 0.5)
    const tubularSegments = Math.max(splinePts.length * 3, 40)
    const radialSegments = TUBE_RADIAL_SEGMENTS

    const vertexCount = (tubularSegments + 1) * (radialSegments + 1)
    const positions = new Float32Array(vertexCount * 3)
    const uvs = new Float32Array(vertexCount * 2)
    const colors = new Float32Array(vertexCount * 3)
    const indices: number[] = []

    const up = new THREE.Vector3(0, 1, 0)
    const cStart = new THREE.Color(colorStart)
    const cEnd = new THREE.Color(colorEnd)
    let idx = 0

    for (let i = 0; i <= tubularSegments; i++) {
      const u = i / tubularSegments
      const pt = curve.getPoint(u)
      const tangent = curve.getTangentAt(u).normalize()
      let normal = new THREE.Vector3().crossVectors(tangent, up).normalize()
      if (normal.lengthSq() < 0.001) {
        normal.set(1, 0, 0)
      }
      const width = maxWidth * Math.sin(u * Math.PI)
      const color = cStart.clone().lerp(cEnd, u)

      for (let j = 0; j <= radialSegments; j++) {
        const v = j / radialSegments
        const offset = (v - 0.5) * width
        const pos = pt.clone().add(normal.clone().multiplyScalar(offset))
        positions[idx * 3] = pos.x
        positions[idx * 3 + 1] = pos.y
        positions[idx * 3 + 2] = pos.z
        uvs[idx * 2] = u
        uvs[idx * 2 + 1] = v
        colors[idx * 3] = color.r
        colors[idx * 3 + 1] = color.g
        colors[idx * 3 + 2] = color.b
        idx++
      }
    }

    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j
        const b = a + radialSegments + 1
        indices.push(a, b, a + 1)
        indices.push(b, b + 1, a + 1)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [points, maxWidth, colorStart, colorEnd])

  useEffect(() => {
    if (tubeGeometry) {
      const pos = tubeGeometry.attributes.position
      basePositionsRef.current = new Float32Array(pos.array as Float32Array)
      const count = pos.count
      const phases = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        phases[i] = Math.random() * Math.PI * 2
      }
      phasesRef.current = phases
    }
  }, [tubeGeometry])

  useFrame((state) => {
    if (!meshRef.current || !basePositionsRef.current || !phasesRef.current) return
    const pos = meshRef.current.geometry.attributes.position as THREE.BufferAttribute
    const base = basePositionsRef.current
    const phases = phasesRef.current
    const amplitude = windStrength * 0.05
    const frequency = windStrength * 0.1
    const t = state.clock.elapsedTime
    const arr = pos.array as Float32Array
    for (let i = 0; i < pos.count; i++) {
      const ix = i * 3
      const phase = phases[i]
      const noise = (Math.sin(t * 0.7 + phase * 1.3) + Math.cos(t * 0.5 + phase * 0.7)) * 0.15
      arr[ix] = base[ix] + Math.sin(t * frequency + phase) * amplitude + noise * amplitude
      arr[ix + 1] = base[ix + 1] + Math.cos(t * frequency * 0.8 + phase * 1.2) * amplitude * 0.7 + noise * amplitude * 0.5
      arr[ix + 2] = base[ix + 2] + Math.sin(t * frequency * 1.1 + phase * 0.9) * amplitude * 0.5 + noise * amplitude * 0.3
    }
    pos.needsUpdate = true
    meshRef.current.geometry.computeVertexNormals()
  })

  const handlePointerDown = (pointId: string) => (e: any) => {
    e.stopPropagation()
    const point = points.find(p => p.id === pointId)
    if (!point) return
    setDraggingPointId(pointId)
    const worldPt = new THREE.Vector3(point.x, point.y, point.z)
    const camDir = new THREE.Vector3()
    camera.getWorldDirection(camDir)
    dragPlane.current.setFromNormalAndCoplanarPoint(camDir.negate(), worldPt)
    const rect = gl.domElement.getBoundingClientRect()
    mouseNdc.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseNdc.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.current.setFromCamera(mouseNdc.current, camera)
    const hit = new THREE.Vector3()
    raycaster.current.ray.intersectPlane(dragPlane.current, hit)
    if (hit) dragOffset.current.copy(worldPt).sub(hit)
    const onMove = (ev: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect()
      mouseNdc.current.x = ((ev.clientX - r.left) / r.width) * 2 - 1
      mouseNdc.current.y = -((ev.clientY - r.top) / r.height) * 2 + 1
      raycaster.current.setFromCamera(mouseNdc.current, camera)
      const intersect = new THREE.Vector3()
      if (!raycaster.current.ray.intersectPlane(dragPlane.current, intersect)) return
      intersect.add(dragOffset.current)
      const draggedIdx = points.findIndex(p => p.id === pointId)
      if (draggedIdx < 0) return
      const dragged = points[draggedIdx]
      const delta = new THREE.Vector3(intersect.x - dragged.x, intersect.y - dragged.y, intersect.z - dragged.z)
      const newPts = points.map(p => {
        if (p.id === pointId) {
          return { ...p, x: intersect.x, y: intersect.y, z: intersect.z }
        }
        const dist = Math.sqrt(
          Math.pow(p.x - dragged.x, 2) +
          Math.pow(p.y - dragged.y, 2) +
          Math.pow(p.z - dragged.z, 2)
        )
        if (dist < LINKAGE_MAX_DISTANCE) {
          const decay = Math.exp(-dist * 0.8)
          return {
            ...p,
            x: p.x + delta.x * decay,
            y: p.y + delta.y * decay,
            z: p.z + delta.z * decay
          }
        }
        return p
      })
      onPointsChange(newPts)
    }
    const onUp = () => {
      setDraggingPointId(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <group>
      <mesh ref={meshRef} geometry={tubeGeometry}>
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          emissive={new THREE.Color('#6aa9ff')}
          emissiveIntensity={emissiveIntensity}
          depthWrite={false}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {points.map(pt => (
        <group key={pt.id} position={[pt.x, pt.y, pt.z]}>
          <mesh
            onPointerDown={handlePointerDown(pt.id)}
          >
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial
              color={colorStart}
              emissive={colorStart}
              emissiveIntensity={draggingPointId === pt.id ? 1.2 : 0.6}
            />
          </mesh>
          {(draggingPointId === pt.id || isSelected) && (
            <sprite scale={[1.5, 1.5, 1.5]}>
              <spriteMaterial
                map={glowTexture}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          )}
        </group>
      ))}
    </group>
  )
}

export default Ribbon
