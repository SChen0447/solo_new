import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CrowdEngine } from '../crowdSim/CrowdEngine';
import { PARTICLE_RADIUS } from '../shared/constants';

interface ParticlesProps {
  engine: CrowdEngine;
  getTime: () => number;
}

export const Particles: React.FC<ParticlesProps> = ({ engine }) => {
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const trailInstancedRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particleCount = 2000;
  const trailSegments = 6;

  const geometry = useMemo(
    () => new THREE.SphereGeometry(PARTICLE_RADIUS, 8, 6),
    []
  );

  const trailGeometry = useMemo(
    () => new THREE.SphereGeometry(PARTICLE_RADIUS * 0.7, 6, 4),
    []
  );

  useFrame(() => {
    if (!instancedRef.current || !trailInstancedRef.current) return;

    const positions = engine.getPositions();
    const colors = engine.getColors();
    const trails = engine.getTrailBuffer();
    const count = Math.min(engine.getParticleCount(), particleCount);

    for (let i = 0; i < particleCount; i++) {
      if (i < count) {
        dummy.position.set(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        );
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        instancedRef.current.setMatrixAt(i, dummy.matrix);
        instancedRef.current.setColorAt(
          i,
          new THREE.Color(
            colors[i * 3],
            colors[i * 3 + 1],
            colors[i * 3 + 2]
          )
        );
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        instancedRef.current.setMatrixAt(i, dummy.matrix);
      }
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
    if (instancedRef.current.instanceColor) {
      instancedRef.current.instanceColor.needsUpdate = true;
    }

    const totalTrails = particleCount * trailSegments;
    for (let k = 0; k < totalTrails; k++) {
      const pIdx = Math.floor(k / trailSegments);
      const segIdx = k % trailSegments;
      const alpha = 1 - segIdx / trailSegments;

      if (pIdx < count) {
        const base = (pIdx * trailSegments + segIdx) * 3;
        dummy.position.set(trails[base], trails[base + 1], trails[base + 2]);
        dummy.scale.setScalar(Math.max(0.01, alpha * 0.9));
        dummy.updateMatrix();
        trailInstancedRef.current.setMatrixAt(k, dummy.matrix);
        const c = pIdx * 3;
        trailInstancedRef.current.setColorAt(
          k,
          new THREE.Color(colors[c], colors[c + 1], colors[c + 2]).multiplyScalar(0.6)
        );
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        trailInstancedRef.current.setMatrixAt(k, dummy.matrix);
      }
    }
    trailInstancedRef.current.instanceMatrix.needsUpdate = true;
    if (trailInstancedRef.current.instanceColor) {
      trailInstancedRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh
        ref={trailInstancedRef}
        args={[trailGeometry, undefined, particleCount * trailSegments]}
        frustumCulled={false}
      >
        <meshBasicMaterial transparent opacity={0.6} />
      </instancedMesh>
      <instancedMesh
        ref={instancedRef}
        args={[geometry, undefined, particleCount]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          emissive={0xffffff}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.2}
        />
      </instancedMesh>
    </group>
  );
};
