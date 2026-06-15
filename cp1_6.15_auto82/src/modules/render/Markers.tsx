import React from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { COLORS } from '../shared/constants';

export const Markers: React.FC = () => {
  const startPoints = useSimulationStore((s) => s.startPoints);
  const endPoints = useSimulationStore((s) => s.endPoints);

  return (
    <group>
      {startPoints.map((sp) => (
        <group key={`s-${sp.id}`} position={[sp.worldX, 0.1, sp.worldZ]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.5, 0.5, 0.2, 24]} />
            <meshStandardMaterial
              color={COLORS.START_POINT}
              emissive={COLORS.START_POINT}
              emissiveIntensity={0.4}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, 0.11, 0]}>
            <ringGeometry args={[0.55, 0.65, 32]} />
            <meshBasicMaterial
              color={COLORS.START_POINT}
              transparent
              opacity={0.7}
              side={2}
            />
          </mesh>
        </group>
      ))}
      {endPoints.map((ep) => (
        <group key={`e-${ep.id}`} position={[ep.worldX, 0.1, ep.worldZ]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.5, 0.5, 0.2, 24]} />
            <meshStandardMaterial
              color={COLORS.END_POINT}
              emissive={COLORS.END_POINT}
              emissiveIntensity={0.4}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, 0.11, 0]}>
            <ringGeometry args={[0.55, 0.65, 32]} />
            <meshBasicMaterial
              color={COLORS.END_POINT}
              transparent
              opacity={0.7}
              side={2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
