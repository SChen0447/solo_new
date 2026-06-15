import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore, ViewMode, LightMode, type PointData } from './store';
import {
  generatePresetPoints,
  generatePoissonDiskSampling,
  getPointColor,
  parsePointCloud,
  type ParsedCloud
} from './cloudParser';
import {
  buildBuildingMesh,
  deformWithControlPoints,
  chamferSmooth,
  updateWireframe,
  type BuildingResult
} from './buildingBuilder';
import {
  computeSection,
  createCutPlaneMesh,
  createSectionFillMesh,
  createSectionOutline,
  splitMeshByPlane,
  type SectionData
} from './sectionAnalyzer';

const CAMERA_POSITIONS: Record<ViewMode, THREE.Vector3> = {
  top: new THREE.Vector3(0, 35, 0.01),
  front: new THREE.Vector3(0, 0, 35),
  side: new THREE.Vector3(35, 0, 0),
  free: new THREE.Vector3(18, 15, 22)
};

const LIGHT_POSITIONS = [
  new THREE.Vector3(10, 15, 10),
  new THREE.Vector3(-10, 10, -8),
  new THREE.Vector3(5, 8, -12)
];

const LIGHT_COLORS = [0xfff5cc, 0xccffcc, 0xffcccc];

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

interface CameraControllerProps {
  controlsRef: React.MutableRefObject<any>;
}

const CameraController: React.FC<CameraControllerProps> = ({ controlsRef }) => {
  const { camera } = useThree();
  const viewMode = useAppStore(s => s.viewMode);
  const prevModeRef = useRef<ViewMode>('free');
  const animRef = useRef<{ start: THREE.Vector3; target: THREE.Vector3; progress: number; active: boolean }>({
    start: new THREE.Vector3(),
    target: new THREE.Vector3(),
    progress: 0,
    active: false
  });
  const lookAnimRef = useRef<{ start: THREE.Vector3; target: THREE.Vector3; progress: number; active: boolean }>({
    start: new THREE.Vector3(),
    target: new THREE.Vector3(),
    progress: 0,
    active: false
  });

  useEffect(() => {
    if (viewMode !== prevModeRef.current) {
      animRef.current.start.copy(camera.position);
      animRef.current.target.copy(CAMERA_POSITIONS[viewMode]);
      animRef.current.progress = 0;
      animRef.current.active = true;

      if (controlsRef.current) {
        lookAnimRef.current.start.copy(controlsRef.current.target || new THREE.Vector3());
        lookAnimRef.current.target.set(0, 0, 0);
        lookAnimRef.current.progress = 0;
        lookAnimRef.current.active = true;
      }
      prevModeRef.current = viewMode;
    }
  }, [viewMode, camera, controlsRef]);

  useFrame((_, delta) => {
    const speed = delta / 0.6;
    if (animRef.current.active) {
      animRef.current.progress = Math.min(1, animRef.current.progress + speed);
      const t = easeInOut(animRef.current.progress);
      camera.position.lerpVectors(animRef.current.start, animRef.current.target, t);
      if (animRef.current.progress >= 1) animRef.current.active = false;
    }
    if (lookAnimRef.current.active && controlsRef.current) {
      lookAnimRef.current.progress = Math.min(1, lookAnimRef.current.progress + speed);
      const t = easeInOut(lookAnimRef.current.progress);
      const newTarget = new THREE.Vector3().lerpVectors(
        lookAnimRef.current.start,
        lookAnimRef.current.target,
        t
      );
      controlsRef.current.target = newTarget;
      if (lookAnimRef.current.progress >= 1) lookAnimRef.current.active = false;
    }
  });

  return null;
};

interface LightingSetupProps {
  lightRefs: React.MutableRefObject<(THREE.PointLight | null)[]>;
}

