import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useBoneStore, Fragment, MAGNETIC_THRESHOLD, SNAP_THRESHOLD } from './BoneManager';

interface FragmentMeshProps {
  fragment: Fragment;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string) => void;
  onDrag: (id: string, position: THREE.Vector3) => void;
  isDragging: boolean;
}

function createFragmentGeometry(name: string): THREE.BufferGeometry {
  switch (name) {
    case '颅顶': {
      const geometry = new THREE.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        const z = positions.getZ(i);
        positions.setZ(i, z * 1.3);
        positions.setY(i, y * 0.9);
      }
      geometry.computeVertexNormals();
      return geometry;
    }
    case '左颧骨':
    case '右颧骨': {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(0.8, 0.5, 1, 1.5);
      shape.quadraticCurveTo(0.8, 2, 0, 2.2);
      shape.quadraticCurveTo(-0.3, 1.5, 0, 0);
      const extrudeSettings = { depth: 0.4, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 };
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.translate(0, -1.1, -0.2);
      if (name === '右颧骨') {
        geometry.scale(-1, 1, 1);
      }
      return geometry;
    }
    case '上颌骨': {
      const shape = new THREE.Shape();
      shape.moveTo(-1.2, 0);
      shape.lineTo(-1.5, 0.8);
      shape.quadraticCurveTo(-1.2, 1.5, 0, 1.7);
      shape.quadraticCurveTo(1.2, 1.5, 1.5, 0.8);
      shape.lineTo(1.2, 0);
      shape.quadraticCurveTo(0, -0.3, -1.2, 0);
      const extrudeSettings = { depth: 1, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.1, bevelSegments: 2 };
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.translate(0, 0, -0.5);
      return geometry;
    }
    case '下颌骨': {
      const shape = new THREE.Shape();
      shape.moveTo(-1.5, 0.5);
      shape.quadraticCurveTo(-1.8, -0.5, -1.2, -1.2);
      shape.quadraticCurveTo(0, -1.5, 1.2, -1.2);
      shape.quadraticCurveTo(1.8, -0.5, 1.5, 0.5);
      shape.lineTo(1, 0.2);
      shape.quadraticCurveTo(0, 0.4, -1, 0.2);
      shape.lineTo(-1.5, 0.5);
      const extrudeSettings = { depth: 0.7, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2 };
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.translate(0, 0.5, -0.35);
      return geometry;
    }
    case '左犬齿':
    case '右犬齿': {
      const geometry = new THREE.ConeGeometry(0.2, 1.5, 8);
      geometry.translate(0, -0.75, 0);
      if (name === '右犬齿') {
        geometry.scale(-1, 1, 1);
      }
      return geometry;
    }
    case '鼻骨': {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(0.5, 0.3, 0.6, 1);
      shape.quadraticCurveTo(0.5, 1.3, 0, 1.4);
      shape.quadraticCurveTo(-0.5, 1.3, -0.6, 1);
      shape.quadraticCurveTo(-0.5, 0.3, 0, 0);
      const extrudeSettings = { depth: 0.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.05, bevelSegments: 2 };
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geometry.translate(0, 0, -0.25);
      return geometry;
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

function FragmentMesh({ fragment, onDragStart, onDragEnd, onDrag, isDragging }: FragmentMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const [showSnapEffect, setShowSnapEffect] = useState(false);
  const [showError, setShowError] = useState(false);
  const [snapGlow, setSnapGlow] = useState(0);

  const geometry = useMemo(() => createFragmentGeometry(fragment.name), [fragment.name]);

  const wireframeGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 20);
  }, [geometry]);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#8b7355');
    gradient.addColorStop(0.5, '#6b5344');
    gradient.addColorStop(1, '#4a3728');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(40, 30, 20, 0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      const startX = Math.random() * 256;
      const startY = Math.random() * 256;
      ctx.moveTo(startX, startY);
      let x = startX;
      let y = startY;
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(100, 80, 60, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = Math.random() * 8 + 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xaaaaaa,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
  }, [texture]);

  const wireframeMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.6,
    });
  }, []);

  useFrame((state, delta) => {
    if (isDragging && meshRef.current) {
      material.opacity = 0.7;
    } else if (!fragment.placed) {
      material.opacity = 0.85;
    } else {
      material.opacity = 1;
    }

    if (snapGlow > 0) {
      setSnapGlow((prev) => Math.max(0, prev - delta * 3));
    }

    if (showError && meshRef.current) {
      const shake = Math.sin(state.clock.elapsedTime * 50) * 0.05;
      meshRef.current.position.x = fragment.position.x + shake;
    }
  });

  useEffect(() => {
    if (fragment.status === 'placed' && !showSnapEffect) {
      setShowSnapEffect(true);
      setSnapGlow(1);
      setTimeout(() => setShowSnapEffect(false), 600);
    }
  }, [fragment.status]);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 500);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  const handlePointerDown = (e: any) => {
    if (fragment.placed) return;
    e.stopPropagation();
    onDragStart(fragment.id);
  };

  const handlePointerUp = (e: any) => {
    if (fragment.placed) return;
    e.stopPropagation();
    onDragEnd(fragment.id);
  };

  const displayColor = showError ? '#ff4444' : fragment.placed ? '#c9a84c' : '#aaaaaa';
  const wireframeColor = showError ? '#ff4444' : fragment.placed ? '#d4af37' : '#aaaaaa';

  useEffect(() => {
    if (material) {
      material.color.set(displayColor);
    }
    if (wireframeMaterial && wireframeRef.current) {
      wireframeMaterial.color.set(wireframeColor);
    }
  }, [displayColor, wireframeColor, material, wireframeMaterial]);

  return (
    <group position={[fragment.position.x, fragment.position.y, fragment.position.z]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        rotation={[fragment.rotation.x, fragment.rotation.y, fragment.rotation.z]}
        castShadow
        receiveShadow
      />
      <lineSegments
        ref={wireframeRef}
        geometry={wireframeGeometry}
        material={wireframeMaterial}
        rotation={[fragment.rotation.x, fragment.rotation.y, fragment.rotation.z]}
      />
      {showSnapEffect && (
        <mesh>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={snapGlow} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

interface MagneticGuideProps {
  fragment: Fragment;
  show: boolean;
}

function MagneticGuide({ fragment, show }: MagneticGuideProps) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const dashOffsetRef = useRef(0);

  useFrame((state) => {
    if (lineRef.current && show) {
      dashOffsetRef.current = (dashOffsetRef.current - 0.02) % 1;
      const material = lineRef.current.material as THREE.LineDashedMaterial;
      if (material && 'dashOffset' in material) {
        (material as any).dashOffset = dashOffsetRef.current;
      }
      
      const flash = Math.sin(state.clock.elapsedTime * Math.PI * 2) * 0.3 + 0.7;
      if (material && material.opacity !== undefined) {
        material.opacity = flash;
      }
    }
  });

  if (!show || fragment.placed) return null;

  const points = [
    new THREE.Vector3(fragment.position.x, fragment.position.y, fragment.position.z),
    new THREE.Vector3(fragment.targetPosition.x, fragment.targetPosition.y, fragment.targetPosition.z),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0xffaa00,
    dashSize: 0.15,
    gapSize: 0.15,
    transparent: true,
    opacity: 0.8,
  });

  (geometry as any).computeLineDistances();

  return (
    <lineSegments ref={lineRef as any} geometry={geometry} material={material} />
  );
}

function CompletionEffect({ active }: { active: boolean }) {
  const lightBeamRef = useRef<THREE.Mesh>(null);
  const textRingRef = useRef<THREE.Group>(null);
  const [opacity, setOpacity] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);

  useFrame((state, delta) => {
    if (active) {
      setOpacity((prev) => Math.min(0.8, prev + delta));
      setTextOpacity((prev) => Math.min(1, prev + delta * 0.5));
    } else {
      setOpacity((prev) => Math.max(0, prev - delta * 0.8));
      setTextOpacity((prev) => Math.max(0, prev - delta * 0.5));
    }

    if (textRingRef.current) {
      textRingRef.current.rotation.y += delta * 0.5;
    }
  });

  if (!active && opacity <= 0) return null;

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={lightBeamRef} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3, 3, 20, 32, 1, true]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={opacity} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#ffd700" intensity={opacity * 2} distance={15} />
      <group ref={textRingRef} position={[0, 5, 0]}>
        {['剑齿虎', 'Smilodon', '更新世', 'Pleistocene'].map((text, i) => {
          const angle = (i / 4) * Math.PI * 2;
          const radius = 5;
          return (
            <Text
              key={i}
              position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
              fontSize={0.8}
              color="#ffd700"
              anchorX="center"
              anchorY="middle"
              opacity={textOpacity}
              outlineWidth={0.05}
              outlineColor="#000000"
              rotation={[0, -angle + Math.PI / 2, 0]}
            >
              {text}
            </Text>
          );
        })}
      </group>
    </group>
  );
}

