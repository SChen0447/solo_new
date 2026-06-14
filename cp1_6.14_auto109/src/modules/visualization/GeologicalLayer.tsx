import React, { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGeoStore } from '../../store'
import { GeologicalLayerData, LAYER_WIDTH, LAYER_DEPTH } from '../../types'

function createNoiseTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 128, 128)
  const imageData = ctx.getImageData(0, 0, 128, 128)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 40
    imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise))
    imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + noise))
    imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + noise))
  }
  ctx.putImageData(imageData, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

interface LayerMeshProps {
  layer: GeologicalLayerData
  isHovered: boolean
  isSelected: boolean
  sliceEnabled: boolean
  sliceX: number
  sliceZ: number
  segmentCount: number
  onPointerOver: () => void
  onPointerOut: () => void
  onClick: (e: THREE.Event) => void
}

const LayerMesh: React.FC<LayerMeshProps> = ({
  layer,
  isHovered,
  isSelected,
  sliceEnabled,
  sliceX,
  sliceZ,
  segmentCount,
  onPointerOver,
  onPointerOut,
  onClick,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const outlineRef = useRef<THREE.LineSegments>(null)
  const [noiseTexture] = useState(() => createNoiseTexture(layer.color))

  const geometry = useMemo(() => {
    const w = LAYER_WIDTH
    const d = LAYER_DEPTH
    const h = layer.thickness
    const geo = new THREE.BoxGeometry(w, h, d, segmentCount, 1, segmentCount)
    if (sliceEnabled) {
      const pos = geo.attributes.position
      const halfW = w / 2
      const halfD = d / 2
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const z = pos.getZ(i)
        if (x > sliceX - halfW) {
          pos.setX(i, sliceX - halfW)
        }
        if (z > sliceZ - halfD) {
          pos.setZ(i, sliceZ - halfD)
        }
      }
      pos.needsUpdate = true
      geo.computeVertexNormals()
    }
    return geo
  }, [layer.thickness, sliceEnabled, sliceX, sliceZ, segmentCount])

  const edgeGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 15)
  }, [geometry])

  useFrame(() => {
    if (outlineRef.current) {
      const mat = outlineRef.current.material as THREE.LineBasicMaterial
      if (isHovered || isSelected) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 1, 0.1)
      } else {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.15, 0.1)
      }
    }
  })

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: layer.color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      map: noiseTexture,
      roughness: 0.8,
      metalness: 0.1,
    })
  }, [layer.color, noiseTexture])

  const emissiveValue = isHovered ? 0.5 : isSelected ? 0.3 : 0

  return (
    <group position={[0, layer.yPosition + layer.thickness / 2, 0]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onPointerOver={(e) => {
          e.stopPropagation()
          onPointerOver()
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          onPointerOut()
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick(e)
        }}
      >
        <meshStandardMaterial
          color={layer.color}
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          map={noiseTexture}
          roughness={0.8}
          metalness={0.1}
          emissive={isHovered ? new THREE.Color(0xffffff) : isSelected ? new THREE.Color(0x4fc3f7) : new THREE.Color(0x000000)}
          emissiveIntensity={emissiveValue}
        />
      </mesh>
      <lineSegments ref={outlineRef} geometry={edgeGeometry}>
        <lineBasicMaterial
          color={isHovered ? 0xffffff : isSelected ? 0x4fc3f7 : 0x888888}
          transparent
          opacity={0.15}
        />
      </lineSegments>
    </group>
  )
}

const SeparationLine: React.FC<{ y: number }> = ({ y }) => {
  const points = useMemo(() => {
    const hw = LAYER_WIDTH / 2
    const hd = LAYER_DEPTH / 2
    return [
      new THREE.Vector3(-hw, y, -hd),
      new THREE.Vector3(hw, y, -hd),
      new THREE.Vector3(hw, y, hd),
      new THREE.Vector3(-hw, y, hd),
      new THREE.Vector3(-hw, y, -hd),
    ]
  }, [y])

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [points])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={0x666688} linewidth={1} transparent opacity={0.6} />
    </line>
  )
}

