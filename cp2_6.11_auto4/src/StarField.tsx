import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const StarField: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(200 * 3);
    const sz = new Float32Array(200);
    for (let i = 0; i < 200; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      sz[i] = 1 + Math.random() * 2;
    }
    return { positions: pos, sizes: sz };
  }, []);

  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0d0d2b');
    gradient.addColorStop(1, '#0b0015');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.005;
    }
  });

  return (
    <>
      <mesh position={[0, 0, -40]}>
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial map={gradientTexture} side={THREE.DoubleSide} />
      </mesh>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizes, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#ffffff"
          size={0.15}
          sizeAttenuation
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </points>
    </>
  );
};

export default StarField;
