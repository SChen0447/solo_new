import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Crystal from './Crystal';
import ConnectionLine from './ConnectionLine';
import StarField from './StarField';
import RippleEffect from './RippleEffect';
import { CrystalData, ConnectionData, Frequency, FREQUENCY_CONFIG } from './types';

interface RippleData {
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
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const [dragStartCrystal, setDragStartCrystal] = useState<string | null>(null);
  const dragMoved = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      setRipples(prev => prev.filter(r => now - r.startTime < 500));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useFrame(() => {
    if (dragging) {
      raycaster.setFromCamera(pointer, camera);
      const dist = camera.position.length() * 0.5;
      const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
      const planePoint = camera.position.clone().add(
        camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(dist)
      );
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersectPoint);
      if (intersectPoint) {
        setDragCurrentPos(intersectPoint.clone());
      }
    }
  });

  const getIntersectionPoint = useCallback((): THREE.Vector3 | null => {
    raycaster.setFromCamera(pointer, camera);
    const dist = camera.position.length() * 0.5;
    const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
    const planePoint = camera.position.clone().add(
      camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(dist)
    );
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    const intersectPoint = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, intersectPoint);
    return hit ? intersectPoint : null;
  }, [camera, pointer, raycaster]);

  const handleDoubleClick = (e: THREE.Event) => {
    if ((e as any).target !== (e as any).currentTarget) return;
    (e as any).stopPropagation();

    const intersectPoint = getIntersectionPoint();
    if (intersectPoint) {
      const freqOptions: Frequency[] = ['low', 'mid', 'high'];
      const randomFreq = freqOptions[Math.floor(Math.random() * 3)];
      const color = FREQUENCY_CONFIG[randomFreq].color;

      const ripple: RippleData = {
        id: generateId(),
        position: [intersectPoint.x, intersectPoint.y, intersectPoint.z],
        color,
        startTime: performance.now()
      };
      setRipples(prev => [...prev, ripple]);
      onAddCrystal([intersectPoint.x, intersectPoint.y, intersectPoint.z], randomFreq);
    }
  };

  const handleCrystalPointerDown = (id: string, _e: THREE.Event) => {
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

  const handleClick = (e: THREE.Event) => {
    if ((e as any).target === (e as any).currentTarget) {
      onSelectCrystal(null);
    }
  };

  return (
    <>
      <StarField />
      <group
        ref={groupRef}
        onDoubleClick={handleDoubleClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
      >
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

        {ripples.map(ripple => (
          <RippleEffect
            key={ripple.id}
            position={ripple.position}
            color={ripple.color}
            startTime={ripple.startTime}
          />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={4}
          maxDistance={30}
          enablePan={true}
        />
      </group>
    </>
  );
};

export default CrystalNetwork;
