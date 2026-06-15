import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface Customizer3DControlsProps {
  onControlsReady?: (controls: OrbitControlsImpl) => void;
}

export function Customizer3DControls({ onControlsReady }: Customizer3DControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (controlsRef.current && onControlsReady) {
      onControlsReady(controlsRef.current);
    }
  }, [onControlsReady]);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={3}
      maxDistance={12}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI * 5 / 6}
      minAzimuthAngle={-Math.PI}
      maxAzimuthAngle={Math.PI}
      enableDamping={true}
      dampingFactor={0.08}
      rotateSpeed={0.8}
      zoomSpeed={0.6}
    />
  );
}
