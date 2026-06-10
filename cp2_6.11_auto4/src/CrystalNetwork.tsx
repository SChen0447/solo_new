import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Crystal from './Crystal';
import ConnectionLine from './ConnectionLine';
import { CrystalData, ConnectionData, Frequency, FREQUENCY_CONFIG } from './types';

interface RippleEffect {
  id: string;
  position: [number, number, number];
  color: string;
  startTime: number;
}

interface CrystalNetworkProps {
  crystals: CrystalData[];
  connections: ConnectionData[];
  onAddCrystal: (position: [number, number, number], frequency?: Frequency) => void;
  onAddConnection: (fromId: string, toId: string) => void;
  onSelectCrystal: (id: string | null) => void;
  selectedCrystalId: string | null;
}

const generateId = (): string => Math.random().toString(36).substr(2, 9);

const CrystalNetwork: React.FC<CrystalNetworkProps> = ({
  crystals,
  connections,
  onAddCrystal,
  onAddConnection,
  onSelectCrystal,
  selectedCrystalId
}) => {
  const { camera, raycaster, pointer } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [dragging, setDragging] = useState<{ fromId: string; fromPos: THREE.Vector3 } | null>(null);
  const [dragCurrentPos, setDragCurrentPos] = useState<THREE.Vector3 | null>(null);
  const [ripples, setRipples] = useState<RippleEffect[]>([]);
  const [dragStartCrystal, setDragStartCrystal] = useState<string | null>(null);
  const dragMoved = useRef(false);

  const starsPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 200; i++) {
      positions.push([
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80
      ]);
    }
    return positions;
  }, []);

  const starsSizes = useMemo(() => {
    const sizes: number[] = [];
    for (let i = 0; i < 200; i++) {
      sizes.push(1 + Math.random() * 2);
    }
    return sizes;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }

    setRipples(prev => {
      const now = performance.now();
      return prev.filter(r => now - r.startTime < 500);
    });

    if (dragging) {
      raycaster.setFromCamera(pointer, camera);
      const dist = camera.position.length() * 0.5;
      const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
      const planePoint = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(dist));
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersectPoint);
      if (intersectPoint) {
        setDragCurrentPos(intersectPoint);
      }
    }
  });

  const handleDoubleClick = (e: any) => {
    if (e.target !== e.currentTarget) return;
    e.stopPropagation();

    raycaster.setFromCamera(pointer, camera);
    const dist = camera.position.length() * 0.5;
    const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
    const planePoint = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(dist));
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      const freqOptions: Frequency[] = ['low', 'mid', 'high'];
      const randomFreq = freqOptions[Math.floor(Math.random() * 3)];
      const color = FREQUENCY_CONFIG[randomFreq].color;
      
      const ripple: RippleEffect = {
        id: generateId(),
        position: [intersectPoint.x, intersectPoint.y, intersectPoint.z],
        color,
        startTime: performance.now()
      };
      setRipples(prev => [...prev, ripple]);

      onAddCrystal(
        [intersectPoint.x, intersectPoint.y, intersectPoint.z],
        randomFreq
      );
    }
  };

  const handleCrystalPointerDown = (id: string, e: any) => {
    dragMoved.current = false;
    setDragStartCrystal(id);
    const crystal = crystals.find(c => c.id === id);
    if (crystal) {
      setDragging({
        fromId: id,
        fromPos: new THREE.Vector3(...crystal.position)
      });
      setDragCurrentPos(new THREE.Vector3(...crystal.position));
    }
  };

  const handlePointerMove = () => {
    if (dragStartCrystal && !dragMoved.current) {
      dragMoved.current = true;
    }
  };

  const handleCrystalPointerUp = (id: string) => {
    if (dragging && dragging.fromId !== id) {
      onAddConnection(dragging.fromId, id);
    }
    setDragging(null);
    setDragCurrentPos(null);
    setDragStartCrystal(null);
  };

  const handlePointerUp = () => {
    if (!dragMoved.current && dragStartCrystal) {
      onSelectCrystal(dragStartCrystal);
    }
    setDragging(null);
    setDragCurrentPos(null);
    setDragStartCrystal(null);
  };

  const handleClick = (e: any) => {
    if (e.target === e.currentTarget) {
      onSelectCrystal(null);
    }
  };

  return (
    <group
      ref={groupRef}
      onDoubleClick={handleDoubleClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      <group>
        {starsPositions.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[starsSizes[i] * 0.02, 4, 4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.6 + Math.random() * 0.4} />
          </mesh>
        ))}
      </group>

      {connections.map(conn => {
        const fromCrystal = crystals.find(c => c.id === conn.from);
        const toCrystal = crystals.find(c => c.id === conn.to);
        if (!fromCrystal || !toCrystal) return null;
        return (
          <ConnectionLine
            key={conn.id}
            from={fromCrystal.position}
            to={toCrystal.position}
            fromFrequency={fromCrystal.frequency}
            toFrequency={toCrystal.frequency}
            fromColor={fromCrystal.color}
            toColor={toCrystal.color}
          />
        );
      })}

      {dragging && dragCurrentPos && (
        <ConnectionLine
          from={[dragging.fromPos.x, dragging.fromPos.y, dragging.fromPos.z]}
          to={[dragCurrentPos.x, dragCurrentPos.y, dragCurrentPos.z]}
          fromFrequency={crystals.find(c => c.id === dragging.fromId)?.frequency || 'mid'}
          toFrequency="mid"
          fromColor={crystals.find(c => c.id === dragging.fromId)?.color || '#2a9d8f'}
          toColor="#ffffff"
          isDragging
        />
      )}

      {crystals.map(crystal => (
        <Crystal
          key={crystal.id}
          id={crystal.id}
          position={crystal.position}
          frequency={crystal.frequency}
          color={crystal.color}
          isSelected={crystal.id === selectedCrystalId}
          onClick={onSelectCrystal}
          onPointerDown={handleCrystalPointerDown}
          onPointerUp={handleCrystalPointerUp}
        />
      ))}

      {ripples.map(ripple => {
        const elapsed = performance.now() - ripple.startTime;
        const progress = elapsed / 500;
        const radius = 0.3 + progress * 2;
        const opacity = 0.8 * (1 - progress);
        return (
          <mesh key={ripple.id} position={ripple.position} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * 0.9, radius, 32]} />
            <meshBasicMaterial color={ripple.color} transparent opacity={opacity} side={THREE.DoubleSide} />
          </mesh>
        );
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={4}
        maxDistance={30}
        enablePan={true}
      />
    </group>
  );
};

export default CrystalNetwork;