const SlicePlane: React.FC<{ sliceX: number; sliceZ: number }> = ({ sliceX, sliceZ }) => {
  const layers = useGeoStore((s) => s.layers)
  const totalHeight = layers.reduce((sum, l) => sum + l.thickness, 0)
  const hw = LAYER_WIDTH / 2
  const hd = LAYER_DEPTH / 2

  const xPoints = useMemo(() => {
    return [
      new THREE.Vector3(sliceX - hw, -0.01, -hd),
      new THREE.Vector3(sliceX - hw, totalHeight + 0.01, -hd),
      new THREE.Vector3(sliceX - hw, totalHeight + 0.01, hd),
      new THREE.Vector3(sliceX - hw, -0.01, hd),
      new THREE.Vector3(sliceX - hw, -0.01, -hd),
    ]
  }, [sliceX, totalHeight, hw, hd])

  const zPoints = useMemo(() => {
    return [
      new THREE.Vector3(-hw, -0.01, sliceZ - hd),
      new THREE.Vector3(hw, -0.01, sliceZ - hd),
      new THREE.Vector3(hw, totalHeight + 0.01, sliceZ - hd),
      new THREE.Vector3(-hw, totalHeight + 0.01, sliceZ - hd),
      new THREE.Vector3(-hw, -0.01, sliceZ - hd),
    ]
  }, [sliceZ, totalHeight, hw, hd])

  return (
    <group>
      <line geometry={new THREE.BufferGeometry().setFromPoints(xPoints)}>
        <lineBasicMaterial color={0x4fc3f7} transparent opacity={0.8} />
      </line>
      <line geometry={new THREE.BufferGeometry().setFromPoints(zPoints)}>
        <lineBasicMaterial color={0x4fc3f7} transparent opacity={0.8} />
      </line>
    </group>
  )
}

export const GeologicalLayer: React.FC = () => {
  const layers = useGeoStore((s) => s.layers)
  const selectedLayerId = useGeoStore((s) => s.selectedLayerId)
  const hoveredLayerId = useGeoStore((s) => s.hoveredLayerId)
  const selectLayer = useGeoStore((s) => s.selectLayer)
  const hoverLayer = useGeoStore((s) => s.hoverLayerLayer)
  const setHoverLayer = useGeoStore((s) => s.hoverLayer)
  const sliceEnabled = useGeoStore((s) => s.sliceEnabled)
  const sliceX = useGeoStore((s) => s.viewport.sliceX)
  const sliceZ = useGeoStore((s) => s.viewport.sliceZ)
  const performanceMode = useGeoStore((s) => s.performanceMode)
  const addAnnotation = useGeoStore((s) => s.addAnnotation)

  const segmentCount = performanceMode === 'optimized' ? 16 : 32

  const handleLayerClick = (layerId: string, e: THREE.Event) => {
    selectLayer(layerId)
  }

  return (
    <group>
      {layers.map((layer, index) => (
        <React.Fragment key={layer.id}>
          <LayerMesh
            layer={layer}
            isHovered={hoveredLayerId === layer.id}
            isSelected={selectedLayerId === layer.id}
            sliceEnabled={sliceEnabled}
            sliceX={sliceX}
            sliceZ={sliceZ}
            segmentCount={segmentCount}
            onPointerOver={() => setHoverLayer(layer.id)}
            onPointerOut={() => setHoverLayer(null)}
            onClick={(e) => handleLayerClick(layer.id, e)}
          />
          {index > 0 && <SeparationLine y={layer.yPosition} />}
        </React.Fragment>
      ))}
      {sliceEnabled && <SlicePlane sliceX={sliceX} sliceZ={sliceZ} />}
    </group>
  )
}
