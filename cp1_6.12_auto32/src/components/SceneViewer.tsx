import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useProductStore } from '../store/productStore';
import type { PartName, MaterialType, AccessoryId } from '../store/productStore';

function getMaterialProps(material: MaterialType, color: string) {
  const base = new THREE.Color(color);
  switch (material) {
    case 'metal':
      return { color: base, metalness: 0.9, roughness: 0.15, clearcoat: 0.3, clearcoatRoughness: 0.1 };
    case 'plastic':
      return { color: base, metalness: 0.0, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.2 };
    case 'matte':
      return { color: base, metalness: 0.05, roughness: 0.85, clearcoat: 0.0, clearcoatRoughness: 0.5 };
    case 'glossy':
      return { color: base, metalness: 0.1, roughness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.05 };
    default:
      return { color: base, metalness: 0.1, roughness: 0.5 };
  }
}

function AnimatedMaterial({ material, color }: { material: MaterialType; color: string }) {
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const targetProps = useMemo(() => getMaterialProps(material, color), [material, color]);

  useEffect(() => {
    if (!matRef.current) return;
    const mat = matRef.current;
    const targetColor = new THREE.Color(color);
    const startColor = mat.color.clone();
    const startMetalness = mat.metalness;
    const startRoughness = mat.roughness;
    let elapsed = 0;
    const duration = 0.3;

    const animate = () => {
      elapsed += 0.016;
      const t = Math.min(elapsed / duration, 1);
      const ease = t * (2 - t);
      mat.color.copy(startColor).lerp(targetColor, ease);
      mat.metalness = startMetalness + (targetProps.metalness - startMetalness) * ease;
      mat.roughness = startRoughness + (targetProps.roughness - startRoughness) * ease;
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [material, color, targetProps]);

  return (
    <meshPhysicalMaterial
      ref={matRef}
      color={targetProps.color}
      metalness={targetProps.metalness}
      roughness={targetProps.roughness}
      clearcoat={targetProps.clearcoat}
      clearcoatRoughness={targetProps.clearcoatRoughness}
    />
  );
}

function LampBase({ config, groupRef }: { config: { color: string; material: MaterialType }; groupRef: React.RefObject<THREE.Group> }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const r1 = 1.0, r2 = 0.9, r3 = 0.55, h = 0.3;
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(r1, 0));
    points.push(new THREE.Vector2(r1, 0.03));
    points.push(new THREE.Vector2(r2, 0.06));
    points.push(new THREE.Vector2(r2, 0.06));
    const segs = 12;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const r = r2 - (r2 - r3) * t;
      const y = 0.06 + (h - 0.06) * Math.pow(t, 0.6);
      points.push(new THREE.Vector2(r, y));
    }
    points.push(new THREE.Vector2(r3, h));
    points.push(new THREE.Vector2(0, h));
    return new THREE.LatheGeometry(points, 64);
  }, []);

  return (
    <group ref={groupRef} name="base-group">
      <mesh geometry={geometry} castShadow receiveShadow position={[0, 0, 0]}>
        <AnimatedMaterial material={config.material} color={config.color} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <torusGeometry args={[0.52, 0.04, 16, 64]} />
        <AnimatedMaterial material={config.material} color={config.color} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.06, 32]} />
        <AnimatedMaterial material={config.material} color={config.color} />
      </mesh>
    </group>
  );
}

function LampPole({ config, groupRef, baseExtenderActive }: { config: { color: string; material: MaterialType }; groupRef: React.RefObject<THREE.Group>; baseExtenderActive: boolean }) {
  const yOffset = baseExtenderActive ? 0.16 : 0;
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.1, 0));
    const segs = 8;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const r = 0.1 - 0.02 * Math.sin(t * Math.PI);
      const y = t * 2.3;
      points.push(new THREE.Vector2(r, y));
    }
    points.push(new THREE.Vector2(0.08, 2.3));
    points.push(new THREE.Vector2(0, 2.3));
    return new THREE.LatheGeometry(points, 32);
  }, []);

  return (
    <group ref={groupRef} name="pole-group" position={[0, 0.36 + yOffset, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <AnimatedMaterial material={config.material} color={config.color} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.15, 0]}>
        <torusGeometry args={[0.13, 0.02, 12, 32]} />
        <AnimatedMaterial material={config.material} color={config.color} />
      </mesh>
    </group>
  );
}

