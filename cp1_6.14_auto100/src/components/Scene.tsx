import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import {
  Brick,
  BrickShape,
  BrickMaterial,
  Position,
  MATERIAL_COLORS,
  MATERIAL_EMISSIVE,
} from '../types';
import {
  createBrick,
  placeBrick,
  snapPositionToGrid,
  updateFallingBricks,
  startFallingAnimation,
  recalculateAllBricksStability,
  checkBrickOverlap,
  moveBrick,
  getBrickDimensions,
} from '../modules/brickManager';

interface DragState {
  isDragging: boolean;
  shape: BrickShape | null;
  material: BrickMaterial | null;
  position: Position;
  isValid: boolean;
}

interface BrickMeshProps {
  brick: Brick;
  isGhost?: boolean;
  isInvalid?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: any) => void;
}

function BrickMesh({ brick, isGhost = false, isInvalid = false, onClick, onPointerDown }: BrickMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const gameMode = useGameStore((state) => state.gameMode);
  const isNight = gameMode === 'night';

  useEffect(() => {
    if (!brick.isStable && !brick.isFalling && !isGhost) {
      const blinkInterval = setInterval(() => {
        setIsBlinking((prev) => !prev);
      }, 300);

      const fallTimer = setTimeout(() => {
        if (!brick.isFalling) {
          startFallingAnimation(brick.id);
        }
      }, 3000);

      return () => {
        clearInterval(blinkInterval);
        clearTimeout(fallTimer);
      };
    }
  }, [brick.isStable, brick.isFalling, brick.id, isGhost]);

  const color = useMemo(() => {
    if (isInvalid) return '#ff4444';
    if (!brick.isStable && isBlinking && !isGhost) return '#ff4444';
    return MATERIAL_COLORS[brick.material];
  }, [brick.material, brick.isStable, isBlinking, isInvalid, isGhost]);

  const emissiveColor = useMemo(() => {
    if (isNight && !isGhost) {
      return MATERIAL_EMISSIVE[brick.material];
    }
    return '#000000';
  }, [brick.material, isNight, isGhost]);

  const geometry = useMemo(() => {
    switch (brick.shape) {
      case 'box':
        return new THREE.BoxGeometry(
          brick.dimensions.width,
          brick.dimensions.height,
          brick.dimensions.depth
        );
      case 'cylinder':
        return new THREE.CylinderGeometry(
          brick.dimensions.width / 2,
          brick.dimensions.width / 2,
          brick.dimensions.height,
          16
        );
      case 'prism': {
        const shape = new THREE.Shape();
        const w = brick.dimensions.width / 2;
        const d = brick.dimensions.depth / 2;
        shape.moveTo(-w, -d);
        shape.lineTo(w, -d);
        shape.lineTo(0, d);
        shape.lineTo(-w, -d);
        const extrudeSettings = {
          depth: brick.dimensions.height,
          bevelEnabled: false,
        };
        return new THREE.ExtrudeGeometry(shape, extrudeSettings).rotateX(-Math.PI / 2);
      }
      case 'arch': {
        const shape = new THREE.Shape();
        const w = brick.dimensions.width / 2;
        const h = brick.dimensions.height;
        shape.moveTo(-w, 0);
        shape.lineTo(-w, h * 0.6);
        shape.quadraticCurveTo(0, h, w, h * 0.6);
        shape.lineTo(w, 0);
        shape.lineTo(w * 0.6, 0);
        shape.lineTo(w * 0.6, h * 0.4);
        shape.quadraticCurveTo(0, h * 0.7, -w * 0.6, h * 0.4);
        shape.lineTo(-w * 0.6, 0);
        shape.lineTo(-w, 0);
        const extrudeSettings = {
          depth: brick.dimensions.depth,
          bevelEnabled: false,
        };
        return new THREE.ExtrudeGeometry(shape, extrudeSettings).rotateX(-Math.PI / 2);
      }
      default:
        return new THREE.BoxGeometry();
    }
  }, [brick.shape, brick.dimensions]);

  return (
    <mesh
      ref={meshRef}
      position={[brick.position.x, brick.position.y, brick.position.z]}
      rotation={[brick.rotation.x, brick.rotation.y, brick.rotation.z]}
      onClick={onClick}
      onPointerDown={onPointerDown}
      castShadow
      receiveShadow
    >
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={isNight && !isGhost ? 0.4 : 0}
        transparent={isGhost || !brick.isStable}
        opacity={isGhost ? 0.5 : brick.isStable ? 1 : 0.8}
        roughness={brick.material === 'stone' ? 0.8 : brick.material === 'wood' ? 0.6 : 0.2}
        metalness={brick.material === 'glass' ? 0.8 : 0.1}
      />
      {brick.isSelected && !isGhost && (
        <Edges threshold={15} color="#4fc3f7" lineWidth={1} />
      )}
    </mesh>
  );
}

