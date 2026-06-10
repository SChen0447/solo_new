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

const PULSE_COUNT = 3;
const PULSE_PERIOD = 0.5;

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
  const pulseRefs = useRef<(THREE.Mesh | null)[]>([]);
  const pulsePhases = useRef<number[]>([0, PULSE_PERIOD / 3, (PULSE_PERIOD * 2) / 3]);
  const dotRefs = useRef<(THREE.Mesh | null)[]>([]);

  const freqDiff = Math.abs(frequencyValue[fromFrequency] - frequencyValue[toFrequency]);
  const lineWidth = 0.02 + freqDiff * 0.03;
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
    if (normDir.length() > 0.001) {
      q.setFromUnitVectors(up, normDir);
    }
    return q;
  }, [direction]);

  const lowFreqFirst = frequencyValue[fromFrequency] <= frequencyValue[toFrequency];

  useFrame((_, delta) => {
    for (let i = 0; i < PULSE_COUNT; i++) {
      pulsePhases.current[i] += delta;
      if (pulsePhases.current[i] >= PULSE_PERIOD) {
        pulsePhases.current[i] -= PULSE_PERIOD;
      }

      const t = pulsePhases.current[i] / PULSE_PERIOD;
      const progress = lowFreqFirst ? t : 1 - t;
      const pos = startPoint.clone().lerp(endPoint, progress);

      const pulse = pulseRefs.current[i];
      if (pulse) {
        pulse.position.copy(pos);
      }
    }
  });

  if (isDragging) {
    const dotCount = Math.max(3, Math.floor(length / 0.5));
    return (
      <group ref={groupRef}>
        {Array.from({ length: dotCount }).map((_, i) => (
          <mesh
            key={i}
            ref={(el) => { dotRefs.current[i] = el; }}
          >
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={mixedColor} transparent opacity={0.6} />
          </mesh>
        ))}
        <DraggingDotsUpdater
          startPoint={startPoint}
          endPoint={endPoint}
          dotRefs={dotRefs}
          dotCount={dotCount}
          length={length}
        />
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <mesh position={midPoint} quaternion={quaternion}>
        <cylinderGeometry args={[lineWidth, lineWidth, length, 8]} />
        <meshStandardMaterial
          color={mixedColor}
          emissive={mixedColor}
          emissiveIntensity={0.3 + freqDiff * 0.2}
          transparent
          opacity={0.85}
        />
      </mesh>

      <mesh position={midPoint} quaternion={quaternion}>
        <cylinderGeometry args={[lineWidth * 3, lineWidth * 3, length, 8]} />
        <meshBasicMaterial
          color={mixedColor}
          transparent
          opacity={0.08 + freqDiff * 0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {Array.from({ length: PULSE_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { pulseRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial
            color={mixedColor}
            transparent
            opacity={0.8}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

interface DraggingDotsUpdaterProps {
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  dotRefs: React.MutableRefObject<(THREE.Mesh | null)[]>;
  dotCount: number;
  length: number;
}

const DraggingDotsUpdater: React.FC<DraggingDotsUpdaterProps> = ({
  startPoint,
  endPoint,
  dotRefs,
  dotCount,
  length
}) => {
  const accum = useRef(0);

  useFrame((_, delta) => {
    accum.current += delta;
    const speed = 0.3;
    for (let i = 0; i < dotCount; i++) {
      const mesh = dotRefs.current[i];
      if (mesh) {
        const baseOffset = i / dotCount;
        const t = ((accum.current * speed) / Math.max(length, 0.01) + baseOffset) % 1;
        const pos = startPoint.clone().lerp(endPoint, t);
        mesh.position.copy(pos);
      }
    }
  });

  return null;
};

export default ConnectionLine;