function LampShade({ config, groupRef, yOffset }: { config: { color: string; material: MaterialType }; groupRef: React.RefObject<THREE.Group>; yOffset: number }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.14, 0));
    points.push(new THREE.Vector2(0.14, 0.04));
    const segs = 16;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const r = 0.14 + (0.65 - 0.14) * Math.pow(t, 0.7);
      const y = 0.04 + t * 0.5;
      points.push(new THREE.Vector2(r, y));
    }
    points.push(new THREE.Vector2(0.65, 0.54));
    points.push(new THREE.Vector2(0.62, 0.56));
    for (let i = segs; i >= 0; i--) {
      const t = i / segs;
      const r = 0.12 + (0.6 - 0.12) * Math.pow(t, 0.7);
      const y = 0.04 + t * 0.5;
      points.push(new THREE.Vector2(r, y));
    }
    points.push(new THREE.Vector2(0.12, 0.04));
    points.push(new THREE.Vector2(0, 0.04));
    return new THREE.LatheGeometry(points, 64);
  }, []);

  return (
    <group ref={groupRef} name="shade-group" position={[0, 2.66 + yOffset, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <AnimatedMaterial material={config.material} color={config.color} />
      </mesh>
    </group>
  );
}

function FlowerShade({ yOffset }: { yOffset: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const petals = 8;
    const innerR = 0.2;
    const outerR = 0.7;
    const petalW = 0.12;

    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2;
      const nextAngle = ((i + 1) / petals) * Math.PI * 2;
      const midAngle = (angle + nextAngle) / 2;
      const x1 = Math.cos(angle) * innerR;
      const y1 = Math.sin(angle) * innerR;
      const cx = Math.cos(midAngle) * outerR;
      const cy = Math.sin(midAngle) * outerR;
      const x2 = Math.cos(nextAngle) * innerR;
      const y2 = Math.sin(nextAngle) * innerR;

      if (i === 0) shape.moveTo(x1, y1);
      shape.quadraticCurveTo(
        Math.cos(midAngle - 0.15) * (innerR + petalW),
        Math.sin(midAngle - 0.15) * (innerR + petalW),
        cx, cy
      );
      shape.quadraticCurveTo(
        Math.cos(midAngle + 0.15) * (innerR + petalW),
        Math.sin(midAngle + 0.15) * (innerR + petalW),
        x2, y2
      );
    }

    const extrudeSettings = { depth: 0.5, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 4, curveSegments: 32 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  return (
    <group position={[0, 2.66 + yOffset, 0]} name="flower-shade">
      <mesh geometry={geometry} castShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.25, 0]}>
        <meshPhysicalMaterial color="#f5f5dc" metalness={0.05} roughness={0.4} clearcoat={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function ConeShade({ yOffset }: { yOffset: number }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.12, 0));
    points.push(new THREE.Vector2(0.12, 0.03));
    const segs = 12;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const r = 0.12 + (0.5 - 0.12) * t;
      const y = 0.03 + t * 0.8;
      points.push(new THREE.Vector2(r, y));
    }
    points.push(new THREE.Vector2(0.5, 0.83));
    points.push(new THREE.Vector2(0.48, 0.85));
    for (let i = segs; i >= 0; i--) {
      const t = i / segs;
      const r = 0.1 + (0.46 - 0.1) * t;
      const y = 0.03 + t * 0.8;
      points.push(new THREE.Vector2(r, y));
    }
    points.push(new THREE.Vector2(0.1, 0.03));
    points.push(new THREE.Vector2(0, 0.03));
    return new THREE.LatheGeometry(points, 64);
  }, []);

  return (
    <group position={[0, 2.66 + yOffset, 0]} name="cone-shade">
      <mesh geometry={geometry} castShadow>
        <meshPhysicalMaterial color="#f0f0f0" metalness={0.05} roughness={0.35} clearcoat={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function DecoRing({ yOffset }: { yOffset: number }) {
  return (
    <group position={[0, 2.2 + yOffset, 0]} name="deco-ring">
      <mesh castShadow>
        <torusGeometry args={[0.18, 0.035, 16, 64]} />
        <meshPhysicalMaterial color="#d4af37" metalness={0.95} roughness={0.1} clearcoat={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.04, 0]}>
        <torusGeometry args={[0.18, 0.02, 12, 64]} />
        <meshPhysicalMaterial color="#c9a84c" metalness={0.9} roughness={0.15} />
      </mesh>
    </group>
  );
}

function BaseExtender() {
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.95, 0));
    points.push(new THREE.Vector2(0.95, 0.04));
    points.push(new THREE.Vector2(0.92, 0.08));
    points.push(new THREE.Vector2(0.55, 0.14));
    points.push(new THREE.Vector2(0, 0.16));
    return new THREE.LatheGeometry(points, 64);
  }, []);

  return (
    <group position={[0, 0.3, 0]} name="base-extender">
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial color="#3a3a3a" metalness={0.2} roughness={0.6} />
      </mesh>
    </group>
  );
}