function GridFloor() {
  const gridRef = useRef<THREE.GridHelper>(null);

  return (
    <gridHelper
      ref={gridRef}
      args={[40, 40, 0x444444, 0x444444]}
      position={[0, -4, 0]}
    />
  );
}

interface SceneContentProps {
  onDragStart: (id: string) => void;
  onDragEnd: (id: string) => void;
  onDrag: (id: string, position: THREE.Vector3) => void;
  draggingId: string | null;
}

function SceneContent({ onDragStart, onDragEnd, onDrag, draggingId }: SceneContentProps) {
  const { fragments, isCompleted, checkMagneticSnap } = useBoneStore();
  const { camera, raycaster, mouse } = useThree();
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const isDragging = useRef(false);
  const dragVelocity = useRef(new THREE.Vector3());
  const targetPosition = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (isDragging.current && draggingId) {
      raycaster.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeRef.current, intersectPoint);
      
      if (intersectPoint) {
        targetPosition.current.copy(intersectPoint);
        
        const fragment = fragments.find((f) => f.id === draggingId);
        if (fragment) {
          const currentPos = new THREE.Vector3(fragment.position.x, fragment.position.y, fragment.position.z);
          const newPos = new THREE.Vector3().lerpVectors(currentPos, targetPosition.current, 0.15);
          onDrag(draggingId, newPos);
        }
      }
    }
  });

  const handleDragStart = useCallback((id: string) => {
    isDragging.current = true;
    onDragStart(id);
    
    const fragment = fragments.find((f) => f.id === id);
    if (fragment) {
      targetPosition.current.set(fragment.position.x, fragment.position.y, fragment.position.z);
      planeRef.current.setFromNormalAndCoplanarPoint(
        new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion),
        targetPosition.current
      );
    }
  }, [fragments, camera, onDragStart]);

  const handleDragEnd = useCallback((id: string) => {
    isDragging.current = false;
    onDragEnd(id);
  }, [onDragEnd]);

  const handleDrag = useCallback((id: string, position: THREE.Vector3) => {
    onDrag(id, position);
  }, [onDrag]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#d4af37" />

      <GridFloor />

      {fragments.map((fragment) => {
        const { shouldSnap } = checkMagneticSnap(fragment.id);
        return (
          <group key={fragment.id}>
            <FragmentMesh
              fragment={fragment}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrag={handleDrag}
              isDragging={draggingId === fragment.id}
            />
            <MagneticGuide fragment={fragment} show={shouldSnap} />
          </group>
        );
      })}

      <CompletionEffect active={isCompleted} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function Scene3D() {
  const { 
    fragments, 
    updateFragmentPosition, 
    placeFragment, 
    setDraggingFragment,
    addHistoryRecord,
    setShowError,
  } = useBoneStore();

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggingId(id);
    setDraggingFragment(id);
    const fragment = fragments.find((f) => f.id === id);
    if (fragment) {
      addHistoryRecord('drag', `开始拖动 ${fragment.name}`, fragment.name);
    }
  };

  const handleDragEnd = (id: string) => {
    setDraggingId(null);
    const success = placeFragment(id);
    
    if (!success) {
      const fragment = fragments.find((f) => f.id === id);
      if (fragment) {
        setShowError('位置不正确，请重试', fragment.position);
        setTimeout(() => setShowError(null), 1500);
      }
    }
    
    setDraggingFragment(null);
  };

  const handleDrag = (id: string, position: THREE.Vector3) => {
    updateFragmentPosition(id, { x: position.x, y: position.y, z: position.z });
  };

  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [0, 2, 12], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#1a1a3e');
        }}
      >
        <fog attach="fog" args={['#0a0a23', 15, 40]} />
        <SceneContent
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrag={handleDrag}
          draggingId={draggingId}
        />
      </Canvas>
    </div>
  );
}
