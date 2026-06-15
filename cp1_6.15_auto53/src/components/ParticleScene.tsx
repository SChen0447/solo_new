import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEmotionStore } from '../stores/emotionStore';

const PARTICLE_COUNT = 2000;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function tempToColor(temp: number): THREE.Color {
  const t = Math.max(0, Math.min(1, temp / 100));
  const cold = new THREE.Color(0x3a7bd5);
  const warm = new THREE.Color(0xe94560);
  const mid = new THREE.Color(0x6c63ff);
  if (t < 0.5) {
    return cold.clone().lerp(mid, t * 2);
  }
  return mid.clone().lerp(warm, (t - 0.5) * 2);
}

interface ParticleCloudProps {
  basePositions: Float32Array;
  baseSizes: Float32Array;
  basePhases: Float32Array;
}

const ParticleCloud: React.FC<ParticleCloudProps> = ({ basePositions, baseSizes, basePhases }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const targetOpacity = useEmotionStore((s) => s.opacity);
  const stepTransition = useEmotionStore((s) => s.stepTransition);
  const getParams = useEmotionStore((s) => () => s.currentParams);
  const { viewport } = useThree();

  const currentOpacity = useRef(1);
  const mouseNdc = useRef({ x: 0, y: 0 });
  const hovered = useRef(false);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseNdc.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNdc.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      hovered.current =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const elapsed = state.clock.elapsedTime;

    stepTransition(delta * 1000);
    const params = getParams();

    const targetOp = targetOpacity;
    currentOpacity.current = lerp(currentOpacity.current, targetOp, delta / 0.3);

    const cohesionFactor = 0.4 + (params.cohesion / 100) * 1.6;
    const rotationFactor = (params.rotationSpeed / 100) * 0.8;
    const rhythmFactor = (params.rhythm / 100) * 0.5;
    const baseColor = tempToColor(params.colorTemp);

    const mouseInfluence = hovered.current ? 0.1 : 0;
    const mouseOffsetX = mouseNdc.current.x * 2 * mouseInfluence;
    const mouseOffsetY = mouseNdc.current.y * 2 * mouseInfluence;

    const rotationAngle = elapsed * rotationFactor;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];

      const size = baseSizes[i];
      const phase = basePhases[i];

      let px = bx * cohesionFactor;
      let py = by * cohesionFactor;
      let pz = bz * cohesionFactor;

      const cosR = Math.cos(rotationAngle + phase * 0.5);
      const sinR = Math.sin(rotationAngle + phase * 0.5);
      const rx = px * cosR - pz * sinR;
      const rz = px * sinR + pz * cosR;
      px = rx;
      pz = rz;

      py += Math.sin(elapsed * 2 + phase * 6.28) * rhythmFactor * 0.3;

      px += mouseOffsetX;
      py += mouseOffsetY;

      dummy.position.set(px, py, pz);
      dummy.scale.setScalar(size);
      dummy.rotation.set(phase * 6.28 + elapsed * rotationFactor, elapsed * rotationFactor * 0.7, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const colorVariation = 0.7 + phase * 0.6;
      const color = baseColor.clone().multiplyScalar(colorVariation);
      color.r = Math.min(1, color.r);
      color.g = Math.min(1, color.g);
      color.b = Math.min(1, color.b);
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    if (mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.opacity = currentOpacity.current;
      mesh.material.transparent = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={0xffffff}
        transparent
        opacity={1}
        roughness={0.3}
        metalness={0.6}
      />
    </instancedMesh>
  );
};

const ParticleSceneInner: React.FC = () => {
  const { basePositions, baseSizes, basePhases } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const phases = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = Math.pow(Math.random(), 1 / 3) * 1.8;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 0.05 + Math.random() * 0.15;
      phases[i] = Math.random();
    }

    return { basePositions: positions, baseSizes: sizes, basePhases: phases };
  }, []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color={0xffffff} />
      <pointLight position={[-10, -5, 5]} intensity={0.4} color={0x6c63ff} />
      <pointLight position={[0, -10, -5]} intensity={0.3} color={0xe94560} />
      <ParticleCloud basePositions={basePositions} baseSizes={baseSizes} basePhases={basePhases} />
    </>
  );
};

const ParticleScene: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
      dpr={[1, 2]}
    >
      <ParticleSceneInner />
    </Canvas>
  );
};

export default ParticleScene;