function AccessoryManager() {
  const accessories = useProductStore((s) => s.currentConfig.accessories);
  const hasBaseExtender = accessories.includes('base-extender');
  const yOffset = hasBaseExtender ? 0.16 : 0;

  return (
    <>
      {accessories.includes('shade-flower') && <FlowerShade yOffset={yOffset} />}
      {accessories.includes('shade-cone') && <ConeShade yOffset={yOffset} />}
      {accessories.includes('deco-ring') && <DecoRing yOffset={yOffset} />}
      {accessories.includes('base-extender') && <BaseExtender />}
    </>
  );
}

function LampModel() {
  const config = useProductStore((s) => s.currentConfig);
  const isResetting = useProductStore((s) => s.isResetting);
  const baseGroupRef = useRef<THREE.Group>(null!);
  const poleGroupRef = useRef<THREE.Group>(null!);
  const shadeGroupRef = useRef<THREE.Group>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const hasBaseExtender = config.accessories.includes('base-extender');

  useFrame(() => {
    if (!groupRef.current) return;
    if (isResetting) {
      const t = performance.now() / 1000;
      const opacity = Math.abs(Math.sin(t * Math.PI));
      groupRef.current.scale.setScalar(0.95 + opacity * 0.05);
    } else {
      groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      <LampBase config={config.base} groupRef={baseGroupRef} />
      <LampPole config={config.pole} groupRef={poleGroupRef} baseExtenderActive={hasBaseExtender} />
      {!config.accessories.includes('shade-flower') && !config.accessories.includes('shade-cone') && (
        <LampShade config={config.shade} groupRef={shadeGroupRef} yOffset={hasBaseExtender ? 0.16 : 0} />
      )}
      <AccessoryManager />
    </group>
  );
}

function ResetOverlay() {
  const isResetting = useProductStore((s) => s.isResetting);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    if (isResetting) {
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0.6, 0.05);
    } else {
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, 0, 0.08);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 1.5, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial color="#2a2a2a" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

export interface SceneViewerRef {
  captureScreenshot: () => string | null;
}

const SceneViewer = React.forwardRef<SceneViewerRef>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useImperativeHandle(ref, () => ({
    captureScreenshot: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const renderer = (canvas as any).__reactThreeFiber?.gl;
      if (!renderer) return null;

      renderer.render(
        (canvas as any).__reactThreeFiber?.scene,
        (canvas as any).__reactThreeFiber?.camera
      );

      const dataUrl = canvas.toDataURL('image/png');
      return dataUrl;
    },
  }));

  return (
    <Canvas
      ref={canvasRef}
      shadows
      camera={{ position: [4, 4, 4], fov: 40 }}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 50%, #1a1a1a 100%)' }}
    >
      <fog attach="fog" args={['#2a2a2a', 8, 18]} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-near={0.1}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} />
      <pointLight position={[0, 3.5, 0]} intensity={0.4} color="#fff5e6" />

      <LampModel />
      <ResetOverlay />

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.4}
        scale={8}
        blur={2.5}
        far={4}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e1e1e" metalness={0.1} roughness={0.9} />
      </mesh>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2.5}
        maxDistance={10}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.1}
        target={[0, 1.5, 0]}
      />
    </Canvas>
  );
});

SceneViewer.displayName = 'SceneViewer';

function useSceneScreenshot(canvasRef: React.RefObject<SceneViewerRef>) {
  const captureWithOverlay = (configSummary: string): string | null => {
    const dataUrl = canvasRef.current?.captureScreenshot();
    if (!dataUrl) return null;

    const img = new Image();
    img.src = dataUrl;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 1280;
    canvas.height = 720;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const padding = 16;
    const lineHeight = 22;
    const lines = configSummary.split('\n');
    const boxHeight = lines.length * lineHeight + padding * 2;
    const boxWidth = 320;
    const x = canvas.width - boxWidth - 20;
    const y = canvas.height - boxHeight - 20;

    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Noto Sans SC", sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, x + padding, y + padding + (i + 1) * lineHeight - 4);
    });

    return canvas.toDataURL('image/png');
  };

  return { captureWithOverlay };
}

export { SceneViewer, useSceneScreenshot };
