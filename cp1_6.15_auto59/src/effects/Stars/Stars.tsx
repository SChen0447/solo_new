import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../stores/appStore';

const STAR_COUNT = 200;
const STAR_FIELD_RADIUS = 800;

export default function Stars() {
  const pointsRef = useRef<THREE.Points>(null);
  const backgroundBrightness = useAppStore(state => state.backgroundBrightness);

  const [positions, sizes, phases] = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const siz = new Float32Array(STAR_COUNT);
    const pha: number[] = [];

    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = STAR_FIELD_RADIUS * (0.5 + Math.random() * 0.5);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = radius * Math.cos(phi);

      siz[i] = 1 + Math.random() * 2;
      pha.push(Math.random() * Math.PI * 2);
    }

    return [pos, siz, pha];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const time = state.clock.elapsedTime;
    pointsRef.current.rotation.y += 0.0003;

    const geometry = pointsRef.current.geometry;
    const opacityAttribute = geometry.getAttribute('opacity') as THREE.BufferAttribute;

    for (let i = 0; i < STAR_COUNT; i++) {
      const baseOpacity = 0.2 + backgroundBrightness * 0.3;
      const twinkle = 0.3 * Math.sin(time * 2 + phases[i]);
      opacityAttribute.setX(i, Math.max(0.1, Math.min(0.8, baseOpacity + twinkle)));
    }
    opacityAttribute.needsUpdate = true;
  });

  const opacities = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      arr[i] = 0.3 + Math.random() * 0.2;
    }
    return arr;
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={STAR_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={STAR_COUNT}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-opacity"
          count={STAR_COUNT}
          array={opacities}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={2}
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
