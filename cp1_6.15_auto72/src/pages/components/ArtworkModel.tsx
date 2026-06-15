import { useRef, useState } from 'react'
import { useGLTF, Html, Detailed } from '@react-three/drei'
import type { Artwork } from '@/types'

interface ArtworkModelProps {
  artwork: Artwork
  lodDistance: number
  onSelect: (artwork: Artwork) => void
}

const ArtworkModel = ({ artwork, lodDistance, onSelect }: ArtworkModelProps) => {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<THREE.Group>(null)

  const modelUrl = artwork.modelFile
    ? `/uploads/${artwork.modelFile}`
    : null

  const handleClick = (e: any) => {
    e.stopPropagation()
    onSelect(artwork)
    if (document.pointerLockElement) {
      document.exitPointerLock()
    }
  }

  const handlePointerOver = (e: any) => {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = (e: any) => {
    e.stopPropagation()
    setHovered(false)
    document.body.style.cursor = 'default'
  }

  return (
    <group
      ref={groupRef}
      position={[artwork.position.x, artwork.position.y, artwork.position.z]}
      rotation={[artwork.rotation.x, artwork.rotation.y, artwork.rotation.z]}
      scale={artwork.scale || 1}
    >
      <Detailed distances={[0, 15, 30]}>
        <group
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          {modelUrl ? (
            <LoadedModel url={modelUrl} hovered={hovered} />
          ) : (
            <PlaceholderModel hovered={hovered} />
          )}
        </group>

        <group onClick={handleClick}>
          <mesh>
            <boxGeometry args={[2, 3, 0.5]} />
            <meshStandardMaterial color="#8b7355" roughness={0.7} />
          </mesh>
        </group>

        <mesh onClick={handleClick}>
          <boxGeometry args={[1.5, 2.5, 0.3]} />
          <meshStandardMaterial color="#6b6355" roughness={0.9} />
        </mesh>
      </Detailed>

      {hovered && (
        <mesh position={[0, 0, 0.3]}>
          <boxGeometry args={[2.1, 3.1, 0.02]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.6} />
        </mesh>
      )}

      <Html
        position={[0, -2, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <div className="artwork-label">
          <div className="artwork-label-title">{artwork.name}</div>
          <div className="artwork-label-author">{artwork.author}</div>
        </div>
      </Html>
    </group>
  )
}

const LoadedModel = ({ url, hovered }: { url: string; hovered: boolean }) => {
  try {
    const { scene } = useGLTF(url)
    return (
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation()
        }}
      >
        <primitive object={scene} />
      </mesh>
    )
  } catch {
    return <PlaceholderModel hovered={hovered} />
  }
}

const PlaceholderModel = ({ hovered }: { hovered: boolean }) => {
  return (
    <mesh>
      <boxGeometry args={[2, 3, 0.5]} />
      <meshStandardMaterial
        color={hovered ? '#ffd700' : '#8b7355'}
        emissive={hovered ? '#ffd700' : '#000000'}
        emissiveIntensity={hovered ? 0.3 : 0}
        roughness={0.6}
        metalness={0.2}
      />
    </mesh>
  )
}

export default ArtworkModel
