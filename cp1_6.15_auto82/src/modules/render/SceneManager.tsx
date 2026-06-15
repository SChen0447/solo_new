import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSimulationStore } from '../../store/useSimulationStore';
import { CAMERA, WORLD_MIN, WORLD_MAX, WORLD_SIZE } from '../shared/constants';

interface SceneManagerProps {
  children: React.ReactNode;
}

export const SceneManager: React.FC<SceneManagerProps> = ({ children }) => {
  const { camera } = useThree();
  const targetFocus = useSimulationStore((s) => s.targetFocus);
  const setTargetFocus = useSimulationStore((s) => s.setTargetFocus);

  const controlsRef = React.useRef<any>(null);

  const animState = React.useRef({
    animating: false,
    progress: 0,
    duration: CAMERA.FOCUS_DURATION,
    fromPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
  });

  React.useEffect(() => {
    if (targetFocus && controlsRef.current) {
      const st = animState.current;
      st.fromPos.copy(camera.position);
      st.fromTarget.copy(controlsRef.current.target);
      st.toTarget.copy(targetFocus);
      const offset = new THREE.Vector3()
        .copy(camera.position)
        .sub(controlsRef.current.target);
      st.toPos.copy(targetFocus).add(offset);
      st.progress = 0;
      st.animating = true;
      setTargetFocus(null);
    }
  }, [targetFocus, camera, setTargetFocus]);

  useFrame((_, dt) => {
    const st = animState.current;
    if (!st.animating || !controlsRef.current) return;
    st.progress += dt;
    const t = Math.min(1, st.progress / st.duration);
    const eased = 1 - Math.pow(1 - t, 2);
    camera.position.lerpVectors(st.fromPos, st.toPos, eased);
    controlsRef.current.target.lerpVectors(st.fromTarget, st.toTarget, eased);
    controlsRef.current.update();
    if (t >= 1) st.animating = false;
  });

  return (
    <>
      <color attach="background" args={[0x0d1117]} />
      <fogExp2 attach="fog" args={[0x0d1117, 0.008]} />

      <ambientLight intensity={0.3} color={0x404040} />
      <hemisphereLight
        args={[0x87ceeb, 0x2c3e50, 0.6]}
        position={[0, 50, 0]}
      />
      <directionalLight
        position={[30, 50, 20]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={WORLD_MIN - 10}
        shadow-camera-right={WORLD_MAX + 10}
        shadow-camera-top={WORLD_MAX + 10}
        shadow-camera-bottom={WORLD_MIN - 10}
      />

      <StreetGrid />
      {children}

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        rotateSpeed={CAMERA.ROTATE_SPEED * 0.01}
        zoomSpeed={CAMERA.ZOOM_SPEED}
        minDistance={CAMERA.MIN_DISTANCE}
        maxDistance={CAMERA.MAX_DISTANCE}
        minPolarAngle={CAMERA.MIN_POLAR}
        maxPolarAngle={CAMERA.MAX_POLAR}
        makeDefault
      />
    </>
  );
};

const StreetGrid: React.FC = () => {
  const gridHelper = useMemo(() => {
    const size = WORLD_SIZE;
    const divisions = 11;
    const centerOffset = 0;
    const grid = new THREE.GridHelper(size, divisions, 0x2c3e50, 0x2c3e50);
    const pos = grid.geometry.attributes.position;
    const colors: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      colors.push(0.173, 0.243, 0.314);
    }
    grid.geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    );
    (grid.material as THREE.Material).depthWrite = false;
    return grid;
  }, []);

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshStandardMaterial color={0x0f1620} roughness={0.95} />
      </mesh>
      <primitive object={gridHelper} position={[0, 0.01, 0]} />
    </>
  );
};
