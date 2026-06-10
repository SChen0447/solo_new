import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RippleEffectProps {
  position: [number, number, number];
  color: string;
  startTime: number;
}

const RippleEffect: React.FC<RippleEffectProps> = ({ position, color, startTime }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const duration = 500;

  useFrame(() => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const radius = 0.3 + progress * 2.5;

    if (ringRef.current) {
      ringRef.current.scale.set(radius, radius, radius);
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0.8 * (1 - progress);
    }
  });

  return (
    <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

export default RippleEffect;
