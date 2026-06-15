import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGrowthStore } from '../store';
import { GrowthStage, GrowthParams, STAGE_DURATIONS } from '../types';

interface LSystemParams {
  iterations: number;
  angle: number;
  length: number;
  branchFactor: number;
}

function getLSystemParams(stage: GrowthStage): LSystemParams {
  switch (stage) {
    case GrowthStage.SEED:
      return { iterations: 0, angle: 25, length: 0, branchFactor: 0 };
    case GrowthStage.SEEDLING:
      return { iterations: 1, angle: 30, length: 1.2, branchFactor: 2 };
    case GrowthStage.YOUNG_TREE:
      return { iterations: 2, angle: 28, length: 3, branchFactor: 2 };
    case GrowthStage.MATURE_TREE:
      return { iterations: 4, angle: 25, length: 5, branchFactor: 3 };
  }
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * easeOut(t);
}

interface BranchData {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  level: number;
  leafCount: number;
  hasLeaves: boolean;
  hasFlowers: boolean;
  flowerCount: number;
  fruitCount: number;
}

function generateTreeBranches(
  params: LSystemParams,
  progress: number,
  growthParams: GrowthParams
): BranchData[] {
  const branches: BranchData[] = [];
  const actualLength = params.length * easeOut(progress);
  const leafFactor = (growthParams.light + growthParams.water) / 200;
  const flowerFactor = (growthParams.co2 - 0.5) / 1.5;

  interface StackItem {
    pos: THREE.Vector3;
    dir: THREE.Vector3;
    level: number;
    length: number;
  }

  const stack: StackItem[] = [];
  let currentPos = new THREE.Vector3(0, 0, 0);
  let currentDir = new THREE.Vector3(0, 1, 0);
  let currentLevel = 0;
  let currentLength = actualLength;

  function drawBranch() {
    const endPos = currentPos.clone().add(currentDir.clone().multiplyScalar(currentLength));
    const radius = 0.08 * (1 - currentLevel * 0.15) * Math.max(0.3, progress);
    const maxLevel = params.iterations;
    const isLastLevel = currentLevel >= maxLevel;
    const leafCount = isLastLevel
      ? Math.floor(5 + 15 * leafFactor)
      : Math.floor(2 + 5 * leafFactor * (maxLevel - currentLevel));
    const hasFlowers = currentLevel >= maxLevel - 1 && flowerFactor > 0.3;
    const flowerCount = hasFlowers ? Math.floor(3 * flowerFactor) : 0;
    const fruitCount = hasFlowers ? Math.floor(2 * flowerFactor) : 0;

    branches.push({
      start: currentPos.clone(),
      end: endPos,
      radius: Math.max(0.01, radius),
      level: currentLevel,
      leafCount,
      hasLeaves: currentLevel >= 1,
      hasFlowers,
      flowerCount,
      fruitCount,
    });

    currentPos = endPos;
  }

  function rotateDir(axis: THREE.Vector3, angleDeg: number) {
    const angle = (angleDeg * Math.PI) / 180;
    currentDir.applyAxisAngle(axis, angle);
  }

  drawBranch();

  const buildRecursive = (pos: THREE.Vector3, dir: THREE.Vector3, level: number, length: number) => {
    if (level >= params.iterations || length < 0.1) return;

    currentPos = pos.clone();
    currentDir = dir.clone();
    currentLevel = level + 1;
    currentLength = length * 0.7 * easeOut(progress);

    const numBranches = level === 0 ? 2 : params.branchFactor;
    const angleStep = 360 / numBranches;

    for (let i = 0; i < numBranches; i++) {
      const branchAngle = angleStep * i + (level * 15);
      const up = new THREE.Vector3(0, 1, 0);
      const perp = new THREE.Vector3().crossVectors(dir, up).normalize();
      if (perp.length() < 0.01) perp.set(1, 0, 0);

      let newDir = dir.clone().applyAxisAngle(perp, (params.angle * Math.PI) / 180);
      newDir.applyAxisAngle(dir, (branchAngle * Math.PI) / 180);
      newDir.normalize();

      const newPos = pos.clone();
      currentPos = newPos;
      currentDir = newDir;
      currentLevel = level + 1;
      currentLength = length * 0.65;

      drawBranch();
      buildRecursive(currentPos.clone(), currentDir.clone(), level + 1, currentLength);
    }
  };

  if (params.iterations > 0) {
    buildRecursive(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      0,
      actualLength
    );
  }

  return branches;
}

