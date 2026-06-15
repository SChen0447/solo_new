import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SculptureEngine } from '../modules/sculptureEngine'
import { useEEGStore } from '../store/useStore'

export function Sculpture() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const engineRef = useRef<SculptureEngine | null>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])

  const bandData = useEEGStore((state) => state.bandData)
  const cubeCount = useEEGStore((state) => state.cubeCount)
  const setCubeCount = useEEGStore((state) => state.setCubeCount)

  useMemo(() => {
    engineRef.current = new SculptureEngine(cubeCount, 3, 0.05, 0.3)
    setCubeCount(cubeCount)
  }, [cubeCount])

  useFrame((state) => {
    if (!meshRef.current || !engineRef.current) return

    const time = state.clock.elapsedTime
    engineRef.current.update(bandData, time)

    const positions = engineRef.current.getPositions()
    const colors = engineRef.current.getColors()

    for (let i = 0; i < cubeCount; i++) {
      dummy.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      )
      dummy.rotation.set(
        time * 0.1 + i * 0.001,
        time * 0.15 + i * 0.0015,
        0
      )
      dummy.scale.setScalar(1)
      dummy.updateMatrix()

      meshRef.current.setMatrixAt(i, dummy.matrix)

      color.setRGB(
        colors[i * 3],
        colors[i * 3 + 1],
        colors[i * 3 + 2]
      )
      meshRef.current.setColorAt(i, color)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, cubeCount]}>
      <boxGeometry args={[0.05, 0.05, 0.05]} />
      <meshStandardMaterial
        color="#ffffff"
        metalness={0.3}
        roughness={0.4}
        emissive="#1a1a3a"
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  )
}
