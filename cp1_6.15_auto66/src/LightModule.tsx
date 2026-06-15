import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, Vec3 } from './store';

interface FlashLightModuleProps {}

export function FlashLightModule({}: FlashLightModuleProps) {
  const { camera } = useThree();
  const spotlightRef = useRef<THREE.SpotLight>(null);
  const lightTargetRef = useRef<THREE.Object3D>(null);
  const flashlightMeshRef = useRef<THREE.Group>(null);
  const coneMeshRef = useRef<THREE.Mesh>(null);
  const targetRotation = useRef<Vec3>([0, 0, 0]);
  const currentRotation = useRef<Vec3>([0, 0, 0]);
  const raycaster = useRef(new THREE.Raycaster());
  const flashlightState = useGameStore((s) => s.flashlight);
  const cameraBobOffset = useGameStore((s) => s.player.cameraBobOffset);
  const shakeOffset = useGameStore((s) => s.player.flashlightShakeOffset);
  const setFlashlightRotation = useGameStore((s) => s.setFlashlightRotation);
  const setFlashlightPosition = useGameStore((s) => s.setFlashlightPosition);
  const collectibles = useGameStore((s) => s.collectibles);
  const collectItem = useGameStore((s) => s.collectItem);
  const addScorePopup = useGameStore((s) => s.addScorePopup);

  const coneGeometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(1, 12, 32, 1, true);
    geo.translate(0, -6, 0);
    return geo;
  }, []);

  const coneMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xffe088,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);

  const pulseScaleRef = useRef(1);

  useFrame((state, delta) => {
    if (!spotlightRef.current || !lightTargetRef.current) return;

    const camDirection = new THREE.Vector3();
    camera.getWorldDirection(camDirection);

    const pitch = Math.atan2(
      -camDirection.y,
      Math.sqrt(camDirection.x ** 2 + camDirection.z ** 2)
    );
    const yaw = Math.atan2(camDirection.x, camDirection.z);
    targetRotation.current = [pitch, yaw, 0];

    const damping = 0.85;
    for (let i = 0; i < 3; i++) {
      currentRotation.current[i] =
        currentRotation.current[i] * damping +
        targetRotation.current[i] * (1 - damping);
    }

    const fwdPos = new THREE.Vector3(
      camera.position.x + shakeOffset[0],
      camera.position.y + cameraBobOffset + shakeOffset[1],
      camera.position.z + shakeOffset[2]
    );

    const targetPos = new THREE.Vector3(
      fwdPos.x + Math.sin(currentRotation.current[1]) * 12,
      fwdPos.y + Math.sin(currentRotation.current[0]) * 12,
      fwdPos.z + Math.cos(currentRotation.current[1]) * 12
    );

    spotlightRef.current.position.copy(fwdPos);
    lightTargetRef.current.position.copy(targetPos);
    spotlightRef.current.target = lightTargetRef.current;

    if (flashlightMeshRef.current) {
      flashlightMeshRef.current.position.copy(fwdPos);
      flashlightMeshRef.current.lookAt(targetPos);
    }

    setFlashlightRotation(currentRotation.current as Vec3);
    setFlashlightPosition([fwdPos.x, fwdPos.y, fwdPos.z]);

    raycaster.current.set(fwdPos, camDirection);
    raycaster.current.far = 12;

    const collectibleMeshes = collectibles
      .filter((c) => !c.collected)
      .map((c) => ({
        id: c.id,
        position: new THREE.Vector3(...c.position),
        color: c.color,
      }));

    for (const item of collectibleMeshes) {
      const itemPos = item.position;
      const dist = fwdPos.distanceTo(itemPos);

      if (dist < 0.4) {
        collectItem(item.id);
        addScorePopup(80, 80);
        continue;
      }

      const toItem = new THREE.Vector3().subVectors(itemPos, fwdPos).normalize();
      const dot = toItem.dot(camDirection);
      const angleThreshold = Math.cos((Math.PI / 4) * 0.5);

      if (dot > angleThreshold && dist < 12) {
        pulseScaleRef.current =
          1 + 0.1 * Math.sin(state.clock.elapsedTime * (Math.PI * 2) / 0.6);
      }
    }

    if (coneMeshRef.current) {
      const scale = Math.tan(Math.PI / 8);
      coneMeshRef.current.scale.set(
        scale * pulseScaleRef.current,
        1,
        scale * pulseScaleRef.current
      );
    }
  });

  return (
    <group>
      <spotLight
        ref={spotlightRef}
        angle={Math.PI / 4}
        distance={12}
        decay={2}
        intensity={2.5 * flashlightState.brightness}
        penumbra={0.5}
        color="#ffeaa7"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />
      <primitive object={lightTargetRef.current ?? new THREE.Object3D()} />
      <object3D ref={lightTargetRef} />
      <group ref={flashlightMeshRef}>
        <mesh ref={coneMeshRef} geometry={coneGeometry} material={coneMaterial} />
        <mesh position={[0, 0, 0.08]}>
          <cylinderGeometry args={[0.04, 0.03, 0.15, 16]} />
          <meshStandardMaterial color="#2d3436" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.16]}>
          <circleGeometry args={[0.04, 16]} />
          <meshBasicMaterial color="#ffeaa7" />
        </mesh>
      </group>
    </group>
  );
}

interface MossLightProps {
  position: Vec3;
  radius: number;
  opacity: number;
  blinkPeriod: number;
}

export function MossLight({ position, radius, opacity, blinkPeriod }: MossLightProps) {
  const lightRef = useRef<THREE.PointLight>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const blinkFactor = 0.5 + 0.5 * Math.sin((time * Math.PI * 2) / blinkPeriod + phase);
    const currentOpacity = opacity * (0.4 + 0.6 * blinkFactor);

    if (lightRef.current) {
      lightRef.current.intensity = 0.6 * blinkFactor;
    }
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = currentOpacity;
    }
  });

  return (
    <group position={position}>
      <pointLight
        ref={lightRef}
        color="#00ff88"
        intensity={0.6}
        distance={3}
        decay={2}
      />
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 8, 8]} />
        <meshBasicMaterial
          color="#00ff88"
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
