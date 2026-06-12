import { useMemo } from 'react'
import * as THREE from 'three'
import { LightType } from '../types'

interface LightModelProps {
  type: LightType
  position: [number, number, number]
  selected: boolean
  colorHex: string
}

export function LightModel({ type, position, selected, colorHex }: LightModelProps) {
  const lampColor = selected ? '#D4AF37' : '#B8B8B8'

  const bulbMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.1,
      }),
    [colorHex]
  )

  const frameMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: lampColor,
        metalness: 0.8,
        roughness: 0.3,
      }),
    [lampColor]
  )

  return (
    <group position={position}>
      {type === 'chandelier' && (
        <>
          <mesh position={[0, 0.2, 0]} material={frameMaterial}>
            <cylinderGeometry args={[0.02, 0.02, 0.4]} />
          </mesh>
          <mesh position={[0, -0.05, 0]} material={frameMaterial}>
            <cylinderGeometry args={[0.35, 0.15, 0.1, 24]} />
          </mesh>
          <mesh position={[0, -0.15, 0]} material={bulbMaterial}>
            <sphereGeometry args={[0.18, 24, 24]} />
          </mesh>
        </>
      )}
      {type === 'spotlight' && (
        <>
          <mesh position={[0, 0.1, 0]} material={frameMaterial}>
            <boxGeometry args={[0.12, 0.1, 0.12]} />
          </mesh>
          <mesh position={[0, -0.1, 0]} rotation={[0.3, 0, 0]} material={frameMaterial}>
            <cylinderGeometry args={[0.08, 0.18, 0.3, 24, 1, true]} />
          </mesh>
          <mesh position={[0, -0.2, 0]} rotation={[0.3, 0, 0]} material={bulbMaterial}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </>
      )}
      {type === 'floor_lamp' && (
        <>
          <mesh position={[0, -1, 0]} material={frameMaterial}>
            <cylinderGeometry args={[0.25, 0.3, 0.04, 24]} />
          </mesh>
          <mesh position={[0, -0.3, 0]} material={frameMaterial}>
            <cylinderGeometry args={[0.03, 0.03, 1.4]} />
          </mesh>
          <mesh position={[0, 0.35, 0]} material={frameMaterial}>
            <cylinderGeometry args={[0.22, 0.15, 0.3, 24, 1, true]} />
          </mesh>
          <mesh position={[0, 0.3, 0]} material={bulbMaterial}>
            <sphereGeometry args={[0.13, 20, 20]} />
          </mesh>
        </>
      )}
      {type === 'wall_lamp' && (
        <>
          <mesh position={[0, 0, -0.12]} material={frameMaterial}>
            <boxGeometry args={[0.2, 0.15, 0.05]} />
          </mesh>
          <mesh position={[0, -0.15, -0.02]} material={frameMaterial}>
            <cylinderGeometry args={[0.14, 0.08, 0.2, 24, 1, true]} />
          </mesh>
          <mesh position={[0, -0.18, 0.02]} material={bulbMaterial}>
            <sphereGeometry args={[0.08, 16, 16]} />
          </mesh>
        </>
      )}
    </group>
  )
}
