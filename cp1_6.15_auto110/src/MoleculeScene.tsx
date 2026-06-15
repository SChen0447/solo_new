import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMoleculeStore, DisplayMode } from './store';
import { getAtomColor, getAtomRadius, Atom, Bond } from './moleculeParser';

const BALL_STICK_SCALE = 0.35;
const SPACE_FILL_SCALE = 0.7;
const BOND_RADIUS = 0.08;
const HIGHLIGHT_COLOR = '#00d4aa';
const HIGHLIGHT_THICKNESS = 0.06;
const PULSE_PERIOD = 1.2;

function getDisplayRadius(element: string, mode: DisplayMode): number {
  const base = getAtomRadius(element);
  if (mode === 'ball-stick') {
    return base * (BALL_STICK_SCALE / getAtomRadius('C'));
  }
  return base * (SPACE_FILL_SCALE / getAtomRadius('C'));
}

interface HighlightRingProps {
  position: [number, number, number];
  radius: number;
}

function HighlightRing({ position, radius }: HighlightRingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const phase = (t % PULSE_PERIOD) / PULSE_PERIOD;
    const alpha = 0.3 + 0.5 * Math.sin(phase * Math.PI * 2 - Math.PI / 2);
    if (materialRef.current) {
      materialRef.current.opacity = alpha;
    }
    if (meshRef.current) {
      const s = 1 + 0.08 * Math.sin(phase * Math.PI * 2);
      meshRef.current.scale.set(s, s, s);
    }
  });

  const ringRadius = radius + HIGHLIGHT_THICKNESS / 2;

  return (
    <mesh ref={meshRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[ringRadius, ringRadius + HIGHLIGHT_THICKNESS, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color={HIGHLIGHT_COLOR}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

interface AtomMeshProps {
  atom: Atom;
  isSelected: boolean;
  onClick: (id: number) => void;
}

function AtomMesh({ atom, isSelected, onClick }: AtomMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const mode = useMoleculeStore((s) => s.displayMode);
  const color = getAtomColor(atom.element);
  const targetRadius = getDisplayRadius(atom.element, mode);

  useFrame(() => {
    if (meshRef.current) {
      const current = meshRef.current.scale.x;
      const next = current + (targetRadius - current) * 0.15;
      meshRef.current.scale.set(next, next, next);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick(atom.id);
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[atom.x, atom.y, atom.z]}
        onClick={handleClick}
        scale={targetRadius}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      {isSelected && (
        <HighlightRing
          position={[atom.x, atom.y, atom.z]}
          radius={targetRadius}
        />
      )}
    </group>
  );
}

interface BondMeshProps {
  bond: Bond;
  atom1: Atom;
  atom2: Atom;
}

function BondMesh({ bond, atom1, atom2 }: BondMeshProps) {
  const { position, rotation, length } = useMemo(() => {
    const v1 = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
    const v2 = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(v2, v1);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    const euler = new THREE.Euler().setFromQuaternion(quat);
    return {
      position: [mid.x, mid.y, mid.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      length: len,
    };
  }, [atom1.x, atom1.y, atom1.z, atom2.x, atom2.y, atom2.z]);

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[BOND_RADIUS, BOND_RADIUS, length, 16]} />
      <meshStandardMaterial
        color="#ffffff"
        transparent
        opacity={0.7}
        roughness={0.5}
      />
    </mesh>
  );
}

interface MoleculeContentProps {
  controlsRef: React.MutableRefObject<any>;
}

function MoleculeContent({ controlsRef }: MoleculeContentProps) {
  const molecule = useMoleculeStore((s) => s.molecule);
  const showHydrogen = useMoleculeStore((s) => s.showHydrogen);
  const selectedAtomId = useMoleculeStore((s) => s.selectedAtomId);
  const selectAtom = useMoleculeStore((s) => s.selectAtom);
  const resetKey = useMoleculeStore((s) => s.cameraResetKey);
  const initialCamera = useMoleculeStore((s) => s.initialCamera);

  const visibleAtoms = useMemo(() => {
    return molecule.atoms.filter((a) => showHydrogen || a.element !== 'H');
  }, [molecule.atoms, showHydrogen]);

  const visibleAtomIds = useMemo(() => {
    return new Set(visibleAtoms.map((a) => a.id));
  }, [visibleAtoms]);

  const visibleBonds = useMemo(() => {
    return molecule.bonds.filter(
      (b) => visibleAtomIds.has(b.atom1) && visibleAtomIds.has(b.atom2)
    );
  }, [molecule.bonds, visibleAtomIds]);

  const atomMap = useMemo(() => {
    const map = new Map<number, Atom>();
    molecule.atoms.forEach((a) => map.set(a.id, a));
    return map;
  }, [molecule.atoms]);

  useEffect(() => {
    if (controlsRef.current && resetKey > 0) {
      const controls = controlsRef.current;
      const { distance, polar, azimuth, target } = initialCamera;
      const x = distance * Math.sin(polar) * Math.sin(azimuth);
      const y = distance * Math.cos(polar);
      const z = distance * Math.sin(polar) * Math.cos(azimuth);
      controls.object.position.set(x, y, z);
      controls.target.set(...target);
      controls.update();
    }
  }, [resetKey, controlsRef, initialCamera]);

  const handleSceneClick = () => {
    selectAtom(null);
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, -3, -5]} intensity={0.4} />

      <group onClick={handleSceneClick}>
        {visibleBonds.map((bond) => {
          const a1 = atomMap.get(bond.atom1);
          const a2 = atomMap.get(bond.atom2);
          if (!a1 || !a2) return null;
          return <BondMesh key={bond.id} bond={bond} atom1={a1} atom2={a2} />;
        })}

        {visibleAtoms.map((atom) => (
          <AtomMesh
            key={atom.id}
            atom={atom}
            isSelected={selectedAtomId === atom.id}
            onClick={selectAtom}
          />
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1.5}
        maxDistance={20}
      />
    </>
  );
}

export default function MoleculeScene() {
  const controlsRef = useRef<any>(null);

  return (
    <Canvas
      camera={{ position: [0, 4 * Math.sin(Math.PI / 6), 4 * Math.cos(Math.PI / 6)], fov: 50 }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera, gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.lookAt(0, 0, 0);
      }}
    >
      <MoleculeContent controlsRef={controlsRef} />
    </Canvas>
  );
}
