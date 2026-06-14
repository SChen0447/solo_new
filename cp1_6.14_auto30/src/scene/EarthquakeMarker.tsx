import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Earthquake, EarthquakeCluster } from '../types'
import { getMagnitudeColor, getMagnitudeRadius } from '../utils/geoUtils'

interface EarthquakeMarkerProps {
  earthquake: Earthquake
  position: THREE.Vector3
  onClick: (earthquake: Earthquake) => void
  fadeIn: boolean
}

export function EarthquakeMarker({ earthquake, position, onClick, fadeIn }: EarthquakeMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  const color = useMemo(() => getMagnitudeColor(earthquake.magnitude), [earthquake.magnitude])
  const radius = useMemo(() => getMagnitudeRadius(earthquake.magnitude), [earthquake.magnitude])

  useFrame((state) => {
    if (materialRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2 + earthquake.time * 0.001)
      const opacity = 0.3 + 0.7 * pulse

      if (fadeIn) {
        const fadeProgress = Math.min(1, state.clock.elapsedTime * 2)
        materialRef.current.opacity = opacity * fadeProgress
      } else {
        materialRef.current.opacity = opacity
      }
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick(earthquake)
      }}
    >
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial ref={materialRef} color={color} transparent opacity={0} />
    </mesh>
  )
}

interface ClusterMarkerProps {
  cluster: EarthquakeCluster
  position: THREE.Vector3
  onClick: (cluster: EarthquakeCluster) => void
  fadeIn: boolean
}

export function ClusterMarker({ cluster, position, onClick, fadeIn }: ClusterMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  const color = useMemo(() => getMagnitudeColor(cluster.magnitude), [cluster.magnitude])
  const radius = useMemo(() => getMagnitudeRadius(cluster.magnitude) * 1.5, [cluster.magnitude])

  useFrame((state) => {
    if (materialRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 1.5)
      const opacity = 0.4 + 0.6 * pulse

      if (fadeIn) {
        const fadeProgress = Math.min(1, state.clock.elapsedTime * 2)
        materialRef.current.opacity = opacity * fadeProgress
      } else {
        materialRef.current.opacity = opacity
      }
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick(cluster)
      }}
    >
      <ringGeometry args={[radius * 0.7, radius, 32]} />
      <meshBasicMaterial ref={materialRef} color={color} transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  )
}
