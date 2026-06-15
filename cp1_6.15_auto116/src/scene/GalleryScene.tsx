import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useGalleryStore } from '@/store/useGalleryStore';
import { socketManager } from '@/network/SocketManager';
import ArtworkFrame from './ArtworkFrame';
import OtherUserAvatar from './OtherUserAvatar';
import type { Artwork } from '@/types';

const GALLERY_LENGTH = 12;
const GALLERY_WIDTH = 8;
const GALLERY_HEIGHT = 4;
const WALL_COLOR = '#f5f0e8';
const FLOOR_COLOR = '#8d6e63';
const CEILING_COLOR = '#e0e0e0';

function GalleryRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[GALLERY_LENGTH, GALLERY_WIDTH]} />
        <meshStandardMaterial color={FLOOR_COLOR} side={THREE.DoubleSide} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, GALLERY_HEIGHT, 0]}>
        <planeGeometry args={[GALLERY_LENGTH, GALLERY_WIDTH]} />
        <meshStandardMaterial color={CEILING_COLOR} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, GALLERY_HEIGHT / 2, -GALLERY_WIDTH / 2]}>
        <planeGeometry args={[GALLERY_LENGTH, GALLERY_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, GALLERY_HEIGHT / 2, GALLERY_WIDTH / 2]}>
        <planeGeometry args={[GALLERY_LENGTH, GALLERY_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[-GALLERY_LENGTH / 2, GALLERY_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[GALLERY_WIDTH, GALLERY_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[GALLERY_LENGTH / 2, GALLERY_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[GALLERY_WIDTH, GALLERY_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function GalleryLights({ artworks }: { artworks: Artwork[] }) {
  return (
    <>
      <ambientLight intensity={0.4} color="#fff4e6" />

      {artworks.map((artwork) => (
        <spotLight
          key={artwork.id}
          position={[artwork.position.x, GALLERY_HEIGHT - 0.3, artwork.position.z + (artwork.rotation.y === 0 ? -0.5 : 0.5)]}
          target-position={[artwork.position.x, artwork.position.y, artwork.position.z]}
          angle={Math.PI / 6}
          intensity={0.8}
          color="#fff8e7"
          penumbra={0.5}
          decay={2}
          distance={10}
        />
      ))}
    </>
  );
}

function PlayerController() {
  const { camera, gl } = useThree();
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const velocity = useRef(new THREE.Vector3());
  const selectArtwork = useGalleryStore((state) => state.selectArtwork);
  const selectedArtworkId = useGalleryStore((state) => state.selectedArtworkId);
  const artworks = useGalleryStore((state) => state.artworks);
  const setUserPosition = useGalleryStore((state) => state.setUserPosition);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        (keys.current as any)[key] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        (keys.current as any)[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement === gl.domElement);
    };
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handleLockChange);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const speed = 4;
    const direction = new THREE.Vector3();

    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    if (keys.current.w) move.add(direction);
    if (keys.current.s) move.sub(direction);
    if (keys.current.d) move.add(right);
    if (keys.current.a) move.sub(right);

    if (move.length() > 0) {
      move.normalize().multiplyScalar(speed * delta);
      velocity.current.lerp(move, 0.2);
    } else {
      velocity.current.multiplyScalar(0.8);
    }

    const newPos = camera.position.clone().add(velocity.current);

    const halfLength = GALLERY_LENGTH / 2 - 0.5;
    const halfWidth = GALLERY_WIDTH / 2 - 0.5;
    newPos.x = Math.max(-halfLength, Math.min(halfLength, newPos.x));
    newPos.z = Math.max(-halfWidth, Math.min(halfWidth, newPos.z));
    newPos.y = 1.6;

    camera.position.copy(newPos);

    setUserPosition({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    });

    let closestArtwork: string | null = null;
    let closestDistance = 2;

    artworks.forEach((artwork) => {
      const dx = camera.position.x - artwork.position.x;
      const dz = camera.position.z - artwork.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestArtwork = artwork.id;
      }
    });

    if (closestArtwork !== selectedArtworkId) {
      selectArtwork(closestArtwork);
    }
  });

  return (
    <>
      <PointerLockControls />
      {!isLocked && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '18px',
            padding: '20px 40px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '12px',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          点击画面开始探索
        </div>
      )}
    </>
  );
}

function SceneContent() {
  const artworks = useGalleryStore((state) => state.artworks);
  const onlineUsers = useGalleryStore((state) => state.onlineUsers);
  const selectedArtworkId = useGalleryStore((state) => state.selectedArtworkId);
  const currentUser = useGalleryStore((state) => state.currentUser);
  const selectArtwork = useGalleryStore((state) => state.selectArtwork);

  const handleCanvasClick = useCallback(() => {
    if (selectedArtworkId) {
      selectArtwork(selectedArtworkId);
    }
  }, [selectedArtworkId, selectArtwork]);

  useEffect(() => {
    if (currentUser) {
      const getPosition = () => useGalleryStore.getState().userPosition;
      socketManager.startPositionBroadcast(getPosition);
    }
    return () => {
      socketManager.stopPositionBroadcast();
    };
  }, [currentUser]);

  return (
    <>
      <GalleryRoom />
      <GalleryLights artworks={artworks} />

      {artworks.map((artwork) => (
        <ArtworkFrame
          key={artwork.id}
          artwork={artwork}
          isHighlighted={selectedArtworkId === artwork.id}
          onClick={() => selectArtwork(artwork.id)}
        />
      ))}

      {onlineUsers.map((user) => (
        <OtherUserAvatar key={user.id} user={user} />
      ))}

      <PlayerController />
    </>
  );
}

export default function GalleryScene() {
  return (
    <Canvas
      shadows
      camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 1.6, 2] }}
      style={{ width: '100%', height: '100%' }}
    >
      <fog attach="fog" args={['#f5f0e8', 5, 20]} />
      <SceneContent />
    </Canvas>
  );
}
