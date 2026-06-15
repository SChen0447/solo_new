import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Edges } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/store'
import { Part, COLOR_MAP, PART_DIMENSIONS } from '@/types'
import { GRID_SIZE, HEIGHT_STEP, snapPosition, checkVerticalSnap, getPartHeight } from '@/utils'

interface LegoPartProps {
  part: Part
  isSelected: boolean
  isHovered: boolean
  isRotating: boolean
}

function LegoPart({ part, isSelected, isHovered, isRotating }: LegoPartProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [opacity, setOpacity] = useState(0)
  const [scaleY, setScaleY] = useState(0.5)

  useEffect(() => {
    if (part.isAnimating) {
      setOpacity(0)
      setScaleY(0.5)
      const start = performance.now()
      const animate = (time: number) => {
        const elapsed = time - start
        const progress = Math.min(elapsed / 300, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setOpacity(eased)
        const bounce = Math.sin(progress * Math.PI) * 0.3
        setScaleY(0.5 + eased * 0.5 + bounce * (1 - progress))
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    } else {
      setOpacity(1)
      setScaleY(1)
    }
  }, [part.isAnimating, part.id])

  const dims = PART_DIMENSIONS[part.type]
  const color = COLOR_MAP[part.color]
  const position: [number, number, number] = [
    part.position.x / 10,
    (part.position.y + dims.height / 2) / 10,
    part.position.z / 10,
  ]
  const size: [number, number, number] = [dims.width / 10, dims.height / 10, dims.depth / 10]

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        scale={[1, scaleY, 1]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          roughness={0.5}
          metalness={0.1}
        />
        {(isRotating || isSelected || isHovered) && (
          <Edges threshold={15} color="#ffd54f" linewidth={1} />
        )}
      </mesh>
      {!isRotating && (
        <mesh
          position={[position[0], position[1] - dims.height / 20 - 0.01, position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[dims.width / 10 + 0.1, dims.depth / 10 + 0.1]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.2} />
        </mesh>
      )}
    </group>
  )
}

interface GhostPartProps {
  type: Part['type']
  color: Part['color']
  position: { x: number; y: number; z: number }
  visible: boolean
}

function GhostPart({ type, color, position, visible }: GhostPartProps) {
  if (!visible) return null

  const dims = PART_DIMENSIONS[type]
  const pos: [number, number, number] = [
    position.x / 10,
    (position.y + dims.height / 2) / 10,
    position.z / 10,
  ]
  const size: [number, number, number] = [dims.width / 10, dims.height / 10, dims.depth / 10]

  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={COLOR_MAP[color]}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
      />
      <Edges threshold={15} color="#4caf50" linewidth={2} />
    </mesh>
  )
}

interface CameraControllerProps {
  controlsRef: React.RefObject<any>
}

function CameraController({ controlsRef }: CameraControllerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const { camera } = useThree()
  const setIsRotating = useStore((s) => s.setIsRotating)

  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return

    if (isDragging) {
      if (controls.target) {
        setIsRotating(true)
      }
    }
  })

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    const handleStart = () => setIsDragging(true)
    const handleEnd = () => {
      setIsDragging(false)
      setIsRotating(false)

      const spherical = new THREE.Spherical()
      spherical.setFromVector3(camera.position)

      const snapAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI]
      let closestTheta = snapAngles[0]
      let minThetaDist = Infinity
      for (const angle of snapAngles) {
        const dist = Math.abs(((spherical.theta - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
        if (dist < minThetaDist) {
          minThetaDist = dist
          closestTheta = angle
        }
      }

      let closestPhi = Math.PI / 4
      const phiSnap = [Math.PI / 6, Math.PI / 4, Math.PI / 3]
      let minPhiDist = Infinity
      for (const angle of phiSnap) {
        const dist = Math.abs(spherical.phi - angle)
        if (dist < minPhiDist) {
          minPhiDist = dist
          closestPhi = angle
        }
      }

      const startTheta = spherical.theta
      const startPhi = spherical.phi
      const startTime = performance.now()
      const duration = 500

      const animate = (time: number) => {
        const elapsed = time - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        spherical.theta = startTheta + (closestTheta - startTheta) * eased
        spherical.phi = startPhi + (closestPhi - startPhi) * eased

        camera.position.setFromSpherical(spherical)
        camera.lookAt(0, 0, 0)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }

    controls.addEventListener('start', handleStart)
    controls.addEventListener('end', handleEnd)

    return () => {
      controls.removeEventListener('start', handleStart)
      controls.removeEventListener('end', handleEnd)
    }
  }, [camera, controlsRef])

  return null
}

interface SceneProps {
  controlsRef: React.RefObject<any>
  ghostPosition: { x: number; y: number; z: number }
  ghostVisible: boolean
  heightOffset: number
}

function Scene({ controlsRef, ghostPosition, ghostVisible, heightOffset }: SceneProps) {
  const parts = useStore((s) => s.parts)
  const selectedPartId = useStore((s) => s.selectedPartId)
  const hoveredPartId = useStore((s) => s.hoveredPartId)
  const isRotating = useStore((s) => s.isRotating)
  const selectedPartType = useStore((s) => s.selectedPartType)
  const selectedColor = useStore((s) => s.selectedColor)
  const addPart = useStore((s) => s.addPart)

  const handleCanvasClick = useCallback(
    (e: any) => {
      e.stopPropagation()
      if (ghostVisible) {
        addPart(ghostPosition)
      }
    },
    [ghostVisible, ghostPosition, addPart]
  )

  const adjustedGhostPos = useMemo(() => {
    const snapped = snapPosition(ghostPosition)
    return checkVerticalSnap(
      { ...snapped, y: snapped.y + heightOffset },
      parts,
      getPartHeight(selectedPartType)
    )
  }, [ghostPosition, heightOffset, parts, selectedPartType])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />

      <Grid
        args={[32, 32]}
        cellSize={GRID_SIZE / 10}
        cellThickness={0.5}
        cellColor="#2d2d44"
        sectionSize={GRID_SIZE / 10 * 4}
        sectionThickness={1}
        sectionColor="#3d3d5c"
        fadeDistance={100}
        fadeStrength={1}
        infiniteGrid
        position={[0, -0.01, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {parts.map((part) => (
        <LegoPart
          key={part.id}
          part={part}
          isSelected={selectedPartId === part.id}
          isHovered={hoveredPartId === part.id}
          isRotating={isRotating}
        />
      ))}

      <GhostPart
        type={selectedPartType}
        color={selectedColor}
        position={adjustedGhostPos}
        visible={ghostVisible}
      />

      <mesh
        position={[adjustedGhostPos.x / 10, 0.001, adjustedGhostPos.z / 10]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={ghostVisible}
        onClick={handleCanvasClick}
      >
        <planeGeometry args={[PART_DIMENSIONS[selectedPartType].width / 10, PART_DIMENSIONS[selectedPartType].depth / 10]} />
        <meshBasicMaterial color="#4caf50" transparent opacity={0.15} />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 3}
        minDistance={5}
        maxDistance={100}
        enableDamping
        dampingFactor={0.05}
      />

      <CameraController controlsRef={controlsRef} />
    </>
  )
}

export default function BuildCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<any>(null)
  const [ghostPosition, setGhostPosition] = useState({ x: 0, y: 0, z: 0 })
  const [ghostVisible, setGhostVisible] = useState(false)
  const [heightOffset, setHeightOffset] = useState(0)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const addPart = useStore((s) => s.addPart)
  const setSelectedPartType = useStore((s) => s.setSelectedPartType)
  const setSelectedColor = useStore((s) => s.setSelectedColor)

  const updateGhostPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * 2 - 1
      const y = -((clientY - rect.top) / rect.height) * 2 + 1

      const groundY = 0
      const rayStartZ = 30
      const rayEndZ = -30
      const slope = (groundY - rayStartZ) / (rayEndZ - rayStartZ)
      const intercept = groundY - slope * rayEndZ

      const worldX = x * 20
      const worldZ = y * 20 * (1 - slope) + intercept

      const snapped = snapPosition({ x: worldX * 10, y: heightOffset, z: worldZ * 10 })
      setGhostPosition(snapped)
    },
    [heightOffset]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setIsDraggingOver(true)
      setGhostVisible(true)
      updateGhostPosition(e.clientX, e.clientY)
    },
    [updateGhostPosition]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(true)
    setGhostVisible(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget === e.target) {
      setIsDraggingOver(false)
      setGhostVisible(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingOver(false)
      setGhostVisible(false)

      const partType = e.dataTransfer.getData('partType') as Part['type']
      const partColor = e.dataTransfer.getData('partColor') as Part['color']

      if (partType) {
        setSelectedPartType(partType)
      }
      if (partColor) {
        setSelectedColor(partColor)
      }

      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        const worldX = x * 20
        const worldZ = y * 20
        const finalPos = {
          x: Math.round(worldX),
          y: heightOffset,
          z: Math.round(worldZ),
        }
        addPart(snapPosition({ x: finalPos.x * 10, y: finalPos.y, z: finalPos.z * 10 }))
      }
    },
    [addPart, heightOffset, setSelectedColor, setSelectedPartType]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingOver) {
        updateGhostPosition(e.clientX, e.clientY)
      }
    },
    [isDraggingOver, updateGhostPosition]
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault()
        setHeightOffset((prev) => {
          const delta = e.deltaY > 0 ? HEIGHT_STEP : -HEIGHT_STEP
          return Math.max(0, prev + delta)
        })
      }
    },
    []
  )

  const handleClick = useCallback(() => {
    if (ghostVisible && !isDraggingOver) {
      addPart(ghostPosition)
    }
  }, [ghostVisible, ghostPosition, addPart, isDraggingOver])

  const handleMouseEnter = useCallback(() => {
    setGhostVisible(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setGhostVisible(false)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`build-canvas ${isDraggingOver ? 'dragging-over' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Canvas
        shadows
        camera={{ position: [15, 15, 15], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#1a1a2e' }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 30, 80]} />
        <Scene
          controlsRef={controlsRef}
          ghostPosition={ghostPosition}
          ghostVisible={ghostVisible}
          heightOffset={heightOffset}
        />
      </Canvas>

      {heightOffset > 0 && (
        <div className="height-indicator">
          <span>高度: {heightOffset / HEIGHT_STEP} 层</span>
        </div>
      )}

      <div className="canvas-hint">
        <p>💡 拖拽零件到此处放置 | 点击空白处放置当前零件</p>
        <p>🖱️ 拖拽旋转视角 | Shift+滚轮调整高度</p>
      </div>
    </div>
  )
}
