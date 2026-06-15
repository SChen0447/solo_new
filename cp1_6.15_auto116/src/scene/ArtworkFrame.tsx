import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Artwork } from '@/types';

interface ArtworkFrameProps {
  artwork: Artwork;
  isHighlighted: boolean;
  onClick: () => void;
}

function ArtworkFrame({ artwork, isHighlighted, onClick }: ArtworkFrameProps) {
  const glowRef = useRef<THREE.Mesh>(null);
  const frameWidth = 2;
  const frameHeight = 2.8;
  const frameThickness = 0.05;
  const frameDepth = 0.1;

  const canvasTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 716;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, artwork.colors[0]);
    gradient.addColorStop(1, artwork.colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [artwork.colors]);

  useFrame(() => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = isHighlighted ? 0.8 : 0;
      material.opacity += (targetOpacity - material.opacity) * 0.1;
    }
  });

  const positions = artwork.position;
  const rotations = artwork.rotation;

  return (
    <group position={[positions.x, positions.y, positions.z]} rotation={[rotations.x, rotations.y, rotations.z]}>
      <mesh position={[0, 0, -frameDepth / 2]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <boxGeometry args={[frameWidth + frameThickness * 2, frameHeight + frameThickness * 2, frameDepth]} />
        <meshStandardMaterial color="#d4af37" metalness={0.6} roughness={0.3} />
      </mesh>

      <mesh position={[0, 0, 0.01]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <planeGeometry args={[frameWidth, frameHeight]} />
        <meshStandardMaterial map={canvasTexture} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={glowRef} position={[0, 0, 0.02]}>
        <planeGeometry args={[frameWidth + 0.4, frameHeight + 0.4]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default ArtworkFrame;
