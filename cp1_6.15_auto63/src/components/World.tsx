import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ChunkManager, VoxelType, VOXEL_COLORS, CHUNK_SIZE, WORLD_HEIGHT, GRID_SIZE } from '../engine/ChunkManager';
import { DayNightCycle, DayNightState } from '../engine/DayNightCycle';
import { InteractionSystem, HitResult } from '../engine/InteractionSystem';
import { useGameStore } from '../store/useGameStore';

function DynamicSky({ dayNightState }: { dayNightState: DayNightState }) {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.Fog(dayNightState.fogColor, 30, 100);
    scene.background = dayNightState.skyColor;
  }, [dayNightState.skyColor, dayNightState.fogColor, scene]);

  return null;
}

function Lighting({ dayNightState }: { dayNightState: DayNightState }) {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);

  useFrame(() => {
    if (directionalRef.current) {
      directionalRef.current.position.copy(dayNightState.sunPosition);
      directionalRef.current.color.copy(dayNightState.lightColor);
      directionalRef.current.intensity = dayNightState.directionalIntensity;
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = dayNightState.ambientIntensity;
      ambientRef.current.color.copy(dayNightState.lightColor);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.3} />
      <directionalLight
        ref={directionalRef}
        position={[50, 50, 25]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
    </>
  );
}

function ChunkMesh({
  chunk,
  chunkManager,
  interactionSystem
}: {
  chunk: { x: number; z: number; data: Uint8Array; dirty: boolean };
  chunkManager: ChunkManager;
  interactionSystem: InteractionSystem;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  const buildGeometry = useCallback(() => {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vertexCount = 0;

    const addFace = (
      x: number, y: number, z: number,
      normal: THREE.Vector3,
      color: THREE.Color,
      faceType: 'top' | 'bottom' | 'side'
    ) => {
      const faceVertices: THREE.Vector3[] = [];

      if (normal.y > 0) {
        faceVertices.push(
          new THREE.Vector3(x, y + 1, z),
          new THREE.Vector3(x + 1, y + 1, z),
          new THREE.Vector3(x + 1, y + 1, z + 1),
          new THREE.Vector3(x, y + 1, z + 1)
        );
      } else if (normal.y < 0) {
        faceVertices.push(
          new THREE.Vector3(x, y, z + 1),
          new THREE.Vector3(x + 1, y, z + 1),
          new THREE.Vector3(x + 1, y, z),
          new THREE.Vector3(x, y, z)
        );
      } else if (normal.x > 0) {
        faceVertices.push(
          new THREE.Vector3(x + 1, y, z),
          new THREE.Vector3(x + 1, y + 1, z),
          new THREE.Vector3(x + 1, y + 1, z + 1),
          new THREE.Vector3(x + 1, y, z + 1)
        );
      } else if (normal.x < 0) {
        faceVertices.push(
          new THREE.Vector3(x, y, z + 1),
          new THREE.Vector3(x, y + 1, z + 1),
          new THREE.Vector3(x, y + 1, z),
          new THREE.Vector3(x, y, z)
        );
      } else if (normal.z > 0) {
        faceVertices.push(
          new THREE.Vector3(x + 1, y, z + 1),
          new THREE.Vector3(x + 1, y + 1, z + 1),
          new THREE.Vector3(x, y + 1, z + 1),
          new THREE.Vector3(x, y, z + 1)
        );
      } else {
        faceVertices.push(
          new THREE.Vector3(x, y, z),
          new THREE.Vector3(x, y + 1, z),
          new THREE.Vector3(x + 1, y + 1, z),
          new THREE.Vector3(x + 1, y, z)
        );
      }

      for (const v of faceVertices) {
        positions.push(v.x, v.y, v.z);
        normals.push(normal.x, normal.y, normal.z);
        colors.push(color.r, color.g, color.b);
      }

      indices.push(
        vertexCount, vertexCount + 1, vertexCount + 2,
        vertexCount, vertexCount + 2, vertexCount + 3
      );
      vertexCount += 4;
    };

    const isExposed = (wx: number, wy: number, wz: number): boolean => {
      return chunkManager.getVoxel(wx, wy, wz) === VoxelType.AIR;
    };

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const worldX = chunk.x * CHUNK_SIZE + x;
          const worldY = y;
          const worldZ = chunk.z * CHUNK_SIZE + z;

          const voxelType = chunkManager.getVoxel(worldX, worldY, worldZ);
          if (voxelType === VoxelType.AIR) continue;

          const voxelColors = VOXEL_COLORS[voxelType];
          const topColor = new THREE.Color(voxelColors.top);
          const sideColor = new THREE.Color(voxelColors.side);

          if (isExposed(worldX, worldY + 1, worldZ)) {
            addFace(x, y, z, new THREE.Vector3(0, 1, 0), topColor, 'top');
          }
          if (isExposed(worldX, worldY - 1, worldZ)) {
            addFace(x, y, z, new THREE.Vector3(0, -1, 0), sideColor, 'bottom');
          }
          if (isExposed(worldX + 1, worldY, worldZ)) {
            addFace(x, y, z, new THREE.Vector3(1, 0, 0), sideColor, 'side');
          }
          if (isExposed(worldX - 1, worldY, worldZ)) {
            addFace(x, y, z, new THREE.Vector3(-1, 0, 0), sideColor, 'side');
          }
          if (isExposed(worldX, worldY, worldZ + 1)) {
            addFace(x, y, z, new THREE.Vector3(0, 0, 1), sideColor, 'side');
          }
          if (isExposed(worldX, worldY, worldZ - 1)) {
            addFace(x, y, z, new THREE.Vector3(0, 0, -1), sideColor, 'side');
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);

    return geo;
  }, [chunk, chunkManager]);

  useEffect(() => {
    if (chunk.dirty || !geometry) {
      const newGeo = buildGeometry();
      setGeometry(newGeo);
    }
  }, [chunk.dirty, buildGeometry, geometry]);

  if (!geometry) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[chunk.x * CHUNK_SIZE, 0, chunk.z * CHUNK_SIZE]}
      castShadow
      receiveShadow
    >
      <meshLambertMaterial vertexColors flatShading={false} />
    </mesh>
  );
}

