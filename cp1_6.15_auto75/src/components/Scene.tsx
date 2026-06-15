import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, Fragment, Slot, RippleEffect } from '../stores/gameStore';
import { InteractionManager } from './InteractionManager';

const CAMERA_DISTANCE = 14;

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  const result = new THREE.Color().lerpColors(c1, c2, t);
  return `#${result.getHexString()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = new THREE.Color(hex);
  return { r: c.r, g: c.g, b: c.b };
}

function FragmentMesh({
  fragment
}: {
  fragment: Fragment;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const verts = fragment.vertices;
    shape.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      shape.lineTo(verts[i].x, verts[i].y);
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [fragment.id]);

  const borderGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const verts = fragment.vertices;
    shape.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      shape.lineTo(verts[i].x, verts[i].y);
    }
    shape.closePath();

    const borderGeo = new THREE.EdgesGeometry(new THREE.ShapeGeometry(shape));
    borderGeo.rotateX(-Math.PI / 2);
    return borderGeo;
  }, [fragment.id]);

  const displayColor = useMemo(() => {
    if (fragment.matched) return '#ffd633';
    if (fragment.isDragging) {
      const slots = useGameStore.getState().slots;
      const slot = slots.find((s) => s.fragmentId === fragment.slotId);
      if (slot?.isHighlighted) return '#ffffff';
    }
    if (fragment.isHovered) {
      const base = hexToRgb('#ffcc00');
      return `rgb(${Math.min(255, base.r * 255 * 1.2)}, ${Math.min(255, base.g * 255 * 1.2)}, ${Math.min(255, base.b * 255)})`;
    }
    return fragment.color;
  }, [fragment.isHovered, fragment.isDragging, fragment.matched, fragment.color, fragment.slotId]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    meshRef.current.position.set(
      fragment.position.x,
      fragment.position.y,
      fragment.position.z
    );
    meshRef.current.rotation.set(
      fragment.rotation.x,
      fragment.rotation.y,
      fragment.rotation.z
    );

    if (glowRef.current) {
      glowRef.current.position.copy(meshRef.current.position);
      glowRef.current.rotation.copy(meshRef.current.rotation);
    }

    if (!fragment.isDragging && !fragment.matched) {
      const float = Math.sin(clock.elapsedTime * 1.5 + fragment.id * 0.7) * 0.03;
      meshRef.current.position.y += float;
      if (glowRef.current) glowRef.current.position.y += float;
    }
  });

  if (fragment.matched) {
    return (
      <group>
        <mesh ref={meshRef} geometry={geometry} position={[fragment.position.x, fragment.position.y, fragment.position.z]} rotation={[fragment.rotation.x, fragment.rotation.y, fragment.rotation.z]}>
          <meshStandardMaterial
            color={displayColor}
            emissive={'#ffcc00'}
            emissiveIntensity={0.6}
            transparent
            opacity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
        <lineSegments ref={glowRef as any} geometry={borderGeometry} position={[fragment.position.x, fragment.position.y + 0.001, fragment.position.z]} rotation={[fragment.rotation.x, fragment.rotation.y, fragment.rotation.z]}>
          <lineBasicMaterial color={'rgba(255,200,0,0.8)'} linewidth={2} />
        </lineSegments>
      </group>
    );
  }

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} position={[fragment.position.x, fragment.position.y, fragment.position.z]} rotation={[fragment.rotation.x, fragment.rotation.y, fragment.rotation.z]}>
        <meshStandardMaterial
          color={displayColor}
          emissive={fragment.isHovered || fragment.isDragging ? '#ffffff' : '#ffcc00'}
          emissiveIntensity={fragment.isHovered ? 0.8 : fragment.isDragging ? 1.0 : 0.5}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments ref={glowRef as any} geometry={borderGeometry} position={[fragment.position.x, fragment.position.y + 0.001, fragment.position.z]} rotation={[fragment.rotation.x, fragment.rotation.y, fragment.rotation.z]}>
        <lineBasicMaterial color={'rgba(255,200,0,0.6)'} linewidth={1.5} />
      </lineSegments>
    </group>
  );
}

function SlotMesh({ slot }: { slot: Slot }) {
  const groupRef = useRef<THREE.Group>(null);
  const borderRef = useRef<THREE.LineSegments>(null);
  const highlightRef = useRef<THREE.Mesh>(null);

  const fragments = useGameStore((s) => s.fragments);
  const fragment = fragments.find((f) => f.slotId === slot.fragmentId);

  const geometry = useMemo(() => {
    if (!fragment) return new THREE.BufferGeometry();
    const shape = new THREE.Shape();
    const verts = fragment.vertices;
    shape.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      shape.lineTo(verts[i].x, verts[i].y);
    }
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [fragment?.id]);

  const borderGeometry = useMemo(() => {
    if (!fragment) return new THREE.BufferGeometry();
    const shape = new THREE.Shape();
    const verts = fragment.vertices;
    shape.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      shape.lineTo(verts[i].x, verts[i].y);
    }
    shape.closePath();
    const borderGeo = new THREE.EdgesGeometry(new THREE.ShapeGeometry(shape));
    borderGeo.rotateX(-Math.PI / 2);
    return borderGeo;
  }, [fragment?.id]);

  useFrame(({ clock }) => {
    if (borderRef.current && !slot.matched) {
      const pulse = 0.6 + Math.sin(clock.elapsedTime * Math.PI * 2 / 0.5) * 0.4;
      const mat = borderRef.current.material as THREE.LineBasicMaterial;
      if (slot.isHighlighted) {
        mat.color.set('#00ff00');
        mat.opacity = pulse;
      } else {
        mat.color.set('#ffcc00');
        mat.opacity = 0.5;
      }
    }
    if (highlightRef.current) {
      const pulse = 0.3 + Math.sin(clock.elapsedTime * Math.PI * 2 / 0.5) * 0.2;
      const mat = highlightRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = slot.isHighlighted ? pulse : 0;
    }
  });

  if (slot.matched) return null;

  return (
    <group ref={groupRef} position={[slot.position.x, slot.position.y, slot.position.z]}>
      <mesh geometry={geometry} position={[0, 0.005, 0]}>
        <meshBasicMaterial color="#333344" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={highlightRef} geometry={geometry} position={[0, 0.008, 0]}>
        <meshBasicMaterial color="#00ff00" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments ref={borderRef} geometry={borderGeometry} position={[0, 0.01, 0]}>
        <lineBasicMaterial color={'rgba(255,200,0,0.6)'} transparent opacity={0.5} linewidth={2} />
      </lineSegments>
    </group>
  );
}

function RippleMesh({ ripple }: { ripple: RippleEffect }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = ripple.startTime;
  const DURATION = 800;

  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / DURATION, 1);
    const radius = 0.2 + t * 1.0;
    meshRef.current.scale.set(radius, 1, radius);
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = (1 - t) * 0.8;
  });

  return (
    <mesh ref={meshRef} position={[ripple.position.x, ripple.position.y + 0.02, ripple.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.85, 1, 32]} />
      <meshBasicMaterial color="#00ff00" transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Ground({ interactionManager }: { interactionManager: InteractionManager }) {
  const { camera } = useThree();
  const backgroundTransition = useGameStore((s) => s.backgroundTransition);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      interactionManager.setCamera(camera);
    }
  }, [camera, interactionManager]);

  const bgColor = useMemo(() => {
    return lerpColor('#2d2d2d', '#ffe082', backgroundTransition);
  }, [backgroundTransition]);

  useFrame(() => {
    if (matRef.current) {
      matRef.current.color.set(bgColor);
    }
    interactionManager.updateAnimations();
  });

  return (
    <mesh ref={null} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial ref={matRef} color={bgColor} />
    </mesh>
  );
}

function SceneContent({ interactionManager }: { interactionManager: InteractionManager }) {
  const fragments = useGameStore((s) => s.fragments);
  const slots = useGameStore((s) => s.slots);
  const ripples = useGameStore((s) => s.ripples);

  return (
    <>
      <Ground interactionManager={interactionManager} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#ffcc00" />

      {slots.map((slot) => (
        <SlotMesh key={`slot-${slot.id}`} slot={slot} />
      ))}
      {fragments.map((fragment) => (
        <FragmentMesh key={`frag-${fragment.id}`} fragment={fragment} />
      ))}
      {ripples.map((ripple) => (
        <RippleMesh key={`ripple-${ripple.id}`} ripple={ripple} />
      ))}
    </>
  );
}

export default function Scene({ interactionManager }: { interactionManager: InteractionManager }) {
  return (
    <Canvas
      camera={{ position: [0, CAMERA_DISTANCE, 0.1], fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#1a1a2e' }}
      onPointerDown={(e) => {
        interactionManager.onPointerDown(e.clientX, e.clientY, e.target as HTMLCanvasElement);
      }}
      onPointerMove={(e) => {
        interactionManager.onPointerMove(e.clientX, e.clientY, e.target as HTMLCanvasElement);
      }}
      onPointerUp={() => {
        interactionManager.onPointerUp();
      }}
      onPointerLeave={() => {
        interactionManager.onPointerUp();
      }}
    >
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate={false}
        target={[0, 0, 0]}
      />
      <SceneContent interactionManager={interactionManager} />
    </Canvas>
  );
}
