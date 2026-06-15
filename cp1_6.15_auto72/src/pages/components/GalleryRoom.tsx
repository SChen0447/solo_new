import { useMemo } from 'react'
import * as THREE from 'three'

interface GalleryRoomProps {
  width: number
  height: number
  depth: number
  wallColor: string
}

const GalleryRoom = ({ width, height, depth, wallColor }: GalleryRoomProps) => {
  const wallMaterialProps = useMemo(() => ({
    color: wallColor,
    side: THREE.BackSide,
    roughness: 0.8,
    metalness: 0.1,
  }), [wallColor])

  const halfW = width / 2
  const halfD = depth / 2
  const halfH = height / 2

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color="#1a1a25"
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      <mesh position={[0, halfH, -halfD]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial {...wallMaterialProps} />
      </mesh>

      <mesh position={[0, halfH, halfD]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial {...wallMaterialProps} />
      </mesh>

      <mesh position={[-halfW, halfH, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial {...wallMaterialProps} />
      </mesh>

      <mesh position={[halfW, halfH, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial {...wallMaterialProps} />
      </mesh>

      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#1e1e2e" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

export default GalleryRoom
