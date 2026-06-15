import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useMoleculeStore } from '@/store/useMoleculeStore';
import { EditorManager } from '@/molecule-editor/EditorManager';
import {
  ELEMENT_COLORS,
  ELEMENT_RADII,
  calculateDistance,
} from '@/molecule-core/MoleculeModel';
import type { ElementType, BondType } from '@/molecule-core/MoleculeModel';

function AtomMesh({ atom, isSelected, isMeasured }: { atom: { id: string; element: ElementType; x: number; y: number; z: number }; isSelected: boolean; isMeasured: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const color = ELEMENT_COLORS[atom.element] || '#808080';
  const radius = ELEMENT_RADII[atom.element] || 0.4;

  useFrame((state) => {
    if (glowRef.current && isSelected) {
      const t = state.clock.elapsedTime;
      const pulse = 1 + 0.15 * Math.sin(t * Math.PI * 2 / 0.3);
      glowRef.current.scale.setScalar(pulse);
    }
    if (glowRef.current) {
      glowRef.current.visible = isSelected;
    }
  });

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    EditorManager.handleSceneClick(atom.id, { x: atom.x, y: atom.y, z: atom.z });
  }, [atom.id, atom.x, atom.y, atom.z]);

  return (
    <group position={[atom.x, atom.y, atom.z]}>
      <mesh ref={meshRef} onClick={handleClick}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.1}
          emissive={isMeasured ? '#00e5ff' : '#000000'}
          emissiveIntensity={isMeasured ? 0.3 : 0}
        />
      </mesh>
      {isSelected && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[radius + 0.12, 32, 32]} />
          <meshStandardMaterial
            color="#ffcc00"
            transparent
            opacity={0.25}
            emissive="#ffcc00"
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}

function BondMesh({ atom1, atom2, bondType }: { atom1: { x: number; y: number; z: number }; atom2: { x: number; y: number; z: number }; bondType: BondType }) {
  const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
  const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const orientation = new THREE.Matrix4();
  orientation.lookAt(start, end, new THREE.Vector3(0, 1, 0));
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(orientation);

  const bondRadius = 0.06;
  const offsets: number[] = [];

  if (bondType === 'single') {
    offsets.push(0);
  } else if (bondType === 'double') {
    offsets.push(-0.05, 0.05);
  } else if (bondType === 'triple') {
    offsets.push(-0.08, 0, 0.08);
  }

  const perpendicular = useMemo(() => {
    const dir = direction.clone().normalize();
    let perp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(dir.dot(perp)) > 0.9) {
      perp = new THREE.Vector3(1, 0, 0);
    }
    perp.crossVectors(dir, perp).normalize();
    return perp;
  }, [direction.x, direction.y, direction.z]);

  return (
    <group>
      {offsets.map((offset, i) => {
        const offsetVec = perpendicular.clone().multiplyScalar(offset);
        const pos = mid.clone().add(offsetVec);
        return (
          <mesh key={i} position={[pos.x, pos.y, pos.z]} quaternion={[quaternion.x, quaternion.y, quaternion.z, quaternion.w]}>
            <cylinderGeometry args={[bondRadius, bondRadius, length, 8]} />
            <meshStandardMaterial color="#a0a0a0" roughness={0.5} metalness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

function MeasureLine({ atomId1, atomId2 }: { atomId1: string; atomId2: string }) {
  const molecule = useMoleculeStore((s) => s.molecule);
  const atom1 = molecule.atoms.find((a) => a.id === atomId1);
  const atom2 = molecule.atoms.find((a) => a.id === atomId2);
  if (!atom1 || !atom2) return null;

  const dist = calculateDistance(atom1, atom2);
  const mid = {
    x: (atom1.x + atom2.x) / 2,
    y: (atom1.y + atom2.y) / 2 + 0.3,
    z: (atom1.z + atom2.z) / 2,
  };

  return (
    <group>
      <Line
        points={[[atom1.x, atom1.y, atom1.z], [atom2.x, atom2.y, atom2.z]]}
        color="#00e5ff"
        lineWidth={1.5}
        dashed
        dashSize={0.15}
        gapSize={0.1}
      />
      <Text
        position={[mid.x, mid.y, mid.z]}
        fontSize={0.2}
        color="#12122a"
        anchorX="center"
        anchorY="bottom"
      >
        {dist.toFixed(2)} Å
        <meshBasicMaterial color="#ffffff" />
      </Text>
      <mesh position={[mid.x, mid.y - 0.07, mid.z]}>
        <planeGeometry args={[0.7, 0.22]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function AxisHelper() {
  const len = 1.5;
  return (
    <group position={[-3.5, -2.5, 0]}>
      <Line points={[[0, 0, 0], [len, 0, 0]]} color="red" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, len, 0]]} color="green" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 0, len]]} color="blue" lineWidth={2} />
      <Text position={[len + 0.2, 0, 0]} fontSize={0.2} color="#ff4444">
        X
      </Text>
      <Text position={[0, len + 0.2, 0]} fontSize={0.2} color="#44ff44">
        Y
      </Text>
      <Text position={[0, 0, len + 0.2]} fontSize={0.2} color="#4444ff">
        Z
      </Text>
    </group>
  );
}

function SceneContent() {
  const molecule = useMoleculeStore((s) => s.molecule);
  const selectedAtomId = useMoleculeStore((s) => s.selectedAtomId);
  const measurePoints = useMoleculeStore((s) => s.measurePoints);
  const focusAtomId = useMoleculeStore((s) => s.focusAtomId);

  const handleBackgroundClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const store = useMoleculeStore.getState();
    const { activeTool } = store;

    if (activeTool === 'addAtom') {
      const point = e.point;
      if (point) {
        EditorManager.handleSceneClick(null, { x: point.x, y: point.y, z: point.z });
      }
    } else if (activeTool === 'select') {
      EditorManager.handleSceneClick(null, null);
    }
  }, []);

  const atomMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; z: number }>();
    for (const atom of molecule.atoms) {
      map.set(atom.id, { x: atom.x, y: atom.y, z: atom.z });
    }
    return map;
  }, [molecule.atoms]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />
      <directionalLight position={[-5, -3, -5]} intensity={0.4} />

      <mesh onClick={handleBackgroundClick} visible={false}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {molecule.atoms.map((atom) => (
        <AtomMesh
          key={atom.id}
          atom={atom}
          isSelected={atom.id === selectedAtomId}
          isMeasured={measurePoints.includes(atom.id)}
        />
      ))}

      {molecule.bonds.map((bond) => {
        const a1 = atomMap.get(bond.atom1Id);
        const a2 = atomMap.get(bond.atom2Id);
        if (!a1 || !a2) return null;
        return (
          <BondMesh
            key={bond.id}
            atom1={a1}
            atom2={a2}
            bondType={bond.type}
          />
        );
      })}

      {measurePoints.length === 2 && (
        <MeasureLine atomId1={measurePoints[0]} atomId2={measurePoints[1]} />
      )}

      <AxisHelper />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.8}
        zoomSpeed={0.8}
      />
    </>
  );
}

function BackgroundGradient() {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor('#0a0a2e');
  }, [gl]);
  return null;
}

export default function SceneRenderer() {
  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 45, near: 0.1, far: 1000 }}
      style={{ background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 100%)' }}
      onPointerMissed={() => {
        const store = useMoleculeStore.getState();
        if (store.activeTool === 'select') {
          EditorManager.handleSceneClick(null, null);
        }
      }}
    >
      <BackgroundGradient />
      <SceneContent />
    </Canvas>
  );
}
