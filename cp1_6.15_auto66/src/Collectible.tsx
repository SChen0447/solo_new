import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, CollectibleItem, Vec3 } from './store';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: string;
}

interface CollectibleMeshProps {
  item: CollectibleItem;
  onPickup: () => void;
}

function CollectibleMesh({ item, onPickup }: CollectibleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleStartRef = useRef<number | null>(null);
  const flashlightPos = useGameStore((s) => s.flashlight.position);
  const flashlightRot = useGameStore((s) => s.flashlight.rotation);
  const pickedUpRef = useRef(false);

  const particleGeometry = useMemo(
    () => new THREE.SphereGeometry(0.05, 6, 6),
    []
  );

  const spawnParticles = () => {
    const newParticles: Particle[] = [];
    const count = 32;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1.5 + Math.random() * 1.5;
      newParticles.push({
        position: new THREE.Vector3(...item.position),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        ),
        life: 0.5,
        maxLife: 0.5,
        color: item.color,
      });
    }
    setParticles(newParticles);
    particleStartRef.current = performance.now();
  };

  useFrame((state, delta) => {
    if (item.collected && !pickedUpRef.current) {
      pickedUpRef.current = true;
      spawnParticles();
    }

    if (meshRef.current && !item.collected) {
      meshRef.current.rotation.y += delta * 0.8;
      meshRef.current.position.y =
        item.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }

    if (glowRef.current && !item.collected) {
      glowRef.current.rotation.y = meshRef.current?.rotation.y || 0;
      glowRef.current.position.copy(meshRef.current?.position || new THREE.Vector3(...item.position));

      const camForward = new THREE.Vector3();
      camera.getWorldDirection(camForward);
      const flashlightDir = new THREE.Vector3(
        Math.sin(flashlightRot[1]) * Math.cos(flashlightRot[0]),
        Math.sin(flashlightRot[0]),
        Math.cos(flashlightRot[1]) * Math.cos(flashlightRot[0])
      );

      const toItem = new THREE.Vector3()
        .fromArray(item.position)
        .sub(new THREE.Vector3(...flashlightPos))
        .normalize();
      const flashlightCos = flashlightDir.dot(toItem);
      const threshold = Math.cos(Math.PI / 8);

      const pulseBase = flashlightCos > threshold ? 1.1 : 1.0;
      const pulse =
        pulseBase + 0.1 * Math.sin(state.clock.elapsedTime * (Math.PI * 2) / 0.6);

      const targetScale = flashlightCos > threshold ? pulse : 1.0;
      glowRef.current.scale.setScalar(
        glowRef.current.scale.x + (targetScale * 1.6 - glowRef.current.scale.x) * 0.2
      );

      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = flashlightCos > threshold ? 0.7 : 0.35;
      glowMat.opacity += (targetOpacity - glowMat.opacity) * 0.15;
    }

    if (particles.length > 0 && particleStartRef.current !== null) {
      const elapsed = (performance.now() - particleStartRef.current) / 1000;
      if (elapsed > 0.5) {
        setParticles([]);
        onPickup();
      } else {
        setParticles((prev) =>
          prev.map((p) => ({
            ...p,
            position: p.position
              .clone()
              .add(p.velocity.clone().multiplyScalar(delta)),
            velocity: p.velocity.clone().multiplyScalar(0.92),
            life: p.life - delta,
          }))
        );
      }
    }

    if (!item.collected && !pickedUpRef.current) {
      const dist = camera.position.distanceTo(
        new THREE.Vector3(...item.position)
      );
      if (dist < 0.4) {
        pickedUpRef.current = true;
        useGameStore.getState().collectItem(item.id);
        useGameStore.getState().addScorePopup(
          window.innerWidth * 0.08,
          window.innerHeight * 0.08
        );
      }
    }
  });

  if (item.collected && particles.length === 0) return null;

  return (
    <group>
      {!item.collected && (
        <>
          <mesh ref={meshRef} position={item.position}>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial
              color={item.color}
              emissive={item.color}
              emissiveIntensity={0.8}
              roughness={0.2}
              metalness={0.6}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={glowRef} position={item.position}>
            <octahedronGeometry args={[0.42, 0]} />
            <meshBasicMaterial
              color={item.color}
              transparent
              opacity={0.35}
              side={THREE.BackSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            position={item.position}
            color={item.color}
            intensity={1.2}
            distance={3}
            decay={2}
          />
        </>
      )}
      {particles.map((p, i) => (
        <mesh
          key={i}
          position={p.position.toArray() as Vec3}
          scale={Math.max(0, p.life / p.maxLife)}
        >
          <primitive object={particleGeometry} attach="geometry" />
          <meshBasicMaterial
            color={p.color}
            transparent
            opacity={Math.max(0, p.life / p.maxLife)}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function Collectibles() {
  const collectibles = useGameStore((s) => s.collectibles);

  return (
    <group>
      {collectibles.map((item) => (
        <CollectibleMesh
          key={item.id}
          item={item}
          onPickup={() => {}}
        />
      ))}
    </group>
  );
}