function GroundGrid({ isNight }: { isNight: boolean }) {
  const gridColor = isNight ? '#2a2a4a' : '#4a4a6a';
  const gridSize = 30;
  const gridDivisions = 60;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[gridSize, gridSize]} />
        <meshStandardMaterial color={isNight ? '#0f0f1f' : '#1a1a3a'} />
      </mesh>
      <gridHelper
        args={[gridSize, gridDivisions, gridColor, gridColor]}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}

interface SceneContentProps {
  dragState: DragState;
  setDragState: (state: DragState) => void;
  selectedBrickForMove: string | null;
  setSelectedBrickForMove: (id: string | null) => void;
  isMovingBrick: boolean;
  setIsMovingBrick: (val: boolean) => void;
  movePosition: Position;
  setMovePosition: (pos: Position) => void;
}

function SceneContent({
  dragState,
  setDragState,
  selectedBrickForMove,
  setSelectedBrickForMove,
  isMovingBrick,
  setIsMovingBrick,
  movePosition,
  setMovePosition,
}: SceneContentProps) {
  const { camera, raycaster, mouse, gl } = useThree();
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const bricks = useGameStore((state) => state.bricks);
  const selectBrick = useGameStore((state) => state.selectBrick);
  const selectedBrickId = useGameStore((state) => state.selectedBrickId);
  const gameMode = useGameStore((state) => state.gameMode);
  const setContextMenu = useGameStore((state) => state.setContextMenu);
  const hideContextMenu = useGameStore((state) => state.hideContextMenu);
  const isNight = gameMode === 'night';

  useFrame(() => {
    updateFallingBricks();

    if (dragState.isDragging && dragState.shape && dragState.material) {
      raycaster.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, intersectPoint);

      if (intersectPoint) {
        const dimensions = getBrickDimensions(dragState.shape);
        const snappedPos = snapPositionToGrid({
          x: intersectPoint.x,
          y: dimensions.height / 2,
          z: intersectPoint.z,
        });

        const testBrick = createBrick(
          dragState.shape,
          dragState.material,
          snappedPos
        );
        const isValid = !checkBrickOverlap(testBrick, bricks);

        setDragState({
          ...dragState,
          position: snappedPos,
          isValid,
        });
      }
    }

    if (isMovingBrick && selectedBrickForMove) {
      raycaster.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, intersectPoint);

      if (intersectPoint) {
        const brick = bricks.find((b) => b.id === selectedBrickForMove);
        if (brick) {
          const snappedPos = snapPositionToGrid({
            x: intersectPoint.x,
            y: brick.dimensions.height / 2,
            z: intersectPoint.z,
          });
          setMovePosition(snappedPos);
        }
      }
    }
  });

  const handlePointerMissed = useCallback(() => {
    selectBrick(null);
    setSelectedBrickForMove(null);
    setIsMovingBrick(false);
    hideContextMenu();
  }, [selectBrick, setSelectedBrickForMove, setIsMovingBrick, hideContextMenu]);

  const handleBrickClick = useCallback(
    (brick: Brick) => {
      if (!dragState.isDragging && !isMovingBrick) {
        selectBrick(brick.id);
        setSelectedBrickForMove(brick.id);
      }
    },
    [dragState.isDragging, isMovingBrick, selectBrick, setSelectedBrickForMove]
  );

  const handleBrickPointerDown = useCallback(
    (e: any, brick: Brick) => {
      if (e.button === 2) {
        e.stopPropagation();
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          brickId: brick.id,
        });
      } else if (e.button === 0 && selectedBrickForMove === brick.id) {
        e.stopPropagation();
        setIsMovingBrick(true);
        setMovePosition({ ...brick.position });
      }
    },
    [selectedBrickForMove, setIsMovingBrick, setMovePosition, setContextMenu]
  );

  const handlePointerUp = useCallback(() => {
    if (dragState.isDragging && dragState.shape && dragState.material) {
      if (dragState.isValid) {
        const newBrick = createBrick(
          dragState.shape,
          dragState.material,
          dragState.position
        );
        placeBrick(newBrick);
      }
      setDragState({
        isDragging: false,
        shape: null,
        material: null,
        position: { x: 0, y: 0, z: 0 },
        isValid: false,
      });
    }

    if (isMovingBrick && selectedBrickForMove) {
      moveBrick(selectedBrickForMove, movePosition);
      setIsMovingBrick(false);
      setSelectedBrickForMove(null);
    }
  }, [
    dragState,
    setDragState,
    isMovingBrick,
    selectedBrickForMove,
    movePosition,
    setIsMovingBrick,
    setSelectedBrickForMove,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        camera.position.set(10, 10, 10);
        camera.lookAt(0, 0, 0);
      }
      if (e.code === 'Delete' && selectedBrickId) {
        const deleteAction = useGameStore.getState().removeBrick;
        deleteAction(selectedBrickId);
        recalculateAllBricksStability();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, selectedBrickId]);

  useEffect(() => {
    const handleGlobalPointerUp = () => handlePointerUp();
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [handlePointerUp]);

  useEffect(() => {
    const handleContextMenuClose = () => {
      hideContextMenu();
    };
    window.addEventListener('click', handleContextMenuClose);
    return () => window.removeEventListener('click', handleContextMenuClose);
  }, [hideContextMenu]);

  const movingBrick = selectedBrickForMove
    ? bricks.find((b) => b.id === selectedBrickForMove)
    : null;

  return (
    <>
      <ambientLight intensity={isNight ? 0.2 : 0.5} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={isNight ? 0.3 : 1}
        color={isNight ? '#6688cc' : '#fff5e6'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight
        position={[-5, 8, -5]}
        intensity={isNight ? 0.2 : 0.5}
        color={isNight ? '#4466aa' : '#ffeedd'}
      />

      <fog
        attach="fog"
        args={[isNight ? '#0a0a1a' : '#1a1a3a', 15, 40]}
      />

      <GroundGrid isNight={isNight} />

      {bricks.map((brick) => (
        <BrickMesh
          key={brick.id}
          brick={brick}
          onClick={() => handleBrickClick(brick)}
          onPointerDown={(e) => handleBrickPointerDown(e, brick)}
        />
      ))}

      {dragState.isDragging && dragState.shape && dragState.material && (
        <BrickMesh
          brick={{
            id: 'ghost',
            shape: dragState.shape,
            material: dragState.material,
            position: dragState.position,
            rotation: { x: 0, y: 0, z: 0 },
            dimensions: getBrickDimensions(dragState.shape),
            isStable: true,
            isSelected: false,
            isFalling: false,
          }}
          isGhost
          isInvalid={!dragState.isValid}
        />
      )}

      {isMovingBrick && movingBrick && (
        <BrickMesh
          brick={{
            ...movingBrick,
            position: movePosition,
          }}
          isGhost
          isInvalid={false}
        />
      )}

      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

interface SceneProps {
  dragState: DragState;
  setDragState: (state: DragState) => void;
}

export default function Scene({ dragState, setDragState }: SceneProps) {
  const [selectedBrickForMove, setSelectedBrickForMove] = useState<string | null>(null);
  const [isMovingBrick, setIsMovingBrick] = useState(false);
  const [movePosition, setMovePosition] = useState<Position>({ x: 0, y: 0, z: 0 });

  return (
    <Canvas
      shadows
      camera={{ position: [10, 10, 10], fov: 50 }}
      gl={{ antialias: true }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
      }}
    >
      <SceneContent
        dragState={dragState}
        setDragState={setDragState}
        selectedBrickForMove={selectedBrickForMove}
        setSelectedBrickForMove={setSelectedBrickForMove}
        isMovingBrick={isMovingBrick}
        setIsMovingBrick={setIsMovingBrick}
        movePosition={movePosition}
        setMovePosition={setMovePosition}
      />
    </Canvas>
  );
}

export type { DragState };