const LightingSetup: React.FC<LightingSetupProps> = ({ lightRefs }) => {
  const lightMode = useAppStore(s => s.lightMode);
  const ambientRef = useRef<THREE.AmbientLight>(null!);
  const dirRef = useRef<THREE.DirectionalLight>(null!);
  const hemiRef = useRef<THREE.HemisphereLight>(null!);
  const pointRef1 = useRef<THREE.PointLight>(null!);
  const pointRef2 = useRef<THREE.PointLight>(null!);
  const pointRef3 = useRef<THREE.PointLight>(null!);

  const intensitiesRef = useRef({
    ambient: 1, dir: 1, hemiSky: 1, hemiGround: 0.5,
    point1: 1, point2: 1, point3: 1
  });
  const targetsRef = useRef({
    ambient: 0, dir: 0, hemiSky: 0, hemiGround: 0,
    point1: 0, point2: 0, point3: 0
  });

  useEffect(() => {
    lightRefs.current = [pointRef1.current, pointRef2.current, pointRef3.current];
    switch (lightMode) {
      case 'ambient':
        targetsRef.current = { ambient: 0.55, dir: 0.9, hemiSky: 0, hemiGround: 0, point1: 0, point2: 0, point3: 0 };
        break;
      case 'points':
        targetsRef.current = { ambient: 0.2, dir: 0, hemiSky: 0, hemiGround: 0, point1: 1.1, point2: 0.9, point3: 0.8 };
        break;
      case 'hemisphere':
        targetsRef.current = { ambient: 0, dir: 0, hemiSky: 1.0, hemiGround: 0.4, point1: 0, point2: 0, point3: 0 };
        break;
    }
  }, [lightMode, lightRefs]);

  useFrame((_, delta) => {
    const speed = delta / 0.4;
    const i = intensitiesRef.current;
    const t = targetsRef.current;
    const lerp = (a: number, b: number) => a + (b - a) * Math.min(1, speed);
    i.ambient = lerp(i.ambient, t.ambient);
    i.dir = lerp(i.dir, t.dir);
    i.hemiSky = lerp(i.hemiSky, t.hemiSky);
    i.hemiGround = lerp(i.hemiGround, t.hemiGround);
    i.point1 = lerp(i.point1, t.point1);
    i.point2 = lerp(i.point2, t.point2);
    i.point3 = lerp(i.point3, t.point3);
    if (ambientRef.current) ambientRef.current.intensity = i.ambient;
    if (dirRef.current) dirRef.current.intensity = i.dir;
    if (hemiRef.current) {
      hemiRef.current.intensity = i.hemiSky;
    }
    if (pointRef1.current) pointRef1.current.intensity = i.point1;
    if (pointRef2.current) pointRef2.current.intensity = i.point2;
    if (pointRef3.current) pointRef3.current.intensity = i.point3;
  });

  return (
    <>
      <ambientLight ref={ambientRef} args={[0xffffff, 0]} />
      <directionalLight
        ref={dirRef}
        args={[0xffffff, 0]}
        position={[12, 18, 10]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight ref={hemiRef} args={[0xbfd4ff, 0x443322, 0]} />

      <pointLight
        ref={pointRef1}
        args={[LIGHT_COLORS[0], 0, 60, 2]}
        position={LIGHT_POSITIONS[0].toArray()}
        castShadow
      />
      <pointLight
        ref={pointRef2}
        args={[LIGHT_COLORS[1], 0, 60, 2]}
        position={LIGHT_POSITIONS[1].toArray()}
      />
      <pointLight
        ref={pointRef3}
        args={[LIGHT_COLORS[2], 0, 60, 2]}
        position={LIGHT_POSITIONS[2].toArray()}
      />

      {lightMode === 'points' && LIGHT_POSITIONS.map((pos, i) => (
        <mesh key={i} position={pos.toArray()}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color={LIGHT_COLORS[i]} transparent opacity={0.75} />
        </mesh>
      ))}
    </>
  );
};

interface PointCloudViewProps {
  parsedRef: React.MutableRefObject<ParsedCloud | null>;
}

const PointCloudView: React.FC<PointCloudViewProps> = ({ parsedRef }) => {
  const points = useAppStore(s => s.points);
  const [zRange, setZRange] = useState({ min: -10, max: 10 });

  useEffect(() => {
    if (points.length > 0) {
      let zMin = Infinity, zMax = -Infinity;
      for (const p of points) {
        zMin = Math.min(zMin, p.z);
        zMax = Math.max(zMax, p.z);
      }
      setZRange({ min: zMin, max: zMax });
    }
  }, [points]);

  if (points.length === 0) return null;

  return (
    <group>
      {points.map((p, i) => {
        const color = getPointColor(p.z, zRange.min, zRange.max);
        return (
          <mesh key={i} position={[p.x, p.y, p.z]}>
            <sphereGeometry args={[0.15, 12, 12]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.2}
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
};

interface BuildingViewProps {
  parsedRef: React.MutableRefObject<ParsedCloud | null>;
  buildingResultRef: React.MutableRefObject<BuildingResult | null>;
  setBuildingMesh: (m: THREE.Mesh | null) => void;
  setWireframeMesh: (w: THREE.LineSegments | null) => void;
  setControlPoints: (cp: PointData[]) => void;
  setBuildingBounds: (b: any) => void;
}

const BuildingView: React.FC<BuildingViewProps> = ({
  parsedRef,
  buildingResultRef,
  setBuildingMesh,
  setWireframeMesh,
  setControlPoints,
  setBuildingBounds
}) => {
  const rebuildVersion = useAppStore(s => s.rebuildVersion);
  const heightScale = useAppStore(s => s.heightScale);
  const smoothIterations = useAppStore(s => s.smoothIterations);
  const points = useAppStore(s => s.points);
  const hoverWireframe = useAppStore(s => s.hoverWireframe);
  const setHoverWireframe = useAppStore(s => s.setHoverWireframe);

  const groupRef = useRef<THREE.Group>(null!);
  const wireframeColorRef = useRef<THREE.Color>(new THREE.Color(0x00aaff));

  useEffect(() => {
    if (!parsedRef.current || points.length === 0) return;

    const t0 = performance.now();
    const result = buildBuildingMesh(parsedRef.current, heightScale, smoothIterations);
    const elapsed = performance.now() - t0;
    console.log(`Building generated in ${elapsed.toFixed(1)}ms`);

    buildingResultRef.current = result;
    setBuildingMesh(result.mesh);
    setWireframeMesh(result.wireframe);
    setControlPoints(result.controlPoints);
    setBuildingBounds(result.bounds);

    if (groupRef.current) {
      while (groupRef.current.children.length > 0) {
        const c = groupRef.current.children[0];
        groupRef.current.remove(c);
      }
      groupRef.current.add(result.mesh);
      groupRef.current.add(result.wireframe);
    }
  }, [parsedRef, points, rebuildVersion, heightScale, smoothIterations, setBuildingMesh, setWireframeMesh, setControlPoints, setBuildingBounds, buildingResultRef]);

  useFrame(() => {
    if (!buildingResultRef.current) return;
    const wireMat = buildingResultRef.current.wireframe.material as THREE.LineBasicMaterial;
    const targetColor = hoverWireframe ? 0xff8800 : 0x00aaff;
    const tc = new THREE.Color(targetColor);
    wireframeColorRef.current.lerp(tc, 0.15);
    wireMat.color.copy(wireframeColorRef.current);
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={() => setHoverWireframe(true)}
      onPointerOut={() => setHoverWireframe(false)}
    />
  );
};

interface ControlPointsHandlerProps {
  buildingResultRef: React.MutableRefObject<BuildingResult | null>;
}

const ControlPointsHandler: React.FC<ControlPointsHandlerProps> = ({ buildingResultRef }) => {
  const controlPoints = useAppStore(s => s.controlPoints);
  const selectedId = useAppStore(s => s.selectedControlPointId);
  const setSelectedId = useAppStore(s => s.setSelectedControlPointId);
  const updateControlPointPosition = useAppStore(s => s.updateControlPointPosition);
  const triggerRebuild = useAppStore(s => s.triggerRebuild);
  const setControlPoints = useAppStore(s => s.setControlPoints);
  const setBuildingBounds = useAppStore(s => s.setBuildingBounds);
  const setWireframeMesh = useAppStore(s => s.setWireframeMesh);
  const { camera, gl } = useThree();

  const draggingRef = useRef<{ id: number; lastX: number; lastY: number; active: boolean }>({
    id: -1, lastX: 0, lastY: 0, active: false
  });
  const pulseRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null!);
  const scalesRef = useRef<Map<number, number>>(new Map());

  useFrame((state, delta) => {
    pulseRef.current += delta / 0.6;
    const pulseT = (Math.sin(pulseRef.current * Math.PI * 2) + 1) / 2;
    const pulse = 1 + pulseT * 0.2;

    if (groupRef.current) {
      for (let i = 0; i < groupRef.current.children.length; i++) {
        const child = groupRef.current.children[i] as THREE.Mesh;
        const cp = controlPoints[i];
        if (!cp) continue;
        const isSelected = cp.id === selectedId;
        const currentScale = scalesRef.current.get(cp.id) || 0.3;
        const target = isSelected ? 0.5 : 0.3;
        const newScale = currentScale + (target - currentScale) * 0.2;
        scalesRef.current.set(cp.id, newScale);
        const s = isSelected ? newScale * pulse : newScale;
        child.scale.setScalar(s);

        const mat = child.material as THREE.MeshStandardMaterial;
        if (isSelected) {
          mat.color.setRGB(1, 1, 1);
          mat.emissive.setRGB(0.4, 0.4, 0.4);
          mat.emissiveIntensity = 0.8;
        } else {
          mat.color.setRGB(1, 0.84, 0);
          mat.emissive.setRGB(1, 0.6, 0);
          mat.emissiveIntensity = 0.4;
        }
      }
    }
  });

  const handlePointerDown = useCallback((e: any, cp: PointData) => {
    e.stopPropagation();
    setSelectedId(cp.id);
    draggingRef.current = { id: cp.id, lastX: e.clientX, lastY: e.clientY, active: true };
    (document.body.style as any).cursor = 'grabbing';
    e.target.setPointerCapture?.(e.pointerId);
  }, [setSelectedId]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!draggingRef.current.active) return;
      const { id, lastX, lastY } = draggingRef.current;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      draggingRef.current.lastX = e.clientX;
      draggingRef.current.lastY = e.clientY;

      const cp = controlPoints.find(c => c.id === id);
      const result = buildingResultRef.current;
      if (!cp || !result) return;

      const delta2D = Math.sqrt(dx * dx + dy * dy);
      if (delta2D < 0.5) return;

      const cameraRight = new THREE.Vector3();
      const cameraUp = new THREE.Vector3();
      camera.matrixWorld.extractBasis(cameraRight, cameraUp, new THREE.Vector3());

      const dirVec = new THREE.Vector3()
        .addScaledVector(cameraRight, dx * 0.01)
        .addScaledVector(cameraUp, -dy * 0.01);

      if (dirVec.lengthSq() < 1e-8) return;

      const newPos = cp.position.clone().add(dirVec);
      updateControlPointPosition(id, newPos);

      deformWithControlPoints(result.mesh, controlPoints, id, 2.0);

      const newWire = updateWireframe(result.mesh);
      setWireframeMesh(newWire);
      if (result.mesh.parent) {
        const parent = result.mesh.parent;
        const oldWireIdx = parent.children.indexOf(result.wireframe);
        if (oldWireIdx >= 0) {
          parent.remove(result.wireframe);
          parent.add(newWire);
          result.wireframe = newWire;
        }
      }

      const bbox = new THREE.Box3().setFromObject(result.mesh);
      setBuildingBounds({ min: bbox.min.clone(), max: bbox.max.clone() });
    };

    const handleUp = () => {
      if (!draggingRef.current.active) return;
      const { id } = draggingRef.current;
      draggingRef.current.active = false;
      (document.body.style as any).cursor = '';

      const result = buildingResultRef.current;
      if (result) {
        chamferSmooth(result.mesh.geometry, 3);
        const newWire = updateWireframe(result.mesh);
        setWireframeMesh(newWire);
        if (result.mesh.parent) {
          const parent = result.mesh.parent;
          const oldWireIdx = parent.children.indexOf(result.wireframe);
          if (oldWireIdx >= 0) {
            parent.remove(result.wireframe);
            parent.add(newWire);
            result.wireframe = newWire;
          }
        }
        const bbox = new THREE.Box3().setFromObject(result.mesh);
        setBuildingBounds({ min: bbox.min.clone(), max: bbox.max.clone() });

        const newCP = controlPoints.map(cp => ({
          ...cp,
          originalPosition: cp.position.clone()
        }));
        setControlPoints(newCP);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [controlPoints, buildingResultRef, camera, updateControlPointPosition, setWireframeMesh, setBuildingBounds, setControlPoints]);

  return (
    <group ref={groupRef}>
      {controlPoints.map(cp => (
        <mesh
          key={cp.id}
          position={[cp.position.x, cp.position.y, cp.position.z]}
          onPointerDown={(e) => handlePointerDown(e, cp)}
          onPointerOver={() => { if (!draggingRef.current.active) (document.body.style as any).cursor = 'grab'; }}
          onPointerOut={() => { if (!draggingRef.current.active) (document.body.style as any).cursor = ''; }}
        >
          <sphereGeometry args={[0.3, 24, 24]} />
          <meshStandardMaterial
            color={0xffd700}
            emissive={0xff6600}
            emissiveIntensity={0.4}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
};

interface SectionViewProps {
  buildingResultRef: React.MutableRefObject<BuildingResult | null>;
}

const SectionView: React.FC<SectionViewProps> = ({ buildingResultRef }) => {
  const cutHeight = useAppStore(s => s.cutHeight);
  const buildingBounds = useAppStore(s => s.buildingBounds);
  const setSectionResult = useAppStore(s => s.setSectionResult);

  const groupRef = useRef<THREE.Group>(null!);
  const sectionDataRef = useRef<SectionData | null>(null);
  const lastCutRef = useRef(-1);

  useEffect(() => {
    if (!buildingResultRef.current || !buildingBounds) return;
    if (Math.abs(lastCutRef.current - cutHeight) < 0.0001 && groupRef.current && groupRef.current.children.length > 0) return;
    lastCutRef.current = cutHeight;

    const t0 = performance.now();
    const result = computeSection(buildingResultRef.current.mesh, cutHeight, buildingBounds);
    sectionDataRef.current = result;
    const elapsed = performance.now() - t0;

    if (groupRef.current) {
      while (groupRef.current.children.length > 0) {
        const c = groupRef.current.children[0];
        groupRef.current.remove(c);
      }
    }

    const planeMesh = createCutPlaneMesh(buildingBounds, cutHeight);
    groupRef.current?.add(planeMesh);

    if (result && result.fillGeometry.getAttribute('position')) {
      const posAttr = result.fillGeometry.getAttribute('position');
      if (posAttr && posAttr.count >= 3) {
        const fillMesh = createSectionFillMesh(result.fillGeometry);
        groupRef.current?.add(fillMesh);
      }
      if (result.outlinePoints.length >= 2) {
        const outline = createSectionOutline(result.outlinePoints);
        groupRef.current?.add(outline);
      }
      setSectionResult({
        polygon: result.polygon,
        area: Math.round(result.area * 10) / 10,
        perimeter: Math.round(result.perimeter * 10) / 10,
        fillMesh: null,
        outlineLine: null
      });
    } else {
      setSectionResult(null);
    }
  }, [cutHeight, buildingBounds, buildingResultRef, setSectionResult]);

  return <group ref={groupRef} />;
};

export const SceneSetup: React.FC = () => {
  const parsedRef = useRef<ParsedCloud | null>(null);
  const buildingResultRef = useRef<BuildingResult | null>(null);
  const controlsRef = useRef<any>(null);
  const lightRefs = useRef<(THREE.PointLight | null)[]>([]);
  const points = useAppStore(s => s.points);
  const setPoints = useAppStore(s => s.setPoints);
  const setBuildingMesh = useAppStore(s => s.setBuildingMesh);
  const setWireframeMesh = useAppStore(s => s.setWireframeMesh);
  const setControlPoints = useAppStore(s => s.setControlPoints);
  const setBuildingBounds = useAppStore(s => s.setBuildingBounds);
  const triggerRebuild = useAppStore(s => s.triggerRebuild);

  const handleLoadPreset = useCallback(() => {
    const t0 = performance.now();
    const preset = generatePresetPoints();
    parsedRef.current = parsePointCloud(preset);
    const elapsed = performance.now() - t0;
    console.log(`Preset parsed in ${elapsed.toFixed(1)}ms (${preset.length} points)`);
    setPoints(preset);
    triggerRebuild();
  }, [setPoints, triggerRebuild]);

  const handleRandom = useCallback(() => {
    const t0 = performance.now();
    const rand = generatePoissonDiskSampling(20, 20, 20, 0.5, 500);
    parsedRef.current = parsePointCloud(rand);
    const elapsed = performance.now() - t0;
    console.log(`Random generated in ${elapsed.toFixed(1)}ms (${rand.length} points)`);
    setPoints(rand);
    triggerRebuild();
  }, [setPoints, triggerRebuild]);

  useEffect(() => {
    (window as any).__buildingActions = {
      loadPreset: handleLoadPreset,
      loadRandom: handleRandom
    };
    handleLoadPreset();
    return () => { delete (window as any).__buildingActions; };
  }, [handleLoadPreset, handleRandom]);

  return (
    <Canvas
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #0a1020 0%, #141428 60%, #1a1a30 100%)' }}
    >
      <PerspectiveCamera makeDefault position={[18, 15, 22]} fov={50} />
      <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} makeDefault />
      <CameraController controlsRef={controlsRef} />
      <LightingSetup lightRefs={lightRefs} />

      <Grid
        position={[0, -10.2, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2a2a44"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#3a3a5a"
        fadeDistance={60}
        fadeStrength={0.8}
        infiniteGrid
      />

      <Stars radius={80} depth={40} count={1500} factor={3} fade speed={0.5} />

      <PointCloudView parsedRef={parsedRef} />
      <BuildingView
        parsedRef={parsedRef}
        buildingResultRef={buildingResultRef}
        setBuildingMesh={setBuildingMesh}
        setWireframeMesh={setWireframeMesh}
        setControlPoints={setControlPoints}
        setBuildingBounds={setBuildingBounds}
      />
      <ControlPointsHandler buildingResultRef={buildingResultRef} />
      <SectionView buildingResultRef={buildingResultRef} />
    </Canvas>
  );
};
