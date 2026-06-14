import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useEarthquakeStore } from '../store/useEarthquakeStore'
import { EarthquakeMarker, ClusterMarker } from './EarthquakeMarker'
import { latLonToVector3, interpolatePosition } from '../utils/geoUtils'
import type { Earthquake, EarthquakeCluster } from '../types'

const GLOBE_RADIUS = 2
const FLAT_WIDTH = 6
const FLAT_HEIGHT = 3

function Earth() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { mapMode, transitionProgress } = useEarthquakeStore()

  const textureUrl = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'

  useFrame((state) => {
    if (meshRef.current && mapMode === 'globe') {
      meshRef.current.rotation.y += 0.001
    }
  })

  const scaleX = 1 + (FLAT_WIDTH / (2 * GLOBE_RADIUS) - 1) * transitionProgress
  const scaleY = 1 + (FLAT_HEIGHT / (2 * GLOBE_RADIUS) - 1) * transitionProgress
  const scaleZ = 1 - transitionProgress * 0.99

  return (
    <mesh ref={meshRef} scale={[scaleX, scaleY, scaleZ]}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshStandardMaterial
        map={new THREE.TextureLoader().load(textureUrl)}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function EarthquakeMarkers() {
  const { earthquakes, clusters, mapMode, transitionProgress, setSelectedEarthquake } =
    useEarthquakeStore()
  const [fadeKey, setFadeKey] = useState(0)

  useEffect(() => {
    setFadeKey((k) => k + 1)
  }, [earthquakes.length])

  const displayItems = useMemo(() => {
    if (clusters.length > 0) {
      return { type: 'clusters' as const, items: clusters }
    }
    return { type: 'earthquakes' as const, items: earthquakes }
  }, [earthquakes, clusters])

  const getPosition = (lat: number, lon: number) => {
    if (mapMode === 'flat' || transitionProgress > 0.5) {
      return interpolatePosition(lat, lon, GLOBE_RADIUS, Math.min(1, transitionProgress), FLAT_WIDTH, FLAT_HEIGHT)
    }
    return latLonToVector3(lat, lon, GLOBE_RADIUS, 'globe')
  }

  const handleEarthquakeClick = (eq: Earthquake) => {
    setSelectedEarthquake(eq)
  }

  const handleClusterClick = (cluster: EarthquakeCluster) => {
    console.log('Cluster clicked:', cluster)
  }

  if (displayItems.type === 'earthquakes') {
    return (
      <group key={fadeKey}>
        {displayItems.items.map((eq) => (
          <EarthquakeMarker
            key={eq.id}
            earthquake={eq}
            position={getPosition(eq.latitude, eq.longitude)}
            onClick={handleEarthquakeClick}
            fadeIn={true}
          />
        ))}
      </group>
    )
  }

  return (
    <group key={fadeKey}>
      {displayItems.items.map((cluster) => (
        <ClusterMarker
          key={cluster.id}
          cluster={cluster}
          position={getPosition(cluster.latitude, cluster.longitude)}
          onClick={handleClusterClick}
          fadeIn={true}
        />
      ))}
    </group>
  )
}

function Scene() {
  const { mapMode, transitionProgress } = useEarthquakeStore()
  const { camera } = useThree()

  useFrame(() => {
    const targetZ = mapMode === 'flat' ? 5 : 6
    const currentZ = camera.position.z
    camera.position.z = currentZ + (targetZ - currentZ) * 0.02
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <pointLight position={[-5, -3, -5]} intensity={0.3} color="#4488ff" />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Earth />
      <EarthquakeMarkers />

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={15}
        enableDamping
        dampingFactor={0.05}
        autoRotate={false}
        autoRotateSpeed={0.5}
      />
    </>
  )
}

export function Globe() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Scene />
    </Canvas>
  )
}
