import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../stores/appStore';
import { hexToRgb } from '../../utils/semanticAnalyzer';

const PARTICLE_COUNT = 4000;
const SPHERE_RADIUS = 180;

interface ParticleCloudProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function ParticleCloud({ canvasRef }: ParticleCloudProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particleParams = useAppStore(state => state.particleParams);
  const particleSize = useAppStore(state => state.particleSize);

  const { positions, phases, frequencies, baseAngles } = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const phases: number[] = [];
    const frequencies: number[] = [];
    const baseAngles: number[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();

      const x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = SPHERE_RADIUS * Math.cos(phi);

      positions.push(new THREE.Vector3(x, y, z));
      phases.push(Math.random() * Math.PI * 2);
      frequencies.push(0.5 + Math.random() * 1.5);
      baseAngles.push(theta);
    }

    return { positions, phases, frequencies, baseAngles };
  }, []);

  const colors = useMemo(() => {
    const c = new Float32Array(PARTICLE_COUNT * 3);
    const warmColor = hexToRgb('#ff9f43');
    const coolColor = hexToRgb('#0abde3');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = 0.5 + (Math.random() - 0.5) * 0.2;
      const color = new THREE.Color().lerpColors(coolColor, warmColor, t);
      c[i * 3] = color.r;
      c[i * 3 + 1] = color.g;
      c[i * 3 + 2] = color.b;
    }
    return c;
  }, []);

  const warmColor = useMemo(() => hexToRgb('#ff9f43'), []);
  const coolColor = useMemo(() => hexToRgb('#0abde3'), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    const { hueShift, motionIntensity, aggregation } = particleParams;
    const colorT = (hueShift + 1) / 2;
    const rotationSpeed = motionIntensity;
    const jitterAmount = 0.5 + motionIntensity * 2;
    const flickerSpeed = 1 + motionIntensity * 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const basePos = positions[i];
      const phase = phases[i];
      const freq = frequencies[i];
      const baseAngle = baseAngles[i];

      const angle = baseAngle + time * rotationSpeed * 0.3;
      const radius = SPHERE_RADIUS * aggregation;

      const phi = Math.acos(2 * (i / PARTICLE_COUNT) - 1);
      const x = radius * Math.sin(phi) * Math.cos(angle);
      const y = radius * Math.sin(phi) * Math.sin(angle);
      const z = radius * Math.cos(phi);

      const jitterX = Math.sin(time * freq * 2 + phase) * jitterAmount;
      const jitterY = Math.cos(time * freq * 1.5 + phase * 1.3) * jitterAmount;
      const jitterZ = Math.sin(time * freq * 1.7 + phase * 0.7) * jitterAmount;

      dummy.position.set(
        x + jitterX,
        y + jitterY,
        z + jitterZ
      );

      const scale = particleSize / 4;
      dummy.scale.setScalar(scale);
      dummy.rotation.set(
        time * freq * 0.5,
        time * freq * 0.3,
        time * freq * 0.7
      );

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const flicker = 0.7 + 0.3 * Math.sin(time * flickerSpeed + phase);
      const particleColorT = Math.max(0, Math.min(1, colorT + (Math.random() - 0.5) * 0.1));
      const color = new THREE.Color().lerpColors(coolColor, warmColor, particleColorT);
      meshRef.current.setColorAt(i, color);
      (meshRef.current.material as THREE.MeshStandardMaterial).opacity = flicker;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, PARTICLE_COUNT]}
      frustumCulled={false}
    >
      <boxGeometry args={[4, 4, 4]} />
      <meshStandardMaterial
        transparent
        opacity={0.85}
        metalness={0.3}
        roughness={0.2}
        emissiveIntensity={0.5}
      />
      <instancedBufferAttribute
        attach="instanceColor"
        args={[colors, 3]}
      />
    </instancedMesh>
  );
}
