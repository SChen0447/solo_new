import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec3 } from '../store/store';

interface SpotlightProps {
  rolePosition: Vec3;
  color: string;
  intensity: number;
  angle: number;
  lightHeight?: number;
  lightOffsetX?: number;
  lightOffsetZ?: number;
  type?: 'main' | 'fill';
  targetColor?: string;
  transitionProgress?: number;
  showParticles?: boolean;
}

export function Spotlight({
  rolePosition,
  color,
  intensity,
  angle,
  lightHeight = 8,
  lightOffsetX = -2,
  lightOffsetZ = -3,
  type = 'main',
  targetColor,
  transitionProgress = 1,
  showParticles = false
}: SpotlightProps) {
  const lightRef = useRef<THREE.SpotLight>(null);
  const coneRef = useRef<THREE.Mesh>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const lightPosition = useMemo(() => {
    const offsetX = type === 'main' ? -2 : 3;
    const offsetZ = type === 'main' ? -3 : -1.5;
    const height = type === 'main' ? 8 : 6;
    return {
      x: rolePosition.x + offsetX,
      y: height,
      z: rolePosition.z + offsetZ
    };
  }, [rolePosition.x, rolePosition.z, type]);

  const currentColor = useMemo(() => {
    if (!targetColor || transitionProgress >= 1) return color;
    const c1 = new THREE.Color(color);
    const c2 = new THREE.Color(targetColor);
    return `#${c1.lerp(c2, transitionProgress).getHexString()}`;
  }, [color, targetColor, transitionProgress]);

  const currentIntensity = useMemo(() => {
    return intensity * transitionProgress;
  }, [intensity, transitionProgress]);

  const coneMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: currentColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, [currentColor]);

  const particleGeometry = useMemo(() => {
    const count = 30;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = Math.random() * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }, []);

  useFrame((_, delta) => {
    if (targetRef.current) {
      targetRef.current.position.set(
        rolePosition.x,
        rolePosition.y + 1,
        rolePosition.z
      );
    }

    if (lightRef.current) {
      lightRef.current.target = targetRef.current!;
    }

    if (coneRef.current) {
      const targetX = rolePosition.x;
      const targetY = rolePosition.y + 1;
      const targetZ = rolePosition.z;
      const lx = lightPosition.x;
      const ly = lightPosition.y;
      const lz = lightPosition.z;
      
      const dx = targetX - lx;
      const dy = targetY - ly;
      const dz = targetZ - lz;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const coneHeight = distance;
      
      coneRef.current.position.set(
        lx + dx / 2,
        ly + dy / 2,
        lz + dz / 2
      );
      
      const direction = new THREE.Vector3(dx, dy, dz).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
      coneRef.current.quaternion.copy(quaternion);
      
      coneRef.current.scale.set(
        Math.tan(angle) * coneHeight,
        coneHeight,
        Math.tan(angle) * coneHeight
      );
    }

    if (particlesRef.current && showParticles) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += delta * (2 + Math.random() * 3);
        if (positions[i * 3 + 1] > 8) {
          positions[i * 3 + 1] = 0;
          positions[i * 3] = rolePosition.x + (Math.random() - 0.5) * 2;
          positions[i * 3 + 2] = rolePosition.z + (Math.random() - 0.5) * 2;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      
      particlesRef.current.material.opacity = Math.sin(Date.now() * 0.01) * 0.3 + 0.5;
    }
  });

  return (
    <group>
      <spotLight
        ref={lightRef}
        position={[lightPosition.x, lightPosition.y, lightPosition.z]}
        angle={angle}
        penumbra={0.8}
        intensity={currentIntensity * 50}
        color={currentColor}
        distance={30}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      
      <mesh ref={coneRef} material={coneMaterial}>
        <coneGeometry args={[1, 1, 32, 1, true]} />
      </mesh>

      {showParticles && (
        <points ref={particlesRef}>
          <primitive object={particleGeometry} attach="geometry" />
          <pointsMaterial
            size={0.08}
            color={currentColor}
            transparent
            opacity={0.8}
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      <object3D ref={targetRef} position={[rolePosition.x, rolePosition.y + 1, rolePosition.z]} />
    </group>
  );
}
