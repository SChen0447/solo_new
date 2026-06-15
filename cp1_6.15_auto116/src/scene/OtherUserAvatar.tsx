import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { User } from '@/types';

interface OtherUserAvatarProps {
  user: User;
}

export default function OtherUserAvatar({ user }: OtherUserAvatarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetPos = useRef(new THREE.Vector3(user.position.x, user.position.y, user.position.z));

  useFrame((_, delta) => {
    if (meshRef.current) {
      targetPos.current.set(user.position.x, user.position.y + 0.25, user.position.z);
      meshRef.current.position.lerp(targetPos.current, delta * 10);
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={[user.position.x, user.position.y + 0.25, user.position.z]}>
        <capsuleGeometry args={[0.2, 0.5, 8, 16]} />
        <meshStandardMaterial color={user.avatarColor} emissive={user.avatarColor} emissiveIntensity={0.3} transparent opacity={0.9} />
      </mesh>

      <pointLight position={[user.position.x, user.position.y + 0.5, user.position.z]} color={user.avatarColor} intensity={0.5} distance={2} />
    </group>
  );
}
