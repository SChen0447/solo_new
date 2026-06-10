import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Frequency, FREQUENCY_CONFIG } from './types';

interface CrystalProps {
  id: string;
  position: [number, number, number];
  frequency: Frequency;
  color: string;
  isSelected?: boolean;
  onClick?: (id: string) => void;
  onPointerDown?: (id: string, e: any) => void;
  onPointerUp?: (id: string, e: any) => void;
}

const Crystal: React.FC<CrystalProps> = ({
  id,
  position,
  frequency,
  color,
  isSelected = false,
  onClick,
  onPointerDown,
  onPointerUp
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const config = FREQUENCY_CONFIG[frequency];
  const scale = 1.2 * config.scale;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += (1 / (config.rotationSpeed * 60)) * Math.PI * 2;
      meshRef.current.rotation.x += (1 / (config.rotationSpeed * 60)) * Math.PI * 0.5;
    }
    if (glowRef.current) {
      const glowScale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      glowRef.current.scale.setScalar(scale * 1.3 * glowScale);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={glowRef}
        scale={scale * 1.3}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh
        ref={meshRef}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(id);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown?.(id, e);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          onPointerUp?.(id, e);
        }}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.3}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {isSelected && (
        <mesh scale={scale * 1.6}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.1}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
};

export default Crystal;
