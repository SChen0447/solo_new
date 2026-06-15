import { useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useCustomizerStore } from '@store/customizerStore';
import { Customizer3DControls } from './Customizer3DControls';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export interface Customizer3DHandle {
  takeSnapshot: () => string | null;
}

const HARDWARE_COLORS: Record<string, string> = {
  gold: '#ffd700',
  silver: '#c0c0c0',
  bronze: '#cd7f32',
};

const MATERIAL_ROUGHNESS: Record<string, number> = {
  'leather-001': 0.7,
  'leather-002': 0.6,
  'leather-003': 0.4,
  'leather-004': 0.8,
  'leather-005': 0.3,
};

function createLeatherTexture(colorHex: string, materialId: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 512, 512);

  const roughness = MATERIAL_ROUGHNESS[materialId] ?? 0.6;
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2 + 0.5;
    const alpha = Math.random() * 0.15 * roughness;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(x, y, size, size);
  }

  for (let i = 0; i < 80; i++) {
    ctx.beginPath();
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.moveTo(startX, startY);
    const length = Math.random() * 60 + 20;
    const angle = Math.random() * Math.PI * 2;
    ctx.lineTo(startX + Math.cos(angle) * length, startY + Math.sin(angle) * length);
    ctx.strokeStyle = `rgba(60, 40, 20, ${0.05 * roughness})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

interface BagMeshProps {
  colorHex: string;
  materialId: string;
  hardwareColor: string;
  buckleShape: string;
  rivetStyle: string;
}

function BagMesh({ colorHex, materialId, hardwareColor, buckleShape, rivetStyle }: BagMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  const leatherMaterial = useMemo(() => {
    const texture = createLeatherTexture(colorHex, materialId);
    return new THREE.MeshStandardMaterial({
      map: texture,
      color: new THREE.Color(colorHex),
      roughness: MATERIAL_ROUGHNESS[materialId] ?? 0.6,
      metalness: 0.05,
    });
  }, [colorHex, materialId]);

  const hardwareMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(HARDWARE_COLORS[hardwareColor] ?? '#c0c0c0'),
      metalness: 0.9,
      roughness: 0.2,
    });
  }, [hardwareColor]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  const rivetGeometry = useMemo(() => {
    switch (rivetStyle) {
      case 'flat':
        return new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16);
      case 'cross':
        return new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16);
      default:
        return new THREE.SphereGeometry(0.05, 16, 16);
    }
  }, [rivetStyle]);

  const buckleGeometry = useMemo(() => {
    switch (buckleShape) {
      case 'square':
        return new THREE.TorusGeometry(0.1, 0.03, 8, 4);
      case 'dshape':
        return new THREE.TorusGeometry(0.08, 0.025, 12, 16, Math.PI);
      default:
        return new THREE.TorusGeometry(0.08, 0.025, 12, 32);
    }
  }, [buckleShape]);

  const rivetPositions = [
    [-0.9, 0.9, 0.45], [0.9, 0.9, 0.45],
    [-0.9, 0.9, -0.45], [0.9, 0.9, -0.45],
    [-0.9, -0.9, 0.45], [0.9, -0.9, 0.45],
    [-0.9, -0.9, -0.45], [0.9, -0.9, -0.45],
  ];

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      <mesh geometry={new THREE.BoxGeometry(2, 2, 1)} material={leatherMaterial} position={[0, 0, 0]} />
      <mesh geometry={new THREE.BoxGeometry(1.9, 1.9, 0.02)} material={leatherMaterial} position={[0, 0, 0.51]} />

      <mesh
        geometry={new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16)}
        material={leatherMaterial}
        position={[-0.6, 1.4, 0]}
        rotation={[0, 0, Math.PI / 6]}
      />
      <mesh
        geometry={new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16)}
        material={leatherMaterial}
        position={[0.6, 1.4, 0]}
        rotation={[0, 0, -Math.PI / 6]}
      />
      <mesh
        geometry={new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16)}
        material={leatherMaterial}
        position={[-0.6, 1.4, -0.3]}
        rotation={[0, 0, Math.PI / 6]}
      />
      <mesh
        geometry={new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16)}
        material={leatherMaterial}
        position={[0.6, 1.4, -0.3]}
        rotation={[0, 0, -Math.PI / 6]}
      />

      <mesh
        geometry={new THREE.BoxGeometry(2.1, 0.08, 0.1)}
        material={hardwareMaterial}
        position={[0, 0.95, 0]}
      />
      <mesh
        geometry={new THREE.BoxGeometry(0.3, 0.12, 0.06)}
        material={hardwareMaterial}
        position={[0.3, 0.95, 0.06]}
      />

      {rivetPositions.map((pos, i) => (
        <mesh
          key={i}
          geometry={rivetGeometry}
          material={hardwareMaterial}
          position={pos as [number, number, number]}
        />
      ))}

      <mesh geometry={buckleGeometry} material={hardwareMaterial} position={[-0.5, 0.3, 0.55]} />
      <mesh geometry={buckleGeometry} material={hardwareMaterial} position={[0.5, 0.3, 0.55]} />

      <mesh geometry={new THREE.BoxGeometry(1.6, 1.5, 0.01)} material={leatherMaterial} position={[0, 0.1, -0.49]} />
    </group>
  );
}

interface Customizer3DContentProps {
  colorHex: string;
  materialId: string;
  hardwareColor: string;
  buckleShape: string;
  rivetStyle: string;
}

function Customizer3DContent({ colorHex, materialId, hardwareColor, buckleShape, rivetStyle }: Customizer3DContentProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.4} />
      <pointLight position={[0, 3, 2]} intensity={0.5} />

      <BagMesh
        colorHex={colorHex}
        materialId={materialId}
        hardwareColor={hardwareColor}
        buckleShape={buckleShape}
        rivetStyle={rivetStyle}
      />

      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
      />

      <Environment preset="studio" />
      <Customizer3DControls />
    </>
  );
}

export const Customizer3D = forwardRef<Customizer3DHandle>(function Customizer3D(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const materialId = useCustomizerStore((state) => state.materialId);
  const colorId = useCustomizerStore((state) => state.colorId);
  const hardware = useCustomizerStore((state) => state.hardware);
  const colors = useCustomizerStore((state) => state);

  const colorHex = useMemo(() => {
    const colorMap: Record<string, string> = {
      'color-001': '#1a1a1a', 'color-002': '#4a2c0a', 'color-003': '#c19a6b',
      'color-004': '#722f37', 'color-005': '#1a3a2a', 'color-006': '#1a2744',
      'color-007': '#f5f0e6', 'color-008': '#a8a8a8', 'color-009': '#e65c00',
      'color-010': '#ffd700', 'color-011': '#ffb6c1', 'color-012': '#87ceeb',
      'color-013': '#6b3fa0', 'color-014': '#98ff98', 'color-015': '#ff7f7f',
      'color-016': '#c3b091', 'color-017': '#556b2f', 'color-018': '#800020',
      'color-019': '#008080', 'color-020': '#3d1f0a', 'color-021': '#c2b280',
      'color-022': '#b22222', 'color-023': '#4b0082', 'color-024': '#4b5320',
    };
    return colorMap[colorId] ?? '#4a2c0a';
  }, [colorId]);

  useImperativeHandle(ref, () => ({
    takeSnapshot: () => {
      if (!canvasRef.current) return null;
      const offscreen = document.createElement('canvas');
      offscreen.width = 1080;
      offscreen.height = 1080;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.drawImage(canvasRef.current, 0, 0, 1080, 1080);
      return offscreen.toDataURL('image/png');
    },
  }));

  return (
    <div className="canvas-wrapper">
      <Canvas
        ref={canvasRef}
        shadows
        camera={{ position: [0, 1, 6], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#f3f4f6');
        }}
      >
        <Customizer3DContent
          colorHex={colorHex}
          materialId={materialId}
          hardwareColor={hardware.zipperColor}
          buckleShape={hardware.buckleShape}
          rivetStyle={hardware.rivetStyle}
        />
      </Canvas>
    </div>
  );
});
