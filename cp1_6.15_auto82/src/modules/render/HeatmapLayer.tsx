import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { HeatmapRenderer } from './HeatmapRenderer';
import { CrowdEngine } from '../crowdSim/CrowdEngine';
import { WORLD_SIZE, HEATMAP_UPDATE_INTERVAL } from '../shared/constants';

interface HeatmapLayerProps {
  heatmap: HeatmapRenderer;
  engine: CrowdEngine;
  onDensityUpdate: (avg: number) => void;
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  heatmap,
  engine,
  onDensityUpdate,
}) => {
  const planeRef = useRef<THREE.Mesh>(null);
  const texture = heatmap.getTexture();
  const lastUpdate = useRef(0);

  useFrame((state, dt) => {
    if (!planeRef.current) return;
    lastUpdate.current += dt * 1000;
    const count = engine.getParticleCount();
    if (count === 0) return;

    if (lastUpdate.current >= HEATMAP_UPDATE_INTERVAL) {
      lastUpdate.current = 0;
      const positions = engine.getPositions();
      heatmap.update(positions, count, state.clock.elapsedTime);
      onDensityUpdate(heatmap.getAverageDensity());
    }
  });

  return (
    <mesh
      ref={planeRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.03, 0]}
      receiveShadow
    >
      <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </mesh>
  );
};