function interpolateColor(color1: string, color2: string, t: number): THREE.Color {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, t);
}

const Particles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const growthTriggered = useGrowthStore((s) => s.growthTriggered);
  const brightRef = useRef(0);

  const { positions, velocities, sizes } = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const radius = 2 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      sizes[i] = 0.01 + Math.random() * 0.01;
    }
    return { positions, velocities, sizes };
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry as THREE.BufferGeometry;
    const pos = geom.attributes.position.array as Float32Array;

    if (growthTriggered) brightRef.current = 0.5;
    brightRef.current = Math.max(0, brightRef.current - delta);

    const brightMult = 1 + brightRef.current * 0.4;

    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3] += velocities[i * 3] * delta * 60 * brightMult;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60 * brightMult;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60 * brightMult;

      if (pos[i * 3 + 1] > 6) pos[i * 3 + 1] = 0;
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 6;

      if (brightRef.current > 0) {
        pos[i * 3] += (Math.random() - 0.5) * 0.005;
        pos[i * 3 + 1] += (Math.random() - 0.5) * 0.005;
        pos[i * 3 + 2] += (Math.random() - 0.5) * 0.005;
      }
    }
    geom.attributes.position.needsUpdate = true;

    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = 0.3 + brightRef.current * 0.2;
    material.sizeAttenuation = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#aaccff"
        transparent
        opacity={0.3}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

