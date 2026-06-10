import React, { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Ribbon, { ControlPoint } from './Ribbon'

export interface RibbonData {
  id: string
  points: ControlPoint[]
  colorStart: string
  colorEnd: string
  emissiveIntensity: number
  maxWidth: number
}

interface SceneProps {
  ribbons: RibbonData[]
  windStrength: number
  onRibbonsChange: (ribbons: RibbonData[]) => void
  onDoubleClickCreate: (worldPoint: THREE.Vector3) => void
  mergingPair: [string, string] | null
  onMergingComplete: () => void
}

interface Connection {
  id: string
  ribbonA: string
  ribbonB: string
  pointA: THREE.Vector3
  pointB: THREE.Vector3
  colorA: string
  colorB: string
}

const PARTICLE_COUNT = 200
const CONNECTION_DISTANCE = 1.5
const MERGE_DURATION = 0.5

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v * 255))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const Scene: React.FC<SceneProps> = ({
  ribbons,
  windStrength,
  onRibbonsChange,
  onDoubleClickCreate,
  mergingPair,
  onMergingComplete
}) => {
  const { camera, gl, scene } = useThree()
  const particlesRef = useRef<THREE.Points>(null)
  const particlesGroupRef = useRef<THREE.Group>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const mergeProgressRef = useRef(0)
  const mergeAnimatingRef = useRef(false)
  const mergeStartState = useRef<{ a: RibbonData; b: RibbonData } | null>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const mouseNdc = useRef(new THREE.Vector2())

  const { particlePositions, particlePhases } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const phases = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 8 + Math.random() * 12
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      phases[i] = Math.random() * Math.PI * 2
    }
    return { particlePositions: positions, particlePhases: phases }
  }, [])

  const particleAlphas = useRef(new Float32Array(PARTICLE_COUNT))

  useFrame((state) => {
    if (particlesGroupRef.current) {
      const camQuat = camera.quaternion.clone()
      particlesGroupRef.current.quaternion.slerp(camQuat, 0.05)
    }
    if (particlesRef.current) {
      const geom = particlesRef.current.geometry
      const pos = geom.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      const t = state.clock.elapsedTime
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const phase = particlePhases[i]
        arr[i * 3] += Math.sin(t * 0.1 + phase) * 0.002
        arr[i * 3 + 1] += Math.cos(t * 0.15 + phase * 1.1) * 0.002
        arr[i * 3 + 2] += Math.sin(t * 0.08 + phase * 0.9) * 0.002
        particleAlphas.current[i] = 0.1 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.5 + phase))
      }
      pos.needsUpdate = true
      const mat = particlesRef.current.material as THREE.PointsMaterial
      mat.opacity = 1
    }

    if (mergeAnimatingRef.current && mergingPair && mergeStartState.current) {
      mergeProgressRef.current += state.clock.getDelta() / MERGE_DURATION
      const t = Math.min(1, mergeProgressRef.current)
      const eased = easeInOutCubic(t)
      const { a: startA, b: startB } = mergeStartState.current
      const targetPoints = [...startA.points, ...startB.points]
      const newPointsA = startA.points.map((p, i) => {
        const target = targetPoints[i] || p
        return {
          ...p,
          x: p.x + (target.x - p.x) * eased,
          y: p.y + (target.y - p.y) * eased,
          z: p.z + (target.z - p.z) * eased
        }
      })
      const newPointsB = startB.points.map((p, i) => {
        const target = targetPoints[startA.points.length + i] || p
        return {
          ...p,
          x: p.x + (target.x - p.x) * eased,
          y: p.y + (target.y - p.y) * eased,
          z: p.z + (target.z - p.z) * eased
        }
      })
      const rgbA = hexToRgb(startA.colorStart)
      const rgbB = hexToRgb(startB.colorStart)
      const mixedColor = rgbToHex(
        rgbA.r + (rgbB.r - rgbA.r) * eased,
        rgbA.g + (rgbB.g - rgbA.g) * eased,
        rgbA.b + (rgbB.b - rgbA.b) * eased
      )
      const rgbE = hexToRgb(startA.colorEnd)
      const rgbF = hexToRgb(startB.colorEnd)
      const mixedEnd = rgbToHex(
        rgbE.r + (rgbF.r - rgbE.r) * eased,
        rgbE.g + (rgbF.g - rgbE.g) * eased,
        rgbE.b + (rgbF.b - rgbE.b) * eased
      )
      const updated = ribbons.map(r => {
        if (r.id === mergingPair[0]) {
          return { ...r, points: newPointsA, colorStart: mixedColor, colorEnd: mixedEnd }
        }
        if (r.id === mergingPair[1]) {
          return { ...r, points: newPointsB, colorStart: mixedColor, colorEnd: mixedEnd }
        }
        return r
      })
      onRibbonsChange(updated)

      if (t >= 1) {
        mergeAnimatingRef.current = false
        const [idA, idB] = mergingPair
        const ribbonA = ribbons.find(r => r.id === idA)
        const ribbonB = ribbons.find(r => r.id === idB)
        if (ribbonA && ribbonB) {
          const merged: RibbonData = {
            id: idA,
            points: [...ribbonA.points, ...ribbonB.points],
            colorStart: ribbonA.colorStart,
            colorEnd: ribbonB.colorEnd,
            emissiveIntensity: 0.3,
            maxWidth: Math.max(ribbonA.maxWidth, ribbonB.maxWidth)
          }
          onRibbonsChange(ribbons.filter(r => r.id !== idB).map(r => r.id === idA ? merged : r))
        }
        mergeProgressRef.current = 0
        mergeStartState.current = null
        onMergingComplete()
      }
    }
  })

  useEffect(() => {
    if (mergingPair && !mergeAnimatingRef.current) {
      const [idA, idB] = mergingPair
      const a = ribbons.find(r => r.id === idA)
      const b = ribbons.find(r => r.id === idB)
      if (a && b) {
        mergeAnimatingRef.current = true
        mergeProgressRef.current = 0
        mergeStartState.current = { a: JSON.parse(JSON.stringify(a)), b: JSON.parse(JSON.stringify(b)) }
      }
    }
  }, [mergingPair, ribbons])

  useEffect(() => {
    const newConnections: Connection[] = []
    for (let i = 0; i < ribbons.length; i++) {
      for (let j = i + 1; j < ribbons.length; j++) {
        const rA = ribbons[i]
        const rB = ribbons[j]
        for (const pA of rA.points) {
          for (const pB of rB.points) {
            const dist = Math.sqrt(
              Math.pow(pA.x - pB.x, 2) + Math.pow(pA.y - pB.y, 2) + Math.pow(pA.z - pB.z, 2)
            )
            if (dist < CONNECTION_DISTANCE) {
              newConnections.push({
                id: `${rA.id}-${rB.id}-${pA.id}-${pB.id}`,
                ribbonA: rA.id,
                ribbonB: rB.id,
                pointA: new THREE.Vector3(pA.x, pA.y, pA.z),
                pointB: new THREE.Vector3(pB.x, pB.y, pB.z),
                colorA: rA.colorStart,
                colorB: rB.colorStart
              })
            }
          }
        }
      }
    }
    setConnections(newConnections)
  }, [ribbons])

  const handleConnectionClick = (conn: Connection) => (e: any) => {
    e.stopPropagation()
    if (mergingPair || mergeAnimatingRef.current) return
    onRibbonsChange(ribbons)
    setTimeout(() => {
      const ev = new CustomEvent('request-merge', {
        detail: { pair: [conn.ribbonA, conn.ribbonB] as [string, string] }
      })
      window.dispatchEvent(ev)
    }, 0)
  }

  const handleSceneDoubleClick = (e: any) => {
    e.stopPropagation()
    if (e.target !== gl.domElement && !(e.target instanceof HTMLCanvasElement)) return
    const rect = gl.domElement.getBoundingClientRect()
    mouseNdc.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouseNdc.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.current.setFromCamera(mouseNdc.current, camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const hit = new THREE.Vector3()
    raycaster.current.ray.intersectPlane(plane, hit)
    onDoubleClickCreate(hit || new THREE.Vector3(0, 0, 0))
  }

  const handleRibbonPointsChange = (ribbonId: string) => (newPoints: ControlPoint[]) => {
    onRibbonsChange(ribbons.map(r => r.id === ribbonId ? { ...r, points: newPoints } : r))
  }

  return (
    <>
      <color attach="background" args={['#0b1024']} />
      <fog attach="fog" args={['#0b1024', 15, 35]} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.3} color="#ffffff" />
      <pointLight position={[-5, 3, -5]} intensity={0.2} color="#6c63ff" />

      <group ref={particlesGroupRef}>
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={PARTICLE_COUNT}
              array={particlePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.08}
            color="#c0c8d8"
            transparent
            opacity={0.35}
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>

      <mesh onDoubleClick={handleSceneDoubleClick} position={[0, 0, -0.01]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} color="#000000" />
      </mesh>

      {ribbons.map(ribbon => (
        <Ribbon
          key={ribbon.id}
          id={ribbon.id}
          points={ribbon.points}
          colorStart={ribbon.colorStart}
          colorEnd={ribbon.colorEnd}
          windStrength={windStrength}
          maxWidth={ribbon.maxWidth}
          emissiveIntensity={ribbon.emissiveIntensity}
          onPointsChange={handleRibbonPointsChange(ribbon.id)}
        />
      ))}

      {connections.map(conn => {
        const mid = conn.pointA.clone().lerp(conn.pointB, 0.5)
        const rgbA = hexToRgb(conn.colorA)
        const rgbB = hexToRgb(conn.colorB)
        const mixedColor = rgbToHex(
          (rgbA.r + rgbB.r) / 2,
          (rgbA.g + rgbB.g) / 2,
          (rgbA.b + rgbB.b) / 2
        )
        const dir = new THREE.Vector3().subVectors(conn.pointB, conn.pointA)
        const len = dir.length()
        const dashCount = Math.max(2, Math.floor(len * 4))
        const positions = new Float32Array(dashCount * 2 * 3)
        for (let i = 0; i < dashCount; i++) {
          const tStart = i / dashCount
          const tEnd = tStart + 0.5 / dashCount
          const pS = conn.pointA.clone().lerp(conn.pointB, tStart)
          const pE = conn.pointA.clone().lerp(conn.pointB, Math.min(1, tEnd))
          positions[i * 6] = pS.x
          positions[i * 6 + 1] = pS.y
          positions[i * 6 + 2] = pS.z
          positions[i * 6 + 3] = pE.x
          positions[i * 6 + 4] = pE.y
          positions[i * 6 + 5] = pE.z
        }
        return (
          <group key={conn.id}>
            <lineSegments onPointerDown={handleConnectionClick(conn)}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={dashCount * 2}
                  array={positions}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={mixedColor} transparent opacity={0.35} />
            </lineSegments>
            <mesh position={[mid.x, mid.y, mid.z]} onPointerDown={handleConnectionClick(conn)}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshBasicMaterial color={mixedColor} transparent opacity={0.6} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

export default Scene
