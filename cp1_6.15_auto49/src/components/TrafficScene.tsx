import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { TerrainManager } from '@terrain/TerrainManager';
import {
  useTrafficStore,
  GRID_SIZE_TIME,
  GRID_SIZE_Z,
  MAX_TERRAIN_HEIGHT,
  type TrafficPacket,
  type AnomalyMarker,
  type Protocol,
} from '@store/useTrafficStore';
import { TrafficSimulator } from '@traffic/TrafficSimulator';

const PROTOCOL_COLORS: Record<Protocol, string> = {
  TCP: 'rgba(52,152,219,0.8)',
  UDP: 'rgba(46,204,113,0.8)',
  ICMP: 'rgba(231,76,60,0.8)',
};

const PROTOCOL_THREE: Record<Protocol, THREE.Color> = {
  TCP: new THREE.Color(52 / 255, 152 / 255, 219 / 255),
  UDP: new THREE.Color(46 / 255, 204 / 255, 113 / 255),
  ICMP: new THREE.Color(231 / 255, 76 / 255, 60 / 255),
};

interface Particle {
  id: string;
  mesh: THREE.Mesh;
  start: THREE.Vector3;
  end: THREE.Vector3;
  progress: number;
  duration: number;
  protocol: Protocol;
  spawnTime: number;
}

interface Ripple {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  startTime: number;
  duration: number;
}

interface TerrainMeshProps {
  manager: React.MutableRefObject<TerrainManager | null>;
  onManagerReady: (m: TerrainManager) => void;
}

function TerrainMesh({ manager, onManagerReady }: TerrainMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const packets = useTrafficStore((s) => s.packets);
  const anomalies = useTrafficStore((s) => s.anomalies);
  const isPaused = useTrafficStore((s) => s.isPaused);
  const isReplaying = useTrafficStore((s) => s.isReplaying);
  const markAnomaly = useTrafficStore((s) => s.markAnomaly);
  const selectedIP = useTrafficStore((s) => s.selectedIP);
  const updateIPStatsMap = useTrafficStore((s) => s.updateIPStatsMap);
  const setTerrainHeights = useTrafficStore((s) => s.setTerrainHeights);
  const [localAnomalies, setLocalAnomalies] = useState<AnomalyMarker[]>([]);

  useEffect(() => {
    const mgr = new TerrainManager();
    manager.current = mgr;
    onManagerReady(mgr);
    if (groupRef.current) {
      groupRef.current.add(mgr.getMesh());
    }
    mgr.setAnomalyCallback((a) => {
      markAnomaly(a);
    });
    return () => {
      mgr.dispose();
      manager.current = null;
    };
  }, []);

  useEffect(() => {
    setLocalAnomalies(anomalies);
    if (manager.current) {
      manager.current.setAnomalies(anomalies);
    }
  }, [anomalies]);

  useFrame((_, delta) => {
    if (!manager.current) return;
    if (!isPaused || isReplaying) {
      manager.current.update(delta);
    }
    if (!isPaused && !isReplaying) {
      manager.current.addPackets(packets, Date.now());
    }
    updateIPStatsMap(manager.current.getIPStats());
    setTerrainHeights(manager.current.getHeights());
  });

  const selectedZIdx = useMemo(() => {
    if (!selectedIP) return -1;
    return TrafficSimulator.getSegmentIndex(selectedIP);
  }, [selectedIP]);

  const anomalyBoxes = useMemo(() => {
    if (!manager.current) return [];
    return localAnomalies.map((a) => ({
      id: a.id,
      pos: manager.current!.getWorldPosition(a.timeIndex, a.zIndex),
      anomaly: a,
    }));
  }, [localAnomalies, manager.current]);

  return (
    <group ref={groupRef}>
      {selectedZIdx >= 0 && (
        <mesh
          position={[0, 0.02, -((GRID_SIZE_Z - 1) * 0.3) + selectedZIdx * 0.6]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[GRID_SIZE_TIME * 0.5, 0.6]} />
          <meshBasicMaterial
            color={new THREE.Color(255 / 255, 215 / 255, 0 / 255)}
            transparent
            opacity={0.4}
          />
        </mesh>
      )}
      {anomalyBoxes.map(({ id, pos, anomaly }) => (
        <AnomalyBox key={id} position={pos} anomaly={anomaly} />
      ))}
    </group>
  );
}