const Tree: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const params = useGrowthStore((s) => s.params);
  const currentStage = useGrowthStore((s) => s.currentStage);
  const stageProgress = useGrowthStore((s) => s.stageProgress);
  const updateStageProgress = useGrowthStore((s) => s.updateStageProgress);
  const setPartInfo = useGrowthStore((s) => s.setPartInfo);
  const growthTriggered = useGrowthStore((s) => s.growthTriggered);

  const animProgressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    targetProgressRef.current = 1;
  }, [growthTriggered]);

  useFrame((_, delta) => {
    const duration = STAGE_DURATIONS[currentStage];
    const progressDelta = (delta * 1000) / duration;
    updateStageProgress(progressDelta);

    if (animProgressRef.current < targetProgressRef.current) {
      animProgressRef.current = Math.min(
        1,
        animProgressRef.current + delta / 2.5
      );
      forceUpdate((n) => n + 1);
    }
  });

  const displayProgress = easeOut(
    lerp(stageProgress * 0.3, stageProgress, animProgressRef.current)
  );

  const branches = useMemo(
    () => {
      const lsParams = getLSystemParams(currentStage);
      return generateTreeBranches(lsParams, Math.max(0.01, displayProgress), params);
    },
    [currentStage, displayProgress, params.light, params.water, params.co2]
  );

  const flowerColorT = (params.co2 - 0.5) / 1.5;
  const flowerColor = interpolateColor('#ff69b4', '#8a2be2', flowerColorT);
  const leafGreenness = 0.4 + (params.light / 100) * 0.4;

  const handleDoubleClick = (e: any, branch: BranchData) => {
    e.stopPropagation();
    const levelNames = ['主干', '一级枝干', '二级枝干', '三级枝干', '四级枝干'];
    const name = levelNames[Math.min(branch.level, levelNames.length - 1)];
    const length = branch.start.distanceTo(branch.end).toFixed(2);
    const details = `长度${length}单位，叶片数${branch.leafCount}片${
      branch.hasFlowers ? `，花朵${branch.flowerCount}朵，果实${branch.fruitCount}个` : ''
    }`;
    setPartInfo({
      visible: true,
      x: (e as any).nativeEvent?.clientX ?? 0,
      y: (e as any).nativeEvent?.clientY ?? 0,
      name,
      details,
    });
  };

  const handleSceneClick = () => {
    setPartInfo({ visible: false, x: 0, y: 0, name: '', details: '' });
  };

  return (
    <group ref={groupRef} onClick={handleSceneClick}>
      {currentStage === GrowthStage.SEED && (
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.15 * Math.max(0.1, displayProgress), 16, 12]} />
          <meshStandardMaterial color="#8b4513" roughness={0.8} />
        </mesh>
      )}

      {branches.map((branch, idx) => {
        const direction = new THREE.Vector3()
          .subVectors(branch.end, branch.start)
          .normalize();
        const length = branch.start.distanceTo(branch.end);
        const midpoint = new THREE.Vector3()
          .addVectors(branch.start, branch.end)
          .multiplyScalar(0.5);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

        const leafPositions: [number, number, number][] = [];
        if (branch.hasLeaves) {
          for (let i = 0; i < branch.leafCount; i++) {
            const t = 0.3 + (i / branch.leafCount) * 0.7;
            const lp = new THREE.Vector3()
              .addVectors(
                branch.start.clone().multiplyScalar(1 - t),
                branch.end.clone().multiplyScalar(t)
              );
            const offset = new THREE.Vector3(
              (Math.random() - 0.5) * 0.2,
              (Math.random() - 0.5) * 0.1,
              (Math.random() - 0.5) * 0.2
            );
            lp.add(offset);
            leafPositions.push([lp.x, lp.y, lp.z]);
          }
        }

        const flowerPositions: [number, number, number][] = [];
        if (branch.hasFlowers) {
          for (let i = 0; i < branch.flowerCount; i++) {
            const t = 0.6 + (i / branch.flowerCount) * 0.4;
            const fp = new THREE.Vector3()
              .addVectors(
                branch.start.clone().multiplyScalar(1 - t),
                branch.end.clone().multiplyScalar(t)
              );
            const offset = new THREE.Vector3(
              (Math.random() - 0.5) * 0.15,
              Math.random() * 0.05,
              (Math.random() - 0.5) * 0.15
            );
            fp.add(offset);
            flowerPositions.push([fp.x, fp.y, fp.z]);
          }
        }

        const fruitPositions: [number, number, number][] = [];
        if (branch.hasFlowers) {
          for (let i = 0; i < branch.fruitCount; i++) {
            const t = 0.7 + (i / branch.fruitCount) * 0.3;
            const fp = new THREE.Vector3()
              .addVectors(
                branch.start.clone().multiplyScalar(1 - t),
                branch.end.clone().multiplyScalar(t)
              );
            const offset = new THREE.Vector3(
              (Math.random() - 0.5) * 0.12,
              Math.random() * 0.08,
              (Math.random() - 0.5) * 0.12
            );
            fp.add(offset);
            fruitPositions.push([fp.x, fp.y, fp.z]);
          }
        }

        return (
          <group key={idx}>
            <mesh
              position={midpoint}
              quaternion={quaternion}
              onDoubleClick={(e) => handleDoubleClick(e, branch)}
            >
              <cylinderGeometry
                args={[branch.radius * 0.7, branch.radius, Math.max(0.01, length), 8]}
              />
              <meshStandardMaterial
                color={new THREE.Color().setHSL(0.08, 0.4, 0.2 + branch.level * 0.03)}
                roughness={0.9}
              />
            </mesh>

            {leafPositions.map((pos, li) => (
              <mesh key={`leaf-${idx}-${li}`} position={pos}>
                <sphereGeometry args={[0.04, 6, 4]} />
                <meshStandardMaterial
                  color={new THREE.Color().setHSL(0.3, 0.6, leafGreenness)}
                  transparent
                  opacity={0.85}
                  roughness={0.6}
                />
              </mesh>
            ))}

            {flowerPositions.map((pos, fi) => (
              <mesh key={`flower-${idx}-${fi}`} position={pos}>
                <sphereGeometry args={[0.06, 8, 6]} />
                <meshStandardMaterial
                  color={flowerColor}
                  emissive={flowerColor}
                  emissiveIntensity={0.2}
                  roughness={0.5}
                />
              </mesh>
            ))}

            {fruitPositions.map((pos, fri) => (
              <mesh key={`fruit-${idx}-${fri}`} position={pos}>
                <sphereGeometry args={[0.05, 8, 6]} />
                <meshStandardMaterial
                  color="#ffa500"
                  emissive="#ff6600"
                  emissiveIntensity={0.1}
                  roughness={0.5}
                />
              </mesh>
            ))}
          </group>
        );
      })}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#1a1a2a" roughness={1} />
      </mesh>
    </group>
  );
};

const CameraController: React.FC = () => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    camera.position.set(4, 3, 6);
    camera.lookAt(0, 2, 0);
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.3}
      minDistance={0.5}
      maxDistance={5.0}
      zoomSpeed={1.2}
      target={[0, 2, 0]}
    />
  );
};

const TreeScene: React.FC = () => {
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#0d0d1a']} />
      <fog attach="fog" args={['#0d0d1a', 8, 15]} />

      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} color="#fff8e7" />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} color="#88aaff" />
      <pointLight position={[0, 4, 0]} intensity={0.5} color="#00d4aa" distance={8} />

      <CameraController />
      <Tree />
      <Particles />
    </Canvas>
  );
};

export default TreeScene;
