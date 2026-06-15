import React, { useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, THEMES } from '../stores/useStore';
import { particleManager } from '../core/ParticleManager';
import { ConnectionRenderer } from '../core/ConnectionRenderer';
import { animationRecorder } from '../core/AnimationRecorder';
import { ParticleData } from '../types';

interface ParticleMeshProps {
  particle: ParticleData;
  isSelected: boolean;
  onClick: (id: string) => void;
}

const ParticleMesh: React.FC<ParticleMeshProps> = ({ particle, isSelected, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const highlightRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [scale, setScale] = React.useState(0);
  const haloRotation = useRef(0);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 500;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const elastic = 1 - Math.pow(1 - t, 3);
      const overshoot = 1 + Math.sin(t * Math.PI) * 0.2;
      setScale(elastic * overshoot);
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [particle.id]);

  useFrame((_, delta) => {
    if (isSelected && haloRef.current) {
      haloRotation.current += delta * (Math.PI * 2 / 0.8);
      haloRef.current.rotation.y = haloRotation.current;
      haloRef.current.rotation.x = haloRotation.current * 0.3;
    }
    if (glowRef.current) {
      const glowMaterial = glowRef.current.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 0.3 + Math.sin(performance.now() * 0.003) * 0.15;
    }
  });

  const currentScale = scale * particle.size / 0.3;

  return (
    <group position={particle.position}>
      <mesh
        ref={glowRef}
        scale={currentScale * 2.5}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial
          color={particle.color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh
        ref={meshRef}
        scale={currentScale}
        onClick={(e) => {
          e.stopPropagation();
          onClick(particle.id);
        }}
      >
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={particle.color}
          emissive={particle.color}
          emissiveIntensity={1.5}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>

      <mesh
        ref={highlightRef}
        scale={currentScale * 0.3}
        position={[0.1, 0.1, 0.2]}
      >
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {isSelected && (
        <mesh ref={haloRef} scale={currentScale * 1.5}>
          <torusGeometry args={[0.5, 0.03, 16, 64]} />
          <meshBasicMaterial
            color={particle.color}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

interface SceneContentProps {
  onCanvasClick: (point: THREE.Vector3) => void;
}

const SceneContent: React.FC<SceneContentProps> = ({ onCanvasClick }) => {
  const { scene, camera } = useThree();
  const particles = useStore((s) => s.particles);
  const selectedParticleId = useStore((s) => s.selectedParticleId);
  const selectParticle = useStore((s) => s.selectParticle);
  const currentTheme = useStore((s) => s.currentTheme);
  const isRecording = useStore((s) => s.isRecording);
  const startRecording = useStore((s) => s.startRecording);
  const stopRecording = useStore((s) => s.stopRecording);
  const addRecordingFrame = useStore((s) => s.addRecordingFrame);
  const setCameraPosition = useStore((s) => s.setCameraPosition);
  const setCameraTarget = useStore((s) => s.setCameraTarget);

  const connectionRendererRef = useRef<ConnectionRenderer | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  useEffect(() => {
    connectionRendererRef.current = new ConnectionRenderer(scene);
    const theme = THEMES[currentTheme];
    connectionRendererRef.current.setGradient(
      theme.connectionGradient[0],
      theme.connectionGradient[1]
    );
    return () => {
      connectionRendererRef.current?.dispose();
    };
  }, [scene]);

  useEffect(() => {
    const theme = THEMES[currentTheme];
    connectionRendererRef.current?.setGradient(
      theme.connectionGradient[0],
      theme.connectionGradient[1]
    );
  }, [currentTheme]);

  useEffect(() => {
    particleManager.syncFromStore(particles);
  }, [particles]);

  useEffect(() => {
    if (isRecording) {
      animationRecorder.start();
    } else {
      if (animationRecorder.recording) {
        animationRecorder.stop();
      }
    }
  }, [isRecording]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime() * 1000;

    particleManager.updatePositions(time);

    if (connectionRendererRef.current) {
      connectionRendererRef.current.update(particleManager.getAllParticles(), time);
    }

    if (animationRecorder.recording) {
      animationRecorder.tryRecordFrame(particleManager.getAllParticles());
    }

    setCameraPosition(camera.position);
    const controls = (camera as any).controls;
    if (controls && controls.target) {
      setCameraTarget(controls.target);
    }
  });

  const handleClick = useCallback(
    (event: any) => {
      event.stopPropagation();
      if (event.point) {
        onCanvasClick(event.point.clone());
      }
    },
    [onCanvasClick]
  );

  const handleParticleClick = useCallback(
    (id: string) => {
      selectParticle(selectedParticleId === id ? null : id);
    },
    [selectedParticleId, selectParticle]
  );

  const theme = THEMES[currentTheme];

  return (
    <>
      <color attach="background" args={[theme.background]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, 5, -10]} intensity={0.3} />

      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      <gridHelper args={[50, 50, '#333344', '#222233']} position={[0, -0.01, 0]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} onClick={handleClick}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <group>
        {particleManager.getAllParticles().map((particle) => (
          <ParticleMesh
            key={particle.id}
            particle={particle}
            isSelected={particle.id === selectedParticleId}
            onClick={handleParticleClick}
          />
        ))}
      </group>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        makeDefault
      />
    </>
  );
};

interface SceneCanvasProps {
  onCanvasClick: (point: THREE.Vector3) => void;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({ onCanvasClick }) => {
  const currentTheme = useStore((s) => s.currentTheme);
  const theme = THEMES[currentTheme];

  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [0, 5, 15], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(theme.background);
      }}
    >
      <SceneContent onCanvasClick={onCanvasClick} />
    </Canvas>
  );
};
