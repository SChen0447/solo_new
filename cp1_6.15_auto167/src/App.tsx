import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { ParticleSystem, ParticleData, Connection, TrailParticle } from './particleSystem';
import { ParticlePanel, ControlBar, InfoCard } from './uiComponents';

interface SceneProps {
  particleSystemRef: React.MutableRefObject<ParticleSystem>;
  particlesVersion: number;
  paused: boolean;
  selectedParticleId: string | null;
  hoveredParticleId: string | null;
  onParticleHover: (id: string | null) => void;
  onParticleClick: (id: string | null) => void;
}

const lerpColor = (color1: string, color2: string, t: number): THREE.Color => {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, t);
};

const ParticleMesh: React.FC<{
  particle: ParticleData;
  isSelected: boolean;
  isConnected: boolean;
  isHovered: boolean;
  paused: boolean;
  flickerPhase: number;
  onPointerOver: () => void;
  onPointerOut: () => void;
  onClick: () => void;
}> = ({ particle, isSelected, isConnected, isHovered, paused, flickerPhase, onPointerOver, onPointerOut, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(particle.currentPosition);
      meshRef.current.scale.setScalar(particle.radius / 0.3);

      let opacity = 1;
      if (paused) {
        opacity = 0.6 + 0.4 * Math.abs(Math.sin(flickerPhase));
      }
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = opacity;
      material.color.copy(particle.color);
      material.emissive.copy(particle.color).multiplyScalar(isHovered ? 0.5 : 0.2);

      if (isSelected) {
        material.emissive.setHex(0xffffff);
        material.emissiveIntensity = 0.8;
      } else if (isConnected) {
        material.emissive.setHex(0xffffff);
        material.emissiveIntensity = 0.4 + 0.3 * Math.sin(performance.now() * 0.005);
      }
    }
    if (glowRef.current) {
      glowRef.current.position.copy(particle.currentPosition);
      glowRef.current.scale.setScalar((particle.radius / 0.3) * 1.4);
      const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
      if (isSelected || isConnected) {
        glowMat.opacity = 0.3 + 0.3 * Math.sin(performance.now() * 0.008);
      } else {
        glowMat.opacity = 0;
      }
    }
  });

  return (
    <group>
      <mesh
        ref={glowRef}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={meshRef}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        <sphereGeometry args={[0.3, particle.segments, particle.segments]} />
        <meshStandardMaterial
          color={particle.color}
          transparent
          opacity={1}
          roughness={0.3}
          metalness={0.6}
          emissive={particle.color}
          emissiveIntensity={0.2}
        />
      </mesh>
    </group>
  );
};

const ConnectionLines: React.FC<{
  connections: Connection[];
  particles: Map<string, ParticleData>;
}> = ({ connections, particles }) => {
  const linesRef = useRef<THREE.Group>(null);

  const renderedConnections = useMemo(() => {
    return connections.filter(conn => {
      const pA = particles.get(conn.particleA);
      const pB = particles.get(conn.particleB);
      return pA && pB;
    });
  }, [connections, particles]);

  return (
    <group ref={linesRef}>
      {renderedConnections.map((conn, idx) => {
        const pA = particles.get(conn.particleA)!;
        const pB = particles.get(conn.particleB)!;
        const distance = pA.currentPosition.distanceTo(pB.currentPosition);
        const maxDist = 35;
        const alpha = Math.max(0.2, 0.8 - (distance / maxDist) * 0.6);
        const colorT = Math.min(distance / 20, 1);
        const lineColor = lerpColor('#00ffff', '#ff00ff', colorT);

        return (
          <Line
            key={`conn_${idx}`}
            points={[pA.currentPosition, pB.currentPosition]}
            color={lineColor}
            lineWidth={1}
            transparent
            opacity={alpha}
            depthWrite={false}
          />
        );
      })}
    </group>
  );
};

