import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useNetworkStore } from '../store/useNetworkStore';
import { eventBus } from '../utils/eventBus';
import { PipeSegment } from './PipeSegment';
import { SensorNode } from './SensorNode';
import { ViewMode, PipeType } from '../types';

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function CameraController({ viewMode }: { viewMode: ViewMode }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const animatingRef = useRef(false);
  const targetRef = useRef({ position: new THREE.Vector3(), target: new THREE.Vector3() });

  useEffect(() => {
    const unsubscribe = eventBus.on('VIEW_CHANGE', (mode) => {
      if (mode === 'profile') {
        targetRef.current = {
          position: new THREE.Vector3(0, -5, 80),
          target: new THREE.Vector3(0, -5, 0),
        };
      } else {
        targetRef.current = {
          position: new THREE.Vector3(60, 60, 60),
          target: new THREE.Vector3(0, 0, 0),
        };
      }
      animatingRef.current = true;
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (viewMode === 'profile') {
      camera.position.set(0, -5, 80);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, -5, 0);
      }
    } else {
      camera.position.set(60, 60, 60);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
      }
    }
  }, [viewMode, camera]);

  useFrame((_, delta) => {
    if (animatingRef.current && controlsRef.current) {
      const target = targetRef.current;
      const duration = 1200;
      let elapsed = 0;

      const startPos = camera.position.clone();
      const startTarget = controlsRef.current.target.clone();

      function animate() {
        elapsed += delta * 1000;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutQuad(progress);

        camera.position.lerpVectors(startPos, target.position, eased);
        controlsRef.current.target.lerpVectors(startTarget, target.target, eased);
        controlsRef.current.update();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          animatingRef.current = false;
        }
      }
      animate();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.9}
      enablePan={false}
      minDistance={20}
      maxDistance={150}
      maxPolarAngle={Math.PI / 2.1}
    />
  );
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color="#1a2332"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <gridHelper
        args={[40, 40, '#ffffff20', '#ffffff10']}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}

function NetworkContent() {
  const nodes = useNetworkStore((state) => state.nodes);
  const pipes = useNetworkStore((state) => state.pipes);
  const selectedNodeId = useNetworkStore((state) => state.selectedNodeId);
  const selectedPipeId = useNetworkStore((state) => state.selectedPipeId);
  const visibleTypes = useNetworkStore((state) => state.visibleTypes);
  const getNodeById = useNetworkStore((state) => state.getNodeById);

  const isNodeVisible = (nodeId: string): boolean => {
    const node = getNodeById(nodeId);
    if (!node) return false;
    
    const connectedPipes = pipes.filter(
      (p) => p.startNodeId === nodeId || p.endNodeId === nodeId
    );
    return connectedPipes.some((p) => visibleTypes[p.type]);
  };

  return (
    <group>
      {pipes.map((pipe) => {
        const startNode = getNodeById(pipe.startNodeId);
        const endNode = getNodeById(pipe.endNodeId);
        if (!startNode || !endNode) return null;

        return (
          <PipeSegment
            key={pipe.id}
            pipe={pipe}
            startNode={startNode}
            endNode={endNode}
            isSelected={selectedPipeId === pipe.id}
            visible={visibleTypes[pipe.type]}
          />
        );
      })}

      {nodes.map((node) => (
        <SensorNode
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          visible={isNodeVisible(node.id)}
        />
      ))}
    </group>
  );
}

export function SceneView() {
  const viewMode = useNetworkStore((state) => state.viewMode);
  const initData = useNetworkStore((state) => state.initData);
  const setSelectedNode = useNetworkStore((state) => state.setSelectedNode);
  const setSelectedPipe = useNetworkStore((state) => state.setSelectedPipe);
  const setTypeVisibility = useNetworkStore((state) => state.setTypeVisibility);
  const setViewMode = useNetworkStore((state) => state.setViewMode);

  useEffect(() => {
    initData();
  }, [initData]);

  useEffect(() => {
    const unsub1 = eventBus.on('SELECT_NODE', (id) => setSelectedNode(id));
    const unsub2 = eventBus.on('SELECT_PIPE', (id) => setSelectedPipe(id));
    const unsub3 = eventBus.on('FILTER_TYPE', ({ type, visible }) =>
      setTypeVisibility(type as PipeType, visible)
    );
    const unsub4 = eventBus.on('CLEAR_SELECTION', () => {
      setSelectedNode(null);
      setSelectedPipe(null);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') {
        eventBus.emit('VIEW_CHANGE', 'profile');
        setViewMode('profile');
      } else if (e.key.toLowerCase() === 'n') {
        eventBus.emit('VIEW_CHANGE', 'top');
        setViewMode('top');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setSelectedNode, setSelectedPipe, setTypeVisibility, setViewMode]);

  const handleCanvasClick = () => {
    eventBus.emit('CLEAR_SELECTION', undefined as any);
  };

  return (
    <div style={{ width: '100%', height: '100%' }} onClick={handleCanvasClick}>
      <Canvas
        camera={{ position: [60, 60, 60], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0e17');
        }}
        frameloop="always"
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[50, 50, 25]} intensity={0.8} castShadow />
        <directionalLight position={[-50, 30, -25]} intensity={0.4} />

        <CameraController viewMode={viewMode} />
        <Ground />
        <NetworkContent />
      </Canvas>
    </div>
  );
}
