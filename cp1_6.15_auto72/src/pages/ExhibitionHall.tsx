import { useRef, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useExhibitionStore } from '@/store/useExhibitionStore'
import ArtworkDetail from '@/components/ArtworkDetail'
import GalleryRoom from './components/GalleryRoom'
import ArtworkModel from './components/ArtworkModel'
import './ExhibitionHall.css'

const ROOM_WIDTH = 40
const ROOM_HEIGHT = 8
const ROOM_DEPTH = 30
const PLAYER_HEIGHT = 2
const PLAYER_RADIUS = 0.5
const MOVE_SPEED = 0.15
const MOUSE_SENSITIVITY = 0.002

interface PlayerControllerProps {
  onPointerLockChange?: (locked: boolean) => void
}

const PlayerController = ({ onPointerLockChange }: PlayerControllerProps) => {
  const { camera, gl } = useThree()
  const controlsRef = useRef<any>(null)
  const keysRef = useRef<Record<string, boolean>>({})
  const velocityRef = useRef(new THREE.Vector3())
  const directionRef = useRef(new THREE.Vector3())
  const setPlayerPosition = useExhibitionStore(state => state.setPlayerPosition)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const checkCollision = useCallback((pos: THREE.Vector3): boolean => {
    const halfWidth = ROOM_WIDTH / 2 - PLAYER_RADIUS
    const halfDepth = ROOM_DEPTH / 2 - PLAYER_RADIUS
    return (
      pos.x < -halfWidth ||
      pos.x > halfWidth ||
      pos.z < -halfDepth ||
      pos.z > halfDepth
    )
  }, [])

  useFrame((_, delta) => {
    if (!controlsRef.current || !controlsRef.current.isLocked) return

    const keys = keysRef.current
    const velocity = velocityRef.current
    const direction = directionRef.current

    velocity.x -= velocity.x * 10.0 * delta
    velocity.z -= velocity.z * 10.0 * delta

    direction.z = Number(keys['KeyW'] || keys['ArrowUp']) - Number(keys['KeyS'] || keys['ArrowDown'])
    direction.x = Number(keys['KeyD'] || keys['ArrowRight']) - Number(keys['KeyA'] || keys['ArrowLeft'])
    direction.normalize()

    if (keys['KeyW'] || keys['KeyS'] || keys['ArrowUp'] || keys['ArrowDown']) {
      velocity.z -= direction.z * MOVE_SPEED * 60 * delta
    }
    if (keys['KeyA'] || keys['KeyD'] || keys['ArrowLeft'] || keys['ArrowRight']) {
      velocity.x -= direction.x * MOVE_SPEED * 60 * delta
    }

    const moveForward = new THREE.Vector3()
    camera.getWorldDirection(moveForward)
    moveForward.y = 0
    moveForward.normalize()

    const moveRight = new THREE.Vector3()
    moveRight.crossVectors(moveForward, new THREE.Vector3(0, 1, 0)).normalize()

    const newPos = camera.position.clone()
    newPos.addScaledVector(moveForward, -velocity.z * delta * 60)
    newPos.addScaledVector(moveRight, velocity.x * delta * 60)

    if (!checkCollision(new THREE.Vector3(newPos.x, 0, newPos.z))) {
      camera.position.x = newPos.x
      camera.position.z = newPos.z
    } else {
      const testX = new THREE.Vector3(newPos.x, 0, camera.position.z)
      const testZ = new THREE.Vector3(camera.position.x, 0, newPos.z)
      if (!checkCollision(testX)) {
        camera.position.x = newPos.x
      }
      if (!checkCollision(testZ)) {
        camera.position.z = newPos.z
      }
    }

    camera.position.y = PLAYER_HEIGHT

    setPlayerPosition({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    })
  })

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => onPointerLockChange?.(true)}
      onUnlock={() => onPointerLockChange?.(false)}
    />
  )
}

