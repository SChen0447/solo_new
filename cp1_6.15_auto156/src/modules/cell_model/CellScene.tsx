import React, { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, type OrganelleId, type CellType, type SimulationParams } from '@/store/Store'
import { CellBuilder, type OrganelleMesh } from './CellBuilder'

interface CellGroupProps {
  cellType: CellType
  params: SimulationParams
  selectedOrganelleId: OrganelleId | null
  onOrganelleClick: (id: OrganelleId) => void
}

const CellGroup: React.FC<CellGroupProps> = ({
  cellType,
  params,
  selectedOrganelleId,
  onOrganelleClick,
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const cellBuilderRef = useRef<CellBuilder | null>(null)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())
  const { camera, gl } = useThree()

  const organelleMeshesRef = useRef<Map<OrganelleId, OrganelleMesh>>(new Map())

  useEffect(() => {
    cellBuilderRef.current = new CellBuilder()
    const cellGroup = cellBuilderRef.current.build(cellType, params)
    organelleMeshesRef.current = cellBuilderRef.current.getOrganelleMeshes()

    if (groupRef.current) {
      while (groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0])
      }
      groupRef.current.add(cellGroup)
    }

    return () => {
      cellBuilderRef.current?.dispose()
    }
  }, [cellType])

  useEffect(() => {
    if (cellBuilderRef.current) {
      cellBuilderRef.current.update(cellType, params)
    }
  }, [params, cellType])

  useEffect(() => {
    if (cellBuilderRef.current) {
      cellBuilderRef.current.highlightOrganelle(selectedOrganelleId)
    }
  }, [selectedOrganelleId])

  const handleClick = (event: ThreeEvent<MouseEvent>): void => {
    const meshes: THREE.Mesh[] = []
    organelleMeshesRef.current.forEach((organelle) => {
      meshes.push(...organelle.instances)
    })

    const intersects = event.intersections.filter((i) => meshes.includes(i.object as THREE.Mesh))

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh
      const organelleId = clickedMesh.userData.organelleId as OrganelleId
      if (organelleId) {
        onOrganelleClick(organelleId)
      }
    }
  }

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05
    }
  })

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
    />
  )
}

const StatusBar: React.FC = () => {
  const cellType = useStore((state) => state.cellType)
  const simulationTime = useStore((state) => state.simulationTime)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const cellTypeName = cellType === 'animal' ? '动物细胞' : '植物细胞'

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 36,
        background: 'rgba(30, 30, 30, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        color: '#fff',
        fontFamily: 'sans-serif',
        fontSize: 13,
        borderTop: '1px solid #333',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: '#888' }}>细胞类型:</span>
          <span
            style={{
              color: '#00bcd4',
              fontWeight: 600,
            }}
          >
            {cellTypeName}
          </span>
        </div>
        <div style={{ width: 1, height: 16, background: '#444' }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: '#888' }}>模拟时间:</span>
          <span
            style={{
              color: '#00e676',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'monospace',
            }}
          >
            {formatTime(simulationTime)}
          </span>
        </div>
      </div>
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#00e676',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <span style={{ color: '#888', fontSize: 12 }}>模拟运行中</span>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}

const CellScene: React.FC = () => {
  const cellType = useStore((state) => state.cellType)
  const params = useStore((state) => state.params)
  const selectedOrganelleId = useStore((state) => state.selectedOrganelleId)
  const setSelectedOrganelleId = useStore((state) => state.setSelectedOrganelleId)

  const handleOrganelleClick = (id: OrganelleId): void => {
    setSelectedOrganelleId(id === selectedOrganelleId ? null : id)
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#121212',
      }}
    >
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera
          makeDefault
          position={[0, 0, 12]}
          fov={50}
          near={0.1}
          far={100}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={6}
          maxDistance={60}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />

        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight
          position={[5, 10, 7]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight
          position={[-5, -5, -5]}
          intensity={0.3}
          color="#4a90d9"
        />

        <fog attach="fog" args={['#121212', 15, 30]} />

        <CellGroup
          cellType={cellType}
          params={params}
          selectedOrganelleId={selectedOrganelleId}
          onOrganelleClick={handleOrganelleClick}
        />
      </Canvas>

      <StatusBar />
    </div>
  )
}

export default CellScene
