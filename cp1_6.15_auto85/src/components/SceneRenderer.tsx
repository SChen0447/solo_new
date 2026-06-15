import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore, GRID_X, GRID_Y, GRID_Z } from '@/store/simulationStore';
import type { Well } from '@/store/simulationStore';
import { snapToSurface } from '@/utils/wellManager';

interface RockMeshProps {
  meshData: {
    positions: Float32Array;
    indices: Uint32Array;
    colors: Float32Array;
  } | null;
  size: { x: number; y: number; z: number };
  onRaycast: (point: THREE.Vector3, screenPos: { x: number; y: number }) => void;
}

const RockMesh: React.FC<RockMeshProps> = ({ meshData, size, onRaycast }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const { wellPlacementMode, addWell } = useSimulationStore();

  const handleClick = useCallback((event: any) => {
    event.stopPropagation();

    if (wellPlacementMode !== 'none') {
      const point = event.point.clone();
      const snapped = snapToSurface(point, size);
      const screenPos = { x: event.clientX, y: event.clientY };
      addWell(wellPlacementMode, snapped);
    } else {
      const point = event.point;
      const screenPos = { x: event.clientX, y: event.clientY };
      onRaycast(point, screenPos);
    }
  }, [wellPlacementMode, addWell, size, onRaycast]);

  useFrame(() => {
    if (wellPlacementMode !== 'none') {
      gl.domElement.style.cursor = 'crosshair';
    } else {
      gl.domElement.style.cursor = 'pointer';
    }
  });

  const geometry = useMemo(() => {
    if (!meshData) return null;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 4));
    geo.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, [meshData]);

  const edgesGeometry = useMemo(() => {
    if (!geometry) return null;
    return new THREE.EdgesGeometry(geometry);
  }, [geometry]);

  if (!geometry) return null;

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={handleClick}
      >
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments ref={linesRef} geometry={edgesGeometry}>
        <lineBasicMaterial color="#4a6b8a" linewidth={0.02} transparent opacity={0.8} />
      </lineSegments>
    </group>
  );
};

const Axes: React.FC<{ size?: number }> = ({ size = 6 }) => {
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, size, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ff4444" transparent opacity={0.6} />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, size, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#44ff44" transparent opacity={0.6} />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, 0, size])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#4444ff" transparent opacity={0.6} />
      </line>
    </group>
  );
};

interface WellModelProps {
  well: Well;
  isSelected: boolean;
  onSelect: () => void;
}

const WellModel: React.FC<WellModelProps> = ({ well, isSelected, onSelect }) => {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const color = well.type === 'injector' ? '#00bfff' : '#ff6347';

  const particleCount = 50;

  const { position, velocity } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 0.1 + Math.random() * 0.3;

      pos[i * 3] = well.position.x + r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = well.position.y + r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = well.position.z + r * Math.cos(phi);

      const speed = well.rate * 0.01;
      vel[i * 3] = (pos[i * 3] - well.position.x) * speed;
      vel[i * 3 + 1] = (pos[i * 3 + 1] - well.position.y) * speed;
      vel[i * 3 + 2] = (pos[i * 3 + 2] - well.position.z) * speed;
    }

    return { position: pos, velocity: vel };
  }, [well.position, well.rate]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      if (well.type === 'producer') {
        groupRef.current.rotation.y += 0.02;
      }
    }

    if (pulseRef.current) {
      const pulseScale = 1 + Math.sin(time * (Math.PI * 2 / 1.5)) * 0.3;
      pulseRef.current.scale.setScalar(pulseScale);
      const material = pulseRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.5 + Math.sin(time * (Math.PI * 2 / 1.5)) * 0.3;
    }

    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocity[i * 3];
        positions[i * 3 + 1] += velocity[i * 3 + 1];
        positions[i * 3 + 2] += velocity[i * 3 + 2];

        const dist = Math.sqrt(
          Math.pow(positions[i * 3] - well.position.x, 2) +
          Math.pow(positions[i * 3 + 1] - well.position.y, 2) +
          Math.pow(positions[i * 3 + 2] - well.position.z, 2)
        );

        if (dist > 2.0) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const r = 0.1 + Math.random() * 0.3;

          positions[i * 3] = well.position.x + r * Math.sin(phi) * Math.cos(theta);
          positions[i * 3 + 1] = well.position.y + r * Math.sin(phi) * Math.sin(theta);
          positions[i * 3 + 2] = well.position.z + r * Math.cos(phi);
        }
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <group ref={groupRef} position={[well.position.x, well.position.y, well.position.z}>
      <mesh onClick={handleClick}>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>

      {well.type === 'injector' && (
        <mesh ref={pulseRef}>
          <torusGeometry args={[0.35, 0.02, 8, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      )}

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={position}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.03} transparent opacity={0.8} sizeAttenuation />
      </points>

      {isSelected && (
        <mesh>
          <wireframeGeometry>
            <boxGeometry args={[0.5, 0.7, 0.5]} />
          </wireframeGeometry>
          <meshBasicMaterial color="#fbbf24" wireframe />
        </mesh>
      )}
    </group>
  );
};

