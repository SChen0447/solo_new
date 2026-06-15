import React, { useRef, useMemo, useEffect, MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useJointStore, JointAngles } from '../jointModule/JointController';

const degToRad = (deg: number) => (deg * Math.PI) / 180;

const easeInOutCubic = (t: number) => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const interpolateAngles = (
  start: JointAngles,
  end: JointAngles,
  t: number
): JointAngles => {
  const eased = easeInOutCubic(t);
  return {
    base: start.base + (end.base - start.base) * eased,
    shoulder: start.shoulder + (end.shoulder - start.shoulder) * eased,
    elbow: start.elbow + (end.elbow - start.elbow) * eased,
    wrist1: start.wrist1 + (end.wrist1 - start.wrist1) * eased,
    wrist2: start.wrist2 + (end.wrist2 - start.wrist2) * eased,
    wrist3: start.wrist3 + (end.wrist3 - start.wrist3) * eased
  };
};

const JointRing: React.FC<{ position?: [number, number, number] }> = ({ position = [0, 0, 0] }) => (
  <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
    <torusGeometry args={[0.1, 0.02, 16, 32]} />
    <meshStandardMaterial color="#ff3333" metalness={0.6} roughness={0.3} />
  </mesh>
);

const TargetCube: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { targetCube, selectTargetCube } = useJointStore();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.2 * state.clock.getDelta();
    }
    if (glowRef.current && targetCube.selected) {
      const pulse = 0.8 + 0.2 * Math.sin(state.clock.elapsedTime * Math.PI * 4);
      const scale = 1 + 0.3 * pulse;
      glowRef.current.scale.setScalar(scale);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 * pulse;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectTargetCube(!targetCube.selected);
  };

  if (!targetCube.visible) return null;

  return (
    <group position={targetCube.position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#00ff88"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      {targetCube.selected && (
        <mesh ref={glowRef}>
          <boxGeometry args={[1.05, 1.05, 1.05]} />
          <meshBasicMaterial
            color="#ffff00"
            transparent
            opacity={0.5}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

const Particles: React.FC = () => {
  const { particles } = useJointStore();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    particles.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(Math.max(0.02, p.life * 0.08));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, new THREE.Color('#00ff88'));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    meshRef.current.count = particles.length;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 200]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#00ff88" transparent opacity={0.9} />
    </instancedMesh>
  );
};

interface RobotArmProps {
  endEffectorRef: MutableRefObject<THREE.Group | null>;
}

const RobotArm: React.FC<RobotArmProps> = ({ endEffectorRef }) => {
  const baseRef = useRef<THREE.Group>(null);
  const shoulderRef = useRef<THREE.Group>(null);
  const elbowRef = useRef<THREE.Group>(null);
  const wrist1Ref = useRef<THREE.Group>(null);
  const wrist2Ref = useRef<THREE.Group>(null);
  const wrist3Ref = useRef<THREE.Group>(null);
  const tempVec = useMemo(() => new THREE.Vector3(), []);

  const metalMaterial = useMemo(() => ({
    color: '#c0c0c0',
    metalness: 0.7,
    roughness: 0.3
  }), []);

  useFrame((state, delta) => {
    const store = useJointStore.getState();
    let angles = { ...store.jointAngles };

    if (store.animation.isMoving && store.animation.startAngles && store.animation.targetAngles) {
      const newProgress = Math.min(
        1,
        store.animation.animationProgress + delta / store.animation.animationDuration
      );
      angles = interpolateAngles(
        store.animation.startAngles,
        store.animation.targetAngles,
        newProgress
      );
      store.setAllJointAngles(angles);
      store.setAnimationProgress(newProgress);

      if (newProgress >= 1) {
        store.stopAnimation();
        if (store.targetCube.visible && store.targetCube.selected) {
          store.spawnParticles(store.targetCube.position);
          store.toggleTargetCube(false);
          store.selectTargetCube(false);
        }
      }
    }

    if (baseRef.current) baseRef.current.rotation.y = degToRad(angles.base - 90);
    if (shoulderRef.current) shoulderRef.current.rotation.z = degToRad(angles.shoulder - 45);
    if (elbowRef.current) elbowRef.current.rotation.z = degToRad(angles.elbow - 90);
    if (wrist1Ref.current) wrist1Ref.current.rotation.x = degToRad(angles.wrist1);
    if (wrist2Ref.current) wrist2Ref.current.rotation.y = degToRad(angles.wrist2);
    if (wrist3Ref.current) wrist3Ref.current.rotation.z = degToRad(angles.wrist3);

    if (endEffectorRef.current) {
      endEffectorRef.current.getWorldPosition(tempVec);
      const pos = { x: tempVec.x, y: tempVec.y, z: tempVec.z };
      store.setEndEffectorPosition(pos);
      store.addTrailPoint(pos);
    }

    store.updateParticles(delta);
  });

  return (
    <group>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.7, 0.8, 0.3, 32]} />
        <meshStandardMaterial {...metalMaterial} />
      </mesh>

      <group ref={baseRef} position={[0, 0, 0]}>
        <JointRing position={[0, 0.1, 0]} />
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.4, 0.5, 0.3, 32]} />
          <meshStandardMaterial {...metalMaterial} />
        </mesh>

        <group ref={shoulderRef} position={[0, 0.3, 0]}>
          <JointRing />
          <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, 1.0, 24]} />
            <meshStandardMaterial {...metalMaterial} />
          </mesh>

          <group ref={elbowRef} position={[1.0, 0, 0]}>
            <JointRing />
            <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.13, 0.13, 1.0, 24]} />
              <meshStandardMaterial {...metalMaterial} />
            </mesh>

            <group ref={wrist1Ref} position={[1.0, 0, 0]}>
              <JointRing />
              <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.11, 0.11, 0.5, 20]} />
                <meshStandardMaterial {...metalMaterial} />
              </mesh>

              <group ref={wrist2Ref} position={[0.5, 0, 0]}>
                <JointRing />
                <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.09, 0.09, 0.4, 20]} />
                  <meshStandardMaterial {...metalMaterial} />
                </mesh>

                <group ref={wrist3Ref} position={[0.4, 0, 0]}>
                  <JointRing />
                  <group ref={endEffectorRef}>
                    <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.08, 0.08, 0.3, 16]} />
                      <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
                    </mesh>
                    <mesh position={[0.3, 0, 0]}>
                      <cylinderGeometry args={[0.15, 0.1, 0.08, 24]} />
                      <meshStandardMaterial color="#ff6600" metalness={0.5} roughness={0.4} />
                    </mesh>
                    <mesh position={[0.32, 0, 0]}>
                      <cylinderGeometry args={[0.12, 0.12, 0.02, 24]} />
                      <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={0.5} />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

const Ground: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
    <planeGeometry args={[30, 30]} />
    <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.8} />
  </mesh>
);

const GridLines: React.FC = () => (
  <gridHelper
    args={[20, 20, '#2a2a4e', '#1a1a3e']}
    position={[0, -0.29, 0]}
  />
);

const SceneRenderer: React.FC = () => {
  const endEffectorRef = useRef<THREE.Group | null>(null);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} color="#6666ff" />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#ffffff" />

      <Ground />
      <GridLines />
      <RobotArm endEffectorRef={endEffectorRef} />
      <TargetCube />
      <Particles />
    </>
  );
};

export default SceneRenderer;
