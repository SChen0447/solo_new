import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAudioStore } from './store';

const GRID_SIZE = 20;
const BAR_COUNT = GRID_SIZE * GRID_SIZE;
const BAR_BASE_SIZE = 0.3;
const BAR_SPACING = 0.5;
const MIN_HEIGHT = 0.1;
const MAX_HEIGHT = 4;
const COLOR_BOTTOM = new THREE.Color('#0d1b2a');
const COLOR_TOP = new THREE.Color('#00d4aa');

interface SonicTerrainProps {
  frequencyData: Uint8Array;
  volume: number;
  bassGain: number;
  trebleGain: number;
  isPlaying: boolean;
}

function SonicTerrain({ frequencyData, volume, bassGain, trebleGain, isPlaying }: SonicTerrainProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const heightsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const targetHeightsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const gridOffset = (GRID_SIZE * BAR_SPACING) / 2 - BAR_SPACING / 2;

  useEffect(() => {
    if (!meshRef.current) return;

    for (let i = 0; i < BAR_COUNT; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;

      dummy.position.set(
        col * BAR_SPACING - gridOffset,
        MIN_HEIGHT / 2,
        row * BAR_SPACING - gridOffset
      );
      dummy.scale.set(BAR_BASE_SIZE, MIN_HEIGHT, BAR_BASE_SIZE);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);

      const heightNormalized = MIN_HEIGHT / MAX_HEIGHT;
      tempColor.lerpColors(COLOR_BOTTOM, COLOR_TOP, heightNormalized);
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [dummy, gridOffset, tempColor]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const bassBoost = Math.max(0, bassGain / 12) * 2;
    const trebleBoost = Math.max(0, trebleGain / 12);
    const volumeScale = Math.max(0, Math.min(1.5, volume));
    const lerpFactor = Math.min(1, delta * 10);

    for (let i = 0; i < BAR_COUNT; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;

      const freqIndex = Math.floor((i / BAR_COUNT) * frequencyData.length);
      let freqValue = frequencyData[freqIndex] || 0;

      const isLowFreq = i < BAR_COUNT * 0.3;
      const isHighFreq = i > BAR_COUNT * 0.7;

      if (isLowFreq && bassBoost > 0) {
        freqValue = Math.min(255, freqValue * (1 + bassBoost));
      }

      if (isHighFreq && trebleBoost > 0) {
        const jitter = (Math.random() - 0.5) * trebleBoost * 30;
        freqValue = Math.max(0, Math.min(255, freqValue + jitter));
      }

      const normalizedValue = freqValue / 255;
      const targetHeight = MIN_HEIGHT + normalizedValue * (MAX_HEIGHT - MIN_HEIGHT) * volumeScale;

      targetHeightsRef.current[i] = targetHeight;

      const currentHeight = heightsRef.current[i];
      const newHeight = currentHeight + (targetHeight - currentHeight) * lerpFactor;
      heightsRef.current[i] = newHeight;

      dummy.position.set(
        col * BAR_SPACING - gridOffset,
        newHeight / 2,
        row * BAR_SPACING - gridOffset
      );
      dummy.scale.set(BAR_BASE_SIZE, newHeight, BAR_BASE_SIZE);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);

      const heightNormalized = Math.min(1, (newHeight - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT));
      tempColor.lerpColors(COLOR_BOTTOM, COLOR_TOP, heightNormalized);
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BAR_COUNT]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.3} metalness={0.6} />
    </instancedMesh>
  );
}

function StarParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 5000;

  const [positions] = useState(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 30 + Math.random() * 20;

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);
    }
    return pos;
  });

  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#ffffff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function SceneContent() {
  const { frequencyData, volume, bassGain, trebleGain, isPlaying, autoRotate, setAutoRotate } =
    useAudioStore();

  const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setAutoRotate(true);
  };

  const handleStart = () => {
    if (autoRotate) {
      setAutoRotate(false);
    }
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#00d4aa" />

      <group onDoubleClick={handleDoubleClick}>
        <SonicTerrain
          frequencyData={frequencyData}
          volume={volume}
          bassGain={bassGain}
          trebleGain={trebleGain}
          isPlaying={isPlaying}
        />
      </group>

      <StarParticles />

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        autoRotate={autoRotate}
        autoRotateSpeed={0.3 * 60}
        minDistance={8}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.2}
        onStart={handleStart}
      />
    </>
  );
}

export function SceneManager() {
  return (
    <Canvas
      camera={{ position: [0, 8, 12], fov: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 100%)' }}
    >
      <fog attach="fog" args={['#0a0a1a', 20, 60]} />
      <SceneContent />
    </Canvas>
  );
}