function AnomalyBox({ position, anomaly }: { position: THREE.Vector3; anomaly: AnomalyMarker }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTime = useRef(Date.now());
  const [showLabel, setShowLabel] = useState(true);

  useEffect(() => {
    startTime.current = Date.now();
    setShowLabel(true);
    const t = setTimeout(() => setShowLabel(false), 2000);
    return () => clearTimeout(t);
  }, [anomaly.id]);

  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;
    const blink = Math.sin(elapsed * Math.PI * 4) * 0.5 + 0.5;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.3 + blink * 0.7;
  });

  return (
    <group position={[position.x, position.y + 0.05, position.z]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.52, 0.08, 0.62]} />
        <meshBasicMaterial
          color={new THREE.Color('#d32f2f')}
          transparent
          wireframe
          opacity={0.8}
        />
      </mesh>
      {showLabel && (
        <Html
          position={[0, 1, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: '#d32f2f',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(211,47,47,0.5)',
              fontFamily: 'monospace',
              animation: 'fadeInLabel 0.3s ease',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{anomaly.ipSegment}</div>
            <div>包数: {anomaly.packetCount}</div>
            <div style={{ fontSize: '10px', opacity: 0.85 }}>
              {new Date(anomaly.triggerTime).toLocaleTimeString()}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Particles({ manager }: { manager: React.MutableRefObject<TerrainManager | null> }) {
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const sceneGroupRef = useRef<THREE.Group>(null);
  const processedIds = useRef<Set<string>>(new Set());
  const packets = useTrafficStore((s) => s.packets);
  const isPaused = useTrafficStore((s) => s.isPaused);
  const isReplaying = useTrafficStore((s) => s.isReplaying);

  const spawnParticle = useCallback(
    (packet: TrafficPacket) => {
      if (!sceneGroupRef.current || !manager.current) return;

      const zIdx = TrafficSimulator.getSegmentIndex(packet.srcIP);
      const tNorm = Math.random();
      const tIdx = Math.floor(tNorm * GRID_SIZE_TIME);
      const endPos = manager.current.getWorldPosition(tIdx, zIdx);

      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 10;
      const startPos = new THREE.Vector3(
        Math.cos(angle) * radius,
        8 + Math.random() * 6,
        Math.sin(angle) * radius
      );

      const geometry = new THREE.SphereGeometry(0.06, 8, 8);
      const color = PROTOCOL_THREE[packet.protocol];
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(startPos);

      const particle: Particle = {
        id: packet.id,
        mesh,
        start: startPos,
        end: endPos,
        progress: 0,
        duration: 0.8 + Math.random() * 0.4,
        protocol: packet.protocol,
        spawnTime: Date.now(),
      };

      particlesRef.current.push(particle);
      sceneGroupRef.current.add(mesh);
    },
    [manager]
  );

  useEffect(() => {
    if (isPaused || isReplaying) return;
    for (const p of packets) {
      if (!processedIds.current.has(p.id)) {
        processedIds.current.add(p.id);
        spawnParticle(p);
      }
    }
    const cutoff = Date.now() - 2000;
    const ids = Array.from(processedIds.current);
    for (const id of ids) {
      const par = particlesRef.current.find((x) => x.id === id);
      if (par && par.spawnTime < cutoff) {
        processedIds.current.delete(id);
      }
    }
  }, [packets, isPaused, isReplaying, spawnParticle]);

  const spawnRipple = useCallback((pos: THREE.Vector3, protocol: Protocol) => {
    if (!sceneGroupRef.current) return;
    const geometry = new THREE.RingGeometry(0.05, 0.1, 32);
    const color = PROTOCOL_THREE[protocol];
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos);
    mesh.position.y += 0.1;

    const ripple: Ripple = {
      id: Math.random().toString(36).substr(2, 9),
      mesh,
      position: pos.clone(),
      startTime: Date.now(),
      duration: 400,
    };

    ripplesRef.current.push(ripple);
    sceneGroupRef.current.add(mesh);
  }, []);

  useFrame((_, delta) => {
    if (!sceneGroupRef.current) return;
    if (isPaused && !isReplaying) return;

    const toRemove: Particle[] = [];
    for (const p of particlesRef.current) {
      p.progress += delta / p.duration;
      if (p.progress >= 1) {
        toRemove.push(p);
        spawnRipple(p.end, p.protocol);
      } else {
        const t = p.progress;
        const ease = 1 - Math.pow(1 - t, 3);
        const yOffset = Math.sin(t * Math.PI) * 3;
        p.mesh.position.x = p.start.x + (p.end.x - p.start.x) * ease;
        p.mesh.position.y =
          p.start.y + (p.end.y - p.start.y) * ease + yOffset;
        p.mesh.position.z = p.start.z + (p.end.z - p.start.z) * ease;
        const scale = 1 - 0.3 * ease;
        p.mesh.scale.setScalar(scale);
      }
    }

    for (const p of toRemove) {
      sceneGroupRef.current.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    particlesRef.current = particlesRef.current.filter((p) => !toRemove.includes(p));

    const ripplesRemove: Ripple[] = [];
    const now = Date.now();
    for (const r of ripplesRef.current) {
      const elapsed = now - r.startTime;
      const t = elapsed / r.duration;
      if (t >= 1) {
        ripplesRemove.push(r);
      } else {
        const scale = 1 + t * 5;
        r.mesh.scale.setScalar(scale);
        const mat = r.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.6 * (1 - t) + 0.2 * t;
      }
    }

    for (const r of ripplesRemove) {
      sceneGroupRef.current.remove(r.mesh);
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
    }
    ripplesRef.current = ripplesRef.current.filter((r) => !ripplesRemove.includes(r));
  });

  return <group ref={sceneGroupRef} />;
}

function FPSMonitor() {
  const [fps, setFps] = useState(60);
  const [minFps, setMinFps] = useState(60);
  const framesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  useFrame(() => {
    frameCountRef.current++;
    const now = performance.now();
    if (now - lastTimeRef.current >= 500) {
      const currentFps = Math.round(
        (frameCountRef.current * 1000) / (now - lastTimeRef.current)
      );
      setFps(currentFps);
      framesRef.current.push(currentFps);
      if (framesRef.current.length > 120) framesRef.current.shift();
      const min = Math.min(...framesRef.current);
      setMinFps(min);
      lastTimeRef.current = now;
      frameCountRef.current = 0;
    }
  });

  const minVal = Math.min(...framesRef.current, 60);
  const maxVal = Math.max(...framesRef.current, 60);
  const range = Math.max(1, maxVal - minVal);

  const width = 120;
  const height = 30;
  const pathD = framesRef.current
    .map((v, i) => {
      const x = (i / Math.max(1, framesRef.current.length - 1)) * width;
      const y = height - ((v - minVal) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Html
      position={[-12, 9, -10]}
      style={{ pointerEvents: 'none' }}
      zIndexRange={[0, 0]}
    >
      <div
        style={{
          background: 'rgba(13,17,23,0.85)',
          borderRadius: '8px',
          padding: '8px 12px',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '12px',
          border: '1px solid rgba(124,77,255,0.4)',
          minWidth: '160px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: '#7c4dff' }}>FPS</span>
          <span style={{ color: fps >= 50 ? '#00e5ff' : fps >= 30 ? '#ff9800' : '#d32f2f', fontWeight: 'bold' }}>
            {fps}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ color: '#888' }}>MIN</span>
          <span style={{ color: minFps >= 50 ? '#00e5ff' : '#ff9800' }}>{minFps}</span>
        </div>
        <svg width={width} height={height} style={{ display: 'block' }}>
          <path d={pathD} fill="none" stroke="#7c4dff" strokeWidth="1.5" />
        </svg>
      </div>
    </Html>
  );
}

interface SceneProps {
  managerRef: React.MutableRefObject<TerrainManager | null>;
  controlsRef: React.MutableRefObject<any>;
}

function InnerScene({ managerRef, controlsRef }: SceneProps) {
  const onManagerReady = useCallback(() => {}, []);

  return (
    <>
      <fog attach="fog" args={['#0d1117', 8, 25]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[-1, 2, -1]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 8, 0]} intensity={0.3} color="#7c4dff" />

      <Grid
        position={[0, -0.01, 0]}
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a1f35"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a3550"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid
      />

      <TerrainMesh manager={managerRef} onManagerReady={onManagerReady} />
      <Particles manager={managerRef} />
      <FPSMonitor />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={15}
        minPolarAngle={(15 * Math.PI) / 180}
        maxPolarAngle={(75 * Math.PI) / 180}
        minAzimuthAngle={(-45 * Math.PI) / 180}
        maxAzimuthAngle={(45 * Math.PI) / 180}
      />

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#d32f2f', '#4caf50', '#2196f3']} labelColor="#fff" />
      </GizmoHelper>
    </>
  );
}

export default function TrafficScene() {
  const managerRef = useRef<TerrainManager | null>(null);
  const controlsRef = useRef<any>(null);

  return (
    <Canvas
      shadows
      camera={{ position: [8, 7, 10], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: '#0d1117' }}
    >
      <InnerScene managerRef={managerRef} controlsRef={controlsRef} />
    </Canvas>
  );
}

export type { TerrainManager };
