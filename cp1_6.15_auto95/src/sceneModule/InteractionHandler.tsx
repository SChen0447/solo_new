import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useJointStore } from '../jointModule/JointController';

const InteractionHandler: React.FC = () => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  React.useEffect(() => {
    camera.position.set(5, 4, 6);
    camera.lookAt(0, 1, 0);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.5}
      panSpeed={1.0}
      zoomSpeed={0.8}
      minDistance={5}
      maxDistance={50}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 - 0.05}
      target={[0, 1, 0]}
      makeDefault
    />
  );
};

export default InteractionHandler;
