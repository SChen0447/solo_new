import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Starfield() {
  const starsRef = useRef<THREE.Points>(null)
  const starCount = 500

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(starCount * 3)
    const siz = new Float32Array(starCount)

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)

      siz[i] = Math.random() * 2 + 0.5
    }

    return [pos, siz]
  }, [])

  useFrame((state) => {
    if (starsRef.current) {
      const geometry = starsRef.current.geometry
      const attributes = geometry.attributes
      const positions = attributes.position.array as Float32Array
      const time = state.clock.elapsedTime

      for (let i = 0; i < starCount; i++) {
        const brightness = 0.6 + Math.sin(time * 0.5 + i * 0.1) * 0.4
      }
    }
  })

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}