function HighlightBox({ hit, toolMode }: { hit: HitResult | null; toolMode: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (hit) {
      setOpacity(0.6);
    } else {
      setOpacity(0);
    }
  }, [hit]);

  if (!hit) return null;

  const color = toolMode === 'place'
    ? new THREE.Color(0x4CAF50)
    : toolMode === 'remove'
      ? new THREE.Color(0xF44336)
      : new THREE.Color(0x2196F3);

  return (
    <mesh
      ref={meshRef}
      position={[
        hit.voxelPosition.x + 0.5,
        hit.voxelPosition.y + 0.5,
        hit.voxelPosition.z + 0.5
      ]}
    >
      <boxGeometry args={[1.02, 1.02, 1.02]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        wireframe
        wireframeLinewidth={2}
      />
    </mesh>
  );
}

function Particles({ particles }: { particles: any[] }) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.position.x, p.position.y, p.position.z]}>
          <boxGeometry args={[p.size, p.size, p.size]} />
          <meshBasicMaterial color={p.color} transparent opacity={p.life / p.maxLife} />
        </mesh>
      ))}
    </group>
  );
}

function WorldContent() {
  const { camera, gl, raycaster } = useThree();
  const toolMode = useGameStore((state) => state.toolMode);
  const setTimeOfDay = useGameStore((state) => state.setTimeOfDay);
  const setPlacedBlockCount = useGameStore((state) => state.setPlacedBlockCount);
  const isPaused = useGameStore((state) => state.isPaused);

  const chunkManager = useMemo(() => new ChunkManager(GRID_SIZE, WORLD_HEIGHT), []);
  const dayNightCycle = useMemo(() => new DayNightCycle(120), []);
  const interactionSystem = useMemo(() => new InteractionSystem(chunkManager), [chunkManager]);

  const [chunks, setChunks] = useState(chunkManager.getChunks());
  const [dayNightState, setDayNightState] = useState<DayNightState>(dayNightCycle.getState());
  const [hitResult, setHitResult] = useState<HitResult | null>(null);
  const [particles, setParticles] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const updateChunks = useCallback(() => {
    const dirtyChunks = chunkManager.getDirtyChunks();
    if (dirtyChunks.length > 0) {
      dirtyChunks.forEach(c => chunkManager.markClean(c));
      setChunks([...chunkManager.getChunks()]);
    }
    setPlacedBlockCount(chunkManager.getPlacedVoxelCount());
  }, [chunkManager, setPlacedBlockCount]);

  useFrame((_, delta) => {
    if (!isPaused) {
      dayNightCycle.update(delta);
      setDayNightState(dayNightCycle.getState());
      setTimeOfDay(dayNightCycle.getTime(), dayNightCycle.getTimeString());

      interactionSystem.updateParticles(delta);
      setParticles([...interactionSystem.getParticles()]);
    }

    updateChunks();
  });

  const handlePointerMove = useCallback((event: any) => {
    event.stopPropagation();

    const mouse = new THREE.Vector2(
      (event.nativeEvent.offsetX / gl.domElement.clientWidth) * 2 - 1,
      -(event.nativeEvent.offsetY / gl.domElement.clientHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);
    const hit = interactionSystem.raycast(
      raycaster.ray.origin,
      raycaster.ray.direction
    );
    setHitResult(hit);
  }, [camera, gl, interactionSystem, raycaster]);

  const handlePointerDown = useCallback((event: any) => {
    event.stopPropagation();

    if (!hitResult) return;

    if (event.button === 0 && toolMode === 'place') {
      const success = interactionSystem.placeVoxel(hitResult, VoxelType.BRICK);
      if (success) {
        setChunks([...chunkManager.getChunks()]);
        setPlacedBlockCount(chunkManager.getPlacedVoxelCount());
      }
    } else if (event.button === 2 && toolMode === 'remove') {
      const success = interactionSystem.removeVoxel(hitResult);
      if (success) {
        setChunks([...chunkManager.getChunks()]);
        setPlacedBlockCount(chunkManager.getPlacedVoxelCount());
      }
    }

    if (event.button === 0 || event.button === 2) {
      setIsDragging(true);
    }
  }, [hitResult, toolMode, interactionSystem, chunkManager, setPlacedBlockCount]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleContextMenu = useCallback((event: any) => {
    event.preventDefault();
  }, []);

  return (
    <group
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      <Lighting dayNightState={dayNightState} />
      <DynamicSky dayNightState={dayNightState} />

      {dayNightState.timeOfDay > 0.75 || dayNightState.timeOfDay < 0.2 ? (
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      ) : null}

      {chunks.map((chunk) => (
        <ChunkMesh
          key={`${chunk.x},${chunk.z}`}
          chunk={chunk}
          chunkManager={chunkManager}
          interactionSystem={interactionSystem}
        />
      ))}

      <HighlightBox hit={hitResult} toolMode={toolMode} />
      <Particles particles={particles} />

      <OrbitControls
        makeDefault
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2 - 0.1}
        target={[0, 12, 0]}
      />
    </group>
  );
}

export default function World() {
  return (
    <Canvas
      shadows
      camera={{ position: [20, 25, 30], fov: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <WorldContent />
    </Canvas>
  );
}
