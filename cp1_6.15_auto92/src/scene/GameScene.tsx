import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, type MagicType } from '../store/gameStore';
import { getMagicConfig } from '../game/MagicSystem';
import {
  PLAYER_POSITION,
  AI_POSITION,
  PLATFORM_RADIUS,
  PLATFORM_GAP,
} from '../game/GameManager';

function Platform({
  position,
  color,
  edgeColor,
}: {
  position: THREE.Vector3;
  color: string;
  edgeColor: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const edgeRef = useRef<THREE.LineSegments>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => new THREE.CylinderGeometry(PLATFORM_RADIUS, PLATFORM_RADIUS, 0.3, 64, 1, false, 0, Math.PI), []);
  const edgeGeometry = useMemo(() => {
    const edges = new THREE.EdgesGeometry(new THREE.CylinderGeometry(PLATFORM_RADIUS, PLATFORM_RADIUS, 0.3, 64, 1, false, 0, Math.PI));
    return edges;
  }, []);
  const glowGeometry = useMemo(() => new THREE.CylinderGeometry(PLATFORM_RADIUS + 0.2, PLATFORM_RADIUS + 0.2, 0.05, 64, 1, false, 0, Math.PI), []);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const pulse = 0.4 + Math.sin(clock.elapsedTime * 2) * 0.2;
      mat.opacity = pulse;
    }
  });

  return (
    <group position={[position.x, position.y - 0.1, position.z]}>
      <mesh ref={meshRef} geometry={geometry} rotation={[0, position.x < 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={0.5}
          roughness={0.1}
          metalness={0.3}
          clearcoat={0.8}
          transmission={0.3}
          thickness={0.5}
        />
      </mesh>
      <lineSegments ref={edgeRef} geometry={edgeGeometry} rotation={[0, position.x < 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
        <lineBasicMaterial color={edgeColor} linewidth={3} transparent opacity={0.9} />
      </lineSegments>
      <mesh ref={glowRef} geometry={glowGeometry} position={[0, 0.18, 0]} rotation={[0, position.x < 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
        <meshBasicMaterial color={edgeColor} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Character({
  position,
  color,
  isPlayer = true,
}: {
  position: THREE.Vector3;
  color: string;
  isPlayer?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const cloakRef = useRef<THREE.Mesh>(null);
  const staffRef = useRef<THREE.Mesh>(null);
  const orbRef = useRef<THREE.Mesh>(null);
  const offsetX = isPlayer
    ? useGameStore((s) => s.playerDodgeOffset)
    : useGameStore((s) => s.aiDodgeOffset);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.x = position.x + offsetX;
      groupRef.current.position.y = position.y + Math.sin(clock.elapsedTime * 2) * 0.05;
    }
    if (cloakRef.current) {
      cloakRef.current.rotation.y = Math.sin(clock.elapsedTime * 1.5) * 0.1;
    }
    if (orbRef.current) {
      const mat = orbRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.6 + Math.sin(clock.elapsedTime * 3) * 0.4;
      orbRef.current.position.y = 2.2 + Math.sin(clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      <mesh ref={cloakRef} position={[0, 0.6, 0]}>
        <coneGeometry args={[0.5, 1.4, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} transparent opacity={0.9} />
      </mesh>
      <mesh ref={headRef} position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshStandardMaterial color="#ffe4c4" roughness={0.6} />
      </mesh>
      <mesh ref={staffRef} position={[0.35, 1, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.03, 0.03, 1.6, 12]} />
        <meshStandardMaterial color="#4a3728" roughness={0.8} />
      </mesh>
      <mesh ref={orbRef} position={[0.45, 2.1, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <pointLight color={color} intensity={0.8} distance={4} position={[0.45, 2.1, 0]} />
    </group>
  );
}

function Shield({ active, color }: { active: boolean; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const aiOffset = useGameStore((s) => s.aiDodgeOffset);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.visible = active;
      if (active) {
        const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
        mat.opacity = 0.25 + Math.sin(clock.elapsedTime * 4) * 0.1;
        meshRef.current.rotation.y += 0.02;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[AI_POSITION.x + aiOffset, 1, AI_POSITION.z]}>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        roughness={0.1}
        metalness={0.1}
        transmission={0.6}
        thickness={1}
        clearcoat={1}
      />
    </mesh>
  );
}

function Afterimage({ position, endTime }: { position: THREE.Vector3; endTime: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const now = Date.now();
      const remaining = Math.max(0, (endTime - now) / 300);
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = remaining * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={[position.x, 0.6, position.z]}>
      <coneGeometry args={[0.5, 1.4, 8]} />
      <meshStandardMaterial color="#4488ff" transparent opacity={0.5} />
    </mesh>
  );
}

function Projectile({
  type,
  position,
}: {
  type: MagicType;
  position: THREE.Vector3;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Points>(null);
  const config = getMagicConfig(type);

  const trailGeometry = useMemo(() => {
    const positions = new Float32Array(20 * 3);
    const colors = new Float32Array(20 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  const trailPositions: THREE.Vector3[] = useMemo(() => [], []);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.rotation.x += 0.1;
      groupRef.current.rotation.y += 0.15;
    }
    if (coreRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 10) * 0.15;
      coreRef.current.scale.setScalar(scale * config.projectileSize);
    }

    if (trailRef.current) {
      const posAttr = trailRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colorAttr = trailRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;

      trailPositions.unshift(position.clone());
      if (trailPositions.length > 20) trailPositions.pop();

      for (let i = 0; i < 20; i++) {
        if (i < trailPositions.length) {
          const p = trailPositions[i];
          posAttr.setXYZ(i, p.x, p.y, p.z);
          const alpha = 1 - i / 20;
          const c = new THREE.Color(config.color);
          colorAttr.setXYZ(i, c.r * alpha, c.g * alpha, c.b * alpha);
        }
      }
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <mesh ref={coreRef}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={config.color} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.3, 16, 16]} />
          <meshBasicMaterial color={config.emissiveColor} transparent opacity={0.3} />
        </mesh>
        <pointLight color={config.color} intensity={config.glowIntensity} distance={5} />
      </group>
      <points ref={trailRef} geometry={trailGeometry}>
        <pointsMaterial size={0.1} vertexColors transparent opacity={0.8} sizeAttenuation />
      </points>
    </>
  );
}

function ParticleMesh({
  position,
  color,
  life,
  maxLife,
  size,
}: {
  position: THREE.Vector3;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(position);
      const alpha = Math.max(0, life / maxLife);
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = alpha;
      meshRef.current.scale.setScalar(alpha * size);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={1} />
    </mesh>
  );
}

function ExplosionRing({ position, color, timestamp }: { position: THREE.Vector3; color: string; timestamp: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const elapsed = (Date.now() - timestamp) / 800;
      const progress = Math.min(1, elapsed);
      const scale = 0.1 + progress * 4;
      meshRef.current.scale.setScalar(scale);
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - progress) * 0.6;
    }
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.8, 1, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

function SceneContent() {
  const projectiles = useGameStore((s) => s.projectiles);
  const particles = useGameStore((s) => s.particles);
  const explosions = useGameStore((s) => s.explosions);
  const aiShieldActive = useGameStore((s) => s.aiShieldActive);
  const aiShieldColor = useGameStore((s) => s.aiShieldColor);
  const afterimages = useGameStore((s) => s.afterimages);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} color="#ffffff" />
      <directionalLight position={[-5, 8, -5]} intensity={0.6} color="#8888ff" />
      <pointLight position={[PLAYER_POSITION.x, 2, PLAYER_POSITION.z]} color="#4488ff" intensity={1} distance={10} />
      <pointLight position={[AI_POSITION.x, 2, AI_POSITION.z]} color="#ff4466" intensity={1} distance={10} />

      <fog attach="fog" args={['#0a1a3e', 10, 35]} />

      <Platform position={PLAYER_POSITION} color="#2244aa" edgeColor="#00ff88" />
      <Platform position={AI_POSITION} color="#aa2244" edgeColor="#ff4488" />

      <Character position={PLAYER_POSITION} color="#4488ff" isPlayer={true} />
      <Character position={AI_POSITION} color="#ff4466" isPlayer={false} />

      <Shield active={aiShieldActive} color={aiShieldColor} />

      {afterimages.map((a) => (
        <Afterimage key={a.id} position={a.position} endTime={a.endTime} />
      ))}

      {projectiles.map((p) => (
        <Projectile key={p.id} type={p.type} position={p.position} />
      ))}

      {particles.map((p) => (
        <ParticleMesh
          key={p.id}
          position={p.position}
          color={p.color}
          life={p.life}
          maxLife={p.maxLife}
          size={p.size}
        />
      ))}

      {explosions.map((e) => (
        <ExplosionRing key={e.id} position={e.position} color={e.color} timestamp={e.timestamp} />
      ))}
    </>
  );
}

export default function GameScene() {
  return (
    <Canvas
      camera={{ position: [0, 6, 16], fov: 50, near: 0.1, far: 100 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a1a3e 100%)',
      }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
    >
      <SceneContent />
    </Canvas>
  );
}
