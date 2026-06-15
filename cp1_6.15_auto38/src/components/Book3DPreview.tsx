import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Book } from '../api/books';

interface Book3DProps {
  book: Book;
  edition: 'hardcover' | 'special' | 'collectors';
  engraving: string;
}

function BookMesh({ book, edition, engraving }: Book3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const dimensions = useMemo(() => {
    switch (edition) {
      case 'collectors':
        return { width: 2.2, height: 3.2, depth: 0.5 };
      case 'special':
        return { width: 2.1, height: 3.1, depth: 0.4 };
      default:
        return { width: 2, height: 3, depth: 0.3 };
    }
  }, [edition]);

  const edgeColor = useMemo(() => {
    switch (book.edgeDesign) {
      case 'gold': return '#FFD700';
      case 'galaxy': return '#4a67d6';
      case 'marble': return '#808080';
      case 'stars': return '#FFD700';
      case 'classical': return '#8B4513';
      case 'ink': return '#2c2c2c';
      default: return '#f5f0eb';
    }
  }, [book.edgeDesign]);

  const coverColor = useMemo(() => {
    if (edition === 'collectors') return book.coverColor;
    if (edition === 'special') return book.coverColor;
    return book.coverColor;
  }, [edition, book.coverColor]);

  useFrame((state) => {
    if (groupRef.current && !hovered) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const edgeGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    
    for (let i = 0; i < 50; i++) {
      const x = -dimensions.width / 2 + Math.random() * dimensions.width;
      const y = -dimensions.height / 2 + Math.random() * dimensions.height;
      const z = dimensions.depth / 2 + 0.01;
      positions.push(x, y, z);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, [dimensions]);

  return (
    <group 
      ref={groupRef} 
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshStandardMaterial color={coverColor} roughness={0.3} metalness={0.1} />
      </mesh>

      <mesh position={[0, 0, dimensions.depth / 2 + 0.001]}>
        <planeGeometry args={[dimensions.width * 0.95, dimensions.height * 0.95]} />
        <meshStandardMaterial color={coverColor} roughness={0.2} metalness={0.2} />
      </mesh>

      <mesh position={[-dimensions.width / 2 - 0.001, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[dimensions.depth, dimensions.height]} />
        <meshStandardMaterial color={book.spineColor} roughness={0.4} />
      </mesh>

      <mesh position={[dimensions.width / 2 + 0.001, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[dimensions.depth, dimensions.height]} />
        <meshStandardMaterial color={edgeColor} roughness={0.6} />
      </mesh>

      <mesh position={[0, dimensions.height / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={book.pageColor} roughness={0.8} />
      </mesh>

      <mesh position={[0, -dimensions.height / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={book.pageColor} roughness={0.8} />
      </mesh>

      {edition !== 'hardcover' && (
        <points geometry={edgeGeometry}>
          <pointsMaterial size={0.05} color={edgeColor} transparent opacity={0.8} />
        </points>
      )}

      {engraving && (
        <Html position={[0, 0, dimensions.depth / 2 + 0.02]} center distanceFactor={10}>
          <div
            style={{
              color: '#c9a84c',
              fontFamily: 'serif',
              fontSize: `${Math.max(8, 24 - engraving.length)}px`,
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
              maxWidth: `${dimensions.width * 40}px`,
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {engraving}
          </div>
        </Html>
      )}

      <Html position={[0, dimensions.height * 0.25, dimensions.depth / 2 + 0.02]} center distanceFactor={8}>
        <div
          style={{
            color: '#f5f0eb',
            fontFamily: 'serif',
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {book.title}
        </div>
      </Html>

      <Html position={[0, -dimensions.height * 0.3, dimensions.depth / 2 + 0.02]} center distanceFactor={8}>
        <div
          style={{
            color: '#f5f0eb',
            fontFamily: 'serif',
            fontSize: '10px',
            textAlign: 'center',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {book.author}
        </div>
      </Html>
    </group>
  );
}

export default function Book3DPreview({ book, edition, engraving }: Book3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      style={{ background: 'linear-gradient(135deg, #f5f0eb 0%, #e8e0d8 100%)', borderRadius: '8px' }}
      shadows
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <pointLight position={[0, 0, 3]} intensity={0.5} color="#c9a84c" />
      
      <BookMesh book={book} edition={edition} engraving={engraving} />
      
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={10}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI * 3 / 4}
      />
    </Canvas>
  );
}