const ArtworkWithLOD = ({ artwork, distance }: { artwork: any; distance: number }) => {
  const [hovered, setHovered] = useState(false)
  const setSelectedArtwork = useExhibitionStore(state => state.setSelectedArtwork)
  const meshRef = useRef<THREE.Mesh>(null)
  const lodRef = useRef<THREE.LOD>(null)

  const lodLevel = distance < 10 ? 0 : distance < 20 ? 1 : 2

  const handleClick = (e: any) => {
    e.stopPropagation()
    setSelectedArtwork(artwork)
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
    <group position={[artwork.position.x, artwork.position.y, artwork.position.z]}>
      <group rotation={[artwork.rotation.x, artwork.rotation.y, artwork.rotation.z]}>
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          scale={artwork.scale || 1}
        >
          <boxGeometry args={[2, 3, 0.5]} />
          <meshStandardMaterial
            color={hovered ? '#ffd700' : '#8b7355'}
            emissive={hovered ? '#ffd700' : '#000000'}
            emissiveIntensity={hovered ? 0.3 : 0}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
        {hovered && (
          <mesh position={[0, 0, 0.26]}>
            <boxGeometry args={[2.1, 3.1, 0.02]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.6} />
          </mesh>
        )}
      </group>
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

const Scene = ({ isLocked }: { isLocked: boolean }) => {
  const artworks = useExhibitionStore(state => state.artworks)
  const currentRoom = useExhibitionStore(state =>
    state.rooms.find(r => r.id === state.currentRoomId)
  )
  const playerPosition = useExhibitionStore(state => state.playerPosition)

  const wallColor = currentRoom?.wallColor || '#2c2c3a'

  return (
    <>
      <ambientLight intensity={0.4} />

      <directionalLight
        position={[0, 10, 5]}
        intensity={0.8}
        color="#fff5e6"
        castShadow
      />

      <pointLight position={[-18, 6, -13]} intensity={0.3} color="#e6f0ff" />
      <pointLight position={[18, 6, -13]} intensity={0.3} color="#e6f0ff" />
      <pointLight position={[-18, 6, 13]} intensity={0.3} color="#e6f0ff" />
      <pointLight position={[18, 6, 13]} intensity={0.3} color="#e6f0ff" />

      <GalleryRoom
        width={ROOM_WIDTH}
        height={ROOM_HEIGHT}
        depth={ROOM_DEPTH}
        wallColor={wallColor}
      />

      {artworks.map(artwork => {
        const dx = artwork.position.x - playerPosition.x
        const dz = artwork.position.z - playerPosition.z
        const distance = Math.sqrt(dx * dx + dz * dz)
        return (
          <ArtworkWithLOD key={artwork.id} artwork={artwork} distance={distance} />
        )
      })}

      <PlayerController />
    </>
  )
}

const ExhibitionHall = () => {
  const [isLocked, setIsLocked] = useState(false)
  const selectedArtwork = useExhibitionStore(state => state.selectedArtwork)
  const setSelectedArtwork = useExhibitionStore(state => state.setSelectedArtwork)
  const currentRoom = useExhibitionStore(state =>
    state.rooms.find(r => r.id === state.currentRoomId)
  )
  const initExhibition = useExhibitionStore(state => state.initExhibition)
  const isLoading = useExhibitionStore(state => state.isLoading)

  useEffect(() => {
    initExhibition()
  }, [initExhibition])

  const handleStartClick = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.requestPointerLock()
    }
  }

  return (
    <div className="exhibition-hall">
      <div className="exhibition-header">
        <h1 className="exhibition-title">虚拟艺术画廊</h1>
        {currentRoom && (
          <div className="exhibition-room-name">
            <span className="room-label">当前展厅</span>
            <span className="room-name">{currentRoom.name}</span>
          </div>
        )}
      </div>

      <div className="canvas-container">
        <Canvas
          camera={{ position: [0, PLAYER_HEIGHT, 10], fov: 75 }}
          shadows
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.setClearColor('#0d0d1a')
          }}
        >
          <fog attach="fog" args={['#0d0d1a', 30, 60]} />
          <Scene isLocked={isLocked} />
        </Canvas>

        {!isLocked && !selectedArtwork && (
          <div className="start-overlay" onClick={handleStartClick}>
            <div className="start-card">
              <h2>进入虚拟画廊</h2>
              <p>点击以第一人称视角开始漫游</p>
              <div className="controls-hint">
                <div className="hint-item">
                  <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
                  <span>移动</span>
                </div>
                <div className="hint-item">
                  <kbd>鼠标</kbd>
                  <span>旋转视角</span>
                </div>
                <div className="hint-item">
                  <kbd>Esc</kbd>
                  <span>退出漫游</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLocked && (
          <div className="controls-hint-panel">
            <span className="hint-tag">WASD 移动</span>
            <span className="hint-tag">鼠标 视角</span>
            <span className="hint-tag">点击作品 查看详情</span>
          </div>
        )}
      </div>

      <ArtworkDetail
        artwork={selectedArtwork}
        onClose={() => setSelectedArtwork(null)}
      />

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>加载展览中...</p>
        </div>
      )}
    </div>
  )
}

export default ExhibitionHall
