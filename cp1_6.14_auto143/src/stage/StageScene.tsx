import { useRef, useEffect, useState, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStageStore, CAMERA_PRESETS, Vec3 } from '../store/store';
import { RoleActor } from './RoleActor';
import { Spotlight } from './Spotlight';

export function StageScene() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const gridRef = useRef<THREE.GridHelper>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const curtainRef = useRef<THREE.Mesh>(null);
  const [transitionProgress, setTransitionProgress] = useState(1);
  const [transitioningFromScene, setTransitioningFromScene] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const lastSceneIdRef = useRef<string | null>(null);
  const animatingCameraRef = useRef(false);
  const cameraAnimStartRef = useRef<{ pos: Vec3; target: Vec3 } | null>(null);
  const cameraAnimEndRef = useRef<{ pos: Vec3; target: Vec3 } | null>(null);
  const cameraAnimProgressRef = useRef(0);
  const inertiaRef = useRef<{ velocityX: number; velocityY: number }>({ velocityX: 0, velocityY: 0 });

  const {
    scenes,
    activeSceneId,
    selectedRoleId,
    selectRole,
    updateRolePosition,
    cameraPreset,
    setCameraPreset
  } = useStageStore();

  const activeScene = scenes.find(s => s.id === activeSceneId);
  const fromScene = transitioningFromScene ? scenes.find(s => s.id === transitioningFromScene) : null;

  const stageBounds = useMemo(() => {
    if (!activeScene) return { minX: -6, maxX: 6, minZ: -4, maxZ: 4 };
    const sx = activeScene.stageSize.x / 2;
    const sz = activeScene.stageSize.z / 2;
    return { minX: -sx, maxX: sx, minZ: -sz, maxZ: sz };
  }, [activeScene]);

  useEffect(() => {
    if (lastSceneIdRef.current && lastSceneIdRef.current !== activeSceneId) {
      setTransitioningFromScene(lastSceneIdRef.current);
      setTransitionProgress(0);
      
      const startTime = performance.now();
      const duration = 1200;
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setTransitionProgress(eased);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setTransitioningFromScene(null);
        }
      };
      requestAnimationFrame(animate);
    }
    lastSceneIdRef.current = activeSceneId;
  }, [activeSceneId]);

  useEffect(() => {
    if (cameraPreset === 'default' || animatingCameraRef.current) return;
    
    const preset = CAMERA_PRESETS[cameraPreset];
    if (!preset) return;

    animatingCameraRef.current = true;
    cameraAnimStartRef.current = {
      pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      target: controlsRef.current?.target 
        ? { x: controlsRef.current.target.x, y: controlsRef.current.target.y, z: controlsRef.current.target.z }
        : { x: 0, y: 0, z: 0 }
    };
    cameraAnimEndRef.current = { pos: preset.position, target: preset.target };
    cameraAnimProgressRef.current = 0;

    const startAnim = performance.now();
    const duration = 800;

    const animateCamera = () => {
      const elapsed = performance.now() - startAnim;
      let t = Math.min(elapsed / duration, 1);
      
      const eased = t < 0.5 
        ? 2 * t * t 
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
      
      const parabolicT = Math.sin(t * Math.PI);
      const heightBoost = parabolicT * 3;

      if (cameraAnimStartRef.current && cameraAnimEndRef.current) {
        const start = cameraAnimStartRef.current.pos;
        const end = cameraAnimEndRef.current.pos;
        const tStart = cameraAnimStartRef.current.target;
        const tEnd = cameraAnimEndRef.current.target;

        camera.position.set(
          start.x + (end.x - start.x) * eased,
          start.y + (end.y - start.y) * eased + heightBoost,
          start.z + (end.z - start.z) * eased
        );

        if (controlsRef.current) {
          controlsRef.current.target.set(
            tStart.x + (tEnd.x - tStart.x) * eased,
            tStart.y + (tEnd.y - tStart.y) * eased,
            tStart.z + (tEnd.z - tStart.z) * eased
          );
        }
      }

      if (t < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        animatingCameraRef.current = false;
        setCameraPreset('default');
      }
    };

    requestAnimationFrame(animateCamera);
  }, [cameraPreset, camera, setCameraPreset]);

  useFrame(() => {
    if (gridRef.current) {
      const dist = camera.position.distanceTo(new THREE.Vector3(0, 3, 0));
      const zoom = Math.max(0.5, Math.min(3, 18 / dist));
      setZoomLevel(zoom);
      
      const gridOpacity = zoom > 1.5 ? Math.max(0.05, 1 - (zoom - 1.5) * 1.5) : 0.4;
      (gridRef.current.material as THREE.Material).opacity = gridOpacity;
      (gridRef.current.material as THREE.Material).transparent = true;
    }

    if (controlsRef.current && Math.abs(inertiaRef.current.velocityX) > 0.001) {
      controlsRef.current.rotateLeft(inertiaRef.current.velocityX);
      inertiaRef.current.velocityX *= 0.95;
    }
    if (controlsRef.current && Math.abs(inertiaRef.current.velocityY) > 0.001) {
      controlsRef.current.rotateUp(inertiaRef.current.velocityY);
      inertiaRef.current.velocityY *= 0.95;
    }
  });

  const handleStageClick = (e: any) => {
    e.stopPropagation();
    selectRole(null);
  };

  const interpolateColor = (color1: string, color2: string, progress: number): string => {
    if (progress >= 1) return color2;
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return `#${c1.lerp(c2, progress).getHexString()}`;
  };

  const interpolateNumber = (n1: number, n2: number, progress: number): number => {
    return n1 + (n2 - n1) * progress;
  };

  if (!activeScene) return null;

  const bgColor = fromScene 
    ? interpolateColor(fromScene.backgroundColor, activeScene.backgroundColor, transitionProgress)
    : activeScene.backgroundColor;

  const curtainColor = fromScene
    ? interpolateColor(fromScene.curtainColor, activeScene.curtainColor, transitionProgress)
    : activeScene.curtainColor;

  const ambientColor = fromScene
    ? interpolateColor(fromScene.ambientColor, activeScene.ambientColor, transitionProgress)
    : activeScene.ambientColor;

  const ambientIntensity = fromScene
    ? interpolateNumber(fromScene.ambientIntensity, activeScene.ambientIntensity, transitionProgress)
    : activeScene.ambientIntensity;

  const sx = activeScene.stageSize.x;
  const sz = activeScene.stageSize.z;

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 25, 60]} />

      <ambientLight ref={ambientLightRef} intensity={ambientIntensity} color={ambientColor} />

      <directionalLight
        position={[15, 20, 10]}
        intensity={0.3}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />

      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={handleStageClick}
      >
        <planeGeometry args={[sx, sz]} />
        <meshStandardMaterial
          color={activeScene.floorTexture === 'wood' ? '#4a3728' : '#2d2d2d'}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      <gridHelper
        ref={gridRef}
        args={[Math.max(sx, sz), Math.max(sx, sz), '#c9a84c', '#5a4a2a']}
        position={[0, 0.02, 0]}
      >
        <meshBasicMaterial attach="material" transparent opacity={0.4} />
      </gridHelper>

      <mesh position={[0, 0.1, -sz / 2]} receiveShadow>
        <boxGeometry args={[sx, 0.2, 0.3]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.1, sz / 2]} receiveShadow>
        <boxGeometry args={[sx, 0.2, 0.3]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.9} />
      </mesh>
      <mesh position={[-sx / 2, 0.1, 0]} receiveShadow>
        <boxGeometry args={[0.3, 0.2, sz]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.9} />
      </mesh>
      <mesh position={[sx / 2, 0.1, 0]} receiveShadow>
        <boxGeometry args={[0.3, 0.2, sz]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.9} />
      </mesh>

      <mesh
        ref={curtainRef}
        position={[0, 4, -sz / 2 + 0.15]}
        receiveShadow
      >
        <planeGeometry args={[sx, 8]} />
        <meshStandardMaterial
          color={curtainColor}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>

      {activeScene.roles.map((role, index) => {
        const fromRole = fromScene?.roles[index];
        const spotColor = fromRole
          ? interpolateColor(fromRole.spotlightColor, role.spotlightColor, transitionProgress)
          : role.spotlightColor;
        const spotIntensity = fromRole
          ? interpolateNumber(fromRole.spotlightIntensity, role.spotlightIntensity, transitionProgress)
          : role.spotlightIntensity;

        return (
          <group key={role.id}>
            <Spotlight
              rolePosition={role.position}
              color={spotColor}
              intensity={spotIntensity}
              angle={role.spotlightAngle}
              type="main"
              transitionProgress={transitionProgress < 1 ? transitionProgress : 1}
              showParticles={transitionProgress < 1 && transitionProgress > 0.1}
            />
            <Spotlight
              rolePosition={role.position}
              color={spotColor}
              intensity={spotIntensity * 0.5}
              angle={role.spotlightAngle * 1.3}
              type="fill"
              transitionProgress={transitionProgress < 1 ? transitionProgress : 1}
            />
            <RoleActor
              role={role}
              sceneId={activeScene.id}
              isSelected={selectedRoleId === role.id}
              onSelect={selectRole}
              onPositionChange={(pos) => updateRolePosition(activeScene.id, role.id, pos)}
              stageBounds={stageBounds}
            />
          </group>
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 8}
        target={[0, 1, 0]}
        onChange={() => {
          if (controlsRef.current) {
            inertiaRef.current = {
              velocityX: controlsRef.current._sphericalDelta?.theta || 0,
              velocityY: controlsRef.current._sphericalDelta?.phi || 0
            };
          }
        }}
      />
    </>
  );
}
