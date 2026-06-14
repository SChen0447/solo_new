import React, { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGeoStore } from '../../store'

interface AnnotationMarkerProps {
  id: string
  position: [number, number, number]
  color: string
  text: string
  importance: number
  showBubble: boolean
  onHover: (id: string | null) => void
}

const AnnotationMarker: React.FC<AnnotationMarkerProps> = ({
  id,
  position,
  color,
  text,
  importance,
  showBubble,
  onHover,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const scale = 0.8 + importance * 0.15

  useFrame(() => {
    if (meshRef.current) {
      const targetScale = hovered ? scale * 1.3 : scale
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.15
      )
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        scale={[scale, scale, scale]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          onHover(id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
          onHover(null)
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.85}
          emissive={color}
          emissiveIntensity={hovered ? 0.6 : 0.2}
        />
      </mesh>
      {(showBubble || hovered) && (
        <Html
          position={[0, 0.5, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="px-3 py-2 rounded-lg text-xs max-w-[200px] break-words"
            style={{
              backgroundColor: 'rgba(22, 33, 62, 0.95)',
              color: '#e0e0e0',
              border: `1px solid ${color}`,
              backdropFilter: 'blur(4px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex items-center gap-1 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span style={{ color }}>{'★'.repeat(importance)}</span>
            </div>
            {text}
          </div>
        </Html>
      )}
    </group>
  )
}

export const AnnotationLayer: React.FC = () => {
  const annotations = useGeoStore((s) => s.annotations)
  const showAnnotationBubble = useGeoStore((s) => s.showAnnotationBubble)
  const setShowAnnotationBubble = useGeoStore((s) => s.setShowAnnotationBubble)

  return (
    <group>
      {annotations.map((ann) => (
        <AnnotationMarker
          key={ann.id}
          id={ann.id}
          position={ann.position}
          color={ann.color}
          text={ann.text}
          importance={ann.importance}
          showBubble={showAnnotationBubble === ann.id}
          onHover={(id) => setShowAnnotationBubble(id)}
        />
      ))}
    </group>
  )
}
