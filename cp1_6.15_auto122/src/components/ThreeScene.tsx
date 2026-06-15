import { useRef, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { colorSchemes, getColorFromHeight, ColorSchemeKey } from '../utils/colorSchemes';

const GRID_SIZE = 32;
const CELL_SIZE = 8;
const MAX_HEIGHT = 5;
const HEIGHTMAP_RES = 256;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export interface ThreeSceneHandle {
  takeSnapshot: () => void;
}

interface ThreeSceneProps {}

const ThreeScene = forwardRef<ThreeSceneHandle, ThreeSceneProps>((_props, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const controlsRef = useRef<any>(null);
  const { gl, scene, camera, size } = useThree();
  const heightMap = useStore((s) => s.heightMap);
  const detailHeightMap = useStore((s) => s.detailHeightMap);
  const detailOverlay = useStore((s) => s.detailOverlay);
  const colorScheme = useStore((s) => s.colorScheme);
  const params = useStore((s) => s.params);

  const colorTransitionRef = useRef<{
    from: ColorSchemeKey;
    to: ColorSchemeKey;
    progress: number;
    active: boolean;
  }>({ from: 'classic', to: 'classic', progress: 1, active: false });

  useEffect(() => {
    const current = colorTransitionRef.current.to;
    if (current !== colorScheme) {
      colorTransitionRef.current = {
        from: current,
        to: colorScheme,
        progress: 0,
        active: true,
      };
    }
  }, [colorScheme]);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      GRID_SIZE * CELL_SIZE,
      GRID_SIZE * CELL_SIZE,
      GRID_SIZE,
      GRID_SIZE
    );
    geo.rotateX(-Math.PI / 2);
    const colors = new Float32Array((GRID_SIZE + 1) * (GRID_SIZE + 1) * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  const sampleHeight = (
    map: Float32Array | null,
    u: number,
    v: number
  ): number => {
    if (!map) return 0;
    const x = Math.floor(u * (HEIGHTMAP_RES - 1));
    const y = Math.floor(v * (HEIGHTMAP_RES - 1));
    return map[y * HEIGHTMAP_RES + x] || 0;
  };

  const getCurrentColors = (t: number): string[] => {
    const ct = colorTransitionRef.current;
    const from = colorSchemes[ct.from].colors;
    const to = colorSchemes[ct.to].colors;
    const eased = easeInOut(t);

    return from.map((c, i) => {
      const r1 = parseInt(c.slice(1, 3), 16);
      const g1 = parseInt(c.slice(3, 5), 16);
      const b1 = parseInt(c.slice(5, 7), 16);
      const r2 = parseInt(to[i].slice(1, 3), 16);
      const g2 = parseInt(to[i].slice(3, 5), 16);
      const b2 = parseInt(to[i].slice(5, 7), 16);
      const r = Math.round(lerp(r1, r2, eased));
      const g = Math.round(lerp(g1, g2, eased));
      const b = Math.round(lerp(b1, b2, eased));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    });
  };

  const updateTerrain = () => {
    if (!meshRef.current || !geometry) return;

    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const colors = geometry.attributes.color as THREE.BufferAttribute;
    const count = positions.count;

    const ct = colorTransitionRef.current;
    const colorsArr = ct.active
      ? getCurrentColors(ct.progress)
      : colorSchemes[colorScheme].colors;

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const u = (x + (GRID_SIZE * CELL_SIZE) / 2) / (GRID_SIZE * CELL_SIZE);
      const v = (z + (GRID_SIZE * CELL_SIZE) / 2) / (GRID_SIZE * CELL_SIZE);

      let height = sampleHeight(heightMap, u, v);

      if (detailOverlay && detailHeightMap) {
        const detailH = sampleHeight(detailHeightMap, u, v);
        height = height * 0.6 + detailH * 0.4;
      }

      height = Math.pow(height, 1 / params.scale) * MAX_HEIGHT;
      positions.setY(i, height);

      const normalizedH = Math.max(0, Math.min(1, height / MAX_HEIGHT));
      const [r, g, b] = getColorFromHeight(normalizedH, colorsArr);

      colors.setXYZ(i, r / 255, g / 255, b / 255);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    geometry.computeVertexNormals();
  };

  useEffect(() => {
    updateTerrain();
  }, [heightMap, detailHeightMap, detailOverlay, params.scale]);

  useFrame((_, delta) => {
    const ct = colorTransitionRef.current;
    if (ct.active) {
      ct.progress = Math.min(1, ct.progress + delta / 0.6);
      if (ct.progress >= 1) {
        ct.active = false;
        ct.progress = 1;
      }
      updateTerrain();
    }
  });

  useImperativeHandle(ref, () => ({
    takeSnapshot: () => {
      gl.render(scene, camera);
      const dataURL = gl.domElement.toDataURL('image/png');
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 768;
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 1024, 768);
        const link = document.createElement('a');
        link.download = `terrain-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        useStore.getState().addToast('快照已保存', 'success');
      };
      img.src = dataURL;
    },
  }));

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 80, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-30, 40, -50]} intensity={0.3} color="#8ab4ff" />

      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          ref={materialRef}
          vertexColors
          roughness={0.85}
          metalness={0.05}
          flatShading={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[GRID_SIZE * CELL_SIZE * 1.2, GRID_SIZE * CELL_SIZE * 1.2]} />
        <meshStandardMaterial color="#16213e" />
      </mesh>

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        zoomSpeed={0.2}
        enablePan
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        target={[0, MAX_HEIGHT / 2, 0]}
      />
    </>
  );
});

ThreeScene.displayName = 'ThreeScene';

export default ThreeScene;
