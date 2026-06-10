import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Frequency } from './types';

interface ConnectionLineProps {
  from: [number, number, number];
  to: [number, number, number];
  fromFrequency: Frequency;
  toFrequency: Frequency;
  fromColor: string;
  toColor: string;
  isDragging?: boolean;
}

const frequencyValue: Record<Frequency, number> = {
  low: 0,
  mid: 1,
  high: 2
};

const mixColors = (color1: string, color2: string): string => {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  const mixed = c1.clone().lerp(c2, 0.5);
  return `#${mixed.getHexString()}`;
};

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  from,
  to,
  fromFrequency,
  toFrequency,
  fromColor,
  toColor,
  isDragging = false
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRefs = useRef<THREE.Mesh[]>([]);
  const pulseTimers = useRef<number[]>([0]);

  const freqDiff = Math.abs(frequencyValue[fromFrequency] - frequencyValue[toFrequency]);
  const lineThickness = 0.02 + freqDiff * 0.04;
  const mixedColor = useMemo(() => mixColors(fromColor, toColor), [fromColor, toColor]);

  const startPoint = useMemo(() => new THREE.Vector3(...from), [from]);
  const endPoint = useMemo(() => new THREE.Vector3(...to), [to]);
  const direction = useMemo(() => endPoint.clone().sub(startPoint), [startPoint, endPoint]);
  const length = useMemo(() => direction.length(), [direction]);
  const midPoint = useMemo(() => startPoint.clone().add(endPoint).multiplyScalar(0.5), [startPoint, endPoint]);

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const normDir = direction.clone().normalize();
    q.setFromUnitVectors(up, normDir);
    return q;
  }, [direction]);

  useFrame((state, delta) => {
    pulseTimers.current.forEach((timer, index) => {
      pulseTimers.current[index] += delta;
      if (pulseTimers.current[index] >= 0.5) {
        pulseTimers.current[index] = 0;
      }
    });

    if (pulseTimers.current[pulseTimers.current.length - 1] >= 0.5 && pulseTimers.current.length < 3) {
      pulseTimers.current.push(0);
    }
    if (pulseTimers.current.length > 3) {
      pulseTimers.current.pop();
    }

    pulseRefs.current.forEach((pulse, index) => {
      if (pulse) {
        const t = pulseTimers.current[index] / 0.5;
        const lowFreqFirst = frequencyValue[fromFrequency] <= frequencyValue[toFrequency];
        const progress = lowFreqFirst ? t : 1 - t;
        const pos = startPoint.clone().lerp(endPoint, progress);
        pulse.position.copy(pos);
      }
    });
  });

  if (isDragging) {
    const points: THREE.Vector3[] = [];
    const dotCount = Math.max(2, Math.floor(length / 0.3));
    for (let i = 0; i < dotCount; i++) {
      const t = i / (dotCount - 1);
      const offset = ((performance.now() / 1000) * 0.3 + t) % 1;
      const pos = startPoint.clone().lerp(endPoint, offset);
      points.push(pos);
    }

    return (
      <group ref={groupRef}>
        {points.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color={mixedColor} transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <mesh position={midPoint} quaternion={quaternion}>
        <cylinderGeometry args={[lineThickness, lineThickness, length, 8]} />
        <meshStandardMaterial
          color={mixedColor}
          emissive={mixedColor}
          emissiveIntensity={0.3 + freqDiff * 0.2}
          transparent
          opacity={0.85}
        />
      </mesh>

      <mesh position={midPoint} quaternion={quaternion}>
        <cylinderGeometry args={[lineThickness * 2.5, lineThickness * 2.5, length, 8]} />
        <meshBasicMaterial
          color={mixedColor}
          transparent
          opacity={0.1 + freqDiff * 0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {pulseTimers.current.map((_, index) => (
        <mesh
          key={index}
          ref={(el) => {
            if (el) pulseRefs.current[index] = el;
          }}
        >
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial
            color={mixedColor}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
};

export default ConnectionLine;
