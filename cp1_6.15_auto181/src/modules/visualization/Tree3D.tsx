import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { usePlantStore } from '../../stores/plantStore';
import { CARE_TYPE_COLORS } from '../../types';
import type { CareEntry } from '../../types';

function Trunk({ height }: { height: number }) {
  return (
    <mesh position={[0, height / 2 - 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.08, 0.1, height, 8]} />
      <meshStandardMaterial color="#5d4037" roughness={0.8} />
    </mesh>
  );
}

function Branch({
  startY,
  angle,
  length,
  color,
  leafCount
}: {
  startY: number;
  angle: number;
  length: number;
  color: string;
  leafCount: number;
}) {
  const group = useRef<THREE.Group>(null);
  const direction = new THREE.Vector3(Math.cos(angle), 0.3, Math.sin(angle)).normalize();
  const endPoint = new THREE.Vector3(
    direction.x * length,
    startY + direction.y * length,
    direction.z * length
  );
  const midPoint = new THREE.Vector3(
    direction.x * length * 0.5,
    startY + direction.y * length * 0.5,
    direction.z * length * 0.5
  );

  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

  const leaves = useMemo(() => {
    const result = [];
    for (let i = 0; i < Math.max(1, leafCount); i++) {
      const offsetAngle = (i / Math.max(1, leafCount)) * Math.PI * 2;
      const leafOffset = new THREE.Vector3(
        Math.cos(offsetAngle) * 0.08,
        (Math.random() - 0.5) * 0.1,
        Math.sin(offsetAngle) * 0.08
      );
      result.push(
        <mesh key={i} position={endPoint.clone().add(leafOffset)}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color={`hsl(${100 + i * 10}, 60%, ${40 + i * 3}%)`}
            roughness={0.6}
          />
        </mesh>
      );
    }
    return result;
  }, [leafCount, endPoint.x, endPoint.y, endPoint.z]);

  return (
    <group ref={group}>
      <mesh position={midPoint} quaternion={quaternion}>
        <cylinderGeometry args={[0.03, 0.025, length, 6]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {leaves}
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.01, 0]} receiveShadow>
      <circleGeometry args={[3, 32]} />
      <meshStandardMaterial color="#2e2e2e" roughness={1} />
    </mesh>
  );
}

function TreeScene() {
  const { selectedPlantId, entries, plants } = usePlantStore();
  const plant = plants.find((p) => p.id === selectedPlantId);

  const plantEntries = useMemo(() => {
    if (!selectedPlantId) return [];
    return entries
      .filter((e) => e.plantId === selectedPlantId)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
  }, [selectedPlantId, entries]);

  const trunkHeight = useMemo(() => {
    const count = plantEntries.length;
    return 0.5 + Math.floor(count / 3) * 0.5;
  }, [plantEntries.length]);

  const branches = useMemo(() => {
    return plantEntries.map((entry: CareEntry, idx: number) => {
      const baseY = -2 + (trunkHeight * (idx + 1)) / (plantEntries.length + 1);
      const angle = (idx * 137.5 * Math.PI) / 180;
      const length = 0.3 + ((idx * 37) % 50) / 100;
      return {
        id: entry.id,
        startY: baseY,
        angle,
        length: Math.min(0.8, length),
        color: CARE_TYPE_COLORS[entry.type],
        leafCount: Math.max(1, Math.floor((plant?.health ?? 100) / 10))
      };
    });
  }, [plantEntries, trunkHeight, plant?.health]);

  if (!selectedPlantId || plantEntries.length === 0) {
    return (
      <>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <Ground />
        <Trunk height={0.5} />
        <OrbitControls
          enableDamping
          dampingFactor={0.9}
          minDistance={0.5}
          maxDistance={3}
          target={[0, -1, 0]}
        />
      </>
    );
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[-3, 2, -3]} intensity={0.3} color="#88ccff" />
      <Ground />
      <Trunk height={trunkHeight} />
      {branches.map((b) => (
        <Branch key={b.id} {...b} />
      ))}
      <OrbitControls
        enableDamping
        dampingFactor={0.9}
        minDistance={0.5}
        maxDistance={3}
        target={[0, trunkHeight / 2 - 1.5, 0]}
      />
    </>
  );
}

export default function Tree3D() {
  return (
    <Canvas
      camera={{ position: [4, 3, 4], fov: 50 }}
      style={{ width: '100%', height: '100%', background: '#121212' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      performance={{ min: 0.5 }}
    >
      <color attach="background" args={['#121212']} />
      <fog attach="fog" args={['#121212', 5, 12]} />
      <TreeScene />
    </Canvas>
  );
}
