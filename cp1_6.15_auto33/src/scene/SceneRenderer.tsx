import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GeometryManager } from './Geometries';
import { useAppStore, themeColors } from '../store';

interface SceneContentProps {
  geometryManager: GeometryManager;
}

function SceneContent({ geometryManager }: SceneContentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { sensitivity, colorTheme, lodEnabled, particleCount, fps, setFps, addAnalysisFrame, isPlaying, isRecording } = useAppStore();

  const frequencyData = useAppStore((state) => state.frequencyData);

  const bandEnergy = useMemo(() => {
    const lowEnd = 3;
    const midEnd = 24;
    
    let lowSum = 0, midSum = 0, highSum = 0;
    
    for (let i = 0; i < lowEnd; i++) lowSum += frequencyData[i] || 0;
    for (let i = lowEnd; i < midEnd; i++) midSum += frequencyData[i] || 0;
    for (let i = midEnd; i < frequencyData.length; i++) highSum += frequencyData[i] || 0;

    return {
      low: lowSum / lowEnd,
      mid: midSum / (midEnd - lowEnd),
      high: highSum / (frequencyData.length - midEnd),
    };
  }, [frequencyData]);

  useEffect(() => {
    geometryManager.setLodEnabled(lodEnabled);
    geometryManager.setMaxParticles(particleCount);
    geometryManager.updateColors(themeColors[colorTheme]);
  }, [lodEnabled, particleCount, colorTheme, geometryManager]);

  useEffect(() => {
    const isPerfMode = fps < 40;
    geometryManager.setPerformanceMode(isPerfMode);
    useAppStore.getState().setIsPerformanceMode(isPerfMode);
  }, [fps, geometryManager]);

  useFrame((state, delta) => {
    geometryManager.update(delta, bandEnergy.low, bandEnergy.mid, bandEnergy.high, sensitivity);

    const frameTime = 1 / delta;
    const smoothedFps = Math.round(frameTime * 0.1 + fps * 0.9);
    if (Math.abs(smoothedFps - fps) > 1) {
      setFps(smoothedFps);
    }

    if (isPlaying || isRecording) {
      if (useAppStore.getState().analysisHistory.length < 36000) {
        addAnalysisFrame({
          lowFreqEnergy: bandEnergy.low,
          midFreqEnergy: bandEnergy.mid,
          highFreqEnergy: bandEnergy.high,
        });
      }
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={geometryManager.getCubeGroup()} />
      <primitive object={geometryManager.getSphereGroup()} />
      <primitive object={geometryManager.getParticleSystem()} />
      <primitive object={geometryManager.getConnectingLines()} />
    </group>
  );
}

function NebulaBackground() {
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(100, 100, 255, 0.3)');
    gradient.addColorStop(0.3, 'rgba(50, 50, 150, 0.2)');
    gradient.addColorStop(0.7, 'rgba(20, 20, 60, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 30, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = Math.random() * 2 + 0.5;
      const opacity = Math.random() * 0.5 + 0.3;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0002;
    }
  });

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[10, 32, 32]} />
      <meshBasicMaterial 
        map={texture} 
        side={THREE.BackSide}
        transparent
        opacity={0.3}
      />
    </mesh>
  );
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-5, 3, -5]} intensity={0.5} color="#6c63ff" />
      <pointLight position={[0, -3, 3]} intensity={0.3} color="#ff6b6b" />
    </>
  );
}

interface SceneRendererProps {
  geometryManager: GeometryManager;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function SceneRenderer({ geometryManager, canvasRef }: SceneRendererProps) {
  return (
    <Canvas
      ref={canvasRef as React.RefObject<HTMLCanvasElement>}
      camera={{ position: [0, 5, 10], fov: 60 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      style={{
        background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 100%)',
      }}
    >
      <SceneLighting />
      <NebulaBackground />
      <SceneContent geometryManager={geometryManager} />
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.5}
        minDistance={2}
        maxDistance={20}
        target={[0, 0, 0]}
      />
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
    </Canvas>
  );
}
