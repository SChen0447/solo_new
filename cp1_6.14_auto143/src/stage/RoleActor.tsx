import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RoleData, Vec3 } from '../store/store';

interface RoleActorProps {
  role: RoleData;
  sceneId: string;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onPositionChange: (position: Vec3) => void;
  stageBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export function RoleActor({
  role,
  isSelected,
  onSelect,
  onPositionChange,
  stageBounds
}: RoleActorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const { camera, gl } = useThree();

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(role.position.x, role.position.y, role.position.z);
      groupRef.current.rotation.set(role.rotation.x, role.rotation.y, role.rotation.z);
    }
  }, [role.position.x, role.position.y, role.position.z, role.rotation.x, role.rotation.y, role.rotation.z]);

  useFrame(() => {
    if (shadowRef.current && groupRef.current) {
      const pos = groupRef.current.position;
      shadowRef.current.position.set(pos.x, 0.11, pos.z);
      const lightHeight = 8;
      const shadowScale = Math.max(0.3, 1 - pos.y / lightHeight * 0.5);
      shadowRef.current.scale.set(shadowScale, 1, shadowScale);
    }
  });

  const clampPosition = (x: number, z: number): Vec3 => {
    const clampedX = Math.max(stageBounds.minX + 0.5, Math.min(stageBounds.maxX - 0.5, x));
    const clampedZ = Math.max(stageBounds.minZ + 0.5, Math.min(stageBounds.maxZ - 0.5, z));
    return { x: clampedX, y: 0, z: clampedZ };
  };

  const handlePointerDown = (e: THREE.Event) => {
    e.stopPropagation();
    setIsDragging(true);
    onSelect(role.id);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(
      (e.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);

    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlaneRef.current, intersectPoint);
    
    if (groupRef.current) {
      dragOffsetRef.current.copy(groupRef.current.position).sub(intersectPoint);
    }

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: THREE.Event) => {
    if (!isDragging || !groupRef.current) return;
    e.stopPropagation();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(
      (e.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(pointer, camera);

    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlaneRef.current, intersectPoint)) {
      const newPos = intersectPoint.add(dragOffsetRef.current);
      const clamped = clampPosition(newPos.x, newPos.z);
      
      groupRef.current.position.set(clamped.x, clamped.y, clamped.z);
      onPositionChange(clamped);
    }
  };

  const handlePointerUp = (e: THREE.Event) => {
    e.stopPropagation();
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <group>
      <group
        ref={groupRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        position={[role.position.x, role.position.y, role.position.z]}
        rotation={[role.rotation.x, role.rotation.y, role.rotation.z]}
      >
        <mesh position={[0, 1.4, 0]} castShadow>
          <boxGeometry args={[0.6, 0.8, 0.4]} />
          <meshStandardMaterial 
            color={role.color} 
            emissive={isSelected ? role.color : '#000000'}
            emissiveIntensity={isSelected ? 0.2 : 0}
          />
        </mesh>

        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.7, 1, 0.5]} />
          <meshStandardMaterial 
            color={role.color} 
            emissive={isSelected ? role.color : '#000000'}
            emissiveIntensity={isSelected ? 0.15 : 0}
          />
        </mesh>

        <mesh position={[-0.18, 0.4, 0]} castShadow>
          <boxGeometry args={[0.2, 1, 0.25]} />
          <meshStandardMaterial color={role.color} />
        </mesh>
        <mesh position={[0.18, 0.4, 0]} castShadow>
          <boxGeometry args={[0.2, 1, 0.25]} />
          <meshStandardMaterial color={role.color} />
        </mesh>

        <mesh position={[-0.25, 0.9, 0]} castShadow>
          <boxGeometry args={[0.2, 0.7, 0.2]} />
          <meshStandardMaterial color={role.color} />
        </mesh>
        <mesh position={[0.25, 0.9, 0]} castShadow>
          <boxGeometry args={[0.2, 0.7, 0.2]} />
          <meshStandardMaterial color={role.color} />
        </mesh>

        {isSelected && (
          <mesh position={[0, 1, 0]}>
            <ringGeometry args={[0.55, 0.6, 32]} />
            <meshBasicMaterial 
              color="#c9a84c" 
              transparent 
              opacity={0.9} 
              side={THREE.DoubleSide}
            />
            <rotation x={-Math.PI / 2} />
          </mesh>
        )}
      </group>

      <mesh ref={shadowRef} position={[role.position.x, 0.11, role.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