const TrailParticles: React.FC<{
  trails: TrailParticle[];
}> = ({ trails }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(trails.length * 3), [trails.length]);
  const colors = useMemo(() => new Float32Array(trails.length * 3), [trails.length]);
  const sizes = useMemo(() => new Float32Array(trails.length), [trails.length]);

  useFrame(() => {
    if (pointsRef.current && trails.length > 0) {
      const geom = pointsRef.current.geometry as THREE.BufferGeometry;
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      const colorAttr = geom.getAttribute('color') as THREE.BufferAttribute;
      const sizeAttr = geom.getAttribute('size') as THREE.BufferAttribute;

      trails.forEach((trail, i) => {
        posAttr.array[i * 3] = trail.position.x;
        posAttr.array[i * 3 + 1] = trail.position.y;
        posAttr.array[i * 3 + 2] = trail.position.z;

        const alpha = trail.life / trail.maxLife;
        colorAttr.array[i * 3] = trail.color.r;
        colorAttr.array[i * 3 + 1] = trail.color.g;
        colorAttr.array[i * 3 + 2] = trail.color.b;
        (colorAttr as any).alpha = alpha;

        sizeAttr.array[i] = trail.size * alpha;
      });

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      geom.setDrawRange(0, trails.length);
    }
  });

  if (trails.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={trails.length}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={trails.length}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={trails.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
};

const SceneUpdater: React.FC<{
  particleSystemRef: React.MutableRefObject<ParticleSystem>;
  paused: boolean;
  setParticlesVersion: React.Dispatch<React.SetStateAction<number>>;
}> = ({ particleSystemRef, paused, setParticlesVersion }) => {
  const { camera } = useThree();
  const lastUpdateRef = useRef(0);

  useFrame((_, delta) => {
    const ps = particleSystemRef.current;
    ps.setPaused(paused);
    ps.update(delta, (pos) => camera.position.distanceTo(pos));

    const now = performance.now();
    if (now - lastUpdateRef.current > 50) {
      setParticlesVersion(v => v + 1);
      lastUpdateRef.current = now;
    }
  });

  return null;
};

const Scene: React.FC<SceneProps> = ({
  particleSystemRef,
  particlesVersion,
  paused,
  selectedParticleId,
  hoveredParticleId,
  onParticleHover,
  onParticleClick
}) => {
  const ps = particleSystemRef.current;
  const particles = useMemo(() => {
    const map = new Map<string, ParticleData>();
    ps.getParticles().forEach(p => map.set(p.id, p));
    return map;
  }, [particlesVersion, ps]);

  const connections = useMemo(() => ps.getConnections(), [particlesVersion, ps]);
  const trails = useMemo(() => ps.getTrailParticles(), [particlesVersion, ps]);
  const flickerPhase = ps.getFlickerPhase();

  const connectedSet = useMemo(() => {
    const set = new Set<string>();
    if (selectedParticleId) {
      const connected = ps.getConnectedParticles(selectedParticleId);
      connected.forEach(id => set.add(id));
    }
    return set;
  }, [selectedParticleId, particlesVersion, ps]);

  const particleArray = useMemo(() => Array.from(particles.values()), [particles]);

  return (
    <>
      <SceneUpdater
        particleSystemRef={particleSystemRef}
        paused={paused}
        setParticlesVersion={() => {}}
      />

      <ambientLight intensity={0.4} color="#8888ff" />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00bfff" />
      <pointLight position={[-10, -5, -10]} intensity={0.8} color="#ff00ff" />
      <directionalLight position={[0, 15, 0]} intensity={0.3} color="#ffffff" />

      <ConnectionLines connections={connections} particles={particles} />
      <TrailParticles trails={trails} />

      {particleArray.map(particle => (
        <ParticleMesh
          key={particle.id}
          particle={particle}
          isSelected={particle.id === selectedParticleId}
          isConnected={connectedSet.has(particle.id)}
          isHovered={particle.id === hoveredParticleId}
          paused={paused}
          flickerPhase={flickerPhase}
          onPointerOver={() => onParticleHover(particle.id)}
          onPointerOut={() => onParticleHover(null)}
          onClick={() => onParticleClick(particle.id === selectedParticleId ? null : particle.id)}
        />
      ))}

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={50}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />

      <fog attach="fog" args={['#0a0a1a', 20, 60]} />
    </>
  );
};

export const App: React.FC = () => {
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  const [particlesVersion, setParticlesVersion] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selectedParticleId, setSelectedParticleId] = useState<string | null>(null);
  const [hoveredParticleId, setHoveredParticleId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  const handleAddParticle = useCallback((label: string) => {
    particleSystemRef.current.addParticle(label);
    setParticlesVersion(v => v + 1);
  }, []);

  const handleAddRandom = useCallback((count: number) => {
    particleSystemRef.current.addRandomParticles(count);
    setParticlesVersion(v => v + 1);
  }, []);

  const handleTogglePause = useCallback(() => {
    setPaused(p => !p);
  }, []);

  const handleReset = useCallback(() => {
    particleSystemRef.current.resetAll();
    setPaused(false);
    setSelectedParticleId(null);
    setParticlesVersion(v => v + 1);
  }, []);

  const handleParticleHover = useCallback((id: string | null) => {
    setHoveredParticleId(id);
    particleSystemRef.current.setHovered(id);
  }, []);

  const handleParticleClick = useCallback((id: string | null) => {
    setSelectedParticleId(id);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePause();
      } else if (e.key.toLowerCase() === 'r') {
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePause, handleReset]);

  useEffect(() => {
    handleAddRandom(20);
  }, []);

  const hoveredParticle = hoveredParticleId ? particleSystemRef.current.getParticle(hoveredParticleId) : null;
  const hoveredConnections = hoveredParticleId ? particleSystemRef.current.getConnectedParticles(hoveredParticleId).length : 0;

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseMove={handleMouseMove}
    >
      <Canvas
        camera={{ position: [0, 5, 25], fov: 60, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{
          background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)'
        }}
      >
        <Scene
          particleSystemRef={particleSystemRef}
          particlesVersion={particlesVersion}
          paused={paused}
          selectedParticleId={selectedParticleId}
          hoveredParticleId={hoveredParticleId}
          onParticleHover={handleParticleHover}
          onParticleClick={handleParticleClick}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(16px)',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 30px rgba(0,0,0,0.5), 0 0 20px rgba(0,191,255,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 100,
          maxWidth: '95vw',
          flexWrap: 'wrap',
          minWidth: '320px'
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#00bfff',
            textShadow: '0 0 10px rgba(0,191,255,0.5)',
            marginRight: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          ✦ 信息流宇宙
        </div>
        <ParticlePanel onAdd={handleAddParticle} onAddRandom={handleAddRandom} />
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
        <ControlBar paused={paused} onTogglePause={handleTogglePause} onReset={handleReset} />
        <div
          style={{
            fontSize: '11px',
            color: '#888888',
            marginLeft: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          粒子: <span style={{ color: '#00ff88' }}>{particleSystemRef.current.getParticleCount()}</span> / 800
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '16px',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '11px',
          zIndex: 100,
          pointerEvents: 'none'
        }}
      >
        <span>空格: 暂停/恢复</span>
        <span>R: 重置</span>
        <span>拖拽: 旋转</span>
        <span>滚轮: 缩放</span>
      </div>

      {hoveredParticle && mousePosition && (
        <InfoCard
          position={mousePosition}
          label={hoveredParticle.label}
          particleId={hoveredParticle.id}
          connections={hoveredConnections}
        />
      )}
    </div>
  );
};

export default App;