interface VoxelCloudProps {
  saturation: number[][][];
  size: { x: number; y: number; z: number };
}

const VoxelCloud: React.FC<VoxelCloudProps> = ({ saturation, size }) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => new Float32Array(GRID_X * GRID_Y * GRID_Z * 3), []);

  const halfX = size.x / 2;
  const halfY = size.y / 2;
  const halfZ = size.z / 2;

  const dx = size.x / GRID_X;
  const dy = size.y / GRID_Y;
  const dz = size.z / GRID_Z;

  useFrame(() => {
    if (!instancedMeshRef.current) return;

    let idx = 0;
    const colorArray = instancedMeshRef.current.instanceColor;
    if (!colorArray) return;

    for (let i = 0; i < GRID_X; i++) {
      for (let j = 0; j < GRID_Y; j++) {
        for (let k = 0; k < GRID_Z; k++) {
          const x = -halfX + i * dx + dx / 2;
          const y = -halfY + j * dy + dy / 2;
          const z = -halfZ + k * dz + dz / 2;

          dummy.position.set(x, y, z);
          dummy.scale.set(0.8 * dx, 0.8 * dy, 0.8 * dz);
          dummy.updateMatrix();

          instancedMeshRef.current.setMatrixAt(idx, dummy.matrix);

          const sw = saturation[i][j][k];
          const r = 1 - sw;
          const g = 0.1;
          const b = sw;

          colorArray.setXYZ(idx, r, g, b);

          idx++;
        }
      }
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    colorArray.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instancedMeshRef} args={[undefined, undefined, GRID_X * GRID_Y * GRID_Z]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial vertexColors transparent opacity={0.3} />
    </instancedMesh>
  );
};

const SimulationTimeDisplay: React.FC = () => {
  const { currentTime, isRunning, rockGenerated } = useSimulationStore();

  const displayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    color: 'white',
    fontSize: '14px',
    fontFamily: 'monospace',
    textShadow: '0 0 10px rgba(0,0,0,0.8)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: '8px 16px',
    borderRadius: '6px',
    pointerEvents: 'none',
  };

  if (!rockGenerated) return null;

  return (
    <div style={displayStyle}>
      <div>模拟时间: {currentTime.toFixed(2)} s</div>
      <div style={{ fontSize: '12px', opacity: 0.7 }}>
        状态: {isRunning ? '运行中' : '已暂停'}
      </div>
    </div>
  );
};

interface ProbeInfoCardProps {
  data: {
    position: { x: number; y: number; z: number };
    porosity: number;
    permeability: number;
    pressure: number;
    saturation: number;
  } | null;
  position: { x: number; y: number };
  onClose: () => void;
  onDrag: (pos: { x: number; y: number }) => void;
}

