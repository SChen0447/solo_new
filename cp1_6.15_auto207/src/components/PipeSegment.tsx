import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PipeSegmentData, Node, PIPE_COLORS } from '../types';
import { eventBus } from '../utils/eventBus';

interface PipeSegmentProps {
  pipe: PipeSegmentData;
  startNode: Node;
  endNode: Node;
  isSelected: boolean;
  visible: boolean;
}

export function PipeSegment({ pipe, startNode, endNode, isSelected, visible }: PipeSegmentProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const outlineRef = useRef<THREE.LineSegments>(null);
  const [opacity, setOpacity] = useState(visible ? 1 : 0);

  const { position, rotation, scale } = useMemo(() => {
    const start = new THREE.Vector3(startNode.x, startNode.y, startNode.z);
    const end = new THREE.Vector3(endNode.x, endNode.y, endNode.z);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const midPoint = start.clone().add(end).multiplyScalar(0.5);

    const axis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(axis, direction.clone().normalize());
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: midPoint,
      rotation: euler,
      scale: new THREE.Vector3(1, length, 1),
    };
  }, [startNode, endNode]);

  const outlineGeometry = useMemo(() => {
    const geometry = new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.3, 0.3, 1, 16));
    return geometry;
  }, []);

  useEffect(() => {
    let animationId: number;
    const targetOpacity = visible ? 1 : 0;
    const duration = 500;
    const startTime = performance.now();
    const startOpacity = opacity;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const newOpacity = startOpacity + (targetOpacity - startOpacity) * eased;
      setOpacity(newOpacity);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    }

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [visible]);

  useFrame(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = opacity;
      material.emissiveIntensity = isSelected ? 0.5 : 0;
    }
    if (outlineRef.current) {
      const material = outlineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = opacity;
      material.visible = isSelected && opacity > 0.5;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    eventBus.emit('SELECT_PIPE', pipe.id);
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  const color = PIPE_COLORS[pipe.type];

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[position.x, position.y, position.z]}
        rotation={[rotation.x, rotation.y, rotation.z]}
        scale={[scale.x, scale.y, scale.z]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <cylinderGeometry args={[0.3, 0.3, 1, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={isSelected ? '#ffffff' : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : 0}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      <lineSegments
        ref={outlineRef}
        geometry={outlineGeometry}
        position={[position.x, position.y, position.z]}
        rotation={[rotation.x, rotation.y, rotation.z]}
        scale={[scale.x * 1.05, scale.y * 1.05, scale.z * 1.05]}
      >
        <lineBasicMaterial color="#ffffff" transparent opacity={0} linewidth={2} />
      </lineSegments>
    </group>
  );
}