const ProbeInfoCard: React.FC<ProbeInfoCardProps> = ({ data, position, onClose, onDrag }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        onDrag({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onDrag]);

  if (!data) return null;

  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    backgroundColor: 'rgba(44, 62, 80, 0.95)',
    color: 'white',
    borderRadius: '8px',
    padding: '16px',
    minWidth: '220px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    zIndex: 1000,
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '13px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  };

  const labelStyle: React.CSSProperties = {
    color: '#8b949e',
  };

  const valueStyle: React.CSSProperties = {
    color: '#58a6ff',
    fontFamily: 'monospace',
  };

  return (
    <div style={cardStyle} onMouseDown={handleMouseDown}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div style={{ fontWeight: 600, fontSize: '14px' }}>探测点数据</div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '18px',
          opacity: 0.7,
          padding: '0 4px',
        }}
      >
        ×
      </button>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>X坐标</span>
        <span style={valueStyle}>{data.position.x.toFixed(2)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Y坐标</span>
        <span style={valueStyle}>{data.position.y.toFixed(2)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Z坐标</span>
        <span style={valueStyle}>{data.position.z.toFixed(2)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>孔隙度</span>
        <span style={valueStyle}>{data.porosity.toFixed(4)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>渗透率</span>
        <span style={valueStyle}>{data.permeability.toExponential(2)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>压力</span>
        <span style={valueStyle}>{data.pressure.toExponential(2)}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>水饱和度</span>
        <span style={valueStyle}>{data.saturation.toFixed(4)}</span>
      </div>
    </div>
  );
};

const SimulationControlBar: React.FC = () => {
  const {
    currentTime, isRunning, startSimulation, pauseSimulation, resetSimulation, rockGenerated, wells } = useSimulationStore();

  const barStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(33, 38, 45, 0.9)',
    padding: '12px 20px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  };

  const buttonStyle = (bgColor: string): React.CSSProperties => ({
    backgroundColor: bgColor,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  });

  const progressStyle: React.CSSProperties = {
    width: '200px',
    height: '6px',
    backgroundColor: '#30363d',
    borderRadius: '3px',
    overflow: 'hidden',
  };

  const progressFillStyle: React.CSSProperties = {
    height: '100%',
    backgroundColor: '#58a6ff',
    width: `${(currentTime % 100) / 100 * 100}%`,
    transition: 'width 0.1s linear',
  };

  if (!rockGenerated) return null;

  return (
    <div style={barStyle}>
      <button
        style={buttonStyle(isRunning ? '#9e6a03' : '#238636'}
        onClick={isRunning ? pauseSimulation : startSimulation}
        disabled={wells.length === 0}
      >
        {isRunning ? '⏸ 暂停' : '▶ 播放'}
      </button>
      <button
        style={buttonStyle('#cf222e')}
        onClick={resetSimulation}
      >
        ↻ 重置
      </button>
      <div style={progressStyle}>
        <div style={progressFillStyle} />
      </div>
      <span style={{ color: '#c9d1d9', fontSize: '12px', minWidth: '60px' }}>
        {currentTime.toFixed(2)}s
      </span>
    </div>
  );
};

interface SceneContentProps {
  onRaycast: (point: THREE.Vector3, screenPos: { x: number; y: number }) => void;
}

const SceneContent: React.FC<SceneContentProps> = ({ onRaycast }) => {
  const {
    meshData,
    rockParams,
    rockGenerated,
    wells,
    selectedWellId,
    selectWell,
    saturationField,
    isRunning,
    stepSim,
  } = useSimulationStore();

  const lastUpdateRef = useRef(0);

  useFrame((state, delta) => {
    if (isRunning) {
      lastUpdateRef.current += delta;
      if (lastUpdateRef.current >= 0.5) {
        lastUpdateRef.current = 0;
        for (let i = 0; i < 50; i++) {
          stepSim();
        }
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      <Axes size={Math.max(rockParams.sizeX, rockParams.sizeY, rockParams.sizeZ) + 2} />

      {rockGenerated && meshData && (
        <RockMesh
          meshData={meshData}
          size={rockParams}
          onRaycast={onRaycast}
        />
      )}

      {rockGenerated && (
        <VoxelCloud
          saturation={saturationField}
          size={rockParams}
        />
      )}

      {wells.map((well) => (
        <WellModel
          key={well.id}
          well={well}
          isSelected={selectedWellId === well.id}
          onSelect={() => selectWell(well.id)}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
      />
    </>
  );
};

const SceneRenderer: React.FC = () => {
  const {
    probeData,
    probePosition,
    setProbeData,
    setProbePosition,
    porosityField,
    permeabilityField,
    pressureField,
    saturationField,
    rockParams,
  } = useSimulationStore();

  const handleRaycast = useCallback((point: THREE.Vector3, screenPos: { x: number; y: number }) => {
    const halfX = rockParams.sizeX / 2;
    const halfY = rockParams.sizeY / 2;
    const halfZ = rockParams.sizeZ / 2;

    const i = Math.max(0, Math.min(GRID_X - 1,
      Math.floor(((point.x + halfX) / rockParams.sizeX) * GRID_X)));
    const j = Math.max(0, Math.min(GRID_Y - 1,
      Math.floor(((point.y + halfY) / rockParams.sizeY) * GRID_Y)));
    const k = Math.max(0, Math.min(GRID_Z - 1,
      Math.floor(((point.z + halfZ) / rockParams.sizeZ) * GRID_Z)));

    setProbeData({
      position: { x: point.x, y: point.y, z: point.z },
      porosity: porosityField[i][j][k],
      permeability: permeabilityField[i][j][k],
      pressure: pressureField[i][j][k],
      saturation: saturationField[i][j][k],
    }, screenPos);
  }, [rockParams, porosityField, permeabilityField, pressureField, saturationField, setProbeData]);

  const handleCloseProbe = useCallback(() => {
    setProbeData(null);
  }, [setProbeData]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [15, 12, 10], fov: 50 }}
        style={{ background: '#0d1117' }}
        gl={{ antialias: true }}
      >
        <SceneContent onRaycast={handleRaycast} />
      </Canvas>

      <SimulationTimeDisplay />
      <SimulationControlBar />

      {probeData && (
        <ProbeInfoCard
          data={probeData}
          position={probePosition}
          onClose={handleCloseProbe}
          onDrag={setProbePosition}
        />
      )}
    </div>
  );
};

export default SceneRenderer;
